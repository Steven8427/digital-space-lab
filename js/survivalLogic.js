// ================================================
//  survivalLogic.js v4 — 数字生存（吸血鬼幸存者版）
//  武器自动攻击，敌人数字=血量，打到0消灭
// ================================================
var SW = GameGlobal.SW, SH = GameGlobal.SH
var MAP_W = 3000, MAP_H = 3000, GRID_SIZE = 80
var BASE_SPEED = 160, SPAWN_DIST = 480, GAME_DURATION = 600, MAX_LEVEL = 50

// 50级经验表：前期快升，后期平缓增长
var LEVEL_XP = (function(){
  var t=[0]; for(var i=1;i<50;i++) t.push(Math.floor(20+i*15+i*i*1.2))
  return t
})()

// ── 敌人类型
var ENEMY_TYPES = {
  walker: { speed:40, chase:true },
  swarm:  { speed:55, chase:true },
  tank:   { speed:22, chase:true },
  dash:   { speed:30, chase:true, dashSpeed:180, dashRange:150 },
  split:  { speed:35, chase:true }
}

function _getWeights(t) {
  if (t<60)  return {walker:55,swarm:35,tank:0,dash:5,split:5}
  if (t<120) return {walker:45,swarm:25,tank:10,dash:10,split:10}
  if (t<300) return {walker:35,swarm:20,tank:15,dash:15,split:15}
  return              {walker:25,swarm:15,tank:20,dash:20,split:20}
}
function _pickType(t) {
  var w=_getWeights(t), total=0; for(var k in w) total+=w[k]
  var r=Math.random()*total, s=0; for(var k in w){s+=w[k];if(r<s)return k}
  return 'walker'
}
// 敌人数字（血量）随时间增长
function _pickEnemyHP(elapsed) {
  var base = 3 + Math.floor(elapsed / 30) * 2  // 每30秒+2
  var vary = Math.floor(Math.random() * base * 0.5)
  return Math.max(1, base + vary - Math.floor(base*0.25))
}
function _enemyRadius(type) {
  if (type==='tank') return 24; if (type==='swarm') return 13; return 18
}

// ── 粒子
var _particles = []
function _spawnP(x,y,color,n) {
  // 限制粒子总数，防止手机掉帧
  var maxP = 80
  if (_particles.length > maxP) return
  var actual = Math.min(n, maxP - _particles.length)
  for(var i=0;i<actual;i++){var a=Math.random()*Math.PI*2,sp=40+Math.random()*120
    _particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.35+Math.random()*0.25,age:0,color:color,r:2+Math.random()*3})}
}
function _updateP(dt) {
  for(var i=_particles.length-1;i>=0;i--){var p=_particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.94;p.vy*=0.94
    if(p.age>=p.life){_particles[i]=_particles[_particles.length-1];_particles.pop()}}
}

// ================================================
//  武器定义
// ================================================
var WEAPON_DEFS = {
  orbit: {
    name:'旋转飞刀', desc:'数字环绕你旋转', icon:'🔪',
    baseDmg:5, baseCD:0, count:2, range:65,
    upgrade: function(w) { w.count++; w.dmg+=3; w.range+=8 }
  },
  bolt: {
    name:'能量弹', desc:'自动射击最近敌人', icon:'🔮',
    baseDmg:8, baseCD:0.7, count:1, range:300,
    upgrade: function(w) { w.dmg+=5; w.cd*=0.82; if(w.level%2===0) w.count++ }
  },
  lightning: {
    name:'闪电链', desc:'连锁闪电弹跳伤害', icon:'⚡',
    baseDmg:6, baseCD:2.0, count:3, range:250,
    upgrade: function(w) { w.dmg+=4; w.count+=1; w.cd*=0.9 }
  },
  aura: {
    name:'冰冻光环', desc:'减速并持续伤害', icon:'❄',
    baseDmg:4, baseCD:0.4, count:1, range:60,
    upgrade: function(w) { w.dmg+=3; w.range+=15; w.cd*=0.9 }
  },
  ring: {
    name:'火焰圈', desc:'周期性火焰扩散', icon:'🔥',
    baseDmg:12, baseCD:2.5, count:1, range:180,
    upgrade: function(w) { w.dmg+=6; w.cd*=0.85; w.range+=15 }
  },
  boomerang: {
    name:'回旋镖', desc:'飞出再飞回，穿透敌人', icon:'🪃',
    baseDmg:8, baseCD:1.5, count:1, range:220,
    upgrade: function(w) { w.dmg+=5; w.count++; w.cd*=0.88 }
  },
  meteor: {
    name:'陨石', desc:'随机砸落范围爆炸', icon:'☄',
    baseDmg:20, baseCD:3.0, count:1, range:250,
    upgrade: function(w) { w.dmg+=10; w.count++; w.cd*=0.88 }
  },
  shield: {
    name:'护盾球', desc:'旋转护盾挡住敌人', icon:'🛡',
    baseDmg:6, baseCD:0, count:3, range:85,
    upgrade: function(w) { w.dmg+=4; w.count++; w.range+=12 }
  },
  vampire: {
    name:'吸血斧', desc:'近战攻击回血', icon:'🪓',
    baseDmg:10, baseCD:0.8, count:1, range:120,
    upgrade: function(w) { w.dmg+=6; w.cd*=0.82; w.range+=15 }
  },
  tornado: {
    name:'龙卷风', desc:'向前方推开敌人', icon:'🌪',
    baseDmg:7, baseCD:2.0, count:1, range:200,
    upgrade: function(w) { w.dmg+=5; w.cd*=0.85; w.range+=25 }
  },
  poison: {
    name:'毒雾', desc:'留下毒区域持续伤害', icon:'☢',
    baseDmg:5, baseCD:3.0, count:1, range:90,
    upgrade: function(w) { w.dmg+=4; w.count++; w.range+=20; w.cd*=0.92 }
  }
}

// ================================================
//  主模块
// ================================================
GameGlobal.Survival = {
  running:false, paused:false, gameOver:false, victory:false,
  player:null, enemies:[], maxEnemies:80,
  projectiles:[], // {x,y,vx,vy,dmg,life,type,targets}
  elapsed:0, _lastTick:0, _spawnTimer:0,
  _waveActive:false, _waveEnd:0,
  joystick:null, camera:{x:0,y:0},
  boss:null, eliteSpawned:false,
  _eliteTimer:0, _eliteCount:0,
  levelUp:false, weaponChoices:[],
  weapons:[], // {id, dmg, cd, count, range, level, _timer}
  particles:_particles,
  // 火焰圈/闪电视觉
  _rings:[], // {x,y,r,maxR,dmg}
  _lightnings:[], // [{x1,y1,x2,y2,life}]

  init: function() {
    this.running=true; this.paused=false; this.gameOver=false; this.victory=false
    this.elapsed=0; this._lastTick=Date.now(); this._spawnTimer=0
    this._waveActive=false; this._waveEnd=0
    this.boss=null; this.eliteSpawned=false
    this._eliteTimer=0; this._eliteCount=0
    this.levelUp=false; this.weaponChoices=[]
    this.weapons=[]; this.enemies=[]; this.projectiles=[]
    _particles.length=0; this._rings=[]; this._lightnings=[]
    this._boomerangs=[]; this._meteors=[]; this._poisonZones=[]; this._tornadoes=[]
    this.foodItems=[]; this._foodTimer=0

    this.player = {
      x:MAP_W/2, y:MAP_H/2, hp:100, maxHp:100,
      level:1, xp:0, speed:BASE_SPEED,
      kills:0, dmgDealt:0, _trail:[], _iFrames:0,
      facingLeft:false, skin:'doux'
    }
    this.joystick={active:false,baseX:0,baseY:0,stickX:0,stickY:0,dx:0,dy:0}

    // 应用永久升级
    if(GameGlobal.applySurvivalUpgrades) GameGlobal.applySurvivalUpgrades(this.player)

    // 初始武器：旋转飞刀
    this._addWeapon('orbit')

    // Set player skin from sprites module
    if(GameGlobal.SurvivalSprites) {
      this.player.skin = GameGlobal.SurvivalSprites.getPlayerSkin()
      GameGlobal.SurvivalSprites.setPlayerSkin(this.player.skin)
    }

    // 初始敌人
    var _pickSprite = GameGlobal.SurvivalSprites ? GameGlobal.SurvivalSprites.pickMonsterSprite : null
    for(var i=0;i<20;i++){
      var a=Math.random()*Math.PI*2, d=120+Math.random()*350
      this.enemies.push({
        x:MAP_W/2+Math.cos(a)*d, y:MAP_H/2+Math.sin(a)*d,
        hp:[1,2,2,3,3][Math.floor(Math.random()*5)], maxHp:3,
        type:'walker', speed:ENEMY_TYPES.walker.speed,
        spriteType: _pickSprite ? _pickSprite('walker') : null
      })
    }
  },

  _addWeapon: function(id) {
    var def = WEAPON_DEFS[id]; if(!def) return
    this.weapons.push({
      id:id, dmg:def.baseDmg, cd:def.baseCD, count:def.count,
      range:def.range, level:1, _timer:0
    })
  },

  // ================================================
  update: function() {
    if (!this.running||this.gameOver||this.paused||this.levelUp) return
    var now=Date.now(), dt=Math.min((now-this._lastTick)/1000,0.05)
    this._lastTick=now; this.elapsed+=dt

    var p=this.player, js=this.joystick

    // 无敌帧
    if (p._iFrames > 0) p._iFrames -= dt

    // 移动
    if(js.active&&(js.dx!==0||js.dy!==0)){
      p.x+=js.dx*p.speed*dt;p.y+=js.dy*p.speed*dt
      if(js.dx<-0.1) p.facingLeft=true
      else if(js.dx>0.1) p.facingLeft=false
    }
    // 树碰撞检测：推开玩家
    if (GameGlobal.SurvivalSprites && GameGlobal.SurvivalSprites.resolveTreeCollision) {
      var resolved = GameGlobal.SurvivalSprites.resolveTreeCollision(p.x, p.y, 18)
      p.x = resolved.x; p.y = resolved.y
    }
    p._trail.push({x:p.x,y:p.y}); while(p._trail.length>10) p._trail.shift()
    this.camera.x=p.x-SW/2; this.camera.y=p.y-SH/2

    // 武器
    this._updateWeapons(dt)
    // 投射物
    this._updateProjectiles(dt)
    // 敌人
    this._updateEnemies(dt)
    // 碰撞（玩家撞敌人=受伤）
    this._checkPlayerHit()
    // 食物掉落
    this._updateFood(dt)
    // 粒子/特效
    _updateP(dt)
    this._updateRings(dt)
    this._updateLightnings(dt)

    // 生成
    this._spawnTimer+=dt
    var si=this._waveActive?0.15:0.7
    while(this._spawnTimer>=si){this._spawnTimer-=si;if(this.enemies.length<this.maxEnemies)this._spawnEnemy()}
    this._checkWaves()

    // 精英怪：60秒后开始，每45秒生成一只，越来越强
    if(this.elapsed>=60){
      this._eliteTimer+=dt
      var eliteInterval=Math.max(25, 45-this._eliteCount*3) // 间隔逐渐缩短
      if(this._eliteTimer>=eliteInterval){this._eliteTimer=0;this._spawnElite();this._eliteCount++}
    }
    if(this.elapsed>=GAME_DURATION&&!this.boss&&!this.victory) this._spawnBoss()
    if(this.boss) this._updateBoss(dt)

    // 生命恢复（每10秒回 _regen 点HP）
    var regen = p._regen || 0
    if(regen > 0) {
      p._regenTimer = (p._regenTimer||0) + dt
      if(p._regenTimer >= 10) { p._regenTimer = 0; p.hp = Math.min(p.maxHp, p.hp + regen) }
    }

    // 护甲减伤（统一处理：在受伤前修改hp，这里用被动方式）
    // 实际减伤在 _applyArmor 里处理

    // 死亡
    if(p.hp<=0){this.gameOver=true;this.running=false;_spawnP(p.x,p.y,'#e74c3c',20);GameGlobal.Sound.play('lose');this._saveResult()}
    // 胜利时间到且boss已打
    if(this.elapsed>=GAME_DURATION&&!this.boss&&this.victory){/* already handled */}
  },

  // ================================================
  //  武器系统
  // ================================================
  _updateWeapons: function(dt) {
    var p=this.player
    for(var wi=0;wi<this.weapons.length;wi++){
      var w=this.weapons[wi]
      w._timer+=dt

      if(w.id==='orbit') {
        // 旋转飞刀：持续环绕，碰到敌人就扣血
        this._weaponOrbit(w)
      }
      else if(w.id==='bolt' && w._timer>=w.cd) {
        w._timer=0; this._weaponBolt(w)
      }
      else if(w.id==='lightning' && w._timer>=w.cd) {
        w._timer=0; this._weaponLightning(w)
      }
      else if(w.id==='aura') {
        if(w._timer>=w.cd){w._timer=0; this._weaponAura(w)}
      }
      else if(w.id==='ring' && w._timer>=w.cd) {
        w._timer=0; this._weaponRing(w)
      }
      else if(w.id==='boomerang' && w._timer>=w.cd) {
        w._timer=0; this._weaponBoomerang(w)
      }
      else if(w.id==='meteor' && w._timer>=w.cd) {
        w._timer=0; this._weaponMeteor(w)
      }
      else if(w.id==='shield') {
        this._weaponShield(w)
      }
      else if(w.id==='vampire' && w._timer>=w.cd) {
        w._timer=0; this._weaponVampire(w)
      }
      else if(w.id==='tornado' && w._timer>=w.cd) {
        w._timer=0; this._weaponTornado(w)
      }
      else if(w.id==='poison' && w._timer>=w.cd) {
        w._timer=0; this._weaponPoison(w)
      }
    }
    // 更新毒雾区域
    this._updatePoison(dt)
    // 更新回旋镖
    this._updateBoomerangs(dt)
    // 更新陨石
    this._updateMeteors(dt)
    // 更新龙卷风
    this._updateTornadoes(dt)
  },

  // ── 旋转飞刀
  _weaponOrbit: function(w) {
    var p=this.player, t=this.elapsed
    for(var k=0;k<w.count;k++){
      var a = t*2.5 + k*(Math.PI*2/w.count)
      var ox = p.x+Math.cos(a)*w.range, oy = p.y+Math.sin(a)*w.range
      // 检测碰撞 — use squared distance to avoid sqrt
      for(var i=this.enemies.length-1;i>=0;i--){
        var e=this.enemies[i], dx=ox-e.x, dy=oy-e.y
        var hitR = _enemyRadius(e.type)+10
        if(dx*dx+dy*dy < hitR*hitR){
          this._damageEnemy(i, w.dmg*0.05) // 每帧小伤害（持续接触）
        }
      }
      if(this.boss){var dx=ox-this.boss.x,dy=oy-this.boss.y;if(dx*dx+dy*dy<45*45) this._damageBoss(w.dmg*0.05)}
    }
  },

  // ── 能量弹
  _weaponBolt: function(w) {
    var p=this.player, nearest=null, minD=w.range
    for(var i=0;i<this.enemies.length;i++){
      var e=this.enemies[i],dx=e.x-p.x,dy=e.y-p.y,d=Math.sqrt(dx*dx+dy*dy)
      if(d<minD){minD=d;nearest=e}
    }
    if(!nearest) return
    var dx=nearest.x-p.x,dy=nearest.y-p.y,d=Math.sqrt(dx*dx+dy*dy)
    var spd=350
    for(var c=0;c<w.count;c++){
      var spread=(c-Math.floor(w.count/2))*0.15
      var ax=Math.atan2(dy,dx)+spread
      this.projectiles.push({x:p.x,y:p.y,vx:Math.cos(ax)*spd,vy:Math.sin(ax)*spd,dmg:w.dmg,life:0.9,type:'bolt'})
    }
  },

  // ── 闪电链
  _weaponLightning: function(w) {
    var p=this.player, targets=[], last={x:p.x,y:p.y}
    for(var c=0;c<w.count;c++){
      var best=null, bestD=w.range
      for(var i=0;i<this.enemies.length;i++){
        var e=this.enemies[i]; if(targets.indexOf(i)>=0) continue
        var dx=e.x-last.x,dy=e.y-last.y,d=Math.sqrt(dx*dx+dy*dy)
        if(d<bestD){bestD=d;best=i}
      }
      if(best===null) break
      targets.push(best)
      var te=this.enemies[best]
      this._lightnings.push({x1:last.x,y1:last.y,x2:te.x,y2:te.y,life:0.25})
      this._damageEnemy(best, w.dmg)
      last={x:te.x,y:te.y}
    }
  },

  // ── 冰冻光环 — squared distance
  _weaponAura: function(w) {
    var p=this.player, r2=w.range*w.range
    for(var i=0;i<this.enemies.length;i++){
      var e=this.enemies[i],dx=e.x-p.x,dy=e.y-p.y
      if(dx*dx+dy*dy<r2){
        this._damageEnemy(i, w.dmg)
        e._slowed=1.5 // 减速1.5秒
      }
    }
    if(this.boss){var dx=this.boss.x-p.x,dy=this.boss.y-p.y;if(dx*dx+dy*dy<r2)this._damageBoss(w.dmg)}
  },

  // ── 火焰圈
  _weaponRing: function(w) {
    var p=this.player
    this._rings.push({x:p.x,y:p.y,r:20,maxR:w.range,dmg:w.dmg,hit:{},follow:true})
    _spawnP(p.x,p.y,'#e74c3c',8)
  },

  _updateRings: function(dt) {
    var p=this.player
    for(var ri=this._rings.length-1;ri>=0;ri--){
      var rr=this._rings[ri]; rr.r+=200*dt
      // 跟随玩家
      if(rr.follow){rr.x=p.x;rr.y=p.y}
      // 检测碰撞
      for(var i=this.enemies.length-1;i>=0;i--){
        var e=this.enemies[i]
        if(!e||rr.hit[i]) continue
        var dx=e.x-rr.x,dy=e.y-rr.y,d=Math.sqrt(dx*dx+dy*dy)
        if(Math.abs(d-rr.r)<25){rr.hit[i]=true;this._damageEnemy(i,rr.dmg)}
      }
      if(this.boss&&!rr.hit['boss']){var dx=this.boss.x-rr.x,dy=this.boss.y-rr.y;if(Math.abs(Math.sqrt(dx*dx+dy*dy)-rr.r)<30){rr.hit['boss']=true;this._damageBoss(rr.dmg)}}
      if(rr.r>rr.maxR) this._rings.splice(ri,1)
    }
  },

  _updateLightnings: function(dt) {
    for(var i=this._lightnings.length-1;i>=0;i--){this._lightnings[i].life-=dt;if(this._lightnings[i].life<=0){this._lightnings[i]=this._lightnings[this._lightnings.length-1];this._lightnings.pop()}}
  },

  // ── 回旋镖
  _weaponBoomerang: function(w) {
    var p=this.player
    for(var c=0;c<w.count;c++){
      var a=Math.random()*Math.PI*2
      this._boomerangs.push({x:p.x,y:p.y,ox:p.x,oy:p.y,
        vx:Math.cos(a)*300,vy:Math.sin(a)*300,
        dmg:w.dmg,life:0,maxLife:1.2,returning:false,hit:{}})
    }
  },
  _updateBoomerangs: function(dt) {
    var p=this.player
    for(var i=this._boomerangs.length-1;i>=0;i--){
      var b=this._boomerangs[i]; b.life+=dt
      if(b.life>b.maxLife*0.5&&!b.returning){b.returning=true;b.hit={}}
      if(b.returning){
        var dx=p.x-b.x,dy=p.y-b.y,d=Math.sqrt(dx*dx+dy*dy)
        if(d>1){b.vx=dx/d*350;b.vy=dy/d*350}
        if(d<30){this._boomerangs.splice(i,1);continue}
      }
      b.x+=b.vx*dt;b.y+=b.vy*dt
      for(var ei=this.enemies.length-1;ei>=0;ei--){
        if(b.hit[ei])continue
        var e=this.enemies[ei],edx=b.x-e.x,edy=b.y-e.y
        if(edx*edx+edy*edy<25*25){b.hit[ei]=true;this._damageEnemy(ei,b.dmg)}
      }
      if(this.boss&&!b.hit['boss']){var bdx=b.x-this.boss.x,bdy=b.y-this.boss.y;if(bdx*bdx+bdy*bdy<50*50){b.hit['boss']=true;this._damageBoss(b.dmg)}}
    }
  },

  // ── 陨石（优先砸怪物位置）
  _weaponMeteor: function(w) {
    var p=this.player
    // 收集附近的怪物，按距离排序
    var targets=[]
    for(var i=0;i<this.enemies.length;i++){
      var e=this.enemies[i],dx=e.x-p.x,dy=e.y-p.y
      targets.push({x:e.x,y:e.y,dist:dx*dx+dy*dy})
    }
    if(this.boss){var bdx=this.boss.x-p.x,bdy=this.boss.y-p.y;targets.push({x:this.boss.x,y:this.boss.y,dist:bdx*bdx+bdy*bdy})}
    targets.sort(function(a,b){return a.dist-b.dist})
    for(var c=0;c<w.count;c++){
      var tx,ty
      if(c<targets.length){
        // 砸怪物位置，加小范围偏移
        tx=targets[c].x+(Math.random()-0.5)*20
        ty=targets[c].y+(Math.random()-0.5)*20
      } else {
        // 多出来的随机砸玩家周围
        tx=p.x+(Math.random()-0.5)*w.range*2
        ty=p.y+(Math.random()-0.5)*w.range*2
      }
      this._meteors.push({x:tx,y:ty,delay:0.6+c*0.3,r:0,maxR:60,dmg:w.dmg,phase:'warn'})
    }
  },
  _updateMeteors: function(dt) {
    for(var i=this._meteors.length-1;i>=0;i--){
      var m=this._meteors[i]
      if(m.phase==='warn'){m.delay-=dt;if(m.delay<=0){m.phase='explode';m.r=0;_spawnP(m.x,m.y,'#ff6600',6)}}
      else if(m.phase==='explode'){
        m.r+=300*dt
        for(var ei=this.enemies.length-1;ei>=0;ei--){
          var e=this.enemies[ei],dx=e.x-m.x,dy=e.y-m.y
          if(dx*dx+dy*dy<m.r*m.r){this._damageEnemy(ei,m.dmg*dt*3)}
        }
        if(this.boss){var bdx=this.boss.x-m.x,bdy=this.boss.y-m.y;if(bdx*bdx+bdy*bdy<m.r*m.r)this._damageBoss(m.dmg*dt*3)}
        if(m.r>=m.maxR){this._meteors.splice(i,1)}
      }
    }
  },

  // ── 护盾球（旋转护盾，和orbit类似但更大更慢）
  _weaponShield: function(w) {
    var p=this.player,t=this.elapsed
    for(var k=0;k<w.count;k++){
      var a=t*1.8+k*(Math.PI*2/w.count)
      var ox=p.x+Math.cos(a)*w.range,oy=p.y+Math.sin(a)*w.range
      for(var i=this.enemies.length-1;i>=0;i--){
        var e=this.enemies[i],dx=ox-e.x,dy=oy-e.y
        if(dx*dx+dy*dy<20*20){
          this._damageEnemy(i,w.dmg*0.05)
          // 推开敌人
          var d=Math.sqrt(dx*dx+dy*dy)||1
          e.x-=(dx/d)*3;e.y-=(dy/d)*3
        }
      }
    }
  },

  // ── 吸血刃
  _weaponVampire: function(w) {
    var p=this.player,hitAny=false
    for(var i=this.enemies.length-1;i>=0;i--){
      var e=this.enemies[i],dx=e.x-p.x,dy=e.y-p.y
      if(dx*dx+dy*dy<w.range*w.range){
        this._damageEnemy(i,w.dmg);hitAny=true
        _spawnP(e.x,e.y,'#e74c3c',3)
      }
    }
    if(this.boss){var bdx=this.boss.x-p.x,bdy=this.boss.y-p.y;if(bdx*bdx+bdy*bdy<w.range*w.range){this._damageBoss(w.dmg);hitAny=true}}
    // 挥砍视觉特效
    this._vampSlash = { time: this.elapsed, range: w.range, hit: hitAny }
    if(hitAny){
      var heal=Math.ceil(w.dmg*0.3)
      p.hp=Math.min(p.maxHp,p.hp+heal)
      _spawnP(p.x,p.y,'#2ecc71',3)
    }
  },

  // ── 龙卷风（自动瞄准最近怪物）
  _weaponTornado: function(w) {
    var p=this.player
    // 找最近的敌人
    var nearest=null, nearDist=Infinity
    for(var i=0;i<this.enemies.length;i++){
      var e=this.enemies[i]
      var ex=e.x-p.x, ey=e.y-p.y
      var dist=ex*ex+ey*ey
      if(dist<nearDist){nearDist=dist;nearest=e}
    }
    var dx,dy
    if(nearest){
      dx=nearest.x-p.x; dy=nearest.y-p.y
    } else {
      // 没有怪物时用摇杆方向
      var js=this.joystick
      dx=js&&js.active?js.dx:0; dy=js&&js.active?js.dy:1
    }
    var d=Math.sqrt(dx*dx+dy*dy)||1
    this._tornadoes.push({x:p.x,y:p.y,vx:(dx/d)*250,vy:(dy/d)*250,
      dmg:w.dmg,life:0.8,range:w.range,hit:{}})
  },
  _updateTornadoes: function(dt) {
    for(var i=this._tornadoes.length-1;i>=0;i--){
      var t=this._tornadoes[i];t.x+=t.vx*dt;t.y+=t.vy*dt;t.life-=dt
      if(t.life<=0){this._tornadoes.splice(i,1);continue}
      for(var ei=this.enemies.length-1;ei>=0;ei--){
        var e=this.enemies[ei],dx=e.x-t.x,dy=e.y-t.y
        if(dx*dx+dy*dy<40*40){
          if(!t.hit[ei]){t.hit[ei]=true;this._damageEnemy(ei,t.dmg)}
          // 推开
          var d2=Math.sqrt(dx*dx+dy*dy)||1
          e.x+=(dx/d2)*5;e.y+=(dy/d2)*5
        }
      }
      if(this.boss){var bdx=this.boss.x-t.x,bdy=this.boss.y-t.y;if(bdx*bdx+bdy*bdy<50*50&&!t.hit['boss']){t.hit['boss']=true;this._damageBoss(t.dmg)}}
    }
  },

  // ── 毒雾
  _weaponPoison: function(w) {
    var p=this.player
    for(var c=0;c<w.count;c++){
      var a=Math.random()*Math.PI*2,d=30+Math.random()*60
      this._poisonZones.push({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,
        r:w.range,dmg:w.dmg,life:4,maxLife:4})
    }
  },
  _updatePoison: function(dt) {
    for(var i=this._poisonZones.length-1;i>=0;i--){
      var pz=this._poisonZones[i];pz.life-=dt
      if(pz.life<=0){this._poisonZones.splice(i,1);continue}
      for(var ei=0;ei<this.enemies.length;ei++){
        var e=this.enemies[ei],dx=e.x-pz.x,dy=e.y-pz.y
        if(dx*dx+dy*dy<pz.r*pz.r){
          this._damageEnemy(ei,pz.dmg*dt)
          e._slowed=0.5
        }
      }
      if(this.boss){var bdx=this.boss.x-pz.x,bdy=this.boss.y-pz.y;if(bdx*bdx+bdy*bdy<pz.r*pz.r)this._damageBoss(pz.dmg*dt)}
    }
  },

  // ── 伤害敌人
  _damageEnemy: function(idx, dmg) {
    var e=this.enemies[idx]; if(!e) return
    // 攻击加成
    var bonusPct = (this.player._dmgBonus||0) / 100
    var actualDmg = dmg * (1 + bonusPct)
    e.hp-=actualDmg; e._flashTimer=0.1
    if(e.hp<=0){
      // 死亡 — 经验加成
      var xpMult = 1 + (this.player._xpBonus||0) / 100
      this.player.xp+=Math.floor(e.maxHp * xpMult); this.player.kills++; this.player.dmgDealt+=e.maxHp
      _spawnP(e.x,e.y,'#f39c12',5)
      GameGlobal.Sound.play('merge')
      // 分裂怪
      if(e.type==='split'&&e.maxHp>=6){
        var hh=Math.floor(e.maxHp/2)
        var _ps3=GameGlobal.SurvivalSprites?GameGlobal.SurvivalSprites.pickMonsterSprite:null
        for(var s=0;s<2;s++) this.enemies.push({x:e.x+(Math.random()-0.5)*40,y:e.y+(Math.random()-0.5)*40,hp:hh,maxHp:hh,type:'walker',speed:ENEMY_TYPES.walker.speed,spriteType:_ps3?_ps3('walker'):null})
      }
      this.enemies.splice(idx,1)
      this._checkLevelUp()
    }
  },

  _damageBoss: function(dmg) {
    if(!this.boss) return
    this.boss.hp-=dmg; this.boss._flashTimer=0.1
    if(this.boss.hp<=0){
      _spawnP(this.boss.x,this.boss.y,'#f39c12',30)
      this.boss=null; this.victory=true; this.gameOver=true; this.running=false
      GameGlobal.Sound.play('win'); this._saveResult()
    }
  },

  // ── 投射物
  _updateProjectiles: function(dt) {
    var p=this.player
    for(var i=this.projectiles.length-1;i>=0;i--){
      var pr=this.projectiles[i]
      pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.life-=dt
      if(pr.life<=0){this.projectiles[i]=this.projectiles[this.projectiles.length-1];this.projectiles.pop();continue}

      if(pr.targets==='player') {
        // Boss弹幕 → 碰撞玩家
        var pdx=pr.x-p.x, pdy=pr.y-p.y
        if(pdx*pdx+pdy*pdy < 20*20 && p._iFrames<=0) {
          p.hp-=pr.dmg; p._iFrames=0.5
          _spawnP(p.x,p.y,'#ff4444',3)
          this.projectiles[i]=this.projectiles[this.projectiles.length-1];this.projectiles.pop()
          continue
        }
      } else {
        // 玩家弹幕 → 碰撞敌人
        for(var ei=this.enemies.length-1;ei>=0;ei--){
          var e=this.enemies[ei],dx=pr.x-e.x,dy=pr.y-e.y
          var hitR=_enemyRadius(e.type)+6
          if(dx*dx+dy*dy<hitR*hitR){
            this._damageEnemy(ei,pr.dmg)
            this.projectiles[i]=this.projectiles[this.projectiles.length-1];this.projectiles.pop();break
          }
        }
      }
    }
  },

  // ── 敌人AI
  _updateEnemies: function(dt) {
    var p=this.player
    for(var i=this.enemies.length-1;i>=0;i--){
      var e=this.enemies[i]
      if(e._slowed&&e._slowed>0) e._slowed-=dt
      if(e._stunTimer&&e._stunTimer>0){e._stunTimer-=dt;continue}  // 被击退后停顿
      var dx=p.x-e.x,dy=p.y-e.y,dist=Math.sqrt(dx*dx+dy*dy)
      if(dist<1) continue
      var nx=dx/dist,ny=dy/dist, spd=e.speed
      if(e._slowed&&e._slowed>0) spd*=0.4
      if(e.type==='dash'&&dist<(ENEMY_TYPES.dash.dashRange||150)) spd=ENEMY_TYPES.dash.dashSpeed
      // 到达攻击距离后不再前进（防止贴脸）
      var atkDist = _enemyRadius(e.type) + 18
      if(dist > atkDist) {
        e.x+=nx*spd*dt; e.y+=ny*spd*dt
      }
      // 怪物之间互推（防止重叠成一坨）— skip distant pairs with Manhattan check
      var er = _enemyRadius(e.type)
      var maxPushDist = er + 24 + 2  // max possible minD (er + tank radius 24 + margin)
      for(var j=i-1;j>=0;j--){
        var e2=this.enemies[j]
        // Quick Manhattan distance reject
        var edx=e.x-e2.x,edy=e.y-e2.y
        if(edx>maxPushDist||edx<-maxPushDist||edy>maxPushDist||edy<-maxPushDist) continue
        var edist2=edx*edx+edy*edy
        var minD=er+_enemyRadius(e2.type)
        var minD2=minD*minD
        if(edist2<minD2&&edist2>0.01){
          var edist=Math.sqrt(edist2)
          var push=(minD-edist)*0.3
          e.x+=edx/edist*push; e.y+=edy/edist*push
          e2.x-=edx/edist*push; e2.y-=edy/edist*push
        }
      }
      if(e._flashTimer&&e._flashTimer>0) e._flashTimer-=dt
      if(Math.abs(e.x-p.x)+Math.abs(e.y-p.y)>1200) this.enemies.splice(i,1)
    }
  },

  // ── 玩家碰敌人=受伤 + 击退
  _applyDmgToPlayer: function(rawDmg) {
    var armor = this.player._armor || 0
    return Math.max(1, Math.ceil(rawDmg * (1 - armor/100)))
  },

  _checkPlayerHit: function() {
    var p=this.player; if(p._iFrames>0) return
    for(var i=0;i<this.enemies.length;i++){
      var e=this.enemies[i],dx=p.x-e.x,dy=p.y-e.y
      var hitR=22+_enemyRadius(e.type)-4
      if(dx*dx+dy*dy<hitR*hitR){
        var dmg=this._applyDmgToPlayer(Math.max(1, Math.ceil(e.hp*0.5)))
        p.hp-=dmg; p._iFrames=0.8
        _spawnP(p.x,p.y,'#e74c3c',6)
        break
      }
    }
    // Boss
    if(this.boss&&p._iFrames<=0){
      var b=this.boss,dx=p.x-b.x,dy=p.y-b.y
      if(dx*dx+dy*dy<67*67){
        p.hp-=20;p._iFrames=0.8;_spawnP(p.x,p.y,'#e74c3c',10)
      }
    }
  },

  // ── 升级
  _checkLevelUp: function() {
    var p=this.player; if(p.level>=MAX_LEVEL) return
    var needed=LEVEL_XP[p.level]||(p.level*p.level*50)
    if(p.xp>=needed){p.xp-=needed;p.level++;this.levelUp=true;this._genWeaponChoices()}
  },

  _genWeaponChoices: function() {
    var choices=[], owned={}
    for(var i=0;i<this.weapons.length;i++) owned[this.weapons[i].id]=this.weapons[i]

    // 已有武器升级选项
    for(var id in owned){
      if(owned[id].level<5) choices.push({type:'upgrade',id:id,w:owned[id]})
    }
    // 新武器选项
    for(var id in WEAPON_DEFS){
      if(!owned[id]) choices.push({type:'new',id:id})
    }
    // 特殊选项
    choices.push({type:'heal',id:'heal'})
    choices.push({type:'speed',id:'speed'})

    // 随机3个
    choices.sort(function(){return Math.random()-0.5})
    this.weaponChoices=choices.slice(0,3)
  },

  selectWeapon: function(idx) {
    if(!this.levelUp||idx<0||idx>=this.weaponChoices.length) return
    var ch=this.weaponChoices[idx], p=this.player
    if(ch.type==='new') this._addWeapon(ch.id)
    else if(ch.type==='upgrade'){
      var w=ch.w; w.level++
      var def=WEAPON_DEFS[w.id]; if(def&&def.upgrade) def.upgrade(w)
    }
    else if(ch.type==='heal') { p.hp=Math.min(p.maxHp, p.hp+30) }
    else if(ch.type==='speed') { p.speed+=30 }
    this.levelUp=false; this.weaponChoices=[]
  },

  // ── 生成
  _spawnEnemy: function() {
    var p=this.player,a=Math.random()*Math.PI*2,d=SPAWN_DIST+Math.random()*200
    var x=p.x+Math.cos(a)*d
    var y=p.y+Math.sin(a)*d
    var type=_pickType(this.elapsed), hp=_pickEnemyHP(this.elapsed)
    if(type==='tank') hp=Math.floor(hp*2.5)
    if(type==='swarm') hp=Math.max(1,Math.floor(hp*0.4))
    var _pickSprite2 = GameGlobal.SurvivalSprites ? GameGlobal.SurvivalSprites.pickMonsterSprite : null
    this.enemies.push({x:x,y:y,hp:hp,maxHp:hp,type:type,speed:ENEMY_TYPES[type].speed,spriteType:_pickSprite2?_pickSprite2(type):null})
  },

  _spawnElite: function() {
    var p=this.player,a=Math.random()*Math.PI*2
    var _ps=GameGlobal.SurvivalSprites?GameGlobal.SurvivalSprites.pickMonsterSprite:null
    var n=this._eliteCount||0
    // 3种精英怪轮流出现，随次数增强
    var eliteTypes=[
      {type:'tank',  hp:150+n*40, speed:28+n*1.5, size:1.6, color:'#e74c3c', name:'重甲'},   // 高血高防
      {type:'dash',  hp:100+n*25, speed:60+n*3,   size:1.3, color:'#9b59b6', name:'疾风'},   // 高速冲刺
      {type:'split', hp:120+n*30, speed:35+n*2,   size:1.5, color:'#f39c12', name:'裂变'},   // 死后分裂更多
    ]
    var elite=eliteTypes[n%3]
    var ex=p.x+Math.cos(a)*450,ey=p.y+Math.sin(a)*450
    this.enemies.push({
      x:ex,y:ey,hp:elite.hp,maxHp:elite.hp,
      type:elite.type,speed:elite.speed,
      spriteType:_ps?_ps(elite.type):null,
      isElite:true,           // 标记为精英
      eliteSize:elite.size,   // 放大倍数
      eliteColor:elite.color, // 光环颜色
      eliteName:elite.name    // 名称
    })
  },

  _spawnBoss: function() {
    var p=this.player
    this.boss={
      x:p.x+500, y:p.y, hp:800, maxHp:800, speed:22,
      _spawnTimer:0, _flashTimer:0,
      // 阶段系统
      phase:1,           // 1=普通, 2=狂暴(50%HP), 3=绝望(25%HP)
      // 冲刺攻击
      _chargeCD:0, _charging:false, _chargeDir:{x:0,y:0},
      _chargeSpeed:0, _chargeDur:0, _chargeWarn:0,
      // 范围冲击波
      _waveCD:0,
      // 弹幕
      _bulletCD:0,
      // 召唤
      _summonCD:0
    }
  },

  _updateBoss: function(dt) {
    var b=this.boss, p=this.player
    var dx=p.x-b.x, dy=p.y-b.y
    var dist2=dx*dx+dy*dy, dist=Math.sqrt(dist2)
    if(b._flashTimer>0) b._flashTimer-=dt

    // ── 阶段切换
    var hpRatio = b.hp / b.maxHp
    if(hpRatio<=0.25 && b.phase<3) {
      b.phase=3; b.speed=35
      // 绝望阶段：全屏警告 + 爆发召唤
      this._bossWarn='绝望狂暴！'; this._bossWarnT=2
      for(var i=0;i<5;i++) this._bossSpawnMinion(b, true)
    } else if(hpRatio<=0.5 && b.phase<2) {
      b.phase=2; b.speed=28
      this._bossWarn='Boss 狂暴化！'; this._bossWarnT=2
    }

    // ── 冲刺攻击
    b._chargeCD+=dt
    var chargeInterval = b.phase>=3 ? 3 : (b.phase>=2 ? 5 : 7)
    if(b._charging) {
      // 蓄力阶段
      if(b._chargeWarn>0) {
        b._chargeWarn-=dt
        if(b._chargeWarn<=0) {
          // 开始冲刺
          b._chargeSpeed = b.phase>=3 ? 600 : (b.phase>=2 ? 450 : 350)
          b._chargeDur = 0.5
        }
        return // 蓄力时不移动
      }
      // 冲刺移动
      b.x += b._chargeDir.x * b._chargeSpeed * dt
      b.y += b._chargeDir.y * b._chargeSpeed * dt
      b._chargeDur -= dt
      // 冲刺碰撞检测
      var cdx=p.x-b.x, cdy=p.y-b.y
      if(cdx*cdx+cdy*cdy < 45*45) {
        var dmg = b.phase>=3 ? 25 : (b.phase>=2 ? 18 : 12)
        if(p._iFrames<=0) { p.hp-=dmg; p._iFrames=0.8; _spawnP(p.x,p.y,'#e74c3c',5) }
      }
      if(b._chargeDur<=0) { b._charging=false; b._chargeCD=0 }
      return
    }
    if(b._chargeCD>=chargeInterval && dist<400) {
      // 开始蓄力
      b._charging=true
      b._chargeWarn=0.8  // 0.8秒蓄力警告
      var nd=dist>1?dist:1
      b._chargeDir={x:dx/nd, y:dy/nd}
      b._chargeCD=0
    }

    // ── 普通追踪移动
    if(dist>1){b.x+=(dx/dist)*b.speed*dt; b.y+=(dy/dist)*b.speed*dt}

    // ── 范围冲击波
    b._waveCD+=dt
    var waveInterval = b.phase>=3 ? 2.5 : (b.phase>=2 ? 4 : 6)
    if(b._waveCD>=waveInterval) {
      b._waveCD=0
      var waveR = b.phase>=3 ? 200 : (b.phase>=2 ? 160 : 120)
      // 用 _rings 系统显示冲击波
      this._rings.push({x:b.x, y:b.y, r:0, maxR:waveR, dmg:0, isBossWave:true})
      // 对玩家造成伤害（在范围内）
      if(dist<waveR && p._iFrames<=0) {
        var waveDmg = b.phase>=3 ? 15 : (b.phase>=2 ? 10 : 6)
        p.hp-=waveDmg; p._iFrames=0.5; _spawnP(p.x,p.y,'#ff6600',4)
      }
    }

    // ── 弹幕攻击
    b._bulletCD+=dt
    var bulletInterval = b.phase>=3 ? 1.5 : (b.phase>=2 ? 2.5 : 4)
    if(b._bulletCD>=bulletInterval) {
      b._bulletCD=0
      var numBullets = b.phase>=3 ? 12 : (b.phase>=2 ? 8 : 5)
      var bulletDmg = b.phase>=3 ? 10 : (b.phase>=2 ? 7 : 5)
      for(var bi=0;bi<numBullets;bi++) {
        var ba = (bi/numBullets)*Math.PI*2 + this.elapsed*0.5  // 旋转偏移
        var bvx=Math.cos(ba)*200, bvy=Math.sin(ba)*200
        this.projectiles.push({
          x:b.x, y:b.y, vx:bvx, vy:bvy,
          dmg:bulletDmg, life:2, type:'bossBullet',
          targets:'player', r:6
        })
      }
    }

    // ── 召唤小怪
    b._summonCD+=dt
    var summonInterval = b.phase>=3 ? 3 : (b.phase>=2 ? 5 : 8)
    if(b._summonCD>=summonInterval) {
      b._summonCD=0
      var summonCount = b.phase>=3 ? 4 : (b.phase>=2 ? 3 : 2)
      var summonElite = b.phase>=3  // 绝望阶段召唤精英
      for(var si=0;si<summonCount;si++) this._bossSpawnMinion(b, summonElite)
    }
  },

  _bossSpawnMinion: function(b, isElite) {
    var hp = isElite ? 40 : (8+Math.floor(this.elapsed/60)*2)
    var spd = isElite ? 50 : ENEMY_TYPES.walker.speed
    var _ps5=GameGlobal.SurvivalSprites?GameGlobal.SurvivalSprites.pickMonsterSprite:null
    var type = isElite ? 'dash' : 'walker'
    var e = {
      x:b.x+(Math.random()-0.5)*120, y:b.y+(Math.random()-0.5)*120,
      hp:hp, maxHp:hp, type:type, speed:spd,
      spriteType:_ps5?_ps5(type):null
    }
    if(isElite) {
      e.isElite=true; e.eliteSize=1.3; e.eliteColor='#e74c3c'; e.eliteName='守卫'
    }
    if(this.enemies.length<this.maxEnemies+10) this.enemies.push(e)
  },

  // ── 食物掉落系统
  _updateFood: function(dt) {
    var p = this.player

    // Spawn timer: every 20-30 seconds
    this._foodTimer += dt
    var spawnInterval = 20 + Math.random() * 10
    if (this._foodTimer >= spawnInterval && this.foodItems.length < 3) {
      this._foodTimer = 0
      // Spawn near player (100-300px away)
      var a = Math.random() * Math.PI * 2
      var d = 100 + Math.random() * 200
      var fx = p.x + Math.cos(a) * d
      var fy = p.y + Math.sin(a) * d
      // Pick food type by weight: apple 60%, bread 30%, chicken_leg 10%
      var roll = Math.random()
      var foodType = roll < 0.6 ? 0 : (roll < 0.9 ? 1 : 2)
      this.foodItems.push({ x: fx, y: fy, type: foodType, age: 0 })
    }

    // Update food items
    for (var i = this.foodItems.length - 1; i >= 0; i--) {
      var f = this.foodItems[i]
      f.age += dt

      // Despawn after 15 seconds
      if (f.age >= 15) {
        this.foodItems.splice(i, 1)
        continue
      }

      // Pickup check: distance < 30px
      var dx = p.x - f.x, dy = p.y - f.y
      var dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 30) {
        // Heal based on type: apple +10, bread +25, chicken_leg +50
        var healAmount = f.type === 0 ? 10 : (f.type === 1 ? 25 : 50)
        p.hp = Math.min(p.maxHp, p.hp + healAmount)
        GameGlobal.Sound.play('click')
        _spawnP(f.x, f.y, '#2ecc71', 8)
        this.foodItems.splice(i, 1)
      }
    }
  },

  _checkWaves: function() {
    var t=this.elapsed,waves=[180,300,420]
    for(var i=0;i<waves.length;i++){if(t>=waves[i]&&t<waves[i]+20&&!this._waveActive){this._waveActive=true;this._waveEnd=waves[i]+20}}
    if(this._waveActive&&t>=this._waveEnd) this._waveActive=false
  },

  _saveResult: function() {
    var p=this.player,best=wx.getStorageSync('survivalBest')||0
    var score=p.kills
    if(score>best) wx.setStorageSync('survivalBest',score)
    var info=wx.getStorageSync('userInfo')||{}
    wx.cloud.callFunction({name:'leaderboard',data:{action:'upload',type:'survival',nickname:info.nickName||'神秘玩家',avatarUrl:info.avatarUrl||'',score:score,time:Math.floor(this.elapsed)},fail:function(){}})

    // 结算金币奖励
    var killCoins = Math.floor(p.kills * 0.1)
    var timeCoins = Math.floor(this.elapsed / 60) * 2
    var lvCoins = p.level - 1
    var bossCoins = this.victory ? 30 : 0
    this._lastReward = {
      kills: p.kills, time: Math.floor(this.elapsed),
      level: p.level, won: this.victory,
      coinKills: killCoins, coinTime: timeCoins,
      coinLevel: lvCoins, coinBoss: bossCoins,
      coinTotal: 5 + killCoins + timeCoins + lvCoins + bossCoins
    }
    if(GameGlobal.AchieveShop) {
      GameGlobal.AchieveShop.onGameEvent('survival_play', {
        kills:p.kills, time:Math.floor(this.elapsed),
        level:p.level, won:this.victory
      })
    }
  },

  // 摇杆
  joystickStart:function(x,y){this.joystick={active:true,baseX:x,baseY:y,stickX:x,stickY:y,dx:0,dy:0}},
  joystickMove:function(x,y){
    var js=this.joystick;if(!js.active)return
    var dx=x-js.baseX,dy=y-js.baseY,dist=Math.sqrt(dx*dx+dy*dy),maxR=50
    if(dist>maxR){dx=dx/dist*maxR;dy=dy/dist*maxR}
    js.stickX=js.baseX+dx;js.stickY=js.baseY+dy
    if(dist>8){var n=Math.sqrt(dx*dx+dy*dy);js.dx=dx/n;js.dy=dy/n}else{js.dx=0;js.dy=0}
  },
  joystickEnd:function(){this.joystick.active=false;this.joystick.dx=0;this.joystick.dy=0},

  enemyRadius:_enemyRadius,
  MAP_W:MAP_W, MAP_H:MAP_H, GRID_SIZE:GRID_SIZE, GAME_DURATION:GAME_DURATION,
  WEAPON_DEFS:WEAPON_DEFS
}