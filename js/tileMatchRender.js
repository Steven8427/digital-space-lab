// ================================================
//  tileMatchRender.js — 三消堆叠 渲染（卡通风格）
//  大厅 / 游戏界面 / 结算 / 排行榜
// ================================================
var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP
var BOARD_W = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
var BTN_H = GameGlobal.BTN_H, C = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg = GameGlobal.drawBg, drawBtn = GameGlobal.drawBtn, inRect = GameGlobal.inRect

// ── 卡通配色方案 ──
var TOON = {
  sky1: '#87CEEB', sky2: '#E0F4FF',     // 天蓝渐变
  warm1: '#FF9A56', warm2: '#FF6B35',    // 暖橙按钮
  green1: '#6BCB77', green2: '#4CAF50',  // 绿色按钮
  wood: '#8B6914', woodLight: '#C4944A', // 木质
  card: '#FFF8F0',                       // 卡片白
  shadow: 'rgba(0,0,0,0.12)',
  textDark: '#4A3728',                   // 深棕文字
  textWarm: '#8B5E3C',                   // 暖棕文字
  gold: '#FFB800',
  red: '#FF5252',
  purple: '#A66CFF',
}

// 卡通背景绘制
function _drawCartoonBg() {
  var g = ctx.createLinearGradient(0, 0, 0, SH)
  g.addColorStop(0, TOON.sky1); g.addColorStop(0.5, TOON.sky2)
  g.addColorStop(0.7, '#C8E6C9'); g.addColorStop(1, '#A5D6A7')
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH)
  // 淡云朵
  ctx.globalAlpha = 0.3
  _drawCloud(SW * 0.15, SH * 0.06, SW * 0.18)
  _drawCloud(SW * 0.7, SH * 0.12, SW * 0.14)
  _drawCloud(SW * 0.45, SH * 0.03, SW * 0.12)
  ctx.globalAlpha = 1
}
function _drawCloud(x, y, w) {
  ctx.fillStyle = '#fff'
  var r = w * 0.3
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + r * 0.8, y - r * 0.3, r * 0.7, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + r * 1.5, y, r * 0.6, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x - r * 0.5, y + r * 0.1, r * 0.5, 0, Math.PI * 2); ctx.fill()
}

// 卡通圆角按钮（带阴影和高光）
function _drawCartoonBtn(x, y, w, h, radius, color1, color2, text, textColor, fontSize) {
  // 阴影
  roundRect(x + 2, y + 4, w, h, radius, 'rgba(0,0,0,0.15)')
  // 主体渐变
  var bg = ctx.createLinearGradient(x, y, x, y + h)
  bg.addColorStop(0, color1); bg.addColorStop(1, color2)
  roundRect(x, y, w, h, radius, bg)
  // 顶部高光
  ctx.globalAlpha = 0.25
  roundRect(x + 4, y + 2, w - 8, h * 0.4, radius, 'rgba(255,255,255,0.8)')
  ctx.globalAlpha = 1
  // 文字
  setFont(fontSize || h * 0.4, '800'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = textColor || '#fff'
  ctx.fillText(text, x + w / 2, y + h / 2 + 1)
}

// 木质面板
function _drawWoodPanel(x, y, w, h, radius) {
  // 阴影
  roundRect(x + 3, y + 5, w, h, radius, 'rgba(0,0,0,0.2)')
  // 木质渐变
  var wg = ctx.createLinearGradient(x, y, x, y + h)
  wg.addColorStop(0, '#D4A559'); wg.addColorStop(0.3, '#C4944A')
  wg.addColorStop(0.7, '#B8863E'); wg.addColorStop(1, '#A67832')
  roundRect(x, y, w, h, radius, wg)
  // 木纹线
  ctx.globalAlpha = 0.08
  for (var li = 0; li < 3; li++) {
    var ly = y + h * (0.25 + li * 0.25)
    ctx.beginPath(); ctx.moveTo(x + radius, ly); ctx.lineTo(x + w - radius, ly)
    ctx.strokeStyle = '#5D3A1A'; ctx.lineWidth = 1; ctx.stroke()
  }
  ctx.globalAlpha = 1
  // 边框
  roundRect(x, y, w, h, radius, null, '#8B6914')
}

// ================================================
//  大厅
// ================================================
GameGlobal.LobbyTileUI = { startBtn: null, rankBtn: null, backBtn: null }

GameGlobal.drawLobbyTileScreen = function() {
  _drawCartoonBg()
  var cx = SW / 2, L = GameGlobal.LobbyTileUI

  // ── 标题卡片
  var titleY = SH * 0.08
  _drawWoodPanel(BOARD_X - 10, titleY, BOARD_W + 20, SH * 0.12, 18)
  setFont(SW * 0.075, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFF8E1'
  ctx.fillText('三消堆叠', cx, titleY + SH * 0.06)

  // ── 副标题
  setFont(SW * 0.026, '600'); ctx.fillStyle = TOON.textWarm
  ctx.fillText('点击方块，三个一样就消除！', cx, SH * 0.235)

  // ── 最佳记录卡片
  var best = wx.getStorageSync('tileMatchBest') || 0
  var cardY = SH * 0.28, cardH = SH * 0.14
  roundRect(BOARD_X + 2, cardY + 4, BOARD_W, cardH, 16, 'rgba(0,0,0,0.1)')
  roundRect(BOARD_X, cardY, BOARD_W, cardH, 16, TOON.card)
  roundRect(BOARD_X, cardY, BOARD_W, cardH, 16, null, 'rgba(139,105,20,0.2)')

  setFont(SW * 0.024, '700'); ctx.textAlign = 'center'; ctx.fillStyle = TOON.textWarm
  ctx.fillText('最高通关', cx, cardY + cardH * 0.28)

  if (best > 0) {
    setFont(SW * 0.058, '900'); ctx.fillStyle = TOON.warm2
    ctx.fillText('第 ' + best + ' 关', cx, cardY + cardH * 0.68)
  } else {
    setFont(SW * 0.032, '700'); ctx.fillStyle = '#bbb'
    ctx.fillText('暂无记录', cx, cardY + cardH * 0.68)
  }

  // ── 玩法说明
  var infoY = cardY + cardH + GAP * 1.5
  var infoH = SH * 0.12
  roundRect(BOARD_X + 2, infoY + 3, BOARD_W, infoH, 14, 'rgba(0,0,0,0.08)')
  roundRect(BOARD_X, infoY, BOARD_W, infoH, 14, 'rgba(255,255,255,0.85)')
  setFont(SW * 0.022, '600'); ctx.fillStyle = TOON.textWarm; ctx.textAlign = 'center'
  ctx.fillText('点击没被盖住的方块放入槽位', cx, infoY + infoH * 0.25)
  ctx.fillText('三个一样的方块自动消除', cx, infoY + infoH * 0.52)
  ctx.fillText('槽位满了(7个)就输了', cx, infoY + infoH * 0.79)

  // ── 开始按钮
  var btnY = SH * 0.60
  var btnH = BTN_H * 1.4
  _drawCartoonBtn(BOARD_X, btnY, BOARD_W, btnH, 20, TOON.warm1, TOON.warm2,
    best > 0 ? '继续第 ' + (best + 1) + ' 关' : '开 始 游 戏', '#fff', btnH * 0.36)
  L.startBtn = { x: BOARD_X, y: btnY, w: BOARD_W, h: btnH }

  // ── 排行榜按钮
  var rkY = btnY + btnH + GAP * 1.2
  _drawCartoonBtn(BOARD_X, rkY, BOARD_W, BTN_H, 14, TOON.green1, TOON.green2,
    '排 行 榜', '#fff', BTN_H * 0.38)
  L.rankBtn = { x: BOARD_X, y: rkY, w: BOARD_W, h: BTN_H }

  // ── 返回按钮
  var bkY = rkY + BTN_H + GAP
  roundRect(BOARD_X + 2, bkY + 3, BOARD_W, BTN_H * 0.85, 12, 'rgba(0,0,0,0.08)')
  roundRect(BOARD_X, bkY, BOARD_W, BTN_H * 0.85, 12, 'rgba(255,255,255,0.7)')
  setFont(BTN_H * 0.32, '700'); ctx.textAlign = 'center'; ctx.fillStyle = TOON.textWarm
  ctx.fillText('← 返回主页', cx, bkY + BTN_H * 0.425)
  L.backBtn = { x: BOARD_X, y: bkY, w: BOARD_W, h: BTN_H * 0.85 }
}

// ================================================
//  游戏界面
// ================================================
GameGlobal.TileMatchUI = { undoBtn: null, moveOutBtn: null, shuffleBtn: null, retryBtn: null, nextBtn: null, exitBtn: null, holdBtns: [], backBtn: null, settingBtn: null }

GameGlobal.drawTileMatchScreen = function() {
  _drawCartoonBg()
  var TM = GameGlobal.TileMatch
  if (!TM) return
  var UI = GameGlobal.TileMatchUI
  var cx = SW / 2

  // ── 顶部木质栏（避开胶囊区域）
  var capsuleTop = SH * 0.06  // 胶囊下方安全区
  var headerH = SH * 0.07
  var headerY = capsuleTop
  _drawWoodPanel(-2, headerY, SW + 4, headerH, 0)

  // 返回按钮
  setFont(SW * 0.024, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFF8E1'
  ctx.fillText('← 退出', PAD + 4, headerY + headerH * 0.5)
  UI.backBtn = { x: 0, y: headerY, w: SW * 0.22, h: headerH }

  // 关卡标牌
  var lvW = SW * 0.30, lvH = headerH * 0.65
  var lvX = cx - lvW / 2, lvY = headerY + (headerH - lvH) / 2
  roundRect(lvX + 1, lvY + 2, lvW, lvH, 10, 'rgba(0,0,0,0.2)')
  var lvBg = ctx.createLinearGradient(lvX, lvY, lvX, lvY + lvH)
  lvBg.addColorStop(0, '#FF7043'); lvBg.addColorStop(1, '#E64A19')
  roundRect(lvX, lvY, lvW, lvH, 10, lvBg)
  setFont(lvH * 0.50, '900'); ctx.textAlign = 'center'
  ctx.fillStyle = '#FFF8E1'
  ctx.fillText('第 ' + TM.level + ' 关', cx, lvY + lvH * 0.52)

  // 设置按钮
  var stW = SW * 0.09, stH = headerH * 0.55
  var stX = SW - PAD - stW - 4, stY = headerY + (headerH - stH) / 2
  roundRect(stX + 1, stY + 2, stW, stH, 8, 'rgba(0,0,0,0.15)')
  roundRect(stX, stY, stW, stH, 8, 'rgba(255,255,255,0.2)')
  setFont(stH * 0.5, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFF8E1'; ctx.fillText('⚙', stX + stW / 2, stY + stH / 2)
  UI.settingBtn = { x: stX, y: stY, w: stW, h: stH }

  // ── 绘制方块（按层从下到上）
  var sortedTiles = TM.tiles.slice().sort(function(a, b) { return a.layer - b.layer })
  var now = Date.now()

  // 飞行动画参数
  var trayY_anim = SH * 0.78
  var trayW_anim = SW * 0.92
  var trayX_anim = (SW - trayW_anim) / 2
  var slotW_anim = trayW_anim / 7
  var flyDuration = 250

  for (var pi = 0; pi < sortedTiles.length; pi++) {
    var pt = sortedTiles[pi]
    if (!pt.removed || !pt._pickTime || !pt._flyFrom) continue
    var elapsed = now - pt._pickTime
    if (elapsed >= flyDuration) continue
    var progress = elapsed / flyDuration
    var ease = 1 - Math.pow(1 - progress, 3)
    var targetIdx = -1
    for (var ti = 0; ti < TM.tray.length; ti++) {
      if (TM.tray[ti].tileId === pt.id) { targetIdx = ti; break }
    }
    if (targetIdx < 0) continue
    var toX = trayX_anim + targetIdx * slotW_anim + 2
    var toY = trayY_anim + 6
    var toW = slotW_anim - 4
    var toH = SW * 0.14 - 8
    var curX = pt._flyFrom.x + (toX - pt._flyFrom.x) * ease
    var curY = pt._flyFrom.y + (toY - pt._flyFrom.y) * ease
    var curW = pt.w + (toW - pt.w) * ease
    var curH = pt.h + (toH - pt.h) * ease
    // 飞行中的卡片（代码绘制）
    ctx.globalAlpha = 1 - progress * 0.2
    roundRect(curX, curY + 2, curW, curH, 6, '#E8E0D8')
    roundRect(curX, curY, curW, curH - 2, 6, '#FFFDF7')
    ctx.globalAlpha = 1
    var iconImg = TM.getIconImg(pt.type)
    var fPad = curW * 0.10
    if (iconImg) {
      ctx.drawImage(iconImg, curX + fPad, curY + fPad, curW - fPad * 2, curH - fPad * 2)
    } else {
      var icon = TM.TILE_ICONS[pt.type % TM.TILE_ICONS.length]
      setFont(curW * 0.5, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(icon, curX + curW / 2, curY + curH / 2)
    }
  }

  // ── 绘制方块
  for (var i = 0; i < sortedTiles.length; i++) {
    var t = sortedTiles[i]
    if (t.removed) continue
    var free = TM.isFree(t, TM.tiles)
    var tw = t.w, th = t.h, dx = t.x, dy = t.y

    if (free) {
      // ── 自由方块：白色圆角卡片 + 浮起阴影 + 底部厚边
      // 阴影
      roundRect(dx + 1, dy + 3, tw, th, 8, 'rgba(0,0,0,0.15)')
      // 侧边厚度（3D 感）
      roundRect(dx, dy + 2, tw, th, 8, '#E8E0D8')
      // 主体白色面
      roundRect(dx, dy, tw, th - 2, 8, '#FFFDF7')
      // 顶部高光
      ctx.globalAlpha = 0.35
      roundRect(dx + 3, dy + 2, tw - 6, th * 0.3, 6, 'rgba(255,255,255,0.9)')
      ctx.globalAlpha = 1
    } else {
      // ── 被压方块：柔和灰色，微透明
      roundRect(dx, dy, tw, th, 6, 'rgba(180,175,170,0.5)')
      roundRect(dx + 1, dy + 1, tw - 2, th - 2, 5, 'rgba(200,195,190,0.45)')
    }

    // ── 图标
    var iconImg = TM.getIconImg(t.type)
    var pad = tw * 0.10
    if (!free) ctx.globalAlpha = 0.28
    if (iconImg) {
      ctx.drawImage(iconImg, dx + pad, dy + pad, tw - pad * 2, (free ? th - 2 : th) - pad * 2)
    } else {
      var icon = TM.TILE_ICONS[t.type % TM.TILE_ICONS.length]
      setFont(tw * 0.50, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = free ? TOON.textDark : '#888'
      ctx.fillText(icon, dx + tw / 2, dy + (free ? th - 2 : th) / 2)
    }
    ctx.globalAlpha = 1
  }

  // ── 消除粒子效果
  if (TM._elimAnim && now - TM._elimAnim.time < 400) {
    var ep = (now - TM._elimAnim.time) / 400
    var elimSlotW = trayW_anim / 7
    for (var ei = 0; ei < TM._elimAnim.positions.length; ei++) {
      var si = TM._elimAnim.positions[ei]
      var ecx = trayX_anim + si * elimSlotW + elimSlotW / 2
      var ecy = trayY_anim + SW * 0.07
      for (var star = 0; star < 8; star++) {
        var angle = (star / 8) * Math.PI * 2 + ep * 3
        var dist = ep * SW * 0.14
        var sx = ecx + Math.cos(angle) * dist
        var sy = ecy + Math.sin(angle) * dist - ep * 20
        var ss = Math.max(1, (1 - ep) * SW * 0.018)
        ctx.globalAlpha = 1 - ep
        ctx.fillStyle = ['#FFD700', '#FF6B6B', '#6BCB77', '#A66CFF'][star % 4]
        ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  // ── 底部木质槽位区
  var trayY = SH * 0.78
  var trayH = SW * 0.14
  var trayW = SW * 0.94
  var trayX = (SW - trayW) / 2
  var slotW = trayW / 7

  // 暂存区
  UI.holdBtns = []
  if (TM.holdArea && TM.holdArea.length > 0) {
    var holdY = trayY - trayH * 0.8 - GAP * 0.3
    setFont(SW * 0.020, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = TOON.textWarm; ctx.fillText('暂存区', cx, holdY - SW * 0.012)
    for (var hi = 0; hi < TM.holdArea.length; hi++) {
      var hx = cx - TM.holdArea.length * slotW / 2 + hi * slotW
      var hItem = TM.holdArea[hi]
      roundRect(hx + 3, holdY + 2, slotW - 6, trayH * 0.72, 8, 'rgba(0,0,0,0.1)')
      roundRect(hx + 3, holdY + 2, slotW - 6, trayH * 0.7, 8, '#E8E0D8')
      roundRect(hx + 3, holdY, slotW - 6, trayH * 0.7 - 2, 8, '#FFFDF7')
      var hIconImg = TM.getIconImg(hItem.type)
      var hPad = slotW * 0.12
      if (hIconImg) {
        ctx.drawImage(hIconImg, hx + hPad, holdY + hPad * 0.6, slotW - hPad * 2, trayH * 0.7 - hPad * 1.2)
      } else {
        var hIcon = TM.TILE_ICONS[hItem.type % TM.TILE_ICONS.length]
        setFont(trayH * 0.36, '700'); ctx.textAlign = 'center'; ctx.fillStyle = TOON.textDark
        ctx.fillText(hIcon, hx + slotW / 2, holdY + trayH * 0.35)
      }
      UI.holdBtns.push({ x: hx, y: holdY, w: slotW, h: trayH * 0.7, idx: hi })
    }
  }

  // 木质槽位背景
  _drawWoodPanel(trayX - 6, trayY - 6, trayW + 12, trayH + 12, 16)

  // 7个槽位
  for (var i = 0; i < 7; i++) {
    var sx = trayX + i * slotW
    // 槽位凹陷
    roundRect(sx + 3, trayY + 3, slotW - 6, trayH - 6, 8, 'rgba(0,0,0,0.2)')
    roundRect(sx + 3, trayY + 3, slotW - 6, trayH - 6, 8, 'rgba(90,60,30,0.3)')
    if (i < TM.tray.length) {
      var item2 = TM.tray[i]
      // 槽位中的卡片
      roundRect(sx + 4, trayY + 6, slotW - 8, trayH - 8, 6, '#E8E0D8')
      roundRect(sx + 4, trayY + 4, slotW - 8, trayH - 10, 6, '#FFFDF7')
      var trayIconImg = TM.getIconImg(item2.type)
      var tPad = slotW * 0.14
      if (trayIconImg) {
        ctx.drawImage(trayIconImg, sx + tPad, trayY + tPad, slotW - tPad * 2, trayH - tPad * 2)
      } else {
        var icon2 = TM.TILE_ICONS[item2.type % TM.TILE_ICONS.length]
        setFont(trayH * 0.45, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = TOON.textDark
        ctx.fillText(icon2, sx + slotW / 2, trayY + trayH / 2)
      }
    }
  }

  // ── 道具按钮
  var propY = trayY + trayH + GAP * 0.8
  var propW = Math.floor((trayW - GAP * 2) / 3)
  var propH = SH * 0.058

  // 撤回
  var p1x = trayX
  var undoLeft = TM.props.undo
  if (undoLeft > 0) {
    _drawCartoonBtn(p1x, propY, propW, propH, 12, '#6BCB77', '#4CAF50', '↩ 撤回 ×' + undoLeft, '#fff', propH * 0.34)
  } else {
    _drawCartoonBtn(p1x, propY, propW, propH, 12, '#FFB74D', '#FB8C00', '↩ 撤回 ▶', '#fff', propH * 0.34)
  }
  UI.undoBtn = { x: p1x, y: propY, w: propW, h: propH }

  // 移出
  var p2x = trayX + propW + GAP
  var moveLeft = TM.props.moveOut
  if (moveLeft > 0) {
    _drawCartoonBtn(p2x, propY, propW, propH, 12, '#42A5F5', '#1E88E5', '⬆ 移出 ×' + moveLeft, '#fff', propH * 0.34)
  } else {
    _drawCartoonBtn(p2x, propY, propW, propH, 12, '#FFB74D', '#FB8C00', '⬆ 移出 ▶', '#fff', propH * 0.34)
  }
  UI.moveOutBtn = { x: p2x, y: propY, w: propW, h: propH }

  // 打乱
  var p3x = trayX + (propW + GAP) * 2
  var shufLeft = TM.props.shuffle
  if (shufLeft > 0) {
    _drawCartoonBtn(p3x, propY, propW, propH, 12, '#AB47BC', '#8E24AA', '打乱 ×' + shufLeft, '#fff', propH * 0.34)
  } else {
    _drawCartoonBtn(p3x, propY, propW, propH, 12, '#FFB74D', '#FB8C00', '打乱 ▶', '#fff', propH * 0.34)
  }
  UI.shuffleBtn = { x: p3x, y: propY, w: propW, h: propH }

  // ── 胜利/失败覆盖层
  if (TM.gameOver || TM.victory) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, SW, SH)

    var cardY2 = SH * 0.22, cardH2 = SH * 0.42
    // 弹窗卡片
    roundRect(BOARD_X - 5 + 3, cardY2 + 5, BOARD_W + 10, cardH2, 24, 'rgba(0,0,0,0.2)')
    roundRect(BOARD_X - 5, cardY2, BOARD_W + 10, cardH2, 24, TOON.card)

    setFont(SW * 0.055, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (TM.victory) {
      ctx.fillStyle = TOON.warm2; ctx.fillText('通关成功！', cx, cardY2 + cardH2 * 0.14)
      // 星星装饰
      setFont(SW * 0.06, '400')
      ctx.fillText('⭐ ⭐ ⭐', cx, cardY2 + cardH2 * 0.28)
    } else {
      ctx.fillStyle = TOON.red; ctx.fillText('槽位已满', cx, cardY2 + cardH2 * 0.14)
      setFont(SW * 0.05, '400')
      ctx.fillText('😢', cx, cardY2 + cardH2 * 0.28)
    }

    // 统计
    setFont(SW * 0.028, '700'); ctx.fillStyle = TOON.textWarm
    ctx.fillText('第 ' + TM.level + ' 关', cx, cardY2 + cardH2 * 0.40)
    ctx.fillText('消除 ' + TM.score + ' 个方块', cx, cardY2 + cardH2 * 0.50)

    if (TM.victory) {
      setFont(SW * 0.032, '800'); ctx.fillStyle = TOON.gold
      ctx.fillText('+15 金币', cx, cardY2 + cardH2 * 0.62)
    }

    // 按钮
    if (TM.victory) {
      var nxY = cardY2 + cardH2 * 0.72
      var nxH = cardH2 * 0.18
      _drawCartoonBtn(BOARD_X + PAD, nxY, BOARD_W - PAD * 2, nxH, 14,
        TOON.warm1, TOON.warm2, '下 一 关', '#fff', nxH * 0.42)
      UI.nextBtn = { x: BOARD_X + PAD, y: nxY, w: BOARD_W - PAD * 2, h: nxH }
    } else {
      var halfW = (BOARD_W - PAD * 2 - GAP) / 2
      var ryY = cardY2 + cardH2 * 0.72, ryH = cardH2 * 0.18
      _drawCartoonBtn(BOARD_X + PAD, ryY, halfW, ryH, 12,
        TOON.warm1, TOON.warm2, '重 试', '#fff', ryH * 0.42)
      UI.retryBtn = { x: BOARD_X + PAD, y: ryY, w: halfW, h: ryH }

      roundRect(BOARD_X + PAD + halfW + GAP + 2, ryY + 3, halfW, ryH, 12, 'rgba(0,0,0,0.1)')
      roundRect(BOARD_X + PAD + halfW + GAP, ryY, halfW, ryH, 12, '#E0E0E0')
      setFont(ryH * 0.40, '700'); ctx.fillStyle = TOON.textWarm
      ctx.fillText('退 出', BOARD_X + PAD + halfW + GAP + halfW / 2, ryY + ryH / 2)
      UI.exitBtn = { x: BOARD_X + PAD + halfW + GAP, y: ryY, w: halfW, h: ryH }
    }
  }
}

// ================================================
//  排行榜
// ================================================
GameGlobal.TileMatchRank = {
  list: [], myRank: null, scrollY: 0, loading: false,
  load: function() {
    this.loading = true; this.scrollY = 0; var self = this
    wx.cloud.callFunction({
      name: 'leaderboard', data: { action: 'query', type: 'tile_match', limit: 100 },
      success: function(r) { if (r.result && r.result.success) { self.list = r.result.data || []; self.myRank = r.result.myRank || null } self.loading = false },
      fail: function() { self.loading = false }
    })
  }
}
GameGlobal.TileMatchRankUI = { backBtn: null }

GameGlobal.drawTileMatchRankScreen = function() {
  _drawCartoonBg()
  var cx = SW / 2, R = GameGlobal.TileMatchRank, RUI = GameGlobal.TileMatchRankUI

  // 标题木板
  _drawWoodPanel(BOARD_X, SH * 0.04, BOARD_W, SH * 0.08, 14)
  setFont(SW * 0.042, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFF8E1'; ctx.fillText('排 行 榜', cx, SH * 0.08)

  if (R.loading) {
    setFont(SW * 0.035, '700'); ctx.fillStyle = TOON.textWarm; ctx.fillText('加载中...', cx, SH * 0.4)
    var bkY2 = SH * 0.88
    _drawCartoonBtn(BOARD_X, bkY2, BOARD_W, BTN_H, 12, '#E0E0E0', '#BDBDBD', '返回', TOON.textWarm, BTN_H * 0.38)
    RUI.backBtn = { x: BOARD_X, y: bkY2, w: BOARD_W, h: BTN_H }
    return
  }

  // 我的排名
  var myBarY = SH * 0.15, myBarH = SH * 0.065
  roundRect(BOARD_X + 2, myBarY + 3, BOARD_W, myBarH, 12, 'rgba(0,0,0,0.1)')
  if (R.myRank) {
    var myBg = ctx.createLinearGradient(BOARD_X, myBarY, BOARD_X + BOARD_W, myBarY)
    myBg.addColorStop(0, '#FFF3E0'); myBg.addColorStop(1, '#FFE0B2')
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 12, myBg, 'rgba(255,152,0,0.3)')
    setFont(SW * 0.028, '900'); ctx.textAlign = 'left'; ctx.fillStyle = TOON.warm2
    ctx.fillText('我  #' + R.myRank.rank, BOARD_X + PAD, myBarY + myBarH / 2)
    ctx.textAlign = 'right'; ctx.fillText('第' + R.myRank.score + '关', BOARD_X + BOARD_W - PAD, myBarY + myBarH / 2)
  } else {
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 12, TOON.card, 'rgba(200,180,150,0.2)')
    setFont(SW * 0.026, '700'); ctx.textAlign = 'center'; ctx.fillStyle = '#bbb'
    ctx.fillText('完成一关即可上榜', cx, myBarY + myBarH / 2)
  }

  // 列表
  var listY = myBarY + myBarH + GAP, rowH = SH * 0.065
  ctx.save(); ctx.beginPath(); ctx.rect(0, listY, SW, SH * 0.63); ctx.clip()
  var medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']
  for (var i = 0; i < R.list.length; i++) {
    var ry = listY + i * rowH - R.scrollY
    if (ry + rowH < listY || ry > listY + SH * 0.63) continue
    roundRect(BOARD_X, ry + 2, BOARD_W, rowH - 4, 10, i % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)')
    setFont(SW * 0.026, '800'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillStyle = i < 3 ? medalColors[i] : TOON.textWarm
    ctx.fillText(i < 3 ? ['🥇','🥈','🥉'][i] : (i + 1) + '', BOARD_X + PAD, ry + rowH / 2)
    setFont(SW * 0.026, '700'); ctx.fillStyle = TOON.textDark
    ctx.fillText(R.list[i].nickname || '???', BOARD_X + PAD * 3.5, ry + rowH / 2)
    setFont(SW * 0.030, '900'); ctx.textAlign = 'right'; ctx.fillStyle = TOON.warm2
    ctx.fillText('第' + (R.list[i].score || 0) + '关', BOARD_X + BOARD_W - PAD, ry + rowH / 2)
  }
  ctx.restore()

  var bkY = SH * 0.85
  _drawCartoonBtn(BOARD_X, bkY, BOARD_W, BTN_H, 12, '#E0E0E0', '#BDBDBD', '返回', TOON.textWarm, BTN_H * 0.38)
  RUI.backBtn = { x: BOARD_X, y: bkY, w: BOARD_W, h: BTN_H }
}

var _tmRTY = 0, _tmRSS = 0
GameGlobal.handleTileMatchRankTouch = function(type, y) {
  var R = GameGlobal.TileMatchRank
  if (type === 'start') { _tmRTY = y; _tmRSS = R.scrollY }
  else if (type === 'move') { var mx = Math.max(0, R.list.length * SH * 0.065 - SH * 0.63); R.scrollY = Math.max(0, Math.min(mx, _tmRSS - (y - _tmRTY))) }
}
