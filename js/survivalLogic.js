// ================================================
//  survivalLogic.js v4 — 数字生存（吸血鬼幸存者版）
//  武器自动攻击，敌人数字=血量，打到0消灭
// ================================================
var SW = GameGlobal.SW, SH = GameGlobal.SH
var MAP_W = 3000, MAP_H = 3000, GRID_SIZE = 80
var BASE_SPEED = 160, SPAWN_DIST = 480, GAME_DURATION = 600, MAX_LEVEL = 20

var LEVEL_XP = [0,25,60,110,180,270,380,510,660,830,1020,1230,1460,1710,1980,2270,2580,2910,3260,3630]

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
  for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,sp=40+Math.random()*120
    _particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.35+Math.random()*0.25,age:0,color:color,r:2+Math.random()*3})}
}
function _updateP(dt) {
  for(var i=_particles.length-1;i>=0;i--){var p=_particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.94;p.vy*=0.94;if(p.age>=p.life)_particles.splice(i,1)}
}

// ================================================
//  武器定义
// ================================================
var WEAPON_DEFS = {
  orbit: {
    name:'旋转飞刀', desc:'数字环绕你旋转', icon:'🔪',
    baseDmg:3, baseCD:0, count:2, range:60,
    upgrade: function(w) { w.count++; w.dmg+=1 }
  },
  bolt: {
    name:'能量弹', desc:'自动射击最近敌人', icon:'🔮',
    baseDmg:5, baseCD:0.8, count:1, range:300,
    upgrade: function(w) { w.dmg+=3; w.cd*=0.85 }
  },
  lightning: {
    name:'闪电链', desc:'连锁闪电弹跳伤害', icon:'⚡',
    baseDmg:4, baseCD:2.5, count:3, range:250,
    upgrade: function(w) { w.dmg+=2; w.count+=1 }
  },
  aura: {
    name:'冰冻光环', desc:'减速并持续伤害', icon:'❄',
    baseDmg:2, baseCD:0.5, count:1, range:55,
    upgrade: function(w) { w.dmg+=1; w.range+=20 }
  },
  ring: {
    name:'火焰圈', desc:'周期性火焰扩散', icon:'🔥',
    baseDmg:8, baseCD:3.0, count:1, range:180,
    upgrade: function(w) { w.dmg+=4; w.cd*=0.88 }
  }
}

// ================================================
//  主模块
// ================================================
GameGlobal.Survival = {
  running:false, paused:false, gameOver:false, victory:false,
  player:null, enemies:[], maxEnemies:55,
  projectiles:[], // {x,y,vx,vy,dmg,life,type,targets}
  elapsed:0, _lastTick:0, _spawnTimer:0,
  _waveActive:false, _waveEnd:0,
  joystick:null, camera:{x:0,y:0},
  boss:null, eliteSpawned:false,
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
    this.levelUp=false; this.weaponChoices=[]
    this.weapons=[]; this.enemies=[]; this.projectiles=[]
    _particles.length=0; this._rings=[]; this._lightnings=[]
    this.foodItems=[]; this._foodTimer=0

    this.player = {
      x:MAP_W/2, y:MAP_H/2, hp:100, maxHp:100,
      level:1, xp:0, speed:BASE_SPEED,
      kills:0, dmgDealt:0, _trail:[], _iFrames:0,
      facingLeft:false, skin:'doux'
    }
    this.joystick={active:false,baseX:0,baseY:0,stickX:0,stickY:0,dx:0,dy:0}

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

    if(this.elapsed>=540&&!this.eliteSpawned){this.eliteSpawned=true;this._spawnElite()}
    if(this.elapsed>=GAME_DURATION&&!this.boss&&!this.victory) this._spawnBoss()
    if(this.boss) this._updateBoss(dt)

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
    }
  },

  // ── 旋转飞刀
  _weaponOrbit: function(w) {
    var p=this.player, t=this.elapsed
    for(var k=0;k<w.count;k++){
      var a = t*2.5 + k*(Math.PI*2/w.count)
      var ox = p.x+Math.cos(a)*w.range, oy = p.y+Math.sin(a)*w.range
      // 检测碰撞
      for(var i=this.enemies.length-1;i>=0;i--){
        var e=this.enemies[i], dx=ox-e.x, dy=oy-e.y
        if(Math.sqrt(dx*dx+dy*dy) < _enemyRadius(e.type)+10){
          this._damageEnemy(i, w.dmg*0.05) // 每帧小伤害（持续接触）
        }
      }
      if(this.boss){var dx=ox-this.boss.x,dy=oy-this.boss.y;if(Math.sqrt(dx*dx+dy*dy)<45) this._damageBoss(w.dmg*0.05)}
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

  // ── 冰冻光环
  _weaponAura: function(w) {
    var p=this.player
    for(var i=0;i<this.enemies.length;i++){
      var e=this.enemies[i],dx=e.x-p.x,dy=e.y-p.y
      if(Math.sqrt(dx*dx+dy*dy)<w.range){
        this._damageEnemy(i, w.dmg)
        e._slowed=1.5 // 减速1.5秒
      }
    }
    if(this.boss){var dx=this.boss.x-p.x,dy=this.boss.y-p.y;if(Math.sqrt(dx*dx+dy*dy)<w.range)this._damageBoss(w.dmg)}
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
      for(var i=0;i<this.enemies.length;i++){
        if(rr.hit[i]) continue
        var e=this.enemies[i],dx=e.x-rr.x,dy=e.y-rr.y,d=Math.sqrt(dx*dx+dy*dy)
        if(Math.abs(d-rr.r)<25){rr.hit[i]=true;this._damageEnemy(i,rr.dmg)}
      }
      if(this.boss&&!rr.hit['boss']){var dx=this.boss.x-rr.x,dy=this.boss.y-rr.y;if(Math.abs(Math.sqrt(dx*dx+dy*dy)-rr.r)<30){rr.hit['boss']=true;this._damageBoss(rr.dmg)}}
      if(rr.r>rr.maxR) this._rings.splice(ri,1)
    }
  },

  _updateLightnings: function(dt) {
    for(var i=this._lightnings.length-1;i>=0;i--){this._lightnings[i].life-=dt;if(this._lightnings[i].life<=0)this._lightnings.splice(i,1)}
  },

  // ── 伤害敌人
  _damageEnemy: function(idx, dmg) {
    var e=this.enemies[idx]; if(!e) return
    e.hp-=dmg; e._flashTimer=0.1
    if(e.hp<=0){
      // 死亡
      this.player.xp+=e.maxHp; this.player.kills++; this.player.dmgDealt+=e.maxHp
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
    for(var i=this.projectiles.length-1;i>=0;i--){
      var pr=this.projectiles[i]
      pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.life-=dt
      if(pr.life<=0){this.projectiles.splice(i,1);continue}
      // 碰撞敌人
      for(var ei=this.enemies.length-1;ei>=0;ei--){
        var e=this.enemies[ei],dx=pr.x-e.x,dy=pr.y-e.y
        if(Math.sqrt(dx*dx+dy*dy)<_enemyRadius(e.type)+6){
          this._damageEnemy(ei,pr.dmg)
          this.projectiles.splice(i,1); break
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
      // 怪物之间互推（防止重叠成一坨）
      var er = _enemyRadius(e.type)
      for(var j=i-1;j>=0;j--){
        var e2=this.enemies[j]
        var edx=e.x-e2.x,edy=e.y-e2.y,edist=Math.sqrt(edx*edx+edy*edy)
        var minD=er+_enemyRadius(e2.type)
        if(edist<minD&&edist>0.1){
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
  _checkPlayerHit: function() {
    var p=this.player; if(p._iFrames>0) return
    for(var i=0;i<this.enemies.length;i++){
      var e=this.enemies[i],dx=p.x-e.x,dy=p.y-e.y
      var dist=Math.sqrt(dx*dx+dy*dy)
      if(dist<22+_enemyRadius(e.type)-4){
        var dmg=Math.max(1, Math.ceil(e.hp*0.5))
        p.hp-=dmg; p._iFrames=0.8
        _spawnP(p.x,p.y,'#e74c3c',6)
        break
      }
    }
    // Boss
    if(this.boss&&p._iFrames<=0){
      var b=this.boss,dx=p.x-b.x,dy=p.y-b.y,dist=Math.sqrt(dx*dx+dy*dy)
      if(dist<22+45){
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
    var _ps4=GameGlobal.SurvivalSprites?GameGlobal.SurvivalSprites.pickMonsterSprite:null
    this.enemies.push({x:p.x+Math.cos(a)*400,y:p.y+Math.sin(a)*400,hp:150,maxHp:150,type:'tank',speed:18,spriteType:_ps4?_ps4('tank'):null})
  },

  _spawnBoss: function() {
    var p=this.player
    this.boss={x:p.x+500,y:p.y,hp:500,maxHp:500,speed:18,_spawnTimer:0,_flashTimer:0}
  },

  _updateBoss: function(dt) {
    var b=this.boss,p=this.player
    var dx=p.x-b.x,dy=p.y-b.y,dist=Math.sqrt(dx*dx+dy*dy)
    if(dist>1){b.x+=(dx/dist)*b.speed*dt;b.y+=(dy/dist)*b.speed*dt}
    if(b._flashTimer>0) b._flashTimer-=dt
    b._spawnTimer+=dt
    if(b._spawnTimer>=4){
      b._spawnTimer=0
      for(var i=0;i<3;i++){
        var hp=5+Math.floor(this.elapsed/60)*2
        var _ps5=GameGlobal.SurvivalSprites?GameGlobal.SurvivalSprites.pickMonsterSprite:null
        this.enemies.push({x:b.x+(Math.random()-0.5)*100,y:b.y+(Math.random()-0.5)*100,hp:hp,maxHp:hp,type:'walker',speed:ENEMY_TYPES.walker.speed,spriteType:_ps5?_ps5('walker'):null})
      }
    }
  },

  // ── 食物掉落系统
  _updateFood: function(dt) {
    var p = this.player

    // Spawn timer: every 8-12 seconds
    this._foodTimer += dt
    var spawnInterval = 8 + Math.random() * 4
    if (this._foodTimer >= spawnInterval && this.foodItems.length < 5) {
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