// ================================================
//  render.js - 所有界面绘制（主页、游戏、设置）
// ================================================

// ---- 从 GameGlobal 引入共享变量 ----
var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP, SIZE = GameGlobal.SIZE
var BOARD_W = GameGlobal.BOARD_W, BOARD_H = GameGlobal.BOARD_H
var BOARD_X = GameGlobal.BOARD_X, BOARD_Y = GameGlobal.BOARD_Y
var CELL_SZ = GameGlobal.CELL_SZ, BTN_H = GameGlobal.BTN_H
var TOP_PAD = GameGlobal.TOP_PAD, ROW1_H = GameGlobal.ROW1_H, ROW2_H = GameGlobal.ROW2_H
var C = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg = GameGlobal.drawBg, drawBtn = GameGlobal.drawBtn, inRect = GameGlobal.inRect


// ---- 星星粒子 ----
GameGlobal.stars = []
for (var _i = 0; _i < 40; _i++) {
  stars.push({ x: Math.random()*SW, y: Math.random()*SH,
    r: Math.random()*2+0.5, a: Math.random(), sp: Math.random()*0.008+0.003 })
}
GameGlobal.starTick = 0

GameGlobal.drawStars = function() {
  // 有主题时跳过默认星星
  if (GameGlobal._themeBgRenderer) return
  GameGlobal.starTick += 0.03
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i]
    s.a = 0.3 + Math.abs(Math.sin(GameGlobal.starTick * s.sp * 100 + s.x)) * 0.7
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2)
    ctx.fillStyle = 'rgba(255,255,255,' + s.a + ')'; ctx.fill()
  }
}

// ================================================
//  主界面
// ================================================
// ── 游戏卡片统一绘制工具
GameGlobal._drawGameCard = function(x, y, w, h, icon, title, subtitle, grad1, grad2) {
  var r = 20
  var bg = ctx.createLinearGradient(x, y, x+w, y+h)
  bg.addColorStop(0, grad1); bg.addColorStop(1, grad2)
  ctx.shadowColor = grad1; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6
  roundRect(x, y, w, h, r, bg)
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'
  var hl = ctx.createLinearGradient(x, y, x, y+h*0.5)
  hl.addColorStop(0, 'rgba(255,255,255,0.18)'); hl.addColorStop(1, 'rgba(255,255,255,0)')
  roundRect(x+2, y+2, w-4, h*0.5, r, hl)
  setFont(h*0.30, '900'); ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillStyle='rgba(255,255,255,0.9)'
  ctx.fillText(icon, x+h*0.22, y+h*0.38)
  setFont(h*0.26, '900'); ctx.fillStyle='#fff'
  ctx.fillText(title, x+h*0.22, y+h*0.68)
  setFont(h*0.14, '700'); ctx.fillStyle='rgba(255,255,255,0.65)'
  ctx.textAlign='right'
  ctx.fillText(subtitle, x+w-h*0.18, y+h*0.72)
  setFont(h*0.22, '700'); ctx.fillStyle='rgba(255,255,255,0.7)'
  ctx.fillText('›', x+w-h*0.18, y+h*0.38)
}

GameGlobal.Home = { btn2048:null, btnHuarong:null, btnSudoku:null, btnSurvival:null, btnTile:null, settingBtn:null, avatarBtn:null, achieveBtn:null, shopBtn:null }

GameGlobal.drawHomeScreen = function() {
  drawBg()
  drawStars()

  var cx = SW/2
  var uinfo = wx.getStorageSync('userInfo') || {}

  // ── 左上角头像
  var avR = Math.round(SW*0.060)
  var avX = PAD + avR, avY = Math.round(SH*0.055) + avR
  ctx.beginPath(); ctx.arc(avX, avY, avR, 0, Math.PI*2)
  var avGrad = ctx.createRadialGradient(avX, avY, 0, avX, avY, avR)
  avGrad.addColorStop(0, 'rgba(245,166,35,0.35)'); avGrad.addColorStop(1, 'rgba(233,69,96,0.20)')
  ctx.fillStyle = avGrad; ctx.fill()
  ctx.strokeStyle = 'rgba(245,166,35,0.7)'; ctx.lineWidth = 2; ctx.stroke()
  var avImg = uinfo.avatarUrl ? GameGlobal._avatarImgCache && GameGlobal._avatarImgCache[uinfo.avatarUrl] : null
  if (avImg && avImg !== 'loading') {
    ctx.save(); ctx.beginPath(); ctx.arc(avX, avY, avR, 0, Math.PI*2); ctx.clip()
    ctx.drawImage(avImg, avX-avR, avY-avR, avR*2, avR*2); ctx.restore()
  } else {
    setFont(avR*0.9, '900'); ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillStyle = C.textLight; ctx.fillText((uinfo.nickName||'?')[0], avX, avY)
    if (uinfo.avatarUrl && (!GameGlobal._avatarImgCache || !GameGlobal._avatarImgCache[uinfo.avatarUrl]))
      GameGlobal._loadHomeAvatar(uinfo.avatarUrl)
  }
  setFont(SW*0.022, '700'); ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillStyle=C.textDim
  var dispName = (uinfo.nickName||'神秘玩家'); if (dispName.length>5) dispName=dispName.slice(0,5)+'..'
  ctx.fillText(dispName, avX+avR+GAP*0.6, avY)
  Home.avatarBtn = { x:PAD, y:avY-avR, w:avR*2+GAP+SW*0.18, h:avR*2 }

  // ── 右上角金币（带背景）
  var coins = (GameGlobal.AchieveShop && GameGlobal.AchieveShop.coins) || 0
  var coinTxt = '🪙 ' + coins
  setFont(SW * 0.028, '800')
  var coinW = ctx.measureText(coinTxt).width + PAD * 1.5
  var coinH = SW * 0.055, coinX = SW - PAD - coinW, coinY = SH * 0.12
  roundRect(coinX, coinY, coinW, coinH, coinH / 2, 'rgba(0,0,0,0.3)', 'rgba(243,156,18,0.4)')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f39c12'
  ctx.fillText(coinTxt, coinX + coinW / 2, coinY + coinH / 2)

  // ── 标题
  setFont(SW*0.105, '900'); ctx.textAlign='center'; ctx.textBaseline='middle'
  var tg = ctx.createLinearGradient(cx-SW*0.3, 0, cx+SW*0.3, 0)
  tg.addColorStop(0,'#f5a623'); tg.addColorStop(0.5,'#e94560'); tg.addColorStop(1,'#9b59b6')
  ctx.shadowColor='rgba(233,69,96,0.5)'; ctx.shadowBlur=20; ctx.fillStyle=tg
  ctx.fillText('数字空间', cx, SH*0.20)
  ctx.fillText('实  验  室', cx, SH*0.20 + SW*0.130)
  ctx.shadowBlur=0; ctx.shadowColor='transparent'

  setFont(SW*0.026, '600'); ctx.fillStyle='rgba(255,255,255,0.3)'
  ctx.fillText('选择你的挑战', cx, SH*0.20 + SW*0.23)

  // ── 游戏卡片（2x2 网格）
  var halfW = Math.floor((BOARD_W - GAP) / 2)
  var cardH = BTN_H * 1.5
  var cardGap = GAP
  var gridY = SH * 0.42

  var best2048 = wx.getStorageSync('2048best') || 0
  _drawHomeCard(BOARD_X, gridY, halfW, cardH, '🎮', '2048', best2048>0?'最高'+best2048:'', '#e94560', '#f5a623')
  Home.btn2048 = { x:BOARD_X, y:gridY, w:halfW, h:cardH }

  var x2 = BOARD_X + halfW + cardGap
  _drawHomeCard(x2, gridY, halfW, cardH, '🧩', '华容道', '', '#1abc9c', '#3498db')
  Home.btnHuarong = { x:x2, y:gridY, w:halfW, h:cardH }

  var y2 = gridY + cardH + cardGap
  _drawHomeCard(BOARD_X, y2, halfW, cardH, '🔢', '数独', '', '#6c5ce7', '#a29bfe')
  Home.btnSudoku = { x:BOARD_X, y:y2, w:halfW, h:cardH }

  var bestSV = wx.getStorageSync('survivalBest') || 0
  _drawHomeCard(x2, y2, halfW, cardH, '⚔', '生存', bestSV>0?bestSV+'杀':'NEW!', '#e74c3c', '#f39c12')
  Home.btnSurvival = { x:x2, y:y2, w:halfW, h:cardH }

  // 第5个游戏：三消堆叠（全宽横幅）
  var y3 = y2 + cardH + cardGap
  var cardH2 = BTN_H * 1.2
  var tmBest = wx.getStorageSync('tileMatchBest') || 0
  _drawHomeCard(BOARD_X, y3, BOARD_W, cardH2, '🧊', '三消堆叠', tmBest>0?'第'+tmBest+'关':'NEW!', '#2ecc71', '#3498db')
  Home.btnTile = { x:BOARD_X, y:y3, w:BOARD_W, h:cardH2 }

  // ── 底部按钮行：成就 / 商城 / 设置（3等分）
  var btmY = y3 + cardH2 + GAP * 1.0
  var btmH = BTN_H * 0.9
  var btmW = Math.floor((BOARD_W - GAP * 2) / 3)

  // 成就
  roundRect(BOARD_X, btmY, btmW, btmH, 12, C.surface, 'rgba(243,156,18,0.2)')
  setFont(btmH*0.34, '700'); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#f39c12'
  ctx.fillText('🏆 成就', BOARD_X + btmW/2, btmY+btmH/2)
  Home.achieveBtn = { x:BOARD_X, y:btmY, w:btmW, h:btmH }

  // 商城
  var sx = BOARD_X + btmW + GAP
  roundRect(sx, btmY, btmW, btmH, 12, C.surface, 'rgba(108,92,231,0.2)')
  setFont(btmH*0.34, '700'); ctx.fillStyle='#a29bfe'
  ctx.fillText('🛒 商城', sx + btmW/2, btmY+btmH/2)
  Home.shopBtn = { x:sx, y:btmY, w:btmW, h:btmH }

  // 设置
  var sx2 = sx + btmW + GAP
  roundRect(sx2, btmY, btmW, btmH, 12, C.surface, 'rgba(255,255,255,0.08)')
  setFont(btmH*0.34, '700'); ctx.fillStyle=C.textLight
  ctx.fillText('⚙ 设置', sx2 + btmW/2, btmY+btmH/2)
  Home.settingBtn = { x:sx2, y:btmY, w:btmW, h:btmH }

  // ── 底部健康提示 + 年龄分级（贴底）
  setFont(SW * 0.020, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.20)'
  ctx.fillText('适龄提示：本游戏适合8岁以上用户', cx, SH - SW * 0.065)
  ctx.fillText('抵制不良游戏 · 合理安排时间 · 享受健康生活', cx, SH - SW * 0.030)

  Home.helpBtn = null
}

// 2x2 小卡片绘制
function _drawHomeCard(x, y, w, h, icon, name, sub, c1, c2) {
  // 背景
  var g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, c1 + '22'); g.addColorStop(1, c2 + '22')
  roundRect(x, y, w, h, 14, g, c1 + '55')

  // 图标
  setFont(h * 0.28, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'; ctx.fillText(icon, x + w / 2, y + h * 0.32)

  // 名称
  var tg = ctx.createLinearGradient(x, 0, x + w, 0)
  tg.addColorStop(0, c1); tg.addColorStop(1, c2)
  setFont(h * 0.20, '900'); ctx.fillStyle = tg
  ctx.fillText(name, x + w / 2, y + h * 0.62)

  // 副标题
  if (sub) {
    setFont(h * 0.12, '600'); ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText(sub, x + w / 2, y + h * 0.83)
  }
}

// ================================================
//  2048 大厅界面
// ================================================
GameGlobal.Lobby2048UI = { startBtn:null, rankBtn:null, pkBtn:null, backBtn:null }

GameGlobal.drawLobby2048Screen = function() {
  drawBg(); drawStars()
  var cx = SW/2
  var L = GameGlobal.Lobby2048UI

  setFont(SW*0.095, '900'); ctx.textAlign='center'; ctx.textBaseline='middle'
  var tg = ctx.createLinearGradient(cx-SW*0.25,0,cx+SW*0.25,0)
  tg.addColorStop(0,'#f5a623'); tg.addColorStop(1,'#e94560')
  ctx.shadowColor='rgba(233,69,96,0.4)'; ctx.shadowBlur=18; ctx.fillStyle=tg
  ctx.fillText('2048', cx, SH*0.15)
  ctx.shadowBlur=0; ctx.shadowColor='transparent'
  setFont(SW*0.028,'600'); ctx.fillStyle='rgba(255,255,255,0.3)'
  ctx.fillText('合并方块，挑战极限！', cx, SH*0.22)

  var best = wx.getStorageSync('2048best') || 0
  var cardX=BOARD_X, cardW=BOARD_W, cardH=BTN_H*1.1, cardY=SH*0.28
  roundRect(cardX, cardY, cardW, cardH, 16, C.surface, 'rgba(245,166,35,0.25)')
  setFont(SW*0.028,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=C.textDim
  ctx.fillText('历史最高分', cx, cardY+cardH*0.3)
  setFont(best>0 ? SW*0.072 : SW*0.036,'900')
  ctx.fillStyle = best>0 ? C.accent2 : C.textDim
  ctx.fillText(best>0 ? String(best) : '暂无记录', cx, cardY+cardH*0.72)

  var bY=SH*0.48, bH=BTN_H*1.1
  ctx.shadowColor='rgba(233,69,96,0.5)'; ctx.shadowBlur=20
  var gbg=ctx.createLinearGradient(BOARD_X,0,BOARD_X+BOARD_W,0)
  gbg.addColorStop(0,'#e94560'); gbg.addColorStop(1,'#f5a623')
  roundRect(BOARD_X, bY, BOARD_W, bH, 16, gbg)
  ctx.shadowBlur=0; ctx.shadowColor='transparent'
  setFont(bH*0.36,'900'); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'
  ctx.fillText('开 始 游 戏', cx, bY+bH/2)
  L.startBtn = { x:BOARD_X, y:bY, w:BOARD_W, h:bH }

  var row2Y=bY+bH+GAP*1.5, row2H=BTN_H*0.95, halfW=(BOARD_W-GAP)/2
  roundRect(BOARD_X, row2Y, halfW, row2H, 14, C.surface, 'rgba(245,166,35,0.3)')
  setFont(row2H*0.34,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'
  ctx.fillStyle=C.accent2; ctx.fillText('排 行 榜', BOARD_X+halfW/2, row2Y+row2H/2)
  L.rankBtn = { x:BOARD_X, y:row2Y, w:halfW, h:row2H }

  var pkX=BOARD_X+halfW+GAP
  var pkGrad=ctx.createLinearGradient(pkX,0,pkX+halfW,0)
  pkGrad.addColorStop(0,'#e94560'); pkGrad.addColorStop(1,'#9b59b6')
  ctx.shadowColor='rgba(233,69,96,0.3)'; ctx.shadowBlur=10
  roundRect(pkX, row2Y, halfW, row2H, 14, pkGrad)
  ctx.shadowBlur=0; ctx.shadowColor='transparent'
  setFont(row2H*0.34,'900'); ctx.fillStyle='#fff'
  ctx.fillText('⚔ 好友 PK', pkX+halfW/2, row2Y+row2H/2)
  L.pkBtn = { x:pkX, y:row2Y, w:halfW, h:row2H }

  var backY=row2Y+row2H+GAP*1.2, backH=BTN_H*0.85

  // ── 成就 + 商店
  if (GameGlobal.drawLobbyAchieveProps) {
    var apResult = GameGlobal.drawLobbyAchieveProps('2048', backY)
    L._achieveBtn = apResult.achieveBtn
    L._shopBtn = apResult.shopBtn
    backY = (apResult.endY || backY) + GAP * 0.8
  }

  roundRect(BOARD_X, backY, BOARD_W, backH, 14, C.surface, 'rgba(255,255,255,0.06)')
  setFont(backH*0.34,'700'); ctx.fillStyle=C.textDim
  ctx.fillText('← 返回主页', cx, backY+backH/2)
  L.backBtn = { x:BOARD_X, y:backY, w:BOARD_W, h:backH }
}

// ================================================
//  华容道大厅界面
// ================================================
GameGlobal.LobbyHuarongUI = { startBtn:null, rankBtn:null, pkBtn:null, backBtn:null, sizeBtns:[] }

GameGlobal.drawLobbyHuarongScreen = function() {
  drawBg(); drawStars()
  var cx = SW/2
  var L = GameGlobal.LobbyHuarongUI
  L.sizeBtns = []

  // 标题
  setFont(SW*0.075,'900'); ctx.textAlign='center'; ctx.textBaseline='middle'
  var tg=ctx.createLinearGradient(cx-SW*0.25,0,cx+SW*0.25,0)
  tg.addColorStop(0,'#1abc9c'); tg.addColorStop(1,'#3498db')
  ctx.shadowColor='rgba(52,152,219,0.4)'; ctx.shadowBlur=18; ctx.fillStyle=tg
  ctx.fillText('数字华容道', cx, SH*0.115)
  ctx.shadowBlur=0; ctx.shadowColor='transparent'
  setFont(SW*0.028,'600'); ctx.fillStyle='rgba(255,255,255,0.3)'
  ctx.fillText('还原数字，挑战最少步数！', cx, SH*0.175)

  // 选择棋盘大小
  setFont(SW*0.030,'700'); ctx.fillStyle=C.textDim; ctx.textAlign='center'
  ctx.fillText('选择棋盘大小', cx, SH*0.222)

  var sizes = [3,4,5,6,7,8,9,10]
  var selSz = GameGlobal._huarongSize || 4
  var szW = Math.floor((BOARD_W - GAP*3) / 4)
  var szH = Math.round(SH*0.057)
  var szGapX = Math.floor((BOARD_W - szW*4) / 3)
  for (var si=0; si<sizes.length; si++) {
    var sc = si%4, sr = Math.floor(si/4)
    var bx = BOARD_X + sc*(szW+szGapX)
    var by = SH*0.242 + sr*(szH+GAP)
    var sz = sizes[si]
    var isSel = (sz === selSz)
    if (isSel) {
      var sg=ctx.createLinearGradient(bx,0,bx+szW,0)
      sg.addColorStop(0,'#1abc9c'); sg.addColorStop(1,'#3498db')
      roundRect(bx,by,szW,szH,10,sg)
    } else {
      roundRect(bx,by,szW,szH,10,C.surface,'rgba(255,255,255,0.12)')
    }
    setFont(szH*0.38,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillStyle = isSel ? '#fff' : C.textDim
    ctx.fillText(sz+'×'+sz, bx+szW/2, by+szH/2)
    L.sizeBtns.push({x:bx,y:by,w:szW,h:szH,size:sz})
  }

  // 历史最优（按当前尺寸）
  var bestKey = 'huarongBest_' + selSz + 'x' + selSz
  var best = wx.getStorageSync(bestKey) || 0
  var cardY = SH*0.242 + 2*(szH+GAP) + GAP
  var cardH = BTN_H*0.95
  roundRect(BOARD_X, cardY, BOARD_W, cardH, 14, C.surface, 'rgba(26,188,156,0.18)')
  setFont(SW*0.026,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=C.textDim
  ctx.fillText(selSz+'×'+selSz+' 历史最优', cx, cardY+cardH*0.3)
  setFont(best>0 ? SW*0.048 : SW*0.032,'900')
  ctx.fillStyle = best>0 ? '#1abc9c' : C.textDim
  ctx.fillText(best>0 ? best+' 步' : '暂无记录', cx, cardY+cardH*0.72)

  // 开始游戏
  var bY = cardY+cardH+GAP*1.5, bH = BTN_H*1.1
  ctx.shadowColor='rgba(52,152,219,0.5)'; ctx.shadowBlur=20
  var gbg=ctx.createLinearGradient(BOARD_X,0,BOARD_X+BOARD_W,0)
  gbg.addColorStop(0,'#1abc9c'); gbg.addColorStop(1,'#3498db')
  roundRect(BOARD_X,bY,BOARD_W,bH,16,gbg)
  ctx.shadowBlur=0; ctx.shadowColor='transparent'
  setFont(bH*0.36,'900'); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'
  ctx.fillText('开 始 游 戏', cx, bY+bH/2)
  L.startBtn={x:BOARD_X,y:bY,w:BOARD_W,h:bH}

  // 排行榜 + 好友PK（两列）
  var r2Y=bY+bH+GAP*1.5, r2H=BTN_H*0.95
  var hw=Math.floor((BOARD_W-GAP)/2)
  var pkX=BOARD_X+hw+GAP
  roundRect(BOARD_X,r2Y,hw,r2H,14,C.surface,'rgba(26,188,156,0.4)')
  setFont(r2H*0.34,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'
  ctx.fillStyle='#1abc9c'; ctx.fillText('排 行 榜', BOARD_X+hw/2, r2Y+r2H/2)
  L.rankBtn={x:BOARD_X,y:r2Y,w:hw,h:r2H}

  var pg=ctx.createLinearGradient(pkX,0,pkX+hw,0)
  pg.addColorStop(0,'#e94560'); pg.addColorStop(1,'#9b59b6')
  ctx.shadowColor='rgba(233,69,96,0.4)'; ctx.shadowBlur=12
  roundRect(pkX,r2Y,hw,r2H,14,pg)
  ctx.shadowBlur=0; ctx.shadowColor='transparent'
  setFont(r2H*0.30,'700'); ctx.fillStyle='#fff'; ctx.textAlign='center'
  ctx.fillText('✕ 好友PK', pkX+hw/2, r2Y+r2H/2)
  L.pkBtn={x:pkX,y:r2Y,w:hw,h:r2H}

  // 返回主页
  var backY=r2Y+r2H+GAP*1.0, backH=BTN_H*0.85

  // ── 成就 + 商店
  if (GameGlobal.drawLobbyAchieveProps) {
    var apResult = GameGlobal.drawLobbyAchieveProps('huarong', backY)
    L._achieveBtn = apResult.achieveBtn
    L._shopBtn = apResult.shopBtn
    backY = (apResult.endY || backY) + GAP * 0.8
  }

  roundRect(BOARD_X,backY,BOARD_W,backH,14,C.surface,'rgba(255,255,255,0.06)')
  setFont(backH*0.34,'700'); ctx.fillStyle=C.textDim; ctx.textAlign='center'
  ctx.fillText('← 返回主页', cx, backY+backH/2)
  L.backBtn={x:BOARD_X,y:backY,w:BOARD_W,h:backH}
}

// ================================================
//  游戏界面
// ================================================
GameGlobal.GameUI = { undoBtn:null, undoItemBtn:null, newBtn:null, settingBtn:null, overlayBtn:null, continueBtn:null, helpBtn:null }

GameGlobal.cellXY = function(r, c) {
  return [ BOARD_X + GAP + c*(CELL_SZ+GAP), BOARD_Y + GAP + r*(CELL_SZ+GAP) ]
}

GameGlobal.drawScoreBox = function(x, y, w, h, label, value) {
  roundRect(x, y, w, h, 12, C.surface, 'rgba(255,255,255,0.07)')
  setFont(w*0.15, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim; ctx.fillText(label, x+w/2, y+h*0.3)
  var digits = String(value).length
  var fs = digits <= 4 ? w*0.21 : digits <= 6 ? w*0.17 : w*0.13
  setFont(fs, '900'); ctx.fillStyle = C.textLight; ctx.fillText(String(value), x+w/2, y+h*0.72)
}

GameGlobal.drawTile = function(t) {
  var sp = t.slideProgress != null ? t.slideProgress : 1
  // easeOutCubic 缓动
  var ease = sp >= 1 ? 1 : 1 - Math.pow(1 - sp, 3)

  var toPos   = cellXY(t.r, t.c)
  var fromPos = (t.fromR != null && ease < 1) ? cellXY(t.fromR, t.fromC) : toPos
  var bx = fromPos[0] + (toPos[0] - fromPos[0]) * ease
  var by = fromPos[1] + (toPos[1] - fromPos[1]) * ease

  var sc = t.scale
  var cx = bx+CELL_SZ/2, cy = by+CELL_SZ/2
  var w = CELL_SZ*sc, h = CELL_SZ*sc, x = cx-w/2, y = cy-h/2
  var col = C.tiles[t.value] || C.tileHi
  if (t.value >= 128) { ctx.shadowColor = col.bg; ctx.shadowBlur = 14 }
  roundRect(x, y, w, h, 10*sc, col.bg)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  var digits = String(t.value).length
  var fs = CELL_SZ * (digits<=2 ? 0.42 : digits===3 ? 0.32 : 0.25) * sc
  setFont(fs, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = col.fg; ctx.fillText(String(t.value), cx, cy+1)
}

GameGlobal.drawGameOverlay = function() {
  var isClear = GameGlobal.Game.gameWon && !GameGlobal.Game.keepPlaying
  roundRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 16, GameGlobal.Game.gameWon ? 'rgba(20,10,40,0.92)' : 'rgba(15,15,35,0.93)')

  var cx = BOARD_X+BOARD_W/2, cy = BOARD_Y+BOARD_H/2, ts = BOARD_W*0.11

  setFont(ts*1.1, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 14
  if (isClear) {
    var tgrad = ctx.createLinearGradient(cx-ts*2, 0, cx+ts*2, 0)
    tgrad.addColorStop(0,'#f5a623'); tgrad.addColorStop(1,'#fff')
    ctx.fillStyle = tgrad; ctx.fillText('达到 2048 ！', cx, cy-ts*1.5)
  } else {
    ctx.fillStyle = '#fff'; ctx.fillText('游戏结束', cx, cy-ts*1.5)
  }
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  setFont(ts*0.58, '700'); ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText('用时 ' + GameGlobal.Timer.format(), cx, cy-ts*0.55)
  setFont(ts*0.65, '900'); ctx.fillStyle = C.accent2
  ctx.fillText(GameGlobal.Game.score + ' 分', cx, cy+ts*0.1)

  if (isClear) {
    setFont(ts*0.46, '700'); ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('选择你的荣耀：', cx, cy+ts*0.75)

    var bw = BOARD_W*0.82, bh = BTN_H*1.0, bx = cx-bw/2, by = cy+ts*1.1
    var bg1 = ctx.createLinearGradient(bx, 0, bx+bw, 0)
    bg1.addColorStop(0,'#e94560'); bg1.addColorStop(1,'#c73652')
    roundRect(bx, by, bw, bh, 14, bg1)
    setFont(bh*0.32, '900'); ctx.fillStyle = '#fff'
    ctx.fillText('结束游戏  →  冲击最速榜', cx, by+bh/2)
    GameUI.overlayBtn = { x:bx, y:by, w:bw, h:bh }

    var cw = bw, ch = bh, ccx = cx-cw/2, ccy = by+bh+GAP*1.5
    var bg2 = ctx.createLinearGradient(ccx, 0, ccx+cw, 0)
    bg2.addColorStop(0,'#f5a623'); bg2.addColorStop(1,'#e8941a')
    roundRect(ccx, ccy, cw, ch, 14, bg2)
    setFont(ch*0.32, '900'); ctx.fillStyle = '#fff'
    ctx.fillText('继续挑战  →  冲击最高分', cx, ccy+ch/2)
    GameUI.continueBtn = { x:ccx, y:ccy, w:cw, h:ch }
  } else {
    var bw = BOARD_W*0.58, bh = BTN_H*0.95, bx = cx-bw/2, by = cy+ts*0.9
    roundRect(bx, by, bw, bh, 14, '#fff')
    setFont(bh*0.36, '900'); ctx.fillStyle = '#1a1a2e'
    ctx.fillText('再来一局', cx, by+bh/2)
    GameUI.overlayBtn = { x:bx, y:by, w:bw, h:bh }
    GameUI.continueBtn = null
  }
}

GameGlobal.drawGameScreen = function() {
  drawBg()

  // 第一排：设置 + 分数框
  var row1Y = TOP_PAD, iconSz = ROW1_H
  roundRect(PAD, row1Y, iconSz, iconSz, 12, C.surface, 'rgba(255,255,255,0.08)')
  setFont(iconSz*0.32, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textLight; ctx.fillText('设置', PAD+iconSz/2, row1Y+iconSz/2)
  GameUI.settingBtn = { x:PAD, y:row1Y, w:iconSz, h:iconSz }

  GameUI.helpBtn = null  // 玩法介绍入口在设置里

  var sboxW = Math.floor((BOARD_W-iconSz-GAP*3)/2)
  drawScoreBox(PAD+iconSz+GAP,        row1Y, sboxW, ROW1_H, '分数', GameGlobal.Game.score)
  drawScoreBox(PAD+iconSz+GAP*2+sboxW, row1Y, sboxW, ROW1_H, '最高', GameGlobal.Game.best)

  // 第二排：计时器
  var row2Y = row1Y + ROW1_H + Math.round(SH*0.008)
  setFont(SW*0.058, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim; ctx.fillText('⏱  ' + GameGlobal.Timer.format(), SW/2, row2Y+ROW2_H/2)

  // 棋盘
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10
  roundRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 16, C.board)
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'
  roundRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 16, null, 'rgba(255,255,255,0.05)')
  for (var r = 0; r < SIZE; r++)
    for (var c = 0; c < SIZE; c++) {
      var pos = cellXY(r, c); roundRect(pos[0], pos[1], CELL_SZ, CELL_SZ, 10, C.cellEmpty)
    }
  GameGlobal.Game.updateAnimations()
  for (var i = 0; i < GameGlobal.Game.tiles.length; i++) drawTile(GameGlobal.Game.tiles[i])

  // 底部按钮区：撤销道具（左）+ 新游戏（右）
  var btnY      = BOARD_Y + BOARD_H + Math.round(SH*0.022)
  var btnW      = Math.round(BOARD_W * 0.44)
  var btnGp     = BOARD_W - btnW * 2
  var undoItemX = BOARD_X
  var newX      = BOARD_X + btnW + btnGp

  // 撤销按钮：免费 > 道具 > 广告
  var itemLeft = GameGlobal.Game.undoItem.left
  var propCount = (GameGlobal.AchieveShop ? GameGlobal.AchieveShop.getPropCount('prop_undo') : 0)
  var hasFree  = itemLeft > 0
  var hasProp  = propCount > 0

  var itemBg = hasFree ? '#9b59b6' : hasProp ? '#27ae60' : '#e8941a'
  roundRect(undoItemX, btnY, btnW, BTN_H, 14, itemBg, 'rgba(255,255,255,0.08)')
  setFont(BTN_H*0.30, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText('撤  销', undoItemX+btnW/2, btnY+BTN_H*0.38)
  setFont(BTN_H*0.22, '700')
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  if (hasFree) {
    ctx.fillText('免费 ' + itemLeft + ' 次', undoItemX+btnW/2, btnY+BTN_H*0.72)
  } else if (hasProp) {
    ctx.fillText('道具 ×' + propCount, undoItemX+btnW/2, btnY+BTN_H*0.72)
  } else {
    ctx.fillText('▶ 看广告', undoItemX+btnW/2, btnY+BTN_H*0.72)
  }
  GameGlobal.GameUI.undoItemBtn = { x:undoItemX, y:btnY, w:btnW, h:BTN_H }
  GameGlobal.GameUI.undoBtn     = null

  drawBtn(newX, btnY, btnW, BTN_H, '新游戏', C.accent, '#fff')
  GameGlobal.GameUI.newBtn = { x:newX, y:btnY, w:btnW, h:BTN_H }

  if (GameGlobal.Game.gameOver) drawGameOverlay()
}

// ================================================
//  设置界面
// ================================================
GameGlobal.SettingsUI = { backBtn:null, homeBtn:null, soundRow:null, musicRow:null, editNameBtn:null, tutBtn:null }

GameGlobal.drawToggleRow = function(x, y, w, h, title, subtitle, isOn) {
  setFont(h*0.28, '800'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textLight; ctx.fillText(title, x, y+h*0.3)
  setFont(h*0.2, '700'); ctx.fillStyle = C.textDim; ctx.fillText(subtitle, x, y+h*0.65)
  var tw = w*0.24, th = h*0.45, tx = x+w-tw, ty = y+(h-th)/2
  roundRect(tx, ty, tw, th, th/2, isOn ? 'rgba(46,204,113,0.9)' : 'rgba(100,100,120,0.6)')
  var kr = th*0.4, kx = isOn ? tx+tw-kr-th*0.12 : tx+kr+th*0.12
  ctx.beginPath(); ctx.arc(kx, ty+th/2, kr, 0, Math.PI*2)
  ctx.fillStyle = '#fff'; ctx.fill()
  setFont(h*0.2, '800'); ctx.textAlign = 'center'
  ctx.fillStyle = isOn ? '#2ecc71' : C.textDim
  ctx.fillText(isOn ? '开启' : '关闭', tx+tw/2, ty+th+h*0.18)
}

GameGlobal.drawSettingsScreen = function() {
  drawBg()
  var cx = SW/2

  setFont(SW*0.072, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx-SW*0.2, 0, cx+SW*0.2, 0)
  tg.addColorStop(0,'#f5a623'); tg.addColorStop(1,'#e94560')
  ctx.shadowColor = 'rgba(233,69,96,0.3)'; ctx.shadowBlur = 12
  ctx.fillStyle = tg; ctx.fillText('系统设置', cx, SH*0.12)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  var cardX = PAD, cardW = SW-PAD*2, cardY = SH*0.20, cardH = SH*0.60
  roundRect(cardX, cardY, cardW, cardH, 20, C.surface, 'rgba(255,255,255,0.07)')

  var rowH = cardH/4, rowPad = PAD*1.2
  drawToggleRow(cardX+rowPad, cardY+rowH*0.12, cardW-rowPad*2, rowH*0.78, '游戏音效', '移动、合并等声音', GameGlobal.Sound.enabled)
  SettingsUI.soundRow = { x:cardX, y:cardY, w:cardW, h:rowH }

  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(cardX+PAD, cardY+rowH); ctx.lineTo(cardX+cardW-PAD, cardY+rowH); ctx.stroke()

  drawToggleRow(cardX+rowPad, cardY+rowH*1.12, cardW-rowPad*2, rowH*0.78, '背景音乐', '游戏中循环播放', GameGlobal.Sound.musicEnabled)
  SettingsUI.musicRow = { x:cardX, y:cardY+rowH, w:cardW, h:rowH }

  ctx.beginPath(); ctx.moveTo(cardX+PAD, cardY+rowH*2); ctx.lineTo(cardX+cardW-PAD, cardY+rowH*2); ctx.stroke()

  // 玩法介绍按钮（仅游戏内设置显示）
  var _fg = GameGlobal._fromGame
  if (_fg === 'game' || _fg === 'huarong' || _fg === 'sudoku') {
    var tutLabel = _fg === 'huarong' ? '❓  华容道玩法介绍' : (_fg === 'sudoku' ? '❓  数独玩法介绍' : '❓  2048 玩法介绍')
    var tutY = cardY + rowH*2.15, tutW = cardW*0.7, tutX = cx - tutW/2
    roundRect(tutX, tutY, tutW, rowH*0.55, 10, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)')
    setFont(SW*0.028, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim
    ctx.fillText(tutLabel, cx, tutY + rowH*0.275)
    SettingsUI.tutBtn = { x:tutX, y:tutY, w:tutW, h:rowH*0.55 }
  } else {
    SettingsUI.tutBtn = null
  }

  setFont(SW*0.028, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillText('数字空间实验室  v1.0', cx, cardY+cardH-rowH*0.35)
  SettingsUI.editNameBtn = null

  var btnAreaY = cardY+cardH+GAP*2, btnW = (cardW-GAP)/2
  drawBtn(cardX,            btnAreaY, btnW, BTN_H, '返回游戏', C.surface, C.textLight)
  drawBtn(cardX+btnW+GAP,   btnAreaY, btnW, BTN_H, '回主页面', C.accent,  '#fff')
  SettingsUI.backBtn = { x:cardX,          y:btnAreaY, w:btnW, h:BTN_H }
  SettingsUI.homeBtn = { x:cardX+btnW+GAP, y:btnAreaY, w:btnW, h:BTN_H }
}

// ================================================
//  管理后台界面（游戏内嵌）
// ================================================
GameGlobal.AdminUI = { backBtn:null, confirmBtn:null, cancelBtn:null }
GameGlobal._adminData = { stats:null, users:[], logs:[], tab:'stats', page:1, loading:false, loginPwd:'', loggedIn:false }

GameGlobal.drawAdminLoginScreen = function() {
  drawBg()
  var cx = SW/2, cy = SH/2
  var AD = GameGlobal._adminData

  roundRect(SW*0.07, SH*0.2, SW*0.86, SH*0.55, 20, C.surface, 'rgba(255,255,255,0.08)')

  setFont(SW*0.055, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx-SW*0.2,0,cx+SW*0.2,0)
  tg.addColorStop(0,'#f5a623'); tg.addColorStop(1,'#e94560')
  ctx.fillStyle = tg; ctx.fillText('管理员登录', cx, SH*0.32)

  setFont(SW*0.032, '700')
  ctx.fillStyle = C.textDim; ctx.fillText('输入管理密钥', cx, SH*0.42)

  // 密码显示框
  var bw = SW*0.68, bh = SH*0.065, bx = cx-bw/2, by = SH*0.465
  roundRect(bx, by, bw, bh, 12, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.15)')
  setFont(bh*0.42, '700')
  var pwd = AD.loginPwd ? '●'.repeat(AD.loginPwd.length) : ''
  ctx.fillStyle = pwd ? C.textLight : C.textDim
  ctx.fillText(pwd || '点击此处输入密钥', cx, by+bh/2)
  GameGlobal.AdminUI.pwdBox = { x:bx, y:by, w:bw, h:bh }

  // 确认按钮
  var btnW = SW*0.5, btnH = SH*0.065, btnX = cx-btnW/2, btnY = SH*0.575
  var g = ctx.createLinearGradient(btnX,0,btnX+btnW,0)
  g.addColorStop(0,'#e94560'); g.addColorStop(1,'#9b59b6')
  roundRect(btnX, btnY, btnW, btnH, 12, g)
  setFont(btnH*0.38, '900'); ctx.fillStyle = '#fff'
  ctx.fillText('进入后台', cx, btnY+btnH/2)
  GameGlobal.AdminUI.confirmBtn = { x:btnX, y:btnY, w:btnW, h:btnH }

  // 返回
  setFont(SW*0.03, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('← 返回', cx, SH*0.68)
  GameGlobal.AdminUI.backBtn = { x:SW*0.3, y:SH*0.655, w:SW*0.4, h:SH*0.05 }
}

GameGlobal.drawAdminScreen = function() {
  drawBg()
  var cx = SW/2
  var AD = GameGlobal._adminData

  // 顶部标题栏
  roundRect(0, 0, SW, SH*0.1, 0, C.surface)
  setFont(SW*0.042, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx-SW*0.2,0,cx+SW*0.2,0)
  tg.addColorStop(0,'#f5a623'); tg.addColorStop(1,'#e94560')
  ctx.fillStyle = tg; ctx.fillText('管理后台', cx, SH*0.052)

  // 返回按钮
  setFont(SW*0.032, '700'); ctx.fillStyle = C.textDim
  ctx.textAlign = 'left'; ctx.fillText('← 退出', PAD, SH*0.052)
  GameGlobal.AdminUI.backBtn = { x:0, y:0, w:SW*0.25, h:SH*0.1 }

  // Tab 切换
  var tabs = ['stats','users','logs'], labels = ['概览','用户','日志']
  var tabW = BOARD_W/3, tabH = SH*0.06, tabY = SH*0.10
  for (var i=0; i<tabs.length; i++) {
    var tx = BOARD_X + tabW*i
    var isActive = AD.tab === tabs[i]
    roundRect(tx, tabY, tabW, tabH, 0, isActive ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.03)')
    ctx.strokeStyle = isActive ? C.accent : 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.strokeRect(tx, tabY, tabW, tabH)
    setFont(SW*0.032, isActive?'900':'700')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isActive ? C.accent : C.textDim
    ctx.fillText(labels[i], tx+tabW/2, tabY+tabH/2)
    GameGlobal.AdminUI['tab'+i] = { x:tx, y:tabY, w:tabW, h:tabH }
  }

  var contentY = tabY + tabH + GAP

  if (AD.loading) {
    setFont(SW*0.035, '700'); ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillStyle = C.textDim; ctx.fillText('加载中...', cx, contentY + SH*0.15)
    return
  }

  if (AD.tab === 'stats') GameGlobal._drawAdminStats(contentY)
  if (AD.tab === 'users') GameGlobal._drawAdminUsers(contentY)
  if (AD.tab === 'logs')  GameGlobal._drawAdminLogs(contentY)
}

GameGlobal._drawAdminStats = function(y) {
  var cx = SW/2
  var s = GameGlobal._adminData.stats
  if (!s) { GameGlobal._adminLoadStats(); return }

  var items = [
    { label:'总用户', value: s.totalUsers||0, color:'#e94560' },
    { label:'今日活跃', value: s.todayActive||0, color:'#2ecc71' },
    { label:'总记录', value: s.totalLogs||0, color:'#f5a623' },
    { label:'最高分', value: s.topScore?s.topScore.score:0, color:'#9b59b6' }
  ]
  var cw = (BOARD_W-GAP*3)/2, ch = SH*0.14
  for (var i=0; i<items.length; i++) {
    var col = i%2, row = Math.floor(i/2)
    var cx2 = BOARD_X + col*(cw+GAP), cy2 = y + row*(ch+GAP)
    roundRect(cx2, cy2, cw, ch, 14, C.surface, 'rgba(255,255,255,0.06)')
    setFont(SW*0.026, '700'); ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillStyle = C.textDim; ctx.fillText(items[i].label, cx2+cw/2, cy2+ch*0.28)
    setFont(SW*0.065, '900'); ctx.fillStyle = items[i].color
    ctx.fillText(String(items[i].value), cx2+cw/2, cy2+ch*0.68)
  }

  if (s.topScore && s.topScore.nickname) {
    setFont(SW*0.028, '700'); ctx.fillStyle = C.textDim; ctx.textAlign='center'
    ctx.fillText('最高分：' + s.topScore.nickname, cx, y + ch*2+GAP*2+SH*0.04)
  }

  var ry = y + ch*2+GAP*2+SH*0.09
  roundRect(BOARD_X, ry, BOARD_W, SH*0.065, 12, C.accent)
  setFont(SW*0.033, '900'); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'
  ctx.fillText('刷新数据', cx, ry+SH*0.0325)
  GameGlobal.AdminUI.refreshBtn = { x:BOARD_X, y:ry, w:BOARD_W, h:SH*0.065 }
}

GameGlobal._drawAdminUsers = function(y) {
  var cx = SW/2
  var users = GameGlobal._adminData.users
  if (!users || users.length === 0) {
    GameGlobal._adminLoadUsers()
    setFont(SW*0.032,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillStyle=C.textDim; ctx.fillText('加载中...', cx, y+SH*0.15)
    return
  }
  var rowH = SH*0.085, rowY = y
  for (var i=0; i<Math.min(users.length,6); i++) {
    var u = users[i]
    var ry = rowY + i*(rowH+GAP*0.5)
    roundRect(BOARD_X, ry, BOARD_W, rowH, 10, C.surface, 'rgba(255,255,255,0.04)')
    // 头像
    var avR = rowH*0.32
    ctx.beginPath(); ctx.arc(BOARD_X+PAD+avR, ry+rowH/2, avR, 0, Math.PI*2)
    ctx.fillStyle = u.banned ? 'rgba(231,76,60,0.3)' : 'rgba(245,166,35,0.3)'; ctx.fill()
    setFont(avR*0.9,'900'); ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillStyle=C.textLight; ctx.fillText((u.nickName||'?')[0], BOARD_X+PAD+avR, ry+rowH/2)
    // 名字
    setFont(SW*0.032,'700'); ctx.textAlign='left'; ctx.fillStyle=C.textLight
    ctx.fillText(u.nickName||'神秘玩家', BOARD_X+PAD*2+avR*2, ry+rowH*0.35)
    setFont(SW*0.024,'500'); ctx.fillStyle=C.textDim
    ctx.fillText('分数 '+( u.best_score||0), BOARD_X+PAD*2+avR*2, ry+rowH*0.65)
    // 删除按钮
    var dbW=SW*0.16, dbH=rowH*0.5, dbX=BOARD_X+BOARD_W-dbW-GAP, dbY=ry+(rowH-dbH)/2
    roundRect(dbX, dbY, dbW, dbH, 8, 'rgba(231,76,60,0.2)', 'rgba(231,76,60,0.4)')
    setFont(dbH*0.38,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillStyle='#e74c3c'; ctx.fillText('删除', dbX+dbW/2, dbY+dbH/2)
    GameGlobal.AdminUI['delBtn'+i] = { x:dbX, y:dbY, w:dbW, h:dbH, openid: u.openid||u._id, nick: u.nickName }
  }
}

GameGlobal._drawAdminLogs = function(y) {
  var cx = SW/2
  var logs = GameGlobal._adminData.logs
  if (!logs || logs.length === 0) {
    GameGlobal._adminLoadLogs()
    setFont(SW*0.032,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillStyle=C.textDim; ctx.fillText('加载中...', cx, y+SH*0.15)
    return
  }
  var rowH = SH*0.075, al = { score_upload:'上传分数', game_start:'开始游戏' }
  for (var i=0; i<Math.min(logs.length,7); i++) {
    var l = logs[i]
    var ry = y + i*(rowH+GAP*0.3)
    roundRect(BOARD_X, ry, BOARD_W, rowH, 8, C.surface, 'rgba(255,255,255,0.04)')
    setFont(SW*0.028,'700'); ctx.textAlign='left'; ctx.textBaseline='middle'
    ctx.fillStyle=C.textLight; ctx.fillText(l.nickName||'--', BOARD_X+PAD, ry+rowH*0.35)
    setFont(SW*0.023,'500'); ctx.fillStyle=C.textDim
    var dateStr = l.createdAt ? new Date(l.createdAt.$date||l.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : '--'
    ctx.fillText((al[l.action]||l.action) + '  ' + dateStr, BOARD_X+PAD, ry+rowH*0.72)
    if (l.score != null) {
      setFont(SW*0.032,'900'); ctx.textAlign='right'; ctx.fillStyle=C.accent2
      ctx.fillText(String(l.score), BOARD_X+BOARD_W-PAD, ry+rowH/2)
    }
  }
}

GameGlobal._adminLoadStats = function() {
  var AD = GameGlobal._adminData
  if (AD.loading) return
  AD.loading = true
  wx.cloud.callFunction({
    name: 'adminAPI',
    data: { action:'getStats', adminKey: AD.key },
    success: function(r) { AD.stats = r.result; AD.loading = false },
    fail:    function()  { AD.loading = false }
  })
}
GameGlobal._adminLoadUsers = function() {
  var AD = GameGlobal._adminData
  if (AD.loading) return
  AD.loading = true
  wx.cloud.callFunction({
    name: 'adminAPI',
    data: { action:'getUsers', page:1, pageSize:6, adminKey: AD.key },
    success: function(r) { AD.users = (r.result&&r.result.data)||[]; AD.loading = false },
    fail:    function()  { AD.loading = false }
  })
}
GameGlobal._adminLoadLogs = function() {
  var AD = GameGlobal._adminData
  if (AD.loading) return
  AD.loading = true
  wx.cloud.callFunction({
    name: 'adminAPI',
    data: { action:'getLogs', page:1, pageSize:7, adminKey: AD.key },
    success: function(r) { AD.logs = (r.result&&r.result.data)||[]; AD.loading = false },
    fail:    function()  { AD.loading = false }
  })
}


// ================================================
//  玩法介绍界面（2048 / 华容道 通用）
// ================================================
GameGlobal.TutorialUI = { backBtn:null, prevBtn:null, nextBtn:null, page:0 }

GameGlobal.drawTutorialScreen = function() {
  drawBg()
  var cx = SW/2, T = GameGlobal.TutorialUI

  var pages2048 = [
    {
      title: '什么是2048？', icon: '🎮',
      lines: ['在4×4的格子中滑动方块','相同数字的方块会合并','合并后数字翻倍','目标：拼出2048方块！']
    },
    {
      title: '如何操作？', icon: '👆',
      lines: ['上下左右滑动屏幕','所有方块同时向同一方向移动','移动后会随机出现新方块','新方块数字为 2 或 4']
    },
    {
      title: '合并规则', icon: '✨',
      lines: ['两个相同数字碰撞时合并','2+2=4，4+4=8，以此类推','每次滑动只能合并一次','合并会累计得分']
    },
    {
      title: '游戏结束', icon: '💡',
      lines: ['当格子填满且无法合并时结束','达到2048即为通关（可继续）','善用撤销功能挽救失误','挑战最高分，超越好友！']
    }
  ]

  var pagesHuarong = [
    {
      title: '什么是数字华容道？', icon: '🧩',
      lines: ['4×4方格，数字1-15随机排列','右下角有一个空格','滑动方块填入空格','目标：将数字还原为1-15顺序！']
    },
    {
      title: '如何移动？', icon: '👆',
      lines: ['点击空格旁边的方块移入空格','也可以滑动整行或整列','同行/列多块可一次整体滑动','每滑动一格计为一步']
    },
    {
      title: '胜利条件', icon: '🏆',
      lines: ['1-15按顺序排列即胜利','空格必须在右下角','步数越少成绩越好','用时越短排名越高']
    },
    {
      title: '技巧提示', icon: '💡',
      lines: ['先还原第一行，再还原第二行','逐步推进，避免打乱已完成区域','熟悉后可挑战最少步数','在大厅查看排行榜超越好友！']
    }
  ]

  var pagesSudoku = [
    {
      title: '基本规则', icon: '🔢',
      lines: ['在 9×9 的格子中填入 1-9','每行每列每个 3×3 宫格','数字 1-9 各出现一次','灰色数字是题目，不可修改']
    },
    {
      title: '操作方法', icon: '👆',
      lines: ['点击格子选中','点击下方数字按钮填入','「笔记」模式记录候选数字','「擦除」清空当前格子']
    },
    {
      title: '技巧提示', icon: '💡',
      lines: ['先找只有一个候选数的格子','善用笔记记录候选数字','从数字多的行列宫格入手','错误填入会以红色标记']
    }
  ]

  var pages = (GameGlobal._tutorialFor === 'huarong') ? pagesHuarong : (GameGlobal._tutorialFor === 'sudoku') ? pagesSudoku : pages2048

  var p = T.page
  var pg = pages[p]

  // 卡片
  var cw = BOARD_W, ch = SH*0.62, cx2 = BOARD_X, cy2 = SH*0.14
  roundRect(cx2, cy2, cw, ch, 22, C.surface, 'rgba(255,255,255,0.06)')

  // 标题
  setFont(SW*0.05, '900'); ctx.textAlign='center'; ctx.textBaseline='middle'
  var tg = ctx.createLinearGradient(cx-SW*0.2,0,cx+SW*0.2,0)
  tg.addColorStop(0,'#f5a623'); tg.addColorStop(1,'#e94560')
  ctx.fillStyle = tg; ctx.fillText('玩法介绍', cx, SH*0.07)

  // icon
  setFont(SW*0.13, '900'); ctx.fillStyle = '#fff'
  ctx.fillText(pg.icon, cx, cy2 + ch*0.18)

  // page title
  setFont(SW*0.048, '900')
  var ptg = ctx.createLinearGradient(cx-SW*0.2,0,cx+SW*0.2,0)
  ptg.addColorStop(0,'#f5a623'); ptg.addColorStop(1,'#e94560')
  ctx.fillStyle = ptg; ctx.fillText(pg.title, cx, cy2 + ch*0.33)

  // lines
  for (var i=0; i<pg.lines.length; i++) {
    var ly = cy2 + ch*0.46 + i * SH*0.07
    roundRect(cx2+GAP*2, ly-SH*0.025, cw-GAP*4, SH*0.052, 10, 'rgba(255,255,255,0.04)')
    setFont(SW*0.032, '700'); ctx.fillStyle = C.textLight
    ctx.fillText('• ' + pg.lines[i], cx, ly+SH*0.003)
  }

  // 页码指示点
  var dotY = cy2 + ch + GAP*1.5
  for (var d=0; d<pages.length; d++) {
    var dotX = cx + (d - (pages.length-1)/2) * SW*0.055
    ctx.beginPath(); ctx.arc(dotX, dotY, SW*0.013, 0, Math.PI*2)
    ctx.fillStyle = d===p ? C.accent : 'rgba(255,255,255,0.2)'; ctx.fill()
  }

  // 上一页 / 下一页
  var btnW = BOARD_W*0.42, btnH = BTN_H*0.85, btnY = dotY + GAP*2.5
  if (p > 0) {
    roundRect(BOARD_X, btnY, btnW, btnH, 12, C.surface, 'rgba(255,255,255,0.1)')
    setFont(btnH*0.36,'700'); ctx.fillStyle = C.textLight
    ctx.fillText('← 上一页', BOARD_X+btnW/2, btnY+btnH/2)
    T.prevBtn = { x:BOARD_X, y:btnY, w:btnW, h:btnH }
  } else { T.prevBtn = null }

  if (p < pages.length-1) {
    var nextX = BOARD_X + BOARD_W - btnW
    var ng = ctx.createLinearGradient(nextX,0,nextX+btnW,0)
    ng.addColorStop(0,'#e94560'); ng.addColorStop(1,'#f5a623')
    roundRect(nextX, btnY, btnW, btnH, 12, ng)
    setFont(btnH*0.36,'900'); ctx.fillStyle = '#fff'
    ctx.fillText('下一页 →', nextX+btnW/2, btnY+btnH/2)
    T.nextBtn = { x:nextX, y:btnY, w:btnW, h:btnH }
  } else { T.nextBtn = null }

  // 返回按钮
  var backY = btnY + btnH + GAP*1.5
  roundRect(BOARD_X, backY, BOARD_W, BTN_H*0.75, 12, C.surface, 'rgba(255,255,255,0.06)')
  setFont(BTN_H*0.3,'700'); ctx.fillStyle = C.textDim
  ctx.fillText('返回', cx, backY+BTN_H*0.375)
  T.backBtn = { x:BOARD_X, y:backY, w:BOARD_W, h:BTN_H*0.75 }
}