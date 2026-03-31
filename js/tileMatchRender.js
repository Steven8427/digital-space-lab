// ================================================
//  tileMatchRender.js — 三消堆叠 渲染（暗黑风格，统一主题）
//  大厅 / 游戏界面 / 结算 / 排行榜
// ================================================
var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP
var BOARD_W = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
var BTN_H = GameGlobal.BTN_H, C = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg = GameGlobal.drawBg, drawBtn = GameGlobal.drawBtn, inRect = GameGlobal.inRect

// ================================================
//  大厅
// ================================================
GameGlobal.LobbyTileUI = { startBtn: null, rankBtn: null, backBtn: null }

GameGlobal.drawLobbyTileScreen = function() {
  drawBg()
  var cx = SW / 2, L = GameGlobal.LobbyTileUI

  // 标题
  setFont(SW * 0.085, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.25, 0, cx + SW * 0.25, 0)
  tg.addColorStop(0, '#2ecc71'); tg.addColorStop(1, '#3498db')
  ctx.shadowColor = 'rgba(46,204,113,0.4)'; ctx.shadowBlur = 15; ctx.fillStyle = tg
  ctx.fillText('三消堆叠', cx, SH * 0.13)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  setFont(SW * 0.026, '600'); ctx.fillStyle = C.textDim
  ctx.fillText('点击方块，三个一样就消除！', cx, SH * 0.19)

  // 最佳记录卡片
  var best = wx.getStorageSync('tileMatchBest') || 0
  var cardY = SH * 0.25, cardH = SH * 0.13
  roundRect(BOARD_X, cardY, BOARD_W, cardH, 14, C.surface, 'rgba(46,204,113,0.18)')
  setFont(SW * 0.024, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('最高通关', cx, cardY + cardH * 0.30)
  setFont(best > 0 ? SW * 0.055 : SW * 0.032, '900')
  ctx.fillStyle = best > 0 ? '#2ecc71' : C.textDim
  ctx.fillText(best > 0 ? '第 ' + best + ' 关' : '暂无记录', cx, cardY + cardH * 0.70)

  // 玩法说明
  var infoY = cardY + cardH + GAP * 1.5
  roundRect(BOARD_X, infoY, BOARD_W, SH * 0.10, 12, C.surface, 'rgba(255,255,255,0.04)')
  setFont(SW * 0.022, '600'); ctx.fillStyle = C.textDim
  ctx.fillText('点击没被盖住的方块放入槽位', cx, infoY + SH * 0.025)
  ctx.fillText('三个一样的方块自动消除', cx, infoY + SH * 0.050)
  ctx.fillText('槽位满了(7个)就输了', cx, infoY + SH * 0.075)

  // 开始按钮
  var btnY = SH * 0.55
  var bg = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
  bg.addColorStop(0, '#2ecc71'); bg.addColorStop(1, '#3498db')
  roundRect(BOARD_X, btnY, BOARD_W, BTN_H * 1.3, 16, bg)
  setFont(BTN_H * 0.40, '900'); ctx.fillStyle = '#fff'
  ctx.fillText(best > 0 ? '继续第 ' + (best + 1) + ' 关' : '开 始 游 戏', cx, btnY + BTN_H * 0.65)
  L.startBtn = { x: BOARD_X, y: btnY, w: BOARD_W, h: BTN_H * 1.3 }

  // 排行榜
  var rkY = btnY + BTN_H * 1.3 + GAP
  roundRect(BOARD_X, rkY, BOARD_W, BTN_H, 12, C.surface, 'rgba(255,255,255,0.08)')
  setFont(BTN_H * 0.36, '700'); ctx.fillStyle = C.textLight
  ctx.fillText('排 行 榜', cx, rkY + BTN_H / 2)
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

  // ── 顶部信息（胶囊下方）
  var safeTop = SH * 0.095

  // 退出按钮（左侧）
  setFont(SW * 0.026, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('← 退出', PAD, safeTop + SH * 0.02)
  UI.backBtn = { x: 0, y: safeTop - 5, w: SW * 0.22, h: SH * 0.05 }

  // 关卡（居中）
  setFont(SW * 0.034, '900'); ctx.textAlign = 'center'
  ctx.fillStyle = '#f39c12'
  ctx.fillText('第 ' + TM.level + ' 关', cx, safeTop + SH * 0.02)

  // 设置按钮（右侧）
  var stW = SW * 0.12, stH = SH * 0.04
  var stX = SW - PAD - stW, stY = safeTop
  roundRect(stX, stY, stW, stH, 8, C.surface, 'rgba(255,255,255,0.15)')
  setFont(stH * 0.50, '700'); ctx.textAlign = 'center'
  ctx.fillStyle = '#eee'
  ctx.fillText('⚙ 设置', stX + stW / 2, stY + stH / 2)
  UI.settingBtn = { x: stX, y: stY, w: stW, h: stH }

  // ── 绘制方块
  var sortedTiles = TM.tiles.slice().sort(function(a, b) { return a.layer - b.layer })
  var now = Date.now()

  // 飞行动画参数
  var trayY_anim = SH * 0.82
  var trayW_anim = SW * 0.94
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
    var toH = SW * 0.13 - 8
    var curX = pt._flyFrom.x + (toX - pt._flyFrom.x) * ease
    var curY = pt._flyFrom.y + (toY - pt._flyFrom.y) * ease
    var curW = pt.w + (toW - pt.w) * ease
    var curH = pt.h + (toH - pt.h) * ease
    // 飞行中卡片
    ctx.globalAlpha = 1 - progress * 0.2
    roundRect(curX, curY + 2, curW, curH, 6, '#3a3a5c')
    roundRect(curX, curY, curW, curH - 2, 6, '#f0ede8')
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

  // ── 方块绘制
  for (var i = 0; i < sortedTiles.length; i++) {
    var t = sortedTiles[i]
    if (t.removed) continue
    var free = TM.isFree(t, TM.tiles)
    var tw = t.w, th = t.h, dx = t.x, dy = t.y

    if (free) {
      // 自由方块：明亮卡片 + 底部厚度 + 阴影
      roundRect(dx + 1, dy + 3, tw, th, 7, 'rgba(0,0,0,0.25)')
      roundRect(dx, dy + 2, tw, th, 7, '#3a3a5c')
      roundRect(dx, dy, tw, th - 2, 7, '#f0ede8')
    } else {
      // 被压方块：暗色半透明
      roundRect(dx, dy, tw, th, 5, 'rgba(40,40,60,0.7)')
      roundRect(dx + 1, dy + 1, tw - 2, th - 2, 4, 'rgba(60,60,80,0.5)')
    }

    // 图标
    var iconImg = TM.getIconImg(t.type)
    var pad = tw * 0.10
    if (!free) ctx.globalAlpha = 0.25
    if (iconImg) {
      ctx.drawImage(iconImg, dx + pad, dy + pad, tw - pad * 2, (free ? th - 2 : th) - pad * 2)
    } else {
      var ic = TM.TILE_ICONS[t.type % TM.TILE_ICONS.length]
      setFont(tw * 0.50, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = free ? '#eee' : '#888'
      ctx.fillText(ic, dx + tw / 2, dy + (free ? th - 2 : th) / 2)
    }
    ctx.globalAlpha = 1
  }

  // ── 消除粒子
  if (TM._elimAnim && now - TM._elimAnim.time < 400) {
    var ep = (now - TM._elimAnim.time) / 400
    var elimSlotW = trayW_anim / 7
    for (var ei = 0; ei < TM._elimAnim.positions.length; ei++) {
      var si = TM._elimAnim.positions[ei]
      var ecx = trayX_anim + si * elimSlotW + elimSlotW / 2
      var ecy = trayY_anim + SW * 0.065
      for (var star = 0; star < 8; star++) {
        var angle = (star / 8) * Math.PI * 2 + ep * 3
        var dist = ep * SW * 0.12
        var sx = ecx + Math.cos(angle) * dist
        var sy = ecy + Math.sin(angle) * dist - ep * 15
        var ss = Math.max(1, (1 - ep) * SW * 0.015)
        ctx.globalAlpha = 1 - ep
        ctx.fillStyle = ['#FFD700', '#FF6B6B', '#2ecc71', '#a66cff'][star % 4]
        ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  // ── 底部槽位区
  var trayY = SH * 0.82
  var trayH = SW * 0.13
  var trayW = SW * 0.94
  var trayX = (SW - trayW) / 2
  var slotW = trayW / 7

  // 暂存区
  UI.holdBtns = []
  if (TM.holdArea && TM.holdArea.length > 0) {
    var holdY = trayY - trayH * 0.8 - GAP * 0.3
    setFont(SW * 0.022, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('暂存区', cx, holdY - SW * 0.012)
    for (var hi = 0; hi < TM.holdArea.length; hi++) {
      var hx = cx - TM.holdArea.length * slotW / 2 + hi * slotW
      var hItem = TM.holdArea[hi]
      roundRect(hx + 3, holdY + 2, slotW - 6, trayH * 0.72, 6, '#3a3a5c')
      roundRect(hx + 3, holdY, slotW - 6, trayH * 0.7, 6, '#f0ede8')
      var hIconImg = TM.getIconImg(hItem.type)
      var hPad = slotW * 0.12
      if (hIconImg) {
        ctx.drawImage(hIconImg, hx + hPad, holdY + hPad * 0.6, slotW - hPad * 2, trayH * 0.7 - hPad * 1.2)
      } else {
        var hIcon = TM.TILE_ICONS[hItem.type % TM.TILE_ICONS.length]
        setFont(trayH * 0.36, '700'); ctx.fillStyle = '#eee'
        ctx.fillText(hIcon, hx + slotW / 2, holdY + trayH * 0.35)
      }
      UI.holdBtns.push({ x: hx, y: holdY, w: slotW, h: trayH * 0.7, idx: hi })
    }
  }

  // 槽位背景
  roundRect(trayX - 4, trayY - 4, trayW + 8, trayH + 8, 14, 'rgba(20,20,40,0.9)', 'rgba(46,204,113,0.3)')

  // 7个槽位
  for (var i = 0; i < 7; i++) {
    var sx = trayX + i * slotW
    roundRect(sx + 2, trayY + 2, slotW - 4, trayH - 4, 7, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.1)')
    if (i < TM.tray.length) {
      var item2 = TM.tray[i]
      roundRect(sx + 3, trayY + 5, slotW - 6, trayH - 6, 6, '#3a3a5c')
      roundRect(sx + 3, trayY + 3, slotW - 6, trayH - 8, 6, '#f0ede8')
      var trayIconImg = TM.getIconImg(item2.type)
      var tPad = slotW * 0.14
      if (trayIconImg) {
        ctx.drawImage(trayIconImg, sx + tPad, trayY + tPad, slotW - tPad * 2, trayH - tPad * 2)
      } else {
        var icon2 = TM.TILE_ICONS[item2.type % TM.TILE_ICONS.length]
        setFont(trayH * 0.45, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = '#333'
        ctx.fillText(icon2, sx + slotW / 2, trayY + trayH / 2)
      }
    }
  }

  // ── 道具按钮
  var propY = trayY + trayH + GAP * 0.6
  var propW = Math.floor((trayW - GAP * 2) / 3)
  var propH = SH * 0.055

  // 撤回
  var p1x = trayX, undoLeft = TM.props.undo
  roundRect(p1x, propY, propW, propH, 10,
    undoLeft > 0 ? 'rgba(46,204,113,0.2)' : 'rgba(233,160,50,0.15)',
    undoLeft > 0 ? 'rgba(46,204,113,0.4)' : 'rgba(233,160,50,0.3)')
  setFont(propH * 0.34, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = undoLeft > 0 ? '#2ecc71' : '#f5a623'
  ctx.fillText(undoLeft > 0 ? '↩ 撤回 ×' + undoLeft : '↩ 撤回 ▶', p1x + propW / 2, propY + propH / 2)
  UI.undoBtn = { x: p1x, y: propY, w: propW, h: propH }

  // 移出
  var p2x = trayX + propW + GAP, moveLeft = TM.props.moveOut
  roundRect(p2x, propY, propW, propH, 10,
    moveLeft > 0 ? 'rgba(52,152,219,0.2)' : 'rgba(233,160,50,0.15)',
    moveLeft > 0 ? 'rgba(52,152,219,0.4)' : 'rgba(233,160,50,0.3)')
  setFont(propH * 0.34, '700')
  ctx.fillStyle = moveLeft > 0 ? '#3498db' : '#f5a623'
  ctx.fillText(moveLeft > 0 ? '⬆ 移出 ×' + moveLeft : '⬆ 移出 ▶', p2x + propW / 2, propY + propH / 2)
  UI.moveOutBtn = { x: p2x, y: propY, w: propW, h: propH }

  // 打乱
  var p3x = trayX + (propW + GAP) * 2, shufLeft = TM.props.shuffle
  roundRect(p3x, propY, propW, propH, 10,
    shufLeft > 0 ? 'rgba(155,89,182,0.2)' : 'rgba(233,160,50,0.15)',
    shufLeft > 0 ? 'rgba(155,89,182,0.4)' : 'rgba(233,160,50,0.3)')
  setFont(propH * 0.34, '700')
  ctx.fillStyle = shufLeft > 0 ? '#9b59b6' : '#f5a623'
  ctx.fillText(shufLeft > 0 ? '打乱 ×' + shufLeft : '打乱 ▶', p3x + propW / 2, propY + propH / 2)
  UI.shuffleBtn = { x: p3x, y: propY, w: propW, h: propH }

  // ── 胜利/失败覆盖层
  if (TM.gameOver || TM.victory) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, SW, SH)

    var cardY2 = SH * 0.25, cardH2 = SH * 0.38
    roundRect(BOARD_X, cardY2, BOARD_W, cardH2, 20, C.surface, 'rgba(255,255,255,0.1)')

    setFont(SW * 0.055, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (TM.victory) {
      var vg = ctx.createLinearGradient(cx - SW * 0.2, 0, cx + SW * 0.2, 0)
      vg.addColorStop(0, '#2ecc71'); vg.addColorStop(1, '#3498db')
      ctx.fillStyle = vg; ctx.fillText('通关成功！', cx, cardY2 + cardH2 * 0.16)
    } else {
      ctx.fillStyle = '#e74c3c'; ctx.fillText('槽位已满', cx, cardY2 + cardH2 * 0.16)
    }

    // 统计
    setFont(SW * 0.030, '700'); ctx.fillStyle = C.textDim
    ctx.fillText('第 ' + TM.level + ' 关', cx, cardY2 + cardH2 * 0.36)
    ctx.fillText('消除 ' + TM.score + ' 个方块', cx, cardY2 + cardH2 * 0.48)

    if (TM.victory) {
      ctx.fillStyle = '#f39c12'
      ctx.fillText('+15 金币', cx, cardY2 + cardH2 * 0.60)
    }

    // 按钮
    if (TM.victory) {
      var nxY = cardY2 + cardH2 * 0.72, nxH = cardH2 * 0.18
      var bg2 = ctx.createLinearGradient(BOARD_X + PAD, 0, BOARD_X + BOARD_W - PAD, 0)
      bg2.addColorStop(0, '#2ecc71'); bg2.addColorStop(1, '#3498db')
      roundRect(BOARD_X + PAD, nxY, BOARD_W - PAD * 2, nxH, 12, bg2)
      setFont(nxH * 0.45, '900'); ctx.fillStyle = '#fff'
      ctx.fillText('下 一 关', cx, nxY + nxH / 2)
      UI.nextBtn = { x: BOARD_X + PAD, y: nxY, w: BOARD_W - PAD * 2, h: nxH }
    } else {
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
