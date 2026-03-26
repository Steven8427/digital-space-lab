// ================================================
//  survivalRender.js v4 — 吸血鬼幸存者视觉
//  武器特效、敌人血条、玩家HP、投射物
// ================================================
var ctx=GameGlobal.ctx, SW=GameGlobal.SW, SH=GameGlobal.SH
var PAD=GameGlobal.PAD, GAP=GameGlobal.GAP
var BOARD_W=GameGlobal.BOARD_W, BOARD_X=GameGlobal.BOARD_X
var BTN_H=GameGlobal.BTN_H, C=GameGlobal.C
var roundRect=GameGlobal.roundRect, setFont=GameGlobal.setFont
var drawBg=GameGlobal.drawBg, drawBtn=GameGlobal.drawBtn, inRect=GameGlobal.inRect

var _bgStars=[]
for(var _si=0;_si<100;_si++) _bgStars.push({x:Math.random()*3000,y:Math.random()*3000,r:0.5+Math.random()*1.5,b:0.2+Math.random()*0.4})

// ── 大厅
GameGlobal.LobbySurvivalUI={startBtn:null,rankBtn:null,backBtn:null,shopBtn:null}
GameGlobal.drawLobbySurvivalScreen=function(){
  drawBg(); var cx=SW/2,L=GameGlobal.LobbySurvivalUI
  setFont(SW*0.080,'900');ctx.textAlign='center';ctx.textBaseline='middle'
  var tg=ctx.createLinearGradient(cx-SW*0.25,0,cx+SW*0.25,0)
  tg.addColorStop(0,'#e74c3c');tg.addColorStop(1,'#f39c12')
  ctx.shadowColor='rgba(231,76,60,0.5)';ctx.shadowBlur=18;ctx.fillStyle=tg
  ctx.fillText('数字生存',cx,SH*0.13);ctx.shadowBlur=0;ctx.shadowColor='transparent'

  setFont(SW*0.028,'600');ctx.fillStyle='rgba(255,255,255,0.45)'
  ctx.fillText('武器射击，生存10分钟！',cx,SH*0.19)

  var best=wx.getStorageSync('survivalBest')||0
  var cardY=SH*0.26,cardH=BTN_H*1.5
  roundRect(BOARD_X,cardY,BOARD_W,cardH,14,C.surface,'rgba(231,76,60,0.18)')
  setFont(SW*0.026,'700');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=C.textDim
  ctx.fillText('最佳击杀记录',cx,cardY+cardH*0.30)
  setFont(best>0?SW*0.055:SW*0.035,'900');ctx.fillStyle=best>0?'#e74c3c':C.textDim
  ctx.fillText(best>0?best+'击杀':'暂无记录',cx,cardY+cardH*0.62)
  // 金币显示
  var coins=GameGlobal.AchieveShop?GameGlobal.AchieveShop.coins:0
  setFont(SW*0.024,'700');ctx.fillStyle='#f1c40f'
  ctx.fillText('💰 '+coins,cx,cardY+cardH*0.88)

  var infoY=cardY+cardH+GAP*2
  setFont(SW*0.024,'600');ctx.fillStyle='rgba(255,255,255,0.35)';ctx.textAlign='center'
  ctx.fillText('🔪 武器自动攻击周围敌人',cx,infoY)
  ctx.fillText('⚠️ 碰到敌人会掉血',cx,infoY+SH*0.035)
  ctx.fillText('🏆 升级选择新武器和强化',cx,infoY+SH*0.070)

  var btnY=SH*0.56
  var bg=ctx.createLinearGradient(BOARD_X,0,BOARD_X+BOARD_W,0);bg.addColorStop(0,'#e74c3c');bg.addColorStop(1,'#f39c12')
  roundRect(BOARD_X,btnY,BOARD_W,BTN_H*1.3,16,bg)
  setFont(BTN_H*0.42,'900');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff'
  ctx.fillText('开 始 生 存',cx,btnY+BTN_H*0.65)
  L.startBtn={x:BOARD_X,y:btnY,w:BOARD_W,h:BTN_H*1.3}

  var rkY=btnY+BTN_H*1.3+GAP
  // 排行榜和商店并排
  var halfW=(BOARD_W-GAP)/2
  roundRect(BOARD_X,rkY,halfW,BTN_H,12,C.surface,'rgba(255,255,255,0.08)')
  setFont(BTN_H*0.34,'700');ctx.fillStyle=C.textLight;ctx.fillText('🏆 排行榜',BOARD_X+halfW/2,rkY+BTN_H/2)
  L.rankBtn={x:BOARD_X,y:rkY,w:halfW,h:BTN_H}

  roundRect(BOARD_X+halfW+GAP,rkY,halfW,BTN_H,12,'rgba(243,156,18,0.15)','rgba(243,156,18,0.4)')
  setFont(BTN_H*0.34,'700');ctx.fillStyle='#f39c12';ctx.fillText('💰 强化',BOARD_X+halfW+GAP+halfW/2,rkY+BTN_H/2)
  L.shopBtn={x:BOARD_X+halfW+GAP,y:rkY,w:halfW,h:BTN_H}

  var bkY=rkY+BTN_H+GAP
  roundRect(BOARD_X,bkY,BOARD_W,BTN_H*0.85,12,C.surface,'rgba(255,255,255,0.06)')
  setFont(BTN_H*0.34,'700');ctx.fillStyle=C.textDim;ctx.fillText('← 返回主页',cx,bkY+BTN_H*0.425)
  L.backBtn={x:BOARD_X,y:bkY,w:BOARD_W,h:BTN_H*0.85}
}

// ================================================
//  永久强化商店
// ================================================
var UPGRADES = [
  { id:'hp',    name:'生命上限', icon:'❤', desc:'初始HP+10',     base:100, step:10, max:200, price:50, priceStep:30 },
  { id:'speed', name:'移动速度', icon:'👟', desc:'移速+5%',       base:160, step:8,  max:240, price:60, priceStep:40 },
  { id:'dmg',   name:'攻击加成', icon:'⚔', desc:'伤害+8%',       base:0,   step:8,  max:80,  price:80, priceStep:50 },
  { id:'armor', name:'减伤护甲', icon:'🛡', desc:'受伤-5%',       base:0,   step:5,  max:40,  price:70, priceStep:45 },
  { id:'xp',    name:'经验加成', icon:'⭐', desc:'经验+10%',      base:0,   step:10, max:80,  price:40, priceStep:25 },
  { id:'regen', name:'生命恢复', icon:'💚', desc:'每10秒回1HP',   base:0,   step:1,  max:5,   price:100,priceStep:60 },
]

function _getUpgrades() {
  var data = wx.getStorageSync('survivalUpgrades') || {}
  return data
}
function _saveUpgrades(data) {
  wx.setStorageSync('survivalUpgrades', data)
}
function _getUpgradeLevel(id) {
  var data = _getUpgrades()
  return data[id] || 0
}
function _getUpgradePrice(upg, lv) {
  return upg.price + lv * upg.priceStep
}

// 应用永久升级到玩家（游戏init时调用）
GameGlobal.applySurvivalUpgrades = function(player) {
  var data = _getUpgrades()
  for (var i = 0; i < UPGRADES.length; i++) {
    var u = UPGRADES[i], lv = data[u.id] || 0
    if (lv <= 0) continue
    if (u.id === 'hp')    { player.maxHp += u.step * lv; player.hp = player.maxHp }
    if (u.id === 'speed') { player.speed += u.step * lv }
    if (u.id === 'dmg')   { player._dmgBonus = (player._dmgBonus||0) + u.step * lv }
    if (u.id === 'armor') { player._armor = (player._armor||0) + u.step * lv }
    if (u.id === 'xp')    { player._xpBonus = (player._xpBonus||0) + u.step * lv }
    if (u.id === 'regen') { player._regen = (player._regen||0) + u.step * lv }
  }
}

GameGlobal.SurvivalShopUI = { items: [], backBtn: null }
GameGlobal.drawSurvivalShopScreen = function() {
  drawBg(); var cx = SW / 2, UI = GameGlobal.SurvivalShopUI
  var coins = GameGlobal.AchieveShop ? GameGlobal.AchieveShop.coins : 0
  UI.items = []

  // 标题
  setFont(SW * 0.055, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f39c12'; ctx.fillText('永久强化', cx, SH * 0.08)
  setFont(SW * 0.028, '700'); ctx.fillStyle = '#f1c40f'
  ctx.fillText('💰 ' + coins, cx, SH * 0.125)

  var data = _getUpgrades()
  var cardH = SH * 0.09
  var startY = SH * 0.17

  for (var i = 0; i < UPGRADES.length; i++) {
    var u = UPGRADES[i]
    var lv = data[u.id] || 0
    var maxLv = Math.floor((u.max - u.base) / u.step)
    var isMax = lv >= maxLv
    var price = isMax ? 0 : _getUpgradePrice(u, lv)
    var canBuy = !isMax && coins >= price
    var cy = startY + i * (cardH + GAP * 0.6)

    // 卡片背景
    var cardColor = canBuy ? 'rgba(243,156,18,0.12)' : 'rgba(255,255,255,0.04)'
    var borderColor = canBuy ? 'rgba(243,156,18,0.3)' : 'rgba(255,255,255,0.06)'
    roundRect(BOARD_X, cy, BOARD_W, cardH, 10, cardColor, borderColor)

    // 图标
    setFont(SW * 0.040, '700'); ctx.textAlign = 'left'
    ctx.fillText(u.icon, BOARD_X + PAD, cy + cardH / 2)

    // 名称 + 描述
    setFont(SW * 0.028, '800'); ctx.fillStyle = '#fff'
    ctx.fillText(u.name, BOARD_X + PAD * 3.5, cy + cardH * 0.35)
    setFont(SW * 0.020, '600'); ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(u.desc, BOARD_X + PAD * 3.5, cy + cardH * 0.7)

    // 等级条
    var barX = BOARD_X + BOARD_W * 0.52, barW = BOARD_W * 0.18, barH = 6
    var barY = cy + cardH / 2 - barH / 2
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(barX, barY, barW, barH)
    var fillR = maxLv > 0 ? lv / maxLv : 1
    ctx.fillStyle = isMax ? '#2ecc71' : '#f39c12'; ctx.fillRect(barX, barY, barW * fillR, barH)
    setFont(SW * 0.018, '700'); ctx.textAlign = 'center'
    ctx.fillStyle = isMax ? '#2ecc71' : '#f1c40f'
    ctx.fillText(isMax ? 'MAX' : ('Lv.' + lv + '/' + maxLv), barX + barW / 2, barY + barH + SH * 0.012)

    // 购买按钮
    var btnW = BOARD_W * 0.18, btnH = cardH * 0.55
    var btnX = BOARD_X + BOARD_W - btnW - PAD, btnY2 = cy + (cardH - btnH) / 2
    if (isMax) {
      roundRect(btnX, btnY2, btnW, btnH, 8, 'rgba(46,204,113,0.2)')
      setFont(SW * 0.022, '800'); ctx.textAlign = 'center'; ctx.fillStyle = '#2ecc71'
      ctx.fillText('已满级', btnX + btnW / 2, btnY2 + btnH / 2)
    } else {
      roundRect(btnX, btnY2, btnW, btnH, 8, canBuy ? 'rgba(243,156,18,0.8)' : 'rgba(100,100,100,0.3)')
      setFont(SW * 0.022, '800'); ctx.textAlign = 'center'
      ctx.fillStyle = canBuy ? '#fff' : 'rgba(255,255,255,0.3)'
      ctx.fillText('💰' + price, btnX + btnW / 2, btnY2 + btnH / 2)
    }
    UI.items.push({ x: btnX, y: btnY2, w: btnW, h: btnH, id: u.id, price: price, canBuy: canBuy, isMax: isMax })
  }

  // 返回按钮
  var bkY = startY + UPGRADES.length * (cardH + GAP * 0.6) + GAP * 2
  roundRect(BOARD_X, bkY, BOARD_W, BTN_H * 0.85, 12, C.surface, 'rgba(255,255,255,0.06)')
  setFont(BTN_H * 0.34, '700'); ctx.textAlign = 'center'; ctx.fillStyle = C.textDim
  ctx.fillText('← 返回', cx, bkY + BTN_H * 0.425)
  UI.backBtn = { x: BOARD_X, y: bkY, w: BOARD_W, h: BTN_H * 0.85 }
}

// 商店点击处理
GameGlobal.handleSurvivalShopTap = function(x, y) {
  var UI = GameGlobal.SurvivalShopUI
  if (UI.backBtn && inRect(x, y, UI.backBtn)) {
    GameGlobal.Sound.play('click')
    GameGlobal.setScreen('lobbySurvival')
    return
  }
  for (var i = 0; i < UI.items.length; i++) {
    var item = UI.items[i]
    if (inRect(x, y, item) && item.canBuy && !item.isMax) {
      GameGlobal.Sound.play('click')
      var data = _getUpgrades()
      data[item.id] = (data[item.id] || 0) + 1
      _saveUpgrades(data)
      if (GameGlobal.AchieveShop) {
        GameGlobal.AchieveShop.coins -= item.price
        GameGlobal.AchieveShop._save()
      }
      return
    }
  }
}

// ================================================
//  游戏界面
// ================================================
GameGlobal.SurvivalUI={skillBtns:[],retryBtn:null,exitBtn:null,settingBtn:null}

GameGlobal.drawSurvivalScreen=function(){
  var S=GameGlobal.Survival; if(!S||(!S.running&&!S.gameOver)) return
  S.update()
  var cam=S.camera, p=S.player

  // Cache timestamp for this frame (avoid per-element Date.now() calls)
  _drawNow = Date.now()

  // 全局关闭平滑（像素风锐利渲染）— set once per frame
  ctx.imageSmoothingEnabled = false
  ctx.mozImageSmoothingEnabled = false
  ctx.webkitImageSmoothingEnabled = false
  ctx.msImageSmoothingEnabled = false

  // 背景 — 先填充草地基色，消除tile间隙
  ctx.fillStyle='#71d349';ctx.fillRect(0,0,SW,SH)
  // 纯绿色背景已由上方fillRect铺好，不再用tile避免格子线
  var _sprites = GameGlobal.SurvivalSprites

  // 装饰物层（花、草、石头、树）
  if (_sprites && _sprites.isLoaded()) {
    _sprites.drawDecorations(ctx, cam, SW, SH)
  }

  // 粒子
  var pts=S.particles
  for(var pi=0;pi<pts.length;pi++){var pt=pts[pi],a=1-pt.age/pt.life;var px2=pt.x-cam.x,py2=pt.y-cam.y
    ctx.beginPath();ctx.arc(px2,py2,pt.r*a,0,Math.PI*2);ctx.fillStyle=pt.color+_ah(a);ctx.fill()}

  // 火焰圈
  for(var ri=0;ri<S._rings.length;ri++){
    var rr=S._rings[ri],rx=rr.x-cam.x,ry=rr.y-cam.y
    var _fireDrawn = false
    if (_sprites && typeof _sprites.drawFireRing === 'function') {
      _fireDrawn = _sprites.drawFireRing(ctx, rx, ry, rr.r, S.elapsed)
    }
    if (!_fireDrawn) {
      ctx.beginPath();ctx.arc(rx,ry,rr.r,0,Math.PI*2)
      ctx.strokeStyle='rgba(231,76,60,'+(0.7*(1-rr.r/rr.maxR))+')';ctx.lineWidth=4;ctx.stroke()
    }
  }

  // 冰冻光环
  var hasAura=false
  for(var wi=0;wi<S.weapons.length;wi++){if(S.weapons[wi].id==='aura'){hasAura=S.weapons[wi];break}}
  if(hasAura){
    var px3=p.x-cam.x,py3=p.y-cam.y
    var _iceDrawn = false
    if (_sprites && typeof _sprites.drawIceAura === 'function') {
      _iceDrawn = _sprites.drawIceAura(ctx, px3, py3, hasAura.range, S.elapsed)
    }
    if (!_iceDrawn) {
      ctx.beginPath();ctx.arc(px3,py3,hasAura.range,0,Math.PI*2)
      ctx.fillStyle='rgba(93,173,226,0.06)';ctx.fill()
      ctx.strokeStyle='rgba(93,173,226,0.2)';ctx.lineWidth=1.5;ctx.stroke()
    }
  }

  // 毒雾区域
  for(var pzi=0;pzi<(S._poisonZones||[]).length;pzi++){
    var pz=S._poisonZones[pzi],pzx=pz.x-cam.x,pzy=pz.y-cam.y
    var pza=Math.min(1,pz.life/pz.maxLife)*0.25
    ctx.beginPath();ctx.arc(pzx,pzy,pz.r,0,Math.PI*2)
    ctx.fillStyle='rgba(100,220,60,'+pza+')';ctx.fill()
    ctx.strokeStyle='rgba(50,180,30,'+pza*1.5+')';ctx.lineWidth=2;ctx.stroke()
  }

  // 吸血刃挥砍特效
  if(S._vampSlash && S.elapsed - S._vampSlash.time < 0.3){
    var vs=S._vampSlash, va=(S.elapsed-vs.time)/0.3
    var vr=Math.max(1,vs.range*(0.5+va*0.5))
    var px4=p.x-cam.x, py4=p.y-cam.y
    ctx.beginPath()
    ctx.arc(px4,py4,vr, -Math.PI*0.3+va*Math.PI*0.5, Math.PI*0.3+va*Math.PI*0.5)
    ctx.strokeStyle=vs.hit?'rgba(231,76,60,'+(1-va)*0.8+')':'rgba(200,200,200,'+(1-va)*0.4+')'
    ctx.lineWidth=vs.hit?4:2; ctx.stroke()
    if(vs.hit){
      ctx.beginPath();ctx.arc(px4,py4,vr*0.6,0,Math.PI*2)
      ctx.fillStyle='rgba(46,204,113,'+(1-va)*0.15+')';ctx.fill()
    }
  }

  // 陨石警告+爆炸
  for(var mi=0;mi<(S._meteors||[]).length;mi++){
    var mt=S._meteors[mi],mx=mt.x-cam.x,my=mt.y-cam.y
    if(mt.phase==='warn'){
      var wa2=Math.max(0,1-mt.delay/0.6)
      ctx.beginPath();ctx.arc(mx,my,Math.max(1,mt.maxR*wa2),0,Math.PI*2)
      ctx.strokeStyle='rgba(255,100,0,'+(0.3+wa2*0.4)+')';ctx.lineWidth=2
      ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([])
    } else {
      var ea=1-mt.r/mt.maxR
      ctx.beginPath();ctx.arc(mx,my,Math.max(1,mt.r),0,Math.PI*2)
      ctx.fillStyle='rgba(255,120,0,'+ea*0.4+')';ctx.fill()
      ctx.strokeStyle='rgba(255,200,50,'+ea*0.6+')';ctx.lineWidth=3;ctx.stroke()
    }
  }

  // 回旋镖
  for(var bi=0;bi<(S._boomerangs||[]).length;bi++){
    var bm=S._boomerangs[bi],bmx=bm.x-cam.x,bmy=bm.y-cam.y
    ctx.save();ctx.translate(bmx,bmy);ctx.rotate(S.elapsed*12)
    ctx.fillStyle='#f1c40f'
    ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(12,0);ctx.lineTo(0,3);ctx.lineTo(-12,0);ctx.closePath();ctx.fill()
    ctx.strokeStyle='#e67e22';ctx.lineWidth=1.5;ctx.stroke()
    ctx.restore()
  }

  // 龙卷风
  for(var ti=0;ti<(S._tornadoes||[]).length;ti++){
    var tn=S._tornadoes[ti],tnx=tn.x-cam.x,tny=tn.y-cam.y
    var ta=tn.life/0.8
    for(var tr=0;tr<3;tr++){
      var tAngle=S.elapsed*10+tr*2.1
      var tDist=10+tr*8
      ctx.beginPath();ctx.arc(tnx+Math.cos(tAngle)*tDist,tny+Math.sin(tAngle)*tDist,Math.max(0.5,6-tr),0,Math.PI*2)
      ctx.fillStyle='rgba(200,230,255,'+ta*(0.5-tr*0.1)+')';ctx.fill()
    }
  }

  // 护盾球
  var hasShield=false
  for(var wi=0;wi<S.weapons.length;wi++){if(S.weapons[wi].id==='shield'){hasShield=S.weapons[wi];break}}
  if(hasShield){
    var shP=p, shT=S.elapsed
    for(var sk=0;sk<hasShield.count;sk++){
      var shA=shT*1.8+sk*(Math.PI*2/hasShield.count)
      var shx=shP.x+Math.cos(shA)*hasShield.range-cam.x
      var shy=shP.y+Math.sin(shA)*hasShield.range-cam.y
      ctx.beginPath();ctx.arc(shx,shy,10,0,Math.PI*2)
      ctx.fillStyle='rgba(52,152,219,0.6)';ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=2;ctx.stroke()
    }
  }

  // 敌人
  for(var i=0;i<S.enemies.length;i++){
    var e=S.enemies[i],ex=e.x-cam.x,ey=e.y-cam.y
    if(ex<-50||ex>SW+50||ey<-50||ey>SH+50) continue
    _drawEnemy(ex,ey,e)
  }

  // 食物掉落
  var _foodSpriteMap = [0, 1, 3]  // type 0=apple(idx0), 1=bread(idx1), 2=chicken_leg(idx3)
  for(var fi=0;fi<S.foodItems.length;fi++){
    var food=S.foodItems[fi]
    var fx=food.x-cam.x, fy=food.y-cam.y
    if(fx<-40||fx>SW+40||fy<-40||fy>SH+40) continue
    // Floating bob animation (sine wave on Y)
    var bobY = Math.sin(S.elapsed * 2.5 + fi * 1.7) * 4
    var drawY = fy + bobY
    // Glow/sparkle effect (no save/restore needed)
    var glowAlpha = 0.15 + Math.sin(S.elapsed * 3 + fi * 2.3) * 0.08
    ctx.beginPath(); ctx.arc(fx, drawY, 18, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(46,204,113,' + glowAlpha + ')'; ctx.fill()
    // Draw food sprite or fallback
    var foodSize = 28
    var foodIdx = _foodSpriteMap[food.type]
    var foodDrawn = false
    if (_sprites && typeof _sprites.drawFoodItem === 'function') {
      foodDrawn = _sprites.drawFoodItem(ctx, fx, drawY, foodSize, foodIdx)
    }
    if (!foodDrawn) {
      // Fallback: colored circles
      ctx.beginPath(); ctx.arc(fx, drawY, 10, 0, Math.PI * 2)
      ctx.fillStyle = food.type === 0 ? '#e74c3c' : (food.type === 1 ? '#f39c12' : '#e67e22')
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke()
    }
    // Despawn fade (last 3 seconds) — use rgba alpha instead of globalAlpha
    if (food.age > 12) {
      var fadeProgress = (food.age - 12) / 3
      ctx.beginPath(); ctx.arc(fx, drawY, 16, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(6,8,26,' + (0.6 * fadeProgress).toFixed(2) + ')'; ctx.fill()
    }
  }

  // Boss
  if(S.boss) _drawBoss(S.boss.x-cam.x,S.boss.y-cam.y,S.boss)

  // 投射物
  for(var i=0;i<S.projectiles.length;i++){
    var pr=S.projectiles[i],prx=pr.x-cam.x,pry=pr.y-cam.y
    if(prx<-30||prx>SW+30||pry<-30||pry>SH+30) continue
    if(pr.targets==='player') {
      // Boss弹幕：红色旋转弹
      var ba2=S.elapsed*8+i
      ctx.beginPath();ctx.arc(prx,pry,pr.r||6,0,Math.PI*2)
      ctx.fillStyle='#ff3333';ctx.fill()
      ctx.beginPath();ctx.arc(prx,pry,(pr.r||6)*0.5,0,Math.PI*2)
      ctx.fillStyle='#ffaa00';ctx.fill()
    } else {
      var _boltDrawn = false
      if (_sprites && typeof _sprites.drawEnergyBolt === 'function') {
        _boltDrawn = _sprites.drawEnergyBolt(ctx, prx, pry, 16, S.elapsed)
      }
      if (!_boltDrawn) {
        ctx.beginPath();ctx.arc(prx,pry,5,0,Math.PI*2)
        ctx.fillStyle='#a29bfe';ctx.fill()
        ctx.beginPath();ctx.arc(prx,pry,3,0,Math.PI*2)
        ctx.fillStyle='#fff';ctx.fill()
      }
    }
  }

  // Boss阶段警告文字
  if(S._bossWarnT && S._bossWarnT>0) {
    S._bossWarnT -= 1/60
    var wa=Math.min(1, S._bossWarnT)
    setFont(SW*0.05,'900');ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillStyle='rgba(255,50,50,'+wa+')'
    ctx.fillText(S._bossWarn||'', SW/2, SH*0.35)
  }

  // 闪电
  for(var li=0;li<S._lightnings.length;li++){
    var ln=S._lightnings[li],a2=ln.life/0.25
    var _lnDrawn = false
    if (_sprites && typeof _sprites.drawLightningVFX === 'function') {
      ctx.save()
      ctx.globalAlpha = a2
      _lnDrawn = _sprites.drawLightningVFX(ctx, ln.x1-cam.x, ln.y1-cam.y, ln.x2-cam.x, ln.y2-cam.y, S.elapsed)
      ctx.restore()
    }
    if (!_lnDrawn) {
      ctx.beginPath();ctx.moveTo(ln.x1-cam.x,ln.y1-cam.y)
      // 锯齿闪电
      var dx=ln.x2-ln.x1,dy=ln.y2-ln.y1,segs=5
      for(var si2=1;si2<=segs;si2++){
        var t=si2/segs, ox=(Math.random()-0.5)*20, oy=(Math.random()-0.5)*20
        if(si2===segs){ox=0;oy=0}
        ctx.lineTo(ln.x1+dx*t+ox-cam.x, ln.y1+dy*t+oy-cam.y)
      }
      ctx.strokeStyle='rgba(93,173,226,'+a2+')';ctx.lineWidth=3;ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,'+(a2*0.6)+')';ctx.lineWidth=1;ctx.stroke()
    }
  }

  // 旋转飞刀
  for(var wi=0;wi<S.weapons.length;wi++){
    var w=S.weapons[wi]; if(w.id!=='orbit') continue
    for(var k=0;k<w.count;k++){
      var a=S.elapsed*2.5+k*(Math.PI*2/w.count)
      var kx=p.x+Math.cos(a)*w.range-cam.x, ky=p.y+Math.sin(a)*w.range-cam.y
      // Try dagger icon from Weapons.png (index 0)
      var daggerDrawn = false
      if (_sprites && typeof _sprites.drawWeaponIcon === 'function') {
        ctx.save(); ctx.translate(kx, ky); ctx.rotate(a + Math.PI / 2)
        daggerDrawn = _sprites.drawWeaponIcon(ctx, 0, 0, 24, 0)
        ctx.restore()
      }
      if (!daggerDrawn) {
        // Fallback: triangle shape
        ctx.save();ctx.translate(kx,ky);ctx.rotate(a+Math.PI/2)
        ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(4,6);ctx.lineTo(-4,6);ctx.closePath()
        ctx.fillStyle='#ecf0f1';ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.stroke()
        ctx.restore()
      }
    }
  }

  // 玩家
  _drawPlayer(p.x-cam.x,p.y-cam.y,p,cam)

  // HUD
  _drawHUD(S)
  _drawJoystick(S.joystick)

  if(S._waveActive){var wa=0.5+Math.sin(Date.now()/200)*0.3
    setFont(SW*0.038,'900');ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillStyle='rgba(231,76,60,'+wa+')';ctx.fillText('⚠ 怪物潮来袭！',SW/2,SH*0.14)}

  if(S.levelUp) _drawWeaponSelect(S)
  if(S.gameOver) _drawGameOver(S)
}

function _ah(a){var h=Math.round(Math.max(0,Math.min(1,a))*255).toString(16);return h.length<2?'0'+h:h}

// ── 敌人（sprite or fallback shapes + 血条）
// _drawNow is set once per frame to avoid per-enemy Date.now() calls
var _drawNow = 0
function _drawEnemy(x,y,e){
  var r=GameGlobal.Survival.enemyRadius(e.type)
  var flash=e._flashTimer&&e._flashTimer>0
  var t=_drawNow
  var _sprites = GameGlobal.SurvivalSprites
  var sizeMult = e.isElite ? (e.eliteSize || 1.5) : 1
  var spriteSize = r * 1.6 * sizeMult

  // 精英怪光环
  if (e.isElite) {
    var pulseR = Math.max(1, spriteSize * 0.7 + Math.sin(t / 300) * 4)
    ctx.beginPath(); ctx.arc(x, y, pulseR, 0, Math.PI * 2)
    ctx.strokeStyle = (e.eliteColor || '#e74c3c')
    ctx.lineWidth = 2; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1
  }

  // Try sprite drawing first
  var spriteDrawn = false
  if (_sprites && _sprites.isLoaded() && e.spriteType) {
    spriteDrawn = _sprites.drawMonster(ctx, x, y, spriteSize, e.spriteType, GameGlobal.Survival.elapsed, flash)
  }

  if (!spriteDrawn) {
    // Fallback: original shape-based rendering
    ctx.save();ctx.translate(x,y)
    if(e.type==='tank'){
      ctx.rotate(t/2000);var s=r*1.5
      ctx.fillStyle=flash?'#fff':'#6c3483';ctx.fillRect(-s/2,-s/2,s,s)
      ctx.strokeStyle='#9b59b6';ctx.lineWidth=2;ctx.strokeRect(-s/2,-s/2,s,s)
    }else if(e.type==='dash'){
      ctx.rotate(Math.PI/4);var s2=r*1.3
      ctx.fillStyle=flash?'#fff':'#e67e22';ctx.fillRect(-s2/2,-s2/2,s2,s2)
      ctx.strokeStyle='#f39c12';ctx.lineWidth=1.5;ctx.strokeRect(-s2/2,-s2/2,s2,s2)
    }else if(e.type==='split'){
      _drawHex2(0,0,r,flash?'#fff':'#af7ac5')
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1.5;ctx.stroke()
    }else if(e.type==='swarm'){
      ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2)
      ctx.fillStyle=flash?'#fff':'#e74c3c';ctx.fill()
    }else{
      ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2)
      ctx.fillStyle=flash?'#fff':'#c0392b';ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;ctx.stroke()
    }
    ctx.restore()
  }

  // 减速效果
  if(e._slowed&&e._slowed>0){
    ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2)
    ctx.strokeStyle='rgba(93,173,226,0.5)';ctx.lineWidth=2;ctx.stroke()
  }

  // 数字（血量）
  setFont(Math.min(r*0.8,14),'900');ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillStyle='#fff';ctx.fillText(Math.ceil(e.hp),x,y)

  // 血条
  if(e.hp<e.maxHp){
    var bw=r*2.2*sizeMult, bh=3, bx=x-bw/2, by=y-r*sizeMult-6
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(bx,by,bw,bh)
    ctx.fillStyle=e.isElite?(e.eliteColor||'#e74c3c'):'#2ecc71'
    ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),bh)
  }

  // 精英怪名称
  if(e.isElite && e.eliteName){
    setFont(SW*0.022,'900');ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillStyle=e.eliteColor||'#e74c3c'
    ctx.fillText(e.eliteName, x, y-r*sizeMult-14)
  }
}

function _drawHex2(x,y,r,fill){
  ctx.beginPath();for(var i=0;i<6;i++){var a=Math.PI/6+i*Math.PI/3;var hx=x+Math.cos(a)*r,hy=y+Math.sin(a)*r;if(i===0)ctx.moveTo(hx,hy);else ctx.lineTo(hx,hy)}
  ctx.closePath();ctx.fillStyle=fill;ctx.fill()
}

// ── Boss
function _drawBoss(x,y,b){
  var r=42
  var flash=b._flashTimer&&b._flashTimer>0
  var _sprites = GameGlobal.SurvivalSprites

  // Determine if boss is moving (check velocity via distance to player)
  var p = GameGlobal.Survival.player
  var bdx = p.x - b.x, bdy = p.y - b.y
  var bossMoving = Math.sqrt(bdx*bdx + bdy*bdy) > 50
  var bossState = bossMoving ? 'run' : 'idle'

  // Pulsing aura rings (lightweight, no save/restore)
  var t = Date.now()
  for(var rn=3;rn>=1;rn--){var pulse=0.7+Math.sin(t/300+rn)*0.3;ctx.beginPath();ctx.arc(x,y,r+rn*8,0,Math.PI*2);ctx.fillStyle='rgba(231,76,60,'+(0.05*pulse)+')';ctx.fill()}

  // Try sprite drawing
  var spriteDrawn = false
  if (_sprites && typeof _sprites.drawBossSprite === 'function') {
    spriteDrawn = _sprites.drawBossSprite(ctx, x, y, r * 2.5, bossState, GameGlobal.Survival.elapsed, flash)
  }

  if (!spriteDrawn) {
    // Fallback: original red circle
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2)
    ctx.fillStyle=flash?'#fff':'#c0392b';ctx.fill();ctx.strokeStyle='#f39c12';ctx.lineWidth=3;ctx.stroke()
  }

  // 冲刺蓄力警告线
  if(b._charging && b._chargeWarn>0) {
    var warn = 1 - b._chargeWarn / 0.8
    ctx.strokeStyle='rgba(255,50,50,'+(0.3+warn*0.5)+')'
    ctx.lineWidth=2+warn*4
    ctx.setLineDash([8,6])
    ctx.beginPath(); ctx.moveTo(x,y)
    ctx.lineTo(x+b._chargeDir.x*300, y+b._chargeDir.y*300)
    ctx.stroke(); ctx.setLineDash([])
  }

  // 阶段颜色
  var phaseColor = b.phase>=3 ? '#ff2222' : (b.phase>=2 ? '#ff6600' : '#e74c3c')
  var phaseText = b.phase>=3 ? 'BOSS [绝望]' : (b.phase>=2 ? 'BOSS [狂暴]' : 'BOSS')

  // Boss label + HP text
  setFont(14,'900');ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillStyle=phaseColor
  ctx.fillText(phaseText,x,y-r-22);setFont(12,'800');ctx.fillStyle='#fff'
  ctx.fillText(Math.ceil(b.hp),x,y+r+10)

  // Boss HP bar
  var bw=r*2.5,bh=5,bx=x-bw/2,by=y-r-14
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(bx,by,bw,bh)
  ctx.fillStyle=phaseColor;ctx.fillRect(bx,by,bw*(b.hp/b.maxHp),bh)
}

// ── 玩家
function _drawPlayer(x,y,p,cam){
  var r=22
  // 拖尾（只在移动时显示，缩小尺寸）
  var js0=GameGlobal.Survival.joystick
  var isMoving0=js0&&js0.active&&(Math.abs(js0.dx)>0.1||Math.abs(js0.dy)>0.1)
  if(isMoving0){
    var tr=p._trail||[]
    for(var i=0;i<tr.length;i++){var a2=(i+1)/tr.length*0.12;ctx.beginPath();ctx.arc(tr[i].x-cam.x,tr[i].y-cam.y,r*(0.2+i/tr.length*0.3),0,Math.PI*2);ctx.fillStyle='rgba(52,152,219,'+a2+')';ctx.fill()}
  }

  // 无敌闪烁
  if(p._iFrames>0 && Math.floor(Date.now()/80)%2===0) return

  // Determine animation state
  var _sprites = GameGlobal.SurvivalSprites
  var js = GameGlobal.Survival.joystick
  var isMoving = js && js.active && (Math.abs(js.dx) > 0.1 || Math.abs(js.dy) > 0.1)
  var isHurt = p._iFrames > 0
  var animState = isHurt ? 'hurt' : (isMoving ? 'run' : 'idle')
  var spriteSize = r * 1.8

  // Try sprite drawing
  var spriteDrawn = false
  if (_sprites && _sprites.isLoaded()) {
    _sprites.setPlayerSkin(p.skin || 'doux')
    spriteDrawn = _sprites.drawPlayer(ctx, x, y, spriteSize, animState, GameGlobal.Survival.elapsed, p.facingLeft)
  }

  if (!spriteDrawn) {
    // Fallback: original hex rendering
    ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.fillStyle='rgba(52,152,219,0.15)';ctx.fill()
    ctx.save();ctx.translate(x,y)
    _drawHex2(0,0,r,'#2980b9')
    var pg=ctx.createRadialGradient(-r*0.2,-r*0.2,0,0,0,r)
    pg.addColorStop(0,'rgba(52,152,219,0.5)');pg.addColorStop(1,'rgba(41,128,185,0)')
    _drawHex2(0,0,r,pg);ctx.strokeStyle='#5dade2';ctx.lineWidth=2;ctx.stroke()
    ctx.restore()
  }

  // HP条
  var hpW=r*2.5, hpH=4, hpX=x-hpW/2, hpY=y+r+6
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(hpX,hpY,hpW,hpH)
  var hpRatio=Math.max(0,p.hp/p.maxHp)
  ctx.fillStyle=hpRatio>0.5?'#2ecc71':hpRatio>0.25?'#f39c12':'#e74c3c'
  ctx.fillRect(hpX,hpY,hpW*hpRatio,hpH)
}

// ── HUD（下移避开顶部胶囊按钮）
function _drawHUD(S){
  var p=S.player
  var topOff = SH * 0.055  // 顶部偏移，紧贴胶囊下方

  // 无背景，直接画在游戏上面

  // HP
  var hpW=SW*0.35, hpH=8, hpX=PAD, hpY=topOff
  ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(hpX,hpY,hpW,hpH)
  var hpR=Math.max(0,p.hp/p.maxHp)
  ctx.fillStyle=hpR>0.5?'#2ecc71':hpR>0.25?'#f39c12':'#e74c3c'
  ctx.fillRect(hpX,hpY,hpW*hpR,hpH)
  setFont(SW*0.018,'700');ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#fff'
  ctx.fillText(Math.ceil(p.hp)+'/'+p.maxHp, hpX+4, hpY+hpH/2)

  // 等级 + XP（血条正下方）
  setFont(SW*0.018,'800');ctx.fillStyle='#f39c12';ctx.textAlign='left';ctx.textBaseline='middle'
  ctx.fillText(p.level>=50?'Lv.MAX':'Lv.'+p.level, hpX, hpY+hpH+SH*0.010)
  // XP条（等级文字右边）
  var lvTextW = SW * 0.08
  var xpN=(p.level<50)?LEVEL_XP_R[p.level]||999:1,xpR=p.level>=50?1:Math.min(1,p.xp/xpN)
  var xpX=hpX+lvTextW,xpW=hpW-lvTextW,xpH=3,xpY=hpY+hpH+SH*0.009
  ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(xpX,xpY,xpW,xpH)
  if(xpR>0){ctx.fillStyle='#f39c12';ctx.fillRect(xpX,xpY,xpW*xpR,xpH)}

  // 时间（居中，不跟等级重叠）
  var tl=Math.max(0,S.GAME_DURATION-S.elapsed),mm=Math.floor(tl/60),ss=Math.floor(tl%60)
  setFont(SW*0.032,'900');ctx.textAlign='center';ctx.fillStyle=tl<60?'#e74c3c':'#fff'
  ctx.fillText(String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0'),SW/2,topOff+SH*0.005)

  // 击杀（时间下方）
  setFont(SW*0.018,'700');ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.45)'
  ctx.fillText('击杀 '+p.kills, SW/2, topOff+SH*0.028)

  // ── 武器图标栏（像素图标 + 等级）
  var _spr = GameGlobal.SurvivalSprites
  var wBarY = topOff + SH*0.038
  var iconSize = SW * 0.065
  var iconGap = iconSize + 4
  for(var wi=0;wi<S.weapons.length;wi++){
    var ww = S.weapons[wi]
    var wix = PAD + wi * iconGap + iconSize/2
    var wiy = wBarY + iconSize/2

    // 无背景，直接画图标

    // 画武器像素图标
    var wDrawn = false
    if (_spr) {
      if (ww.id === 'orbit' && typeof _spr.drawWeaponIcon === 'function')
        wDrawn = _spr.drawWeaponIcon(ctx, wix, wiy, iconSize * 0.8, 0)
      else if (ww.id === 'bolt' && typeof _spr.drawEnergyBolt === 'function')
        wDrawn = _spr.drawEnergyBolt(ctx, wix, wiy, iconSize * 0.8, S.elapsed)
      else if (ww.id === 'lightning' && typeof _spr.drawPotionIcon === 'function')
        wDrawn = _spr.drawPotionIcon(ctx, wix, wiy, iconSize * 0.8, 0)
      else if (ww.id === 'aura' && typeof _spr.drawIceAura === 'function')
        wDrawn = _spr.drawIceAura(ctx, wix, wiy, iconSize * 0.4, 0)
      else if (ww.id === 'ring' && typeof _spr.drawFireRing === 'function')
        wDrawn = _spr.drawFireRing(ctx, wix, wiy, iconSize * 0.4, 0)
    }
    if (!wDrawn) {
      var def=_WDEFS[ww.id]
      setFont(iconSize*0.5,'700');ctx.textAlign='center';ctx.textBaseline='middle'
      ctx.fillStyle='#fff';ctx.fillText(def?def.icon:'?', wix, wiy)
    }

    // 等级标签
    setFont(SW*0.016,'800');ctx.textAlign='center';ctx.textBaseline='top'
    ctx.fillStyle='#f39c12';ctx.fillText('Lv'+ww.level, wix, wiy + iconSize/2 + 1)
  }

  // 设置按钮（右上，在胶囊下方）
  var stW=SW*0.13, stH=SW*0.075, stX=SW-PAD-stW, stY=topOff + SH*0.04
  roundRect(stX,stY,stW,stH,10,C.surface,'rgba(255,255,255,0.25)')
  setFont(stH*0.42,'700');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#eee'
  ctx.fillText('⚙ 设置',stX+stW/2,stY+stH/2)
  GameGlobal.SurvivalUI.settingBtn={x:stX,y:stY,w:stW,h:stH}
}
var _WDEFS={orbit:{icon:'🔪'},bolt:{icon:'🔮'},lightning:{icon:'⚡'},aura:{icon:'❄'},ring:{icon:'🔥'},boomerang:{icon:'🪃'},meteor:{icon:'☄'},shield:{icon:'🛡'},vampire:{icon:'💉'},tornado:{icon:'🌪'},poison:{icon:'☢'}}
var LEVEL_XP_R=(function(){var t=[0];for(var i=1;i<50;i++)t.push(Math.floor(20+i*15+i*i*1.2));return t})()

// ── 摇杆
function _drawJoystick(js){
  if(!js.active){setFont(SW*0.022,'600');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillText('按住屏幕移动',SW*0.25,SH*0.93);return}
  ctx.beginPath();ctx.arc(js.baseX,js.baseY,50,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fill()
  ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=2;ctx.stroke()
  ctx.beginPath();ctx.arc(js.stickX,js.stickY,20,0,Math.PI*2)
  var jg=ctx.createRadialGradient(js.stickX,js.stickY,0,js.stickX,js.stickY,20)
  jg.addColorStop(0,'rgba(52,152,219,0.6)');jg.addColorStop(1,'rgba(52,152,219,0.2)');ctx.fillStyle=jg;ctx.fill()
  ctx.strokeStyle='rgba(52,152,219,0.8)';ctx.lineWidth=2;ctx.stroke()
}

function _drawBorder(cam){
  var MW=3000,MH=3000;ctx.strokeStyle='rgba(231,76,60,0.4)';ctx.lineWidth=3
  var lx=-cam.x,rx=MW-cam.x,ty=-cam.y,by2=MH-cam.y
  if(lx>0){ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,SH);ctx.stroke()}
  if(rx<SW){ctx.beginPath();ctx.moveTo(rx,0);ctx.lineTo(rx,SH);ctx.stroke()}
  if(ty>0){ctx.beginPath();ctx.moveTo(0,ty);ctx.lineTo(SW,ty);ctx.stroke()}
  if(by2<SH){ctx.beginPath();ctx.moveTo(0,by2);ctx.lineTo(SW,by2);ctx.stroke()}
}

// ── 武器卡片图标（用VFX精灵替代emoji）
function _drawWeaponCardIcon(weaponId, x, y, size, def) {
  var _spr = GameGlobal.SurvivalSprites
  var drawn = false
  if (_spr) {
    if (weaponId === 'orbit' && typeof _spr.drawWeaponIcon === 'function') {
      drawn = _spr.drawWeaponIcon(ctx, x, y, size, 0)  // 匕首
    } else if (weaponId === 'bolt' && typeof _spr.drawEnergyBolt === 'function') {
      drawn = _spr.drawEnergyBolt(ctx, x, y, size, 0)  // 能量弹
    } else if (weaponId === 'lightning' && typeof _spr.drawPotionIcon === 'function') {
      drawn = _spr.drawPotionIcon(ctx, x, y, size, 0)  // 蓝色药水代表闪电
    } else if (weaponId === 'aura' && typeof _spr.drawIceAura === 'function') {
      drawn = _spr.drawIceAura(ctx, x, y, size * 0.8, 0)  // 冰冻圈
    } else if (weaponId === 'ring' && typeof _spr.drawFireRing === 'function') {
      drawn = _spr.drawFireRing(ctx, x, y, size * 0.8, 0)  // 火焰圈
    }
  }
  if (!drawn && def) {
    // Fallback: emoji
    setFont(size * 0.7, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'; ctx.fillText(def.icon, x, y)
  }
}

// ================================================
//  武器选择（升级时）
// ================================================
function _drawWeaponSelect(S){
  var WEAPON_DEFS = S.WEAPON_DEFS || {}
  ctx.fillStyle='rgba(6,8,26,0.93)';ctx.fillRect(0,0,SW,SH)
  var cx=SW/2
  setFont(SW*0.055,'900');ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillStyle='#f39c12';ctx.fillText('升级！',cx,SH*0.16)
  setFont(SW*0.030,'700');ctx.fillStyle='#fff';ctx.fillText('等级 '+S.player.level+' — 选择一项',cx,SH*0.23)

  var UI=GameGlobal.SurvivalUI;UI.skillBtns=[]
  var chs=S.weaponChoices, cardW=BOARD_W*0.90, cardH=SH*0.13, startY=SH*0.30

  for(var i=0;i<chs.length;i++){
    var ch=chs[i],cy=startY+i*(cardH+GAP),cardX=cx-cardW/2
    var def=WEAPON_DEFS[ch.id]

    if(ch.type==='new'){
      roundRect(cardX,cy,cardW,cardH,14,'rgba(46,204,113,0.1)','rgba(46,204,113,0.3)')
      // 武器像素图标
      _drawWeaponCardIcon(ch.id, cardX+PAD+cardH*0.22, cy+cardH*0.45, cardH*0.55, def)
      setFont(cardH*0.20,'800');ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#2ecc71'
      ctx.fillText('新武器: '+def.name,cardX+PAD+cardH*0.5,cy+cardH*0.32)
      setFont(cardH*0.15,'600');ctx.fillStyle=C.textDim
      ctx.fillText(def.desc,cardX+PAD+cardH*0.5,cy+cardH*0.58)
      setFont(cardH*0.13,'700');ctx.fillStyle='#2ecc71'
      ctx.fillText('NEW',cardX+cardW-PAD*3,cy+cardH*0.5)
    }else if(ch.type==='upgrade'){
      roundRect(cardX,cy,cardW,cardH,14,'rgba(243,156,18,0.1)','rgba(243,156,18,0.3)')
      // 武器像素图标
      _drawWeaponCardIcon(ch.id, cardX+PAD+cardH*0.22, cy+cardH*0.45, cardH*0.55, def)
      setFont(cardH*0.20,'800');ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#f39c12'
      ctx.fillText((def?def.name:ch.id)+' Lv'+(ch.w.level+1),cardX+PAD+cardH*0.5,cy+cardH*0.32)
      setFont(cardH*0.15,'600');ctx.fillStyle=C.textDim
      ctx.fillText('伤害↑ 效果↑',cardX+PAD+cardH*0.5,cy+cardH*0.58)
    }else if(ch.type==='heal'){
      roundRect(cardX,cy,cardW,cardH,14,'rgba(46,204,113,0.08)','rgba(46,204,113,0.2)')
      // 红色药瓶图标（potionIdx 4 = 红色）
      var _spr = GameGlobal.SurvivalSprites
      var potionDrawn = false
      if (_spr && typeof _spr.drawPotionIcon === 'function') {
        potionDrawn = _spr.drawPotionIcon(ctx, cardX+PAD+cardH*0.22, cy+cardH*0.45, cardH*0.55, 4)
      }
      if (!potionDrawn) {
        setFont(cardH*0.35,'700');ctx.textAlign='left';ctx.textBaseline='middle'
        ctx.fillStyle='#fff';ctx.fillText('💚',cardX+PAD,cy+cardH*0.4)
      }
      setFont(cardH*0.20,'800');ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#2ecc71'
      ctx.fillText('回复30HP',cardX+PAD+cardH*0.5,cy+cardH*0.45)
    }else{
      roundRect(cardX,cy,cardW,cardH,14,'rgba(52,152,219,0.08)','rgba(52,152,219,0.2)')
      setFont(cardH*0.35,'700');ctx.textAlign='left';ctx.textBaseline='middle'
      ctx.fillStyle='#fff';ctx.fillText('⚡',cardX+PAD,cy+cardH*0.4)
      setFont(cardH*0.20,'800');ctx.fillStyle='#5dade2'
      ctx.fillText('移速提升',cardX+PAD+cardH*0.5,cy+cardH*0.45)
    }
    UI.skillBtns.push({x:cardX,y:cy,w:cardW,h:cardH})
  }
}

// ================================================
//  结算
// ================================================
function _drawGameOver(S){
  ctx.fillStyle='rgba(6,8,26,0.94)';ctx.fillRect(0,0,SW,SH)
  var cx=SW/2,p=S.player
  setFont(SW*0.065,'900');ctx.textAlign='center';ctx.textBaseline='middle'
  if(S.victory){var tg=ctx.createLinearGradient(cx-SW*0.2,0,cx+SW*0.2,0);tg.addColorStop(0,'#f39c12');tg.addColorStop(1,'#e74c3c');ctx.fillStyle=tg;ctx.fillText('胜利！',cx,SH*0.18)}
  else{ctx.fillStyle='#e74c3c';ctx.fillText('游戏结束',cx,SH*0.18)}

  var cdY=SH*0.28,cdH=SH*0.30
  roundRect(BOARD_X,cdY,BOARD_W,cdH,16,C.surface,'rgba(255,255,255,0.06)')
  var items=[{l:'击杀数',v:String(p.kills),c:'#e74c3c'},{l:'存活时间',v:_fmt(S.elapsed),c:'#2ecc71'},{l:'等级',v:p.level>=20?'MAX':'Lv.'+p.level,c:'#f39c12'},{l:'武器数',v:String(S.weapons.length),c:'#3498db'}]
  var ih=cdH/4
  for(var i=0;i<items.length;i++){var iy=cdY+ih*i+ih/2;setFont(SW*0.028,'700');ctx.textAlign='left';ctx.fillStyle=C.textDim;ctx.fillText(items[i].l,BOARD_X+PAD*2,iy);setFont(SW*0.040,'900');ctx.textAlign='right';ctx.fillStyle=items[i].c;ctx.fillText(items[i].v,BOARD_X+BOARD_W-PAD*2,iy)}

  // 金币奖励明细
  var rw=S._lastReward
  if(rw){
    var coinY=cdY+cdH+GAP
    var coinH=SH*0.18
    roundRect(BOARD_X,coinY,BOARD_W,coinH,12,'rgba(243,156,18,0.1)','rgba(243,156,18,0.3)')
    setFont(SW*0.030,'900');ctx.textAlign='center';ctx.fillStyle='#f39c12'
    ctx.fillText('💰 金币奖励',cx,coinY+coinH*0.13)

    var coinItems=[
      {l:'基础奖励',v:'+5'},{l:'击杀('+rw.kills+')',v:'+'+rw.coinKills},
      {l:'存活('+Math.floor(rw.time/60)+'分钟)',v:'+'+rw.coinTime},
      {l:'等级(Lv.'+rw.level+')',v:'+'+rw.coinLevel}
    ]
    if(rw.coinBoss>0) coinItems.push({l:'击败Boss',v:'+'+rw.coinBoss})
    var cih=coinH*0.65/coinItems.length
    for(var ci=0;ci<coinItems.length;ci++){
      var ciy=coinY+coinH*0.25+cih*ci+cih/2
      setFont(SW*0.022,'600');ctx.textAlign='left';ctx.fillStyle='rgba(255,255,255,0.5)'
      ctx.fillText(coinItems[ci].l,BOARD_X+PAD*2,ciy)
      ctx.textAlign='right';ctx.fillStyle='#f1c40f'
      ctx.fillText(coinItems[ci].v,BOARD_X+BOARD_W-PAD*2,ciy)
    }
    setFont(SW*0.032,'900');ctx.textAlign='center';ctx.fillStyle='#f39c12'
    ctx.fillText('合计: +'+rw.coinTotal+' 💰',cx,coinY+coinH*0.92)
    cdH+=coinH+GAP  // 调整按钮位置
  }

  var bY1=cdY+cdH+GAP*2;var bg2=ctx.createLinearGradient(BOARD_X,0,BOARD_X+BOARD_W,0);bg2.addColorStop(0,'#e74c3c');bg2.addColorStop(1,'#f39c12')
  roundRect(BOARD_X,bY1,BOARD_W,BTN_H*1.1,14,bg2);setFont(BTN_H*0.38,'900');ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('再来一局',cx,bY1+BTN_H*0.55)
  GameGlobal.SurvivalUI.retryBtn={x:BOARD_X,y:bY1,w:BOARD_W,h:BTN_H*1.1}
  var bY2=bY1+BTN_H*1.1+GAP;roundRect(BOARD_X,bY2,BOARD_W,BTN_H*0.9,12,C.surface,'rgba(255,255,255,0.08)')
  setFont(BTN_H*0.34,'700');ctx.fillStyle=C.textDim;ctx.fillText('返回大厅',cx,bY2+BTN_H*0.45)
  GameGlobal.SurvivalUI.exitBtn={x:BOARD_X,y:bY2,w:BOARD_W,h:BTN_H*0.9}
}

function _fmt(s){var m=Math.floor(s/60),ss=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0')}

// ── 排行榜（同v3保持不变）
GameGlobal.SurvivalRank={list:[],myRank:null,scrollY:0,loading:false,load:function(){this.loading=true;this.scrollY=0;var self=this;wx.cloud.callFunction({name:'leaderboard',data:{action:'query',type:'survival',limit:100},success:function(r){if(r.result&&r.result.success){self.list=r.result.data||[];self.myRank=r.result.myRank||null}self.loading=false},fail:function(){self.loading=false}})}}
GameGlobal.SurvivalRankUI={backBtn:null}
GameGlobal.drawSurvivalRankScreen=function(){drawBg();var cx=SW/2,R=GameGlobal.SurvivalRank,RUI=GameGlobal.SurvivalRankUI;setFont(SW*0.050,'900');ctx.textAlign='center';ctx.textBaseline='middle';var tg=ctx.createLinearGradient(cx-SW*0.2,0,cx+SW*0.2,0);tg.addColorStop(0,'#e74c3c');tg.addColorStop(1,'#f39c12');ctx.fillStyle=tg;ctx.fillText('生存排行榜',cx,SH*0.09);setFont(SW*0.025,'600');ctx.fillStyle=C.textDim;ctx.fillText('击杀数排名',cx,SH*0.135);if(R.loading){setFont(SW*0.035,'700');ctx.fillStyle=C.textDim;ctx.fillText('加载中...',cx,SH*0.4);RUI.backBtn={x:BOARD_X,y:SH*0.88,w:BOARD_W,h:BTN_H};drawBtn(BOARD_X,SH*0.88,BOARD_W,BTN_H,'返回',C.surface,C.textLight);return}var myBarY=SH*0.17,myBarH=SH*0.065;if(R.myRank){roundRect(BOARD_X,myBarY,BOARD_W,myBarH,10,'rgba(231,76,60,0.15)','rgba(231,76,60,0.4)');setFont(SW*0.030,'900');ctx.textAlign='left';ctx.fillStyle='#e74c3c';ctx.fillText('我  #'+R.myRank.rank,BOARD_X+PAD,myBarY+myBarH/2);ctx.textAlign='right';ctx.fillText(R.myRank.score+'',BOARD_X+BOARD_W-PAD,myBarY+myBarH/2)}else{roundRect(BOARD_X,myBarY,BOARD_W,myBarH,10,C.surface,'rgba(255,255,255,0.05)');setFont(SW*0.028,'700');ctx.textAlign='center';ctx.fillStyle=C.textDim;ctx.fillText('完成一局即可上榜',cx,myBarY+myBarH/2)}var listY=myBarY+myBarH+GAP,rowH=SH*0.065,list=R.list;ctx.save();ctx.beginPath();ctx.rect(0,listY,SW,SH*0.65);ctx.clip();for(var i=0;i<list.length;i++){var ry=listY+i*rowH-R.scrollY;if(ry+rowH<listY||ry>listY+SH*0.65)continue;roundRect(BOARD_X,ry+2,BOARD_W,rowH-4,8,C.surface,'rgba(255,255,255,0.04)');setFont(SW*0.028,'800');ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=i<3?'#f39c12':C.textDim;ctx.fillText((i+1)+'',BOARD_X+PAD,ry+rowH/2);setFont(SW*0.028,'700');ctx.fillStyle=C.textLight;ctx.fillText(list[i].nickname||'???',BOARD_X+PAD*3,ry+rowH/2);setFont(SW*0.032,'900');ctx.textAlign='right';ctx.fillStyle='#e74c3c';ctx.fillText(String(list[i].score||0),BOARD_X+BOARD_W-PAD,ry+rowH/2)}ctx.restore();var bkY=SH*0.88;drawBtn(BOARD_X,bkY,BOARD_W,BTN_H,'返回',C.surface,C.textLight);RUI.backBtn={x:BOARD_X,y:bkY,w:BOARD_W,h:BTN_H}}

var _svRTY=0,_svRSS=0
GameGlobal.handleSurvivalRankTouch=function(type,y){var R=GameGlobal.SurvivalRank;if(type==='start'){_svRTY=y;_svRSS=R.scrollY}else if(type==='move'){var mx=Math.max(0,R.list.length*SH*0.065-SH*0.65);R.scrollY=Math.max(0,Math.min(mx,_svRSS-(y-_svRTY)))}}