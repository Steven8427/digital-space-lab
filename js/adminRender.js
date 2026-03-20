// ================================================
//  adminRender.js - 管理后台 v2.0
//  多游戏统计 / 可滚动用户列表 / 可滚动日志
//  加载后覆盖 render.js 中的旧版 admin 函数
// ================================================

var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP
var BOARD_W = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
var BTN_H = GameGlobal.BTN_H, C = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg = GameGlobal.drawBg, inRect = GameGlobal.inRect

// ── 状态扩展
GameGlobal.AdminUI = {
  backBtn:null, confirmBtn:null, pwdBox:null, refreshBtn:null,
  tab0:null, tab1:null, tab2:null,
  prevBtn:null, nextBtn:null, searchBtn:null
}
GameGlobal._adminData = {
  stats:null, users:[], logs:[], tab:'stats',
  page:1, totalUsers:0, totalLogs:0,
  loading:false, loginPwd:'', loggedIn:false, key:'',
  usersScrollY:0, logsScrollY:0, statsScrollY:0, logFilter:'all',
  keyword:'', _searchTmp:'',
  _usersLoaded:false, _logsLoaded:false
}

// ── 触摸滚动支持
var _admTouchY = 0, _admScrollStart = 0

GameGlobal.handleAdminTouch = function(type, y) {
  var AD = GameGlobal._adminData
  if (type === 'start') {
    _admTouchY = y
    if (AD.tab === 'users') _admScrollStart = AD.usersScrollY
    else if (AD.tab === 'logs') _admScrollStart = AD.logsScrollY
    else _admScrollStart = AD.statsScrollY || 0
  } else if (type === 'move') {
    var diff = y - _admTouchY
    if (AD.tab === 'users') {
      var rowH = SH * 0.105
      var maxS = Math.max(0, AD.users.length * rowH - SH * 0.68)
      AD.usersScrollY = Math.max(0, Math.min(maxS, _admScrollStart - diff))
    } else if (AD.tab === 'logs') {
      var rowH = SH * 0.085
      var maxS = Math.max(0, AD.logs.length * rowH - SH * 0.68)
      AD.logsScrollY = Math.max(0, Math.min(maxS, _admScrollStart - diff))
    } else {
      // stats tab scrolling
      AD.statsScrollY = Math.max(0, Math.min(SH * 0.6, (_admScrollStart || 0) - diff))
    }
  }
}

// ================================================
//  登录界面（不改动）
// ================================================
GameGlobal.drawAdminLoginScreen = function() {
  drawBg()
  var cx = SW / 2
  var AD = GameGlobal._adminData

  roundRect(SW * 0.07, SH * 0.2, SW * 0.86, SH * 0.55, 20, C.surface, 'rgba(255,255,255,0.08)')

  setFont(SW * 0.055, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.2, 0, cx + SW * 0.2, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.fillStyle = tg; ctx.fillText('管理员登录', cx, SH * 0.32)

  setFont(SW * 0.032, '700')
  ctx.fillStyle = C.textDim; ctx.fillText('输入管理密钥', cx, SH * 0.42)

  var bw = SW * 0.68, bh = SH * 0.065, bx = cx - bw / 2, by = SH * 0.465
  roundRect(bx, by, bw, bh, 12, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.15)')
  setFont(bh * 0.42, '700')
  var pwd = AD.loginPwd ? '●'.repeat(AD.loginPwd.length) : ''
  ctx.fillStyle = pwd ? C.textLight : C.textDim
  ctx.fillText(pwd || '点击此处输入密钥', cx, by + bh / 2)
  GameGlobal.AdminUI.pwdBox = { x: bx, y: by, w: bw, h: bh }

  var btnW = SW * 0.5, btnH = SH * 0.065, btnX = cx - btnW / 2, btnY = SH * 0.575
  var g = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0)
  g.addColorStop(0, '#e94560'); g.addColorStop(1, '#9b59b6')
  roundRect(btnX, btnY, btnW, btnH, 12, g)
  setFont(btnH * 0.38, '900'); ctx.fillStyle = '#fff'
  ctx.fillText('进入后台', cx, btnY + btnH / 2)
  GameGlobal.AdminUI.confirmBtn = { x: btnX, y: btnY, w: btnW, h: btnH }

  setFont(SW * 0.03, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('← 返回', cx, SH * 0.68)
  GameGlobal.AdminUI.backBtn = { x: SW * 0.3, y: SH * 0.655, w: SW * 0.4, h: SH * 0.05 }
}

// ================================================
//  主界面
// ================================================
GameGlobal.drawAdminScreen = function() {
  drawBg()
  var cx = SW / 2
  var AD = GameGlobal._adminData
  var AI = GameGlobal.AdminUI

  // 重置动态按钮
  AI.refreshBtn = null; AI.prevBtn = null; AI.nextBtn = null; AI.searchBtn = null; AI.debugCoinBtn = null; AI.debugClearPropsBtn = null; AI.debugClearSkinsBtn = null; AI.debugClearAchBtn = null
  for (var dk = 0; dk < 50; dk++) { AI['delBtn' + dk] = null; AI['banBtn' + dk] = null }

  // ── 顶部标题栏
  roundRect(0, 0, SW, SH * 0.1, 0, C.surface)
  setFont(SW * 0.042, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.2, 0, cx + SW * 0.2, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.fillStyle = tg; ctx.fillText('管理后台', cx, SH * 0.052)

  setFont(SW * 0.032, '700'); ctx.fillStyle = C.textDim
  ctx.textAlign = 'left'; ctx.fillText('← 退出', PAD, SH * 0.052)
  AI.backBtn = { x: 0, y: 0, w: SW * 0.25, h: SH * 0.1 }

  // ── Tab 切换
  var tabs = ['stats', 'users', 'logs'], labels = ['概览', '用户', '日志']
  var tabW = BOARD_W / 3, tabH = SH * 0.055, tabY = SH * 0.105
  for (var i = 0; i < tabs.length; i++) {
    var tx = BOARD_X + tabW * i
    var isAct = AD.tab === tabs[i]
    roundRect(tx, tabY, tabW, tabH, 0, isAct ? 'rgba(233,69,96,0.25)' : 'rgba(255,255,255,0.03)')
    ctx.strokeStyle = isAct ? C.accent : 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1; ctx.strokeRect(tx, tabY, tabW, tabH)
    setFont(SW * 0.030, isAct ? '900' : '700')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isAct ? C.accent : C.textDim
    ctx.fillText(labels[i], tx + tabW / 2, tabY + tabH / 2)
    AI['tab' + i] = { x: tx, y: tabY, w: tabW, h: tabH }
  }

  var contentY = tabY + tabH + GAP

  if (AD.loading) {
    setFont(SW * 0.035, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('加载中...', cx, contentY + SH * 0.2)
    return
  }

  if (AD.tab === 'stats') _drawStats(contentY, AD.statsScrollY || 0)
  if (AD.tab === 'users') _drawUsers(contentY)
  if (AD.tab === 'logs')  _drawLogs(contentY)
}

// ================================================
//  概览 Tab
// ================================================
function _drawStats(y, scrollY) {
  var cx = SW / 2
  var s = GameGlobal._adminData.stats
  if (!s) { GameGlobal._adminLoadStats(); return }

  // 可滚动区域
  ctx.save()
  ctx.beginPath(); ctx.rect(0, y, SW, SH - y); ctx.clip()
  ctx.translate(0, -scrollY)

  // ── 第一行：核心数据 3 卡
  var cw3 = (BOARD_W - GAP * 2) / 3, ch = SH * 0.115
  var row1 = [
    { label: '总用户',   value: s.totalUsers  || 0, color: '#e94560' },
    { label: '今日活跃', value: s.todayActive || 0, color: '#2ecc71' },
    { label: '总记录',   value: s.totalLogs   || 0, color: '#f5a623' }
  ]
  for (var i = 0; i < 3; i++) {
    var cx2 = BOARD_X + i * (cw3 + GAP)
    roundRect(cx2, y, cw3, ch, 12, C.surface, 'rgba(255,255,255,0.06)')
    setFont(SW * 0.022, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText(row1[i].label, cx2 + cw3 / 2, y + ch * 0.30)
    setFont(SW * 0.052, '900'); ctx.fillStyle = row1[i].color
    ctx.fillText(String(row1[i].value), cx2 + cw3 / 2, y + ch * 0.70)
  }

  // ── 第二行：各游戏参与人数 2x2
  var y2 = y + ch + GAP
  var cw2 = (BOARD_W - GAP) / 2, ch2 = SH * 0.10
  var row2 = [
    { label: '2048 玩家',    value: s.players2048 || 0, icon: '🎮', color: '#e94560' },
    { label: '华容道 玩家',  value: s.playersHR   || 0, icon: '🧩', color: '#3498db' },
    { label: '数独 玩家',    value: s.playersSDK  || 0, icon: '🔢', color: '#6c5ce7' },
    { label: '闯关 玩家',    value: s.playersChg  || 0, icon: '🏆', color: '#e67e22' }
  ]
  for (var i = 0; i < 4; i++) {
    var col = i % 2, row = Math.floor(i / 2)
    var rx = BOARD_X + col * (cw2 + GAP), ry = y2 + row * (ch2 + GAP)
    roundRect(rx, ry, cw2, ch2, 12, C.surface, 'rgba(255,255,255,0.05)')
    setFont(SW * 0.022, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim
    ctx.fillText(row2[i].label, rx + cw2 / 2, ry + ch2 * 0.30)
    setFont(SW * 0.042, '900'); ctx.fillStyle = row2[i].color
    ctx.fillText(String(row2[i].value), rx + cw2 / 2, ry + ch2 * 0.72)
  }

  // ── 第三行：排行榜冠军
  var y3 = y2 + ch2 * 2 + GAP * 2 + GAP * 0.5
  var ch3 = SH * 0.075
  // 2048冠军
  var t2 = s.top2048
  roundRect(BOARD_X, y3, BOARD_W, ch3, 10, C.surface, 'rgba(233,69,96,0.08)')
  setFont(SW * 0.024, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim; ctx.fillText('🏅 2048冠军', BOARD_X + PAD, y3 + ch3 / 2)
  setFont(SW * 0.028, '900'); ctx.textAlign = 'right'
  ctx.fillStyle = '#e94560'
  ctx.fillText(t2 ? (t2.nickname + '  ' + t2.score + '分') : '暂无', BOARD_X + BOARD_W - PAD, y3 + ch3 / 2)

  // 闯关冠军
  var y4 = y3 + ch3 + GAP * 0.6
  var tc = s.topChallenge
  roundRect(BOARD_X, y4, BOARD_W, ch3, 10, C.surface, 'rgba(230,126,34,0.08)')
  setFont(SW * 0.024, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim; ctx.fillText('🏆 闯关冠军', BOARD_X + PAD, y4 + ch3 / 2)
  setFont(SW * 0.028, '900'); ctx.textAlign = 'right'
  ctx.fillStyle = '#e67e22'
  ctx.fillText(tc ? (tc.nickname + '  第' + tc.score + '关') : '暂无', BOARD_X + BOARD_W - PAD, y4 + ch3 / 2)

  // ── PK
  var y5 = y4 + ch3 + GAP * 0.6
  roundRect(BOARD_X, y5, BOARD_W, ch3, 10, C.surface, 'rgba(155,89,182,0.08)')
  setFont(SW * 0.024, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim; ctx.fillText('⚔️ PK房间总数', BOARD_X + PAD, y5 + ch3 / 2)
  setFont(SW * 0.028, '900'); ctx.textAlign = 'right'
  ctx.fillStyle = '#9b59b6'; ctx.fillText(String(s.pkRooms || 0), BOARD_X + BOARD_W - PAD, y5 + ch3 / 2)

  // ── 刷新按钮
  var ry = y5 + ch3 + GAP * 1.5
  roundRect(BOARD_X, ry, BOARD_W, SH * 0.06, 12, C.accent)
  setFont(SW * 0.030, '900'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('刷新数据', cx, ry + SH * 0.03)
  GameGlobal.AdminUI.refreshBtn = { x: BOARD_X, y: ry - scrollY, w: BOARD_W, h: SH * 0.06 }

  // ── 调试：设置金币
  var dy = ry + SH * 0.06 + GAP
  var coins = (GameGlobal.AchieveShop && GameGlobal.AchieveShop.coins) || 0
  roundRect(BOARD_X, dy, BOARD_W, SH * 0.05, 10, 'rgba(243,156,18,0.15)', 'rgba(243,156,18,0.3)')
  setFont(SW * 0.026, '700'); ctx.fillStyle = '#f39c12'; ctx.textAlign = 'center'
  ctx.fillText('🪙 金币: ' + coins + '  [设为100000]', cx, dy + SH * 0.025)
  GameGlobal.AdminUI.debugCoinBtn = { x: BOARD_X, y: dy - scrollY, w: BOARD_W, h: SH * 0.05 }

  // ── 调试：清空道具
  var dy2 = dy + SH * 0.05 + GAP * 0.5
  var propInfo = ''
  if (GameGlobal.AchieveShop) {
    var pc = GameGlobal.AchieveShop.propCounts
    for (var pk in pc) { if (pc[pk] > 0) propInfo += pk.replace('prop_','') + ':' + pc[pk] + ' ' }
  }
  roundRect(BOARD_X, dy2, BOARD_W, SH * 0.05, 10, 'rgba(231,76,60,0.15)', 'rgba(231,76,60,0.3)')
  setFont(SW * 0.024, '700'); ctx.fillStyle = '#e74c3c'
  ctx.fillText('🗑 清空道具  ' + (propInfo || '(无)'), cx, dy2 + SH * 0.025)
  GameGlobal.AdminUI.debugClearPropsBtn = { x: BOARD_X, y: dy2 - scrollY, w: BOARD_W, h: SH * 0.05 }

  // ── 调试：清空已购皮肤
  var dy3 = dy2 + SH * 0.05 + GAP * 0.5
  var skinInfo = ''
  if (GameGlobal.AchieveShop) {
    var ow = GameGlobal.AchieveShop.owned
    for (var sk in ow) { if (ow[sk] && sk !== 'skin_default') skinInfo += sk.replace('skin_','') + ' ' }
  }
  roundRect(BOARD_X, dy3, BOARD_W, SH * 0.05, 10, 'rgba(108,92,231,0.15)', 'rgba(108,92,231,0.3)')
  setFont(SW * 0.024, '700'); ctx.fillStyle = '#a29bfe'
  ctx.fillText('🎨 清空皮肤  ' + (skinInfo || '(无)'), cx, dy3 + SH * 0.025)
  GameGlobal.AdminUI.debugClearSkinsBtn = { x: BOARD_X, y: dy3 - scrollY, w: BOARD_W, h: SH * 0.05 }

  // ── 调试：清空成就
  var dy4 = dy3 + SH * 0.05 + GAP * 0.5
  var achCount = 0
  if (GameGlobal.AchieveShop) { for (var ak in GameGlobal.AchieveShop.unlocked) { if (GameGlobal.AchieveShop.unlocked[ak]) achCount++ } }
  roundRect(BOARD_X, dy4, BOARD_W, SH * 0.05, 10, 'rgba(46,204,113,0.15)', 'rgba(46,204,113,0.3)')
  setFont(SW * 0.024, '700'); ctx.fillStyle = '#2ecc71'
  ctx.fillText('🏆 清空成就 (' + achCount + '个)  [全部重置]', cx, dy4 + SH * 0.025)
  GameGlobal.AdminUI.debugClearAchBtn = { x: BOARD_X, y: dy4 - scrollY, w: BOARD_W, h: SH * 0.05 }

  ctx.restore()
}

// ================================================
//  用户 Tab（可滚动，50条/页）
// ================================================
function _drawUsers(y) {
  var cx = SW / 2
  var AD = GameGlobal._adminData
  var users = AD.users

  if (!users || (users.length === 0 && !AD._usersLoaded)) {
    GameGlobal._adminLoadUsers(); return
  }
  if (users.length === 0) {
    setFont(SW * 0.032, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('暂无用户', cx, y + SH * 0.2)
    return
  }

  // ── 顶部信息栏
  var infoH = SH * 0.04
  setFont(SW * 0.024, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('共 ' + (AD.totalUsers || users.length) + ' 人  第' + AD.page + '页', BOARD_X + PAD, y + infoH / 2)

  // 搜索按钮
  var sbW = SW * 0.20, sbH = infoH * 0.9
  var sbX = BOARD_X + BOARD_W - sbW, sbY = y + (infoH - sbH) / 2
  var hasKw = AD.keyword && AD.keyword.length > 0
  roundRect(sbX, sbY, sbW, sbH, 6, hasKw ? 'rgba(233,69,96,0.2)' : 'rgba(108,92,231,0.2)')
  setFont(SW * 0.022, '700'); ctx.textAlign = 'center'
  ctx.fillStyle = hasKw ? '#e94560' : '#a29bfe'
  ctx.fillText(hasKw ? '✕ ' + AD.keyword : '🔍 搜索', sbX + sbW / 2, sbY + sbH / 2)
  GameGlobal.AdminUI.searchBtn = { x: sbX, y: sbY, w: sbW, h: sbH }

  var listY = y + infoH + GAP * 0.5
  var listH = SH * 0.68
  var rowH  = SH * 0.105

  // ── 裁剪区域
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, listY, SW, listH)
  ctx.clip()

  for (var i = 0; i < users.length; i++) {
    var u = users[i]
    var ry = listY + i * rowH - AD.usersScrollY

    if (ry + rowH < listY || ry > listY + listH) continue  // 不在可见区

    // 背景
    var bgStroke = u.banned ? 'rgba(231,76,60,0.25)' : 'rgba(255,255,255,0.05)'
    roundRect(BOARD_X, ry + 2, BOARD_W, rowH - 4, 10, C.surface, bgStroke)

    // 头像占位
    var avR = rowH * 0.28
    var avX = BOARD_X + PAD + avR, avY = ry + rowH / 2
    ctx.beginPath(); ctx.arc(avX, avY, avR, 0, Math.PI * 2)
    ctx.fillStyle = u.banned ? 'rgba(231,76,60,0.3)' : 'rgba(245,166,35,0.3)'; ctx.fill()
    setFont(avR * 0.85, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textLight; ctx.fillText((u.nickName || '?')[0], avX, avY)

    // 名字 + 封禁标记
    var nameX = BOARD_X + PAD * 2 + avR * 2
    setFont(SW * 0.030, '700'); ctx.textAlign = 'left'
    ctx.fillStyle = u.banned ? '#e74c3c' : C.textLight
    var displayName = (u.nickName || '神秘玩家')
    if (u.banned) displayName += ' [封禁]'
    ctx.fillText(displayName, nameX, ry + rowH * 0.30)

    // 多游戏最佳数据（一行显示）
    var scores = []
    if (u.best_score) scores.push('2048:' + u.best_score)
    // 找华容道最佳
    for (var sz = 3; sz <= 10; sz++) {
      var hk = 'best_huarong_moves_' + sz + 'x' + sz
      if (u[hk]) { scores.push('华' + sz + ':' + u[hk] + '步'); break }
    }
    // 找数独最佳
    var sdkDiffs = ['easy', 'medium', 'hard', 'expert', 'hell']
    var sdkNames = ['简', '普', '困', '专', '狱']
    for (var di = sdkDiffs.length - 1; di >= 0; di--) {
      var sk = 'best_sudoku_' + sdkDiffs[di]
      if (u[sk]) {
        var mm = Math.floor(u[sk] / 60), ss = u[sk] % 60
        scores.push('数(' + sdkNames[di] + '):' + mm + ':' + String(ss).padStart(2, '0'))
        break
      }
    }
    if (u.best_sudoku_challenge) scores.push('闯:' + u.best_sudoku_challenge + '关')

    setFont(SW * 0.021, '500'); ctx.fillStyle = C.textDim
    ctx.fillText(scores.join('  ') || '暂无记录', nameX, ry + rowH * 0.58)

    // 最后在线
    if (u.lastSeen) {
      var dt = u.lastSeen.$date ? new Date(u.lastSeen.$date) : new Date(u.lastSeen)
      var ds = (dt.getMonth() + 1) + '/' + dt.getDate()
      setFont(SW * 0.019, '500'); ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillText(ds, nameX, ry + rowH * 0.80)
    }

    // 操作按钮（封禁/解封 + 删除）
    var btnH2 = rowH * 0.34, btnW2 = SW * 0.12
    var btnX2 = BOARD_X + BOARD_W - btnW2 - GAP * 0.5
    // 删除
    var dy2 = ry + rowH * 0.58
    roundRect(btnX2, dy2, btnW2, btnH2, 6, 'rgba(231,76,60,0.15)', 'rgba(231,76,60,0.35)')
    setFont(btnH2 * 0.42, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#e74c3c'; ctx.fillText('删除', btnX2 + btnW2 / 2, dy2 + btnH2 / 2)
    GameGlobal.AdminUI['delBtn' + i] = { x: btnX2, y: dy2, w: btnW2, h: btnH2, openid: u.openid || u._id, nick: u.nickName }

    // 封禁/解封
    var by2 = ry + rowH * 0.14
    var banClr = u.banned ? '#2ecc71' : '#e67e22'
    var banTxt = u.banned ? '解封' : '封禁'
    var banBorder = u.banned ? 'rgba(46,204,113,0.35)' : 'rgba(230,126,34,0.35)'
    roundRect(btnX2, by2, btnW2, btnH2, 6, 'rgba(255,255,255,0.05)', banBorder)
    setFont(btnH2 * 0.42, '700'); ctx.fillStyle = banClr
    ctx.fillText(banTxt, btnX2 + btnW2 / 2, by2 + btnH2 / 2)
    GameGlobal.AdminUI['banBtn' + i] = { x: btnX2, y: by2, w: btnW2, h: btnH2, openid: u.openid || u._id, nick: u.nickName, banned: !!u.banned }
  }

  ctx.restore()

  // ── 翻页按钮
  var pgY = listY + listH + GAP * 0.5
  var pgW = (BOARD_W - GAP) / 2, pgH = SH * 0.048

  if (AD.page > 1) {
    roundRect(BOARD_X, pgY, pgW, pgH, 8, C.surface, 'rgba(255,255,255,0.1)')
    setFont(SW * 0.026, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('← 上一页', BOARD_X + pgW / 2, pgY + pgH / 2)
    GameGlobal.AdminUI.prevBtn = { x: BOARD_X, y: pgY, w: pgW, h: pgH }
  }

  if (users.length >= 50) {
    var nx = BOARD_X + pgW + GAP
    roundRect(nx, pgY, pgW, pgH, 8, C.surface, 'rgba(255,255,255,0.1)')
    setFont(SW * 0.026, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('下一页 →', nx + pgW / 2, pgY + pgH / 2)
    GameGlobal.AdminUI.nextBtn = { x: nx, y: pgY, w: pgW, h: pgH }
  }

  // ── 滚动条
  if (users.length > 7) {
    var totalH = users.length * rowH
    var ratio  = listH / totalH
    var barH   = Math.max(SH * 0.03, listH * ratio)
    var barY   = listY + (AD.usersScrollY / totalH) * listH
    roundRect(BOARD_X + BOARD_W - 3, barY, 3, barH, 2, 'rgba(233,69,96,0.4)')
  }
}

// ================================================
//  日志 Tab（可滚动，50条/页）
// ================================================
function _drawLogs(y) {
  var cx = SW / 2
  var AD = GameGlobal._adminData
  var logs = AD.logs

  if (!logs || (logs.length === 0 && !AD._logsLoaded)) {
    GameGlobal._adminLoadLogs(); return
  }
  if (logs.length === 0) {
    setFont(SW * 0.032, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('暂无日志', cx, y + filterH + SH * 0.2)
    return
  }

  // ── 顶部过滤栏
  var filterH = SH * 0.042
  var filters = ['all', 'score_upload']
  var fLabels = ['全部', '上传分数']
  var fW = Math.floor((BOARD_W - GAP) / 2)
  for (var fi = 0; fi < 2; fi++) {
    var fx = BOARD_X + fi * (fW + GAP)
    var isSel = AD.logFilter === filters[fi]
    roundRect(fx, y, fW, filterH, 6, isSel ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.04)')
    setFont(SW * 0.024, isSel ? '800' : '600')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isSel ? C.accent : C.textDim
    ctx.fillText(fLabels[fi], fx + fW / 2, y + filterH / 2)
    GameGlobal.AdminUI['filter' + fi] = { x: fx, y: y, w: fW, h: filterH, key: filters[fi] }
  }

  // 页码
  setFont(SW * 0.020, '600'); ctx.textAlign = 'right'; ctx.fillStyle = C.textDim
  ctx.fillText('第' + AD.page + '页', BOARD_X + BOARD_W, y + filterH + GAP * 0.3)

  var listY = y + filterH + GAP
  var listH = SH * 0.66
  var rowH  = SH * 0.085

  // 类型颜色映射
  var typeColors = {
    'score': '#e94560', 'time': '#f5a623',
    'sudoku_challenge': '#e67e22'
  }
  function _typeColor(type) {
    if (!type) return C.textDim
    if (typeColors[type]) return typeColors[type]
    if (type.indexOf('huarong') === 0) return '#3498db'
    if (type.indexOf('sudoku')  === 0) return '#6c5ce7'
    return C.textDim
  }
  var actionNames = { 'score_upload': '上传分数', 'game_start': '开始游戏' }
  function _typeName(type) {
    if (!type) return ''
    if (type === 'score') return '2048分数'
    if (type === 'time')  return '2048时间'
    if (type === 'sudoku_challenge') return '闯关'
    if (type.indexOf('huarong_moves') === 0) return '华容道步数'
    if (type.indexOf('huarong_time')  === 0) return '华容道时间'
    if (type.indexOf('sudoku_') === 0) {
      var d = type.replace('sudoku_', '')
      var names = { easy: '数独简单', medium: '数独普通', hard: '数独困难', expert: '数独专家', hell: '数独地狱' }
      return names[d] || '数独'
    }
    return type
  }

  // ── 裁剪区域
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, listY, SW, listH)
  ctx.clip()

  for (var i = 0; i < logs.length; i++) {
    var l = logs[i]
    var ry = listY + i * rowH - AD.logsScrollY

    if (ry + rowH < listY || ry > listY + listH) continue

    roundRect(BOARD_X, ry + 2, BOARD_W, rowH - 4, 8, C.surface, 'rgba(255,255,255,0.04)')

    // 左侧：类型色块
    var dotR = 4
    ctx.beginPath()
    ctx.arc(BOARD_X + PAD + dotR, ry + rowH / 2, dotR, 0, Math.PI * 2)
    ctx.fillStyle = _typeColor(l.type); ctx.fill()

    // 昵称 + 操作
    var textX = BOARD_X + PAD + dotR * 2 + GAP * 0.5
    setFont(SW * 0.026, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textLight
    ctx.fillText((l.nickName || '--'), textX, ry + rowH * 0.30)

    // 操作 + 类型 + 时间
    setFont(SW * 0.021, '500'); ctx.fillStyle = C.textDim
    var actStr = actionNames[l.action] || l.action || ''
    if (l.type) actStr += '  [' + _typeName(l.type) + ']'
    ctx.fillText(actStr, textX, ry + rowH * 0.58)

    // 时间
    if (l.createdAt) {
      var dt = l.createdAt.$date ? new Date(l.createdAt.$date) : new Date(l.createdAt)
      var ds = (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' +
               String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0')
      setFont(SW * 0.019, '500'); ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillText(ds, textX, ry + rowH * 0.82)
    }

    // 分数（右侧）
    if (l.score != null) {
      setFont(SW * 0.030, '900'); ctx.textAlign = 'right'
      ctx.fillStyle = _typeColor(l.type)
      ctx.fillText(String(l.score), BOARD_X + BOARD_W - PAD, ry + rowH * 0.35)
    }
    if (l.time != null && l.action === 'score_upload') {
      setFont(SW * 0.020, '600'); ctx.textAlign = 'right'; ctx.fillStyle = C.textDim
      var tm = Math.floor(l.time / 60), ts = l.time % 60
      ctx.fillText(tm + ':' + String(ts).padStart(2, '0'), BOARD_X + BOARD_W - PAD, ry + rowH * 0.65)
    }
  }

  ctx.restore()

  // ── 翻页
  var pgY = listY + listH + GAP * 0.5
  var pgW = (BOARD_W - GAP) / 2, pgH = SH * 0.048

  if (AD.page > 1) {
    roundRect(BOARD_X, pgY, pgW, pgH, 8, C.surface, 'rgba(255,255,255,0.1)')
    setFont(SW * 0.026, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('← 上一页', BOARD_X + pgW / 2, pgY + pgH / 2)
    GameGlobal.AdminUI.prevBtn = { x: BOARD_X, y: pgY, w: pgW, h: pgH }
  }
  if (logs.length >= 50) {
    var nx = BOARD_X + pgW + GAP
    roundRect(nx, pgY, pgW, pgH, 8, C.surface, 'rgba(255,255,255,0.1)')
    setFont(SW * 0.026, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('下一页 →', nx + pgW / 2, pgY + pgH / 2)
    GameGlobal.AdminUI.nextBtn = { x: nx, y: pgY, w: pgW, h: pgH }
  }

  // ── 滚动条
  if (logs.length > 8) {
    var totalH = logs.length * rowH
    var ratio  = listH / totalH
    var barH   = Math.max(SH * 0.03, listH * ratio)
    var barY   = listY + (AD.logsScrollY / totalH) * listH
    roundRect(BOARD_X + BOARD_W - 3, barY, 3, barH, 2, 'rgba(233,69,96,0.4)')
  }
}

// ================================================
//  数据加载函数
// ================================================
GameGlobal._adminLoadStats = function() {
  var AD = GameGlobal._adminData
  if (AD.loading) return
  AD.loading = true
  wx.cloud.callFunction({
    name: 'adminAPI',
    data: { action: 'getStats', adminKey: AD.key },
    success: function(r) { AD.stats = r.result; AD.loading = false },
    fail: function() { AD.loading = false }
  })
}

GameGlobal._adminLoadUsers = function() {
  var AD = GameGlobal._adminData
  if (AD.loading) return
  AD.loading = true; AD.usersScrollY = 0; AD._usersLoaded = false
  wx.cloud.callFunction({
    name: 'adminAPI',
    data: { action: 'getUsers', page: AD.page, pageSize: 50, adminKey: AD.key, keyword: AD.keyword || '' },
    success: function(r) {
      if (r.result && r.result.success) {
        AD.users = r.result.data || []
        AD.totalUsers = r.result.total || 0
      }
      AD._usersLoaded = true; AD.loading = false
    },
    fail: function() { AD._usersLoaded = true; AD.loading = false }
  })
}

GameGlobal._adminLoadLogs = function() {
  var AD = GameGlobal._adminData
  if (AD.loading) return
  AD.loading = true; AD.logsScrollY = 0; AD._logsLoaded = false
  wx.cloud.callFunction({
    name: 'adminAPI',
    data: { action: 'getLogs', page: AD.page, pageSize: 50, adminKey: AD.key, filter: AD.logFilter || 'all' },
    success: function(r) {
      if (r.result && r.result.success) {
        AD.logs = r.result.data || []
        AD.totalLogs = r.result.total || 0
      }
      AD._logsLoaded = true; AD.loading = false
    },
    fail: function() { AD._logsLoaded = true; AD.loading = false }
  })
}