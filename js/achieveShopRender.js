// ================================================
//  achieveShopRender.js — 成就 + 商城 渲染
//  成就页（按游戏分Tab）/ 商城页（皮肤+道具）
// ================================================
var ctx=GameGlobal.ctx, SW=GameGlobal.SW, SH=GameGlobal.SH
var PAD=GameGlobal.PAD, GAP=GameGlobal.GAP
var BOARD_W=GameGlobal.BOARD_W, BOARD_X=GameGlobal.BOARD_X
var BTN_H=GameGlobal.BTN_H, C=GameGlobal.C
var roundRect=GameGlobal.roundRect, setFont=GameGlobal.setFont
var drawBg=GameGlobal.drawBg, inRect=GameGlobal.inRect

// ── 成就页状态
GameGlobal._achTab = 'all'  // all / 2048 / huarong / sudoku / global
GameGlobal._achScrollY = 0
GameGlobal.AchieveUI = { backBtn:null, tabBtns:[], scrollY:0 }

// ── 商城页状态
GameGlobal._shopTab = 'skin'  // skin / prop
GameGlobal._shopScrollY = 0
GameGlobal.ShopUI = { backBtn:null, tabBtns:[], itemBtns:[] }

// ── 成就提示 Toast（游戏内浮出）
GameGlobal.drawAchievementToast = function() {
  var t = GameGlobal._achToast
  if (!t || t.timer <= 0) return
  t.timer -= 0.016

  var alpha = Math.min(1, t.timer / 0.5, (3.0 - (3.0 - t.timer)) / 3.0)
  var ty = SH * 0.12 + (1 - alpha) * 20

  ctx.save()
  ctx.globalAlpha = alpha
  var tw = SW * 0.75, th = SH * 0.065, tx = (SW - tw) / 2
  roundRect(tx, ty, tw, th, 12, 'rgba(243,156,18,0.95)')
  setFont(th * 0.32, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(t.icon + ' 成就解锁: ' + t.name + '  +' + t.reward + '金币', SW / 2, ty + th / 2)
  ctx.restore()

  if (t.timer <= 0) GameGlobal._achToast = null
}

// ================================================
//  成就界面
// ================================================
GameGlobal.drawAchievementScreen = function() {
  drawBg()
  var cx = SW / 2
  var AS = GameGlobal.AchieveShop
  var UI = GameGlobal.AchieveUI
  UI.tabBtns = []

  // ── 顶部
  roundRect(0, 0, SW, SH * 0.18, 0, C.surface)
  setFont(SW * 0.042, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.15, 0, cx + SW * 0.15, 0)
  tg.addColorStop(0, '#f39c12'); tg.addColorStop(1, '#e74c3c')
  ctx.fillStyle = tg; ctx.fillText('成就', cx, SH * 0.125)

  // 金币
  setFont(SW * 0.026, '800'); ctx.textAlign = 'right'; ctx.fillStyle = '#f39c12'
  ctx.fillText('🪙 ' + AS.coins, SW - PAD, SH * 0.125)

  // 返回
  setFont(SW * 0.030, '700'); ctx.textAlign = 'left'; ctx.fillStyle = C.textDim
  ctx.fillText('← 返回', PAD, SH * 0.125)
  UI.backBtn = { x: 0, y: 0, w: SW * 0.25, h: SH * 0.18 }

  // ── 总进度条
  var prog = AS.getProgress()
  var progY = SH * 0.195, progH = SH * 0.035
  roundRect(BOARD_X, progY, BOARD_W, progH, 8, C.surface, 'rgba(255,255,255,0.05)')
  var ratio = prog.total > 0 ? prog.done / prog.total : 0
  if (ratio > 0) {
    var pg = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W * ratio, 0)
    pg.addColorStop(0, '#f39c12'); pg.addColorStop(1, '#e74c3c')
    roundRect(BOARD_X, progY, BOARD_W * ratio, progH, 8, pg)
  }
  setFont(progH * 0.50, '800'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'; ctx.fillText(prog.done + ' / ' + prog.total, cx, progY + progH / 2)

  // ── Tab 栏
  var tabs = ['all', '2048', 'huarong', 'sudoku', 'global']
  var tabLabels = ['全部', '2048', '华容道', '数独', '综合']
  var tabY = progY + progH + GAP * 0.8, tabH = SH * 0.042
  var tabW = Math.floor((BOARD_W - GAP * 4) / 5)

  for (var i = 0; i < tabs.length; i++) {
    var tx = BOARD_X + i * (tabW + GAP)
    var isSel = GameGlobal._achTab === tabs[i]
    roundRect(tx, tabY, tabW, tabH, 6, isSel ? 'rgba(243,156,18,0.25)' : 'rgba(255,255,255,0.04)')
    setFont(tabH * 0.42, isSel ? '800' : '600')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isSel ? '#f39c12' : C.textDim
    ctx.fillText(tabLabels[i], tx + tabW / 2, tabY + tabH / 2)
    UI.tabBtns.push({ x: tx, y: tabY, w: tabW, h: tabH, key: tabs[i] })
  }

  // ── 成就列表
  var listY = tabY + tabH + GAP
  var listH = SH * 0.63
  var rowH = SH * 0.090
  var achs = AS.ACHIEVEMENTS
  var filter = GameGlobal._achTab

  // 过滤
  var filtered = []
  for (var i = 0; i < achs.length; i++) {
    if (filter === 'all' || achs[i].game === filter) filtered.push(achs[i])
  }

  ctx.save()
  ctx.beginPath(); ctx.rect(0, listY, SW, listH); ctx.clip()

  for (var i = 0; i < filtered.length; i++) {
    var a = filtered[i]
    var ry = listY + i * rowH - GameGlobal._achScrollY
    if (ry + rowH < listY || ry > listY + listH) continue

    var done = !!AS.unlocked[a.id]
    var bgClr = done ? 'rgba(243,156,18,0.08)' : 'rgba(255,255,255,0.03)'
    var borderClr = done ? 'rgba(243,156,18,0.25)' : 'rgba(255,255,255,0.06)'
    roundRect(BOARD_X, ry + 2, BOARD_W, rowH - 4, 10, bgClr, borderClr)

    // 图标
    setFont(rowH * 0.38, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = done ? '#fff' : 'rgba(255,255,255,0.3)'
    ctx.fillText(a.icon, BOARD_X + PAD + rowH * 0.3, ry + rowH / 2)

    // 名称
    var textX = BOARD_X + PAD + rowH * 0.65
    setFont(SW * 0.028, '800'); ctx.textAlign = 'left'
    ctx.fillStyle = done ? '#f39c12' : C.textLight
    ctx.fillText(a.name, textX, ry + rowH * 0.34)

    // 描述
    setFont(SW * 0.022, '600')
    ctx.fillStyle = done ? 'rgba(255,255,255,0.5)' : C.textDim
    ctx.fillText(a.desc, textX, ry + rowH * 0.66)

    // 奖励/状态
    setFont(SW * 0.022, '700'); ctx.textAlign = 'right'
    if (done) {
      ctx.fillStyle = '#2ecc71'; ctx.fillText('✓ 已完成', BOARD_X + BOARD_W - PAD, ry + rowH * 0.34)
      ctx.fillStyle = '#f39c12'; ctx.fillText('+' + a.reward + '🪙', BOARD_X + BOARD_W - PAD, ry + rowH * 0.66)
    } else {
      ctx.fillStyle = C.textDim; ctx.fillText(a.reward + '🪙', BOARD_X + BOARD_W - PAD, ry + rowH / 2)
    }
  }

  ctx.restore()

  // 滚动条
  if (filtered.length > 8) {
    var totalH = filtered.length * rowH, barRatio = listH / totalH
    var barH = Math.max(SH * 0.03, listH * barRatio)
    var barY = listY + (GameGlobal._achScrollY / totalH) * listH
    roundRect(BOARD_X + BOARD_W - 3, barY, 3, barH, 2, 'rgba(243,156,18,0.3)')
  }
}

// ── 成就页滚动
var _achTouchY = 0, _achScrollStart = 0
GameGlobal.handleAchieveTouch = function(type, y) {
  if (type === 'start') { _achTouchY = y; _achScrollStart = GameGlobal._achScrollY }
  else if (type === 'move') {
    var achs = GameGlobal.AchieveShop.ACHIEVEMENTS
    var filter = GameGlobal._achTab
    var cnt = 0; for (var i = 0; i < achs.length; i++) { if (filter === 'all' || achs[i].game === filter) cnt++ }
    var maxS = Math.max(0, cnt * SH * 0.090 - SH * 0.63)
    GameGlobal._achScrollY = Math.max(0, Math.min(maxS, _achScrollStart - (y - _achTouchY)))
  }
}

// ================================================
//  商城界面
// ================================================
GameGlobal.drawShopScreen = function() {
  drawBg()
  var cx = SW / 2
  var AS = GameGlobal.AchieveShop
  var UI = GameGlobal.ShopUI
  UI.tabBtns = []; UI.itemBtns = []

  // ── 顶部
  roundRect(0, 0, SW, SH * 0.18, 0, C.surface)
  setFont(SW * 0.042, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.15, 0, cx + SW * 0.15, 0)
  tg.addColorStop(0, '#6c5ce7'); tg.addColorStop(1, '#a29bfe')
  ctx.fillStyle = tg; ctx.fillText('商城', cx, SH * 0.125)

  // 金币
  setFont(SW * 0.028, '800'); ctx.textAlign = 'right'; ctx.fillStyle = '#f39c12'
  ctx.fillText('🪙 ' + AS.coins, SW - PAD, SH * 0.125)

  // 返回
  setFont(SW * 0.030, '700'); ctx.textAlign = 'left'; ctx.fillStyle = C.textDim
  ctx.fillText('← 返回', PAD, SH * 0.125)
  UI.backBtn = { x: 0, y: 0, w: SW * 0.25, h: SH * 0.18 }

  // ── Tab
  var tabs = ['skin', 'prop']
  var tabLabels = ['🎨 主题皮肤', '🎒 游戏道具']
  var tabY = SH * 0.195, tabH = SH * 0.050
  var tabW = Math.floor((BOARD_W - GAP) / 2)

  for (var i = 0; i < tabs.length; i++) {
    var tx = BOARD_X + i * (tabW + GAP)
    var isSel = GameGlobal._shopTab === tabs[i]
    roundRect(tx, tabY, tabW, tabH, 8, isSel ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.04)')
    setFont(tabH * 0.38, isSel ? '800' : '600')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isSel ? '#a29bfe' : C.textDim
    ctx.fillText(tabLabels[i], tx + tabW / 2, tabY + tabH / 2)
    UI.tabBtns.push({ x: tx, y: tabY, w: tabW, h: tabH, key: tabs[i] })
  }

  // ── 物品列表
  var listY = tabY + tabH + GAP
  var items = AS.SHOP_ITEMS
  var filter = GameGlobal._shopTab
  var filtered = []
  for (var i = 0; i < items.length; i++) {
    if (items[i].type === filter) filtered.push(items[i])
  }

  var listH = SH * 0.66
  var rowH = filter === 'skin' ? SH * 0.11 : SH * 0.09

  ctx.save()
  ctx.beginPath(); ctx.rect(0, listY, SW, listH); ctx.clip()

  for (var i = 0; i < filtered.length; i++) {
    var item = filtered[i]
    var ry = listY + i * rowH - GameGlobal._shopScrollY
    if (ry + rowH < listY || ry > listY + listH) continue

    var isOwned = !!AS.owned[item.id]
    var isEquipped = item.id === 'skin_default' ? (!AS.equipped.theme || AS.equipped.theme === '') : AS.equipped.theme === item.id

    var bgClr = isEquipped ? 'rgba(108,92,231,0.12)' : isOwned ? 'rgba(46,204,113,0.08)' : 'rgba(255,255,255,0.03)'
    var borderClr = isEquipped ? 'rgba(108,92,231,0.35)' : isOwned ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.06)'
    roundRect(BOARD_X, ry + 2, BOARD_W, rowH - 4, 10, bgClr, borderClr)

    // 图标
    setFont(rowH * 0.40, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(item.icon, BOARD_X + PAD + rowH * 0.3, ry + rowH / 2)

    // 名称 + 描述
    var textX = BOARD_X + PAD + rowH * 0.65
    setFont(SW * 0.028, '800'); ctx.textAlign = 'left'
    ctx.fillStyle = isEquipped ? '#a29bfe' : C.textLight
    ctx.fillText(item.name, textX, ry + rowH * 0.34)

    setFont(SW * 0.020, '600')
    ctx.fillStyle = C.textDim
    ctx.fillText(item.desc, textX, ry + rowH * 0.66)

    // 右侧按钮
    var btnW = SW * 0.18, btnH2 = rowH * 0.45
    var btnX = BOARD_X + BOARD_W - btnW - GAP * 0.5
    var btnY2 = ry + (rowH - btnH2) / 2

    if (item.type === 'skin') {
      if (isEquipped) {
        roundRect(btnX, btnY2, btnW, btnH2, 6, 'rgba(108,92,231,0.3)')
        setFont(btnH2 * 0.42, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = '#a29bfe'; ctx.fillText('使用中', btnX + btnW / 2, btnY2 + btnH2 / 2)
      } else if (isOwned) {
        roundRect(btnX, btnY2, btnW, btnH2, 6, 'rgba(46,204,113,0.2)', 'rgba(46,204,113,0.4)')
        setFont(btnH2 * 0.42, '700'); ctx.fillStyle = '#2ecc71'
        ctx.textAlign = 'center'; ctx.fillText('装备', btnX + btnW / 2, btnY2 + btnH2 / 2)
        UI.itemBtns.push({ x: btnX, y: btnY2, w: btnW, h: btnH2, action: 'equip', id: item.id })
      } else {
        var canBuy = AS.coins >= item.price
        roundRect(btnX, btnY2, btnW, btnH2, 6, canBuy ? 'rgba(243,156,18,0.2)' : 'rgba(255,255,255,0.05)', canBuy ? 'rgba(243,156,18,0.4)' : 'rgba(255,255,255,0.1)')
        setFont(btnH2 * 0.40, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = canBuy ? '#f39c12' : C.textDim
        ctx.fillText(item.price + '🪙', btnX + btnW / 2, btnY2 + btnH2 / 2)
        UI.itemBtns.push({ x: btnX, y: btnY2, w: btnW, h: btnH2, action: 'buy', id: item.id, price: item.price })
      }
    } else {
      // 道具：显示价格和数量
      var baseId = item.id.replace(/\d+$/, '')
      var cnt = AS.getPropCount(baseId)
      if (cnt > 0) {
        setFont(SW * 0.018, '600'); ctx.textAlign = 'right'; ctx.fillStyle = '#2ecc71'
        ctx.fillText('库存:' + cnt, BOARD_X + BOARD_W - PAD, ry + rowH * 0.25)
      }
      var canBuy = AS.coins >= item.price
      roundRect(btnX, btnY2, btnW, btnH2, 6, canBuy ? 'rgba(243,156,18,0.2)' : 'rgba(255,255,255,0.05)', canBuy ? 'rgba(243,156,18,0.4)' : 'rgba(255,255,255,0.1)')
      setFont(btnH2 * 0.40, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = canBuy ? '#f39c12' : C.textDim
      ctx.fillText(item.price + '🪙', btnX + btnW / 2, btnY2 + btnH2 / 2)
      UI.itemBtns.push({ x: btnX, y: btnY2, w: btnW, h: btnH2, action: 'buy', id: item.id, price: item.price })
    }
  }

  ctx.restore()
}

// ── 商城滚动
var _shopTouchY = 0, _shopScrollStart = 0
GameGlobal.handleShopTouch = function(type, y) {
  if (type === 'start') { _shopTouchY = y; _shopScrollStart = GameGlobal._shopScrollY }
  else if (type === 'move') {
    var items = GameGlobal.AchieveShop.SHOP_ITEMS
    var filter = GameGlobal._shopTab
    var cnt = 0; for (var i = 0; i < items.length; i++) { if (items[i].type === filter) cnt++ }
    var rowH = filter === 'skin' ? SH * 0.11 : SH * 0.09
    var maxS = Math.max(0, cnt * rowH - SH * 0.66)
    GameGlobal._shopScrollY = Math.max(0, Math.min(maxS, _shopScrollStart - (y - _shopTouchY)))
  }
}