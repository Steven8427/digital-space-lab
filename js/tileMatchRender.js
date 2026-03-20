// ================================================
//  tileMatchRender.js — 三消堆叠 渲染
//  大厅 / 游戏界面 / 结算 / 排行榜
// ================================================
var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP
var BOARD_W = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
var BTN_H = GameGlobal.BTN_H, C = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg = GameGlobal.drawBg, drawBtn = GameGlobal.drawBtn, inRect = GameGlobal.inRect

// 每种图标对应的淡彩色底（参考图的白色卡片+微彩）
var TYPE_COLORS = [
  '#fce4ec','#fff8e1','#e3f2fd','#e8f5e9','#f3e5f5','#fff3e0',
  '#e0f7fa','#fbe9e7','#f1f8e9','#ede7f6','#fce4ec','#e0f2f1'
]

// ================================================
//  大厅
// ================================================
GameGlobal.LobbyTileUI = { startBtn: null, rankBtn: null, backBtn: null }

GameGlobal.drawLobbyTileScreen = function() {
  drawBg()
  var cx = SW / 2, L = GameGlobal.LobbyTileUI

  setFont(SW * 0.075, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.25, 0, cx + SW * 0.25, 0)
  tg.addColorStop(0, '#2ecc71'); tg.addColorStop(1, '#3498db')
  ctx.shadowColor = 'rgba(46,204,113,0.5)'; ctx.shadowBlur = 18; ctx.fillStyle = tg
  ctx.fillText('三消堆叠', cx, SH * 0.14)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  setFont(SW * 0.028, '600'); ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText('点击方块，三个一样就消除！', cx, SH * 0.20)

  // 最佳记录
  var best = wx.getStorageSync('tileMatchBest') || 0
  var cardY = SH * 0.27, cardH = BTN_H * 1.5
  roundRect(BOARD_X, cardY, BOARD_W, cardH, 14, C.surface, 'rgba(46,204,113,0.18)')
  setFont(SW * 0.026, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.textDim
  ctx.fillText('最高通关', cx, cardY + cardH * 0.30)
  setFont(best > 0 ? SW * 0.065 : SW * 0.035, '900')
  ctx.fillStyle = best > 0 ? '#2ecc71' : C.textDim
  ctx.fillText(best > 0 ? '第 ' + best + ' 关' : '暂无记录', cx, cardY + cardH * 0.72)

  // 玩法说明
  var infoY = cardY + cardH + GAP * 2
  setFont(SW * 0.024, '600'); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'center'
  ctx.fillText('👆 点击没被盖住的方块放入槽位', cx, infoY)
  ctx.fillText('✨ 三个一样的方块自动消除', cx, infoY + SH * 0.035)
  ctx.fillText('⚠️ 槽位满了(7个)就输了', cx, infoY + SH * 0.070)

  // 开始按钮
  var btnY = SH * 0.56
  var bg = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
  bg.addColorStop(0, '#2ecc71'); bg.addColorStop(1, '#3498db')
  roundRect(BOARD_X, btnY, BOARD_W, BTN_H * 1.3, 16, bg)
  setFont(BTN_H * 0.42, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'
  ctx.fillText(best > 0 ? '继续第 ' + (best + 1) + ' 关' : '开 始 游 戏', cx, btnY + BTN_H * 0.65)
  L.startBtn = { x: BOARD_X, y: btnY, w: BOARD_W, h: BTN_H * 1.3 }

  // 排行榜
  var rkY = btnY + BTN_H * 1.3 + GAP
  roundRect(BOARD_X, rkY, BOARD_W, BTN_H, 12, C.surface, 'rgba(255,255,255,0.08)')
  setFont(BTN_H * 0.36, '700'); ctx.fillStyle = C.textLight
  ctx.fillText('🏆  排 行 榜', cx, rkY + BTN_H / 2)
  L.rankBtn = { x: BOARD_X, y: rkY, w: BOARD_W, h: BTN_H }

  // 返回
  var bkY = rkY + BTN_H + GAP * 1.5
  roundRect(BOARD_X, bkY, BOARD_W, BTN_H * 0.85, 12, C.surface, 'rgba(255,255,255,0.06)')
  setFont(BTN_H * 0.34, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('← 返回主页', cx, bkY + BTN_H * 0.425)
  L.backBtn = { x: BOARD_X, y: bkY, w: BOARD_W, h: BTN_H * 0.85 }
}

// ================================================
//  游戏界面
// ================================================
GameGlobal.TileMatchUI = { undoBtn: null, moveOutBtn: null, shuffleBtn: null, retryBtn: null, nextBtn: null, exitBtn: null, holdBtns: [], backBtn: null, settingBtn: null }

GameGlobal.drawTileMatchScreen = function() {
  drawBg()
  var TM = GameGlobal.TileMatch
  if (!TM) return
  var UI = GameGlobal.TileMatchUI
  var cx = SW / 2

  // ── 顶部信息（避开刘海）
  var headerY = SH * 0.08
  roundRect(0, 0, SW, SH * 0.13, 0, 'rgba(0,0,0,0.4)')

  // 返回按钮
  setFont(SW * 0.028, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('← 退出', PAD, headerY + SH * 0.025)
  UI.backBtn = { x: 0, y: 0, w: SW * 0.22, h: SH * 0.13 }

  // 关卡
  setFont(SW * 0.032, '900'); ctx.textAlign = 'center'
  ctx.fillStyle = '#f39c12'
  ctx.fillText('第 ' + TM.level + ' 关', cx, headerY + SH * 0.025)

  // 设置按钮
  var stW = SW * 0.12, stH = SW * 0.07
  var stX = SW - PAD - stW, stY = headerY + SH * 0.005
  roundRect(stX, stY, stW, stH, 8, C.surface, 'rgba(255,255,255,0.25)')
  setFont(stH * 0.42, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#eee'
  ctx.fillText('⚙ 设置', stX + stW / 2, stY + stH / 2)
  UI.settingBtn = { x: stX, y: stY, w: stW, h: stH }

  // ── 绘制方块（按层从下到上）
  var sortedTiles = TM.tiles.slice().sort(function(a, b) { return a.layer - b.layer })
  var now = Date.now()

  // 拾取闪光效果
  for (var pi = 0; pi < sortedTiles.length; pi++) {
    var pt = sortedTiles[pi]
    if (pt.removed && pt._pickTime && now - pt._pickTime < 300) {
      var pa = 1 - (now - pt._pickTime) / 300
      ctx.beginPath(); ctx.arc(pt.x + pt.w/2, pt.y + pt.h/2, pt.w * 0.6 * (1 + (1-pa)*0.5), 0, Math.PI*2)
      ctx.fillStyle = 'rgba(255,255,200,' + (pa * 0.3) + ')'; ctx.fill()
    }
  }

  for (var i = 0; i < sortedTiles.length; i++) {
    var t = sortedTiles[i]
    if (t.removed) continue

    var free = TM.isFree(t, TM.tiles)
    var tw = t.w, th = t.h

    // ── 卡片底板（图片 or fallback）
    var cardImg = TM.getCardImg(free)
    if (cardImg) {
      // 阴影层
      ctx.globalAlpha = 0.3
      ctx.drawImage(cardImg, t.x + 3, t.y + 4, tw, th)
      ctx.globalAlpha = 1
      // 卡片底板
      ctx.drawImage(cardImg, t.x, t.y, tw, th)
      // 被盖住时加暗遮罩
      if (!free) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        roundRect(t.x, t.y, tw, th, 6, 'rgba(0,0,0,0.45)')
      }
    } else {
      // fallback: Canvas绘制
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      roundRect(t.x + 3, t.y + 4, tw, th, 6, 'rgba(0,0,0,0.3)')
      roundRect(t.x + 1.5, t.y + 2, tw, th, 6, free ? '#b0b5bc' : '#555566')
      roundRect(t.x, t.y, tw, th, 6, free ? '#f5f5f5' : '#4a4a5a')
      if (!free) roundRect(t.x, t.y, tw, th, 6, 'rgba(0,0,0,0.3)')
    }

    // ── 图标（图片 or emoji fallback）
    var iconImg = TM.getIconImg(t.type)
    var pad = tw * 0.15  // 图标内边距
    if (iconImg) {
      if (!free) ctx.globalAlpha = 0.35
      ctx.drawImage(iconImg, t.x + pad, t.y + pad, tw - pad * 2, th - pad * 2)
      ctx.globalAlpha = 1
    } else {
      // emoji fallback
      var icon = TM.TILE_ICONS[t.type % TM.TILE_ICONS.length]
      setFont(tw * 0.52, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(icon, t.x + tw / 2, t.y + th / 2 + 1)
    }
  }

  // ── 底部槽位区
  var trayY = SH * 0.76
  var trayH = SW * 0.15
  var trayW = SW * 0.92
  var trayX = (SW - trayW) / 2
  var slotW = trayW / 7

  // 暂存区（holdArea）显示在槽位上方
  UI.holdBtns = []
  if (TM.holdArea && TM.holdArea.length > 0) {
    var holdY = trayY - trayH * 0.75 - GAP * 0.5
    setFont(SW * 0.020, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillText('暂存区', cx, holdY - SW * 0.015)
    for (var hi = 0; hi < TM.holdArea.length; hi++) {
      var hx = cx - TM.holdArea.length * slotW / 2 + hi * slotW
      var hItem = TM.holdArea[hi]
      var hCardImg = TM.getCardImg(true)
      if (hCardImg) {
        ctx.drawImage(hCardImg, hx + 3, holdY, slotW - 6, trayH * 0.7)
      } else {
        var hColor = TYPE_COLORS[hItem.type % TYPE_COLORS.length]
        roundRect(hx + 3, holdY, slotW - 6, trayH * 0.7, 8, hColor, 'rgba(255,255,255,0.3)')
      }
      var hIconImg = TM.getIconImg(hItem.type)
      var hPad = slotW * 0.2
      if (hIconImg) {
        ctx.drawImage(hIconImg, hx + hPad, holdY + hPad * 0.6, slotW - hPad * 2, trayH * 0.7 - hPad * 1.2)
      } else {
        var hIcon = TM.TILE_ICONS[hItem.type % TM.TILE_ICONS.length]
        setFont(trayH * 0.38, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(hIcon, hx + slotW / 2, holdY + trayH * 0.35)
      }
      UI.holdBtns.push({ x: hx, y: holdY, w: slotW, h: trayH * 0.7, idx: hi })
    }
  }

  // 槽位背景
  roundRect(trayX - 4, trayY - 4, trayW + 8, trayH + 8, 14, 'rgba(20,20,40,0.85)', 'rgba(162,155,254,0.5)')

  // 画7个槽位
  for (var i = 0; i < 7; i++) {
    var sx = trayX + i * slotW
    roundRect(sx + 2, trayY + 2, slotW - 4, trayH - 4, 8, 'rgba(255,255,255,0.08)', 'rgba(162,155,254,0.3)')
    if (i < TM.tray.length) {
      var item2 = TM.tray[i]
      // 卡片底板
      var trayCardImg = TM.getCardImg(true)
      if (trayCardImg) {
        ctx.drawImage(trayCardImg, sx + 2, trayY + 2, slotW - 4, trayH - 4)
      } else {
        var slotColor2 = TYPE_COLORS[item2.type % TYPE_COLORS.length]
        roundRect(sx + 3, trayY + 3, slotW - 6, trayH - 6, 6, slotColor2)
      }
      // 图标
      var trayIconImg = TM.getIconImg(item2.type)
      var tPad = slotW * 0.18
      if (trayIconImg) {
        ctx.drawImage(trayIconImg, sx + tPad, trayY + tPad, slotW - tPad * 2, trayH - tPad * 2)
      } else {
        var icon2 = TM.TILE_ICONS[item2.type % TM.TILE_ICONS.length]
        setFont(trayH * 0.48, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(icon2, sx + slotW / 2, trayY + trayH / 2)
      }
    }
  }

  // ── 道具栏
  var propY = trayY + trayH + GAP * 0.6
  var propW = Math.floor((trayW - GAP * 2) / 3)
  var propH = SH * 0.055

  // 撤回
  var p1x = trayX
  var undoLeft = TM.props.undo
  roundRect(p1x, propY, propW, propH, 10, undoLeft > 0 ? 'rgba(46,204,113,0.2)' : 'rgba(233,160,50,0.15)', undoLeft > 0 ? 'rgba(46,204,113,0.4)' : 'rgba(233,160,50,0.3)')
  setFont(propH * 0.32, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = undoLeft > 0 ? '#2ecc71' : '#f5a623'
  ctx.fillText(undoLeft > 0 ? '↩ 撤回 ×' + undoLeft : '↩ 撤回 ▶', p1x + propW / 2, propY + propH / 2)
  UI.undoBtn = { x: p1x, y: propY, w: propW, h: propH }

  // 移出
  var p2x = trayX + propW + GAP
  var moveLeft = TM.props.moveOut
  roundRect(p2x, propY, propW, propH, 10, moveLeft > 0 ? 'rgba(52,152,219,0.2)' : 'rgba(233,160,50,0.15)', moveLeft > 0 ? 'rgba(52,152,219,0.4)' : 'rgba(233,160,50,0.3)')
  setFont(propH * 0.32, '700')
  ctx.fillStyle = moveLeft > 0 ? '#3498db' : '#f5a623'
  ctx.fillText(moveLeft > 0 ? '⬆ 移出 ×' + moveLeft : '⬆ 移出 ▶', p2x + propW / 2, propY + propH / 2)
  UI.moveOutBtn = { x: p2x, y: propY, w: propW, h: propH }

  // 打乱
  var p3x = trayX + (propW + GAP) * 2
  var shufLeft = TM.props.shuffle
  roundRect(p3x, propY, propW, propH, 10, shufLeft > 0 ? 'rgba(155,89,182,0.2)' : 'rgba(233,160,50,0.15)', shufLeft > 0 ? 'rgba(155,89,182,0.4)' : 'rgba(233,160,50,0.3)')
  setFont(propH * 0.32, '700')
  ctx.fillStyle = shufLeft > 0 ? '#9b59b6' : '#f5a623'
  ctx.fillText(shufLeft > 0 ? '🔀 打乱 ×' + shufLeft : '🔀 打乱 ▶', p3x + propW / 2, propY + propH / 2)
  UI.shuffleBtn = { x: p3x, y: propY, w: propW, h: propH }

  // ── 胜利/失败覆盖层
  if (TM.gameOver || TM.victory) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, SW, SH)

    var cardY2 = SH * 0.25, cardH2 = SH * 0.38
    roundRect(BOARD_X, cardY2, BOARD_W, cardH2, 20, C.surface, 'rgba(255,255,255,0.1)')

    setFont(SW * 0.06, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (TM.victory) {
      var vg = ctx.createLinearGradient(cx - SW * 0.2, 0, cx + SW * 0.2, 0)
      vg.addColorStop(0, '#2ecc71'); vg.addColorStop(1, '#3498db')
      ctx.fillStyle = vg; ctx.fillText('🎉 通关成功！', cx, cardY2 + cardH2 * 0.18)
    } else {
      ctx.fillStyle = '#e74c3c'; ctx.fillText('💔 槽位已满', cx, cardY2 + cardH2 * 0.18)
    }

    // 统计
    setFont(SW * 0.030, '700'); ctx.fillStyle = C.textDim
    ctx.fillText('第 ' + TM.level + ' 关', cx, cardY2 + cardH2 * 0.36)
    ctx.fillText('消除 ' + TM.score + ' 个方块', cx, cardY2 + cardH2 * 0.48)

    if (TM.victory) {
      ctx.fillStyle = '#f39c12'
      ctx.fillText('+15 🪙', cx, cardY2 + cardH2 * 0.60)
    }

    // 按钮
    if (TM.victory) {
      // 下一关
      var nxY = cardY2 + cardH2 * 0.72
      var nxH = cardH2 * 0.18
      var bg2 = ctx.createLinearGradient(BOARD_X + PAD, 0, BOARD_X + BOARD_W - PAD, 0)
      bg2.addColorStop(0, '#2ecc71'); bg2.addColorStop(1, '#3498db')
      roundRect(BOARD_X + PAD, nxY, BOARD_W - PAD * 2, nxH, 12, bg2)
      setFont(nxH * 0.45, '900'); ctx.fillStyle = '#fff'
      ctx.fillText('下 一 关', cx, nxY + nxH / 2)
      UI.nextBtn = { x: BOARD_X + PAD, y: nxY, w: BOARD_W - PAD * 2, h: nxH }
    } else {
      // 重试 + 退出
      var halfW = (BOARD_W - PAD * 2 - GAP) / 2
      var ryY = cardY2 + cardH2 * 0.72, ryH = cardH2 * 0.18

      roundRect(BOARD_X + PAD, ryY, halfW, ryH, 12, '#e74c3c')
      setFont(ryH * 0.42, '800'); ctx.fillStyle = '#fff'
      ctx.fillText('重 试', BOARD_X + PAD + halfW / 2, ryY + ryH / 2)
      UI.retryBtn = { x: BOARD_X + PAD, y: ryY, w: halfW, h: ryH }

      roundRect(BOARD_X + PAD + halfW + GAP, ryY, halfW, ryH, 12, C.surface, 'rgba(255,255,255,0.1)')
      setFont(ryH * 0.42, '700'); ctx.fillStyle = C.textDim
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
  drawBg()
  var cx = SW / 2, R = GameGlobal.TileMatchRank, RUI = GameGlobal.TileMatchRankUI

  setFont(SW * 0.050, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.2, 0, cx + SW * 0.2, 0)
  tg.addColorStop(0, '#2ecc71'); tg.addColorStop(1, '#3498db')
  ctx.fillStyle = tg; ctx.fillText('三消排行榜', cx, SH * 0.09)
  setFont(SW * 0.025, '600'); ctx.fillStyle = C.textDim; ctx.fillText('通关数排名', cx, SH * 0.135)

  if (R.loading) {
    setFont(SW * 0.035, '700'); ctx.fillStyle = C.textDim; ctx.fillText('加载中...', cx, SH * 0.4)
    RUI.backBtn = { x: BOARD_X, y: SH * 0.88, w: BOARD_W, h: BTN_H }
    drawBtn(BOARD_X, SH * 0.88, BOARD_W, BTN_H, '返回', C.surface, C.textLight); return
  }

  var myBarY = SH * 0.17, myBarH = SH * 0.065
  if (R.myRank) {
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, 'rgba(46,204,113,0.15)', 'rgba(46,204,113,0.4)')
    setFont(SW * 0.030, '900'); ctx.textAlign = 'left'; ctx.fillStyle = '#2ecc71'
    ctx.fillText('我  #' + R.myRank.rank, BOARD_X + PAD, myBarY + myBarH / 2)
    ctx.textAlign = 'right'; ctx.fillText('第' + R.myRank.score + '关', BOARD_X + BOARD_W - PAD, myBarY + myBarH / 2)
  } else {
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, C.surface, 'rgba(255,255,255,0.05)')
    setFont(SW * 0.028, '700'); ctx.textAlign = 'center'; ctx.fillStyle = C.textDim
    ctx.fillText('完成一关即可上榜', cx, myBarY + myBarH / 2)
  }

  var listY = myBarY + myBarH + GAP, rowH = SH * 0.065
  ctx.save(); ctx.beginPath(); ctx.rect(0, listY, SW, SH * 0.65); ctx.clip()
  for (var i = 0; i < R.list.length; i++) {
    var ry = listY + i * rowH - R.scrollY; if (ry + rowH < listY || ry > listY + SH * 0.65) continue
    roundRect(BOARD_X, ry + 2, BOARD_W, rowH - 4, 8, C.surface, 'rgba(255,255,255,0.04)')
    setFont(SW * 0.028, '800'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillStyle = i < 3 ? '#f39c12' : C.textDim; ctx.fillText((i + 1) + '', BOARD_X + PAD, ry + rowH / 2)
    setFont(SW * 0.028, '700'); ctx.fillStyle = C.textLight; ctx.fillText(R.list[i].nickname || '???', BOARD_X + PAD * 3, ry + rowH / 2)
    setFont(SW * 0.032, '900'); ctx.textAlign = 'right'; ctx.fillStyle = '#2ecc71'
    ctx.fillText('第' + (R.list[i].score || 0) + '关', BOARD_X + BOARD_W - PAD, ry + rowH / 2)
  }
  ctx.restore()

  var bkY = SH * 0.88; drawBtn(BOARD_X, bkY, BOARD_W, BTN_H, '返回', C.surface, C.textLight)
  RUI.backBtn = { x: BOARD_X, y: bkY, w: BOARD_W, h: BTN_H }
}

var _tmRTY = 0, _tmRSS = 0
GameGlobal.handleTileMatchRankTouch = function(type, y) {
  var R = GameGlobal.TileMatchRank
  if (type === 'start') { _tmRTY = y; _tmRSS = R.scrollY }
  else if (type === 'move') { var mx = Math.max(0, R.list.length * SH * 0.065 - SH * 0.65); R.scrollY = Math.max(0, Math.min(mx, _tmRSS - (y - _tmRTY))) }
}