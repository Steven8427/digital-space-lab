// ================================================
//  huarongRender.js - 数字华容道界面绘制
//  包含：游戏界面、排行榜界面
// ================================================

var ctx     = GameGlobal.ctx
var SW      = GameGlobal.SW,  SH      = GameGlobal.SH
var PAD     = GameGlobal.PAD, GAP     = GameGlobal.GAP
var BOARD_W = GameGlobal.BOARD_W, BOARD_H = GameGlobal.BOARD_H
var BOARD_X = GameGlobal.BOARD_X, BOARD_Y = GameGlobal.BOARD_Y
var CELL_SZ = GameGlobal.CELL_SZ, BTN_H   = GameGlobal.BTN_H
var TOP_PAD = GameGlobal.TOP_PAD, ROW1_H  = GameGlobal.ROW1_H, ROW2_H = GameGlobal.ROW2_H
var C       = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg    = GameGlobal.drawBg,    drawBtn = GameGlobal.drawBtn
var inRect    = GameGlobal.inRect

// ── 华容道游戏界面按钮注册表
GameGlobal.HuarongUI = {
  settingBtn: null,
  newBtn:     null,
  overlayBtn: null
}

// ================================================
//  绘制单个数字方块
// ================================================
GameGlobal.drawHuarongTile = function(r, c, value, overrideX, overrideY) {
  var HR    = GameGlobal.Huarong
  var pos   = HR.cellXY(r, c)
  var bx    = overrideX != null ? overrideX : pos[0]
  var by    = overrideY != null ? overrideY : pos[1]
  var csz   = HR._cellSz()
  var col   = HR.getColor(value)

  if (!col) {
    // 空格 — 只画深色凹槽
    roundRect(bx, by, csz, csz, 10, 'rgba(0,0,0,0.25)')
    return
  }

  // 方块主体（带阴影）
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3
  roundRect(bx + 1, by + 1, csz - 2, csz - 2, 11, col.bg)
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'

  // 高光边（顶部和左侧）
  ctx.beginPath()
  ctx.moveTo(bx + 10, by + 2); ctx.lineTo(bx + csz - 10, by + 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke()

  // 数字
  var fs = csz * (value >= 10 ? 0.34 : 0.42)
  setFont(fs, '900')
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = col.fg
  ctx.fillText(String(value), bx + csz / 2, by + csz / 2)
}

// ================================================
//  绘制华容道游戏界面
// ================================================
GameGlobal.drawHuarongScreen = function() {
  drawBg()
  GameGlobal.drawStars()

  var cx = SW / 2
  var HR = GameGlobal.Huarong
  // 防御：grid 未初始化或方法不存在时先 init
  if (!HR.grid || !HR.grid.length || typeof HR._boardH !== 'function') {
    HR.init(GameGlobal._huarongSize || 4)
  }
  var HUI = GameGlobal.HuarongUI

  // ── 第一排：设置按钮 + 步数框
  var row1Y  = TOP_PAD
  var iconSz = ROW1_H
  roundRect(PAD, row1Y, iconSz, iconSz, 12, C.surface, 'rgba(255,255,255,0.08)')
  setFont(iconSz * 0.30, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textLight; ctx.fillText('设置', PAD + iconSz / 2, row1Y + iconSz / 2)
  HUI.settingBtn = { x: PAD, y: row1Y, w: iconSz, h: iconSz }

  // 步数框（左）
  var sboxW = Math.floor((BOARD_W - iconSz - GAP * 3) / 2)
  _drawHuarongScoreBox(PAD + iconSz + GAP, row1Y, sboxW, ROW1_H, '步数', HR.moves)
  // 最优框（右）
  _drawHuarongScoreBox(PAD + iconSz + GAP * 2 + sboxW, row1Y, sboxW, ROW1_H, '最优', HR.best || '-')

  // ── 第二排：计时器
  var row2Y = row1Y + ROW1_H + Math.round(SH * 0.008)
  setFont(SW * 0.058, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('⏱  ' + GameGlobal.Timer.format(), cx, row2Y + ROW2_H / 2)

  // ── 棋盘背景
  var _bh = HR._boardH()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10
  roundRect(BOARD_X, BOARD_Y, BOARD_W, _bh, 16, C.board)
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'
  roundRect(BOARD_X, BOARD_Y, BOARD_W, _bh, 16, null, 'rgba(255,255,255,0.05)')

  // ── 绘制所有格子（含滑动动画）
  HR.updateAnimations()
  var _cs = HR._cellSz(), _n = HR.size
  var _anims = HR._animTiles || []

  // 先画所有空格凹槽
  for (var r = 0; r < _n; r++) {
    for (var c = 0; c < _n; c++) {
      if (!HR.grid[r]) continue
      if (HR.grid[r][c] === 0) {
        var pos = HR.cellXY(r, c)
        roundRect(pos[0], pos[1], _cs, _cs, 10, 'rgba(0,0,0,0.22)')
      }
    }
  }

  // 收集正在动画中的目标位置
  var _animDest = {}
  for (var ai = 0; ai < _anims.length; ai++) {
    if (_anims[ai].progress < 1) {
      _animDest[_anims[ai].toR + ',' + _anims[ai].toC] = true
    }
  }

  // 画非动画方块
  for (var r = 0; r < _n; r++) {
    for (var c = 0; c < _n; c++) {
      if (!HR.grid[r]) continue
      var val = HR.grid[r][c]
      if (val === 0) continue
      if (_animDest[r + ',' + c]) continue  // 跳过正在动画中的
      GameGlobal.drawHuarongTile(r, c, val)
    }
  }

  // 画动画中的方块（插值位置）
  for (var ai = 0; ai < _anims.length; ai++) {
    var a = _anims[ai]
    if (a.progress >= 1) continue
    var ease = 1 - Math.pow(1 - a.progress, 3)  // easeOutCubic
    var fromPos = HR.cellXY(a.fromR, a.fromC)
    var toPos   = HR.cellXY(a.toR, a.toC)
    var ax = fromPos[0] + (toPos[0] - fromPos[0]) * ease
    var ay = fromPos[1] + (toPos[1] - fromPos[1]) * ease
    GameGlobal.drawHuarongTile(a.toR, a.toC, a.value, ax, ay)
  }

  // ── 底部按钮区：再来一局（全宽）
  var btnY = BOARD_Y + HR._boardH() + Math.round(SH * 0.022)
  var hrGrad = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
  hrGrad.addColorStop(0, '#1abc9c'); hrGrad.addColorStop(1, '#3498db')
  ctx.shadowColor = 'rgba(52,152,219,0.4)'; ctx.shadowBlur = 12
  roundRect(BOARD_X, btnY, BOARD_W, BTN_H, 14, hrGrad)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(BTN_H * 0.36, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'; ctx.fillText('再 来 一 局', SW / 2, btnY + BTN_H / 2)
  HUI.newBtn = { x: BOARD_X, y: btnY, w: BOARD_W, h: BTN_H }

  // ── 完成覆盖层
  if (HR.solved) {
    _drawHuarongWinOverlay()
  }
}

// ── 分数框（复用样式）
function _drawHuarongScoreBox(x, y, w, h, label, value) {
  roundRect(x, y, w, h, 12, C.surface, 'rgba(255,255,255,0.07)')
  setFont(w * 0.15, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim; ctx.fillText(label, x + w / 2, y + h * 0.3)
  var digits = String(value).length
  var fs = digits <= 4 ? w * 0.21 : w * 0.17
  setFont(fs, '900'); ctx.fillStyle = C.textLight; ctx.fillText(String(value), x + w / 2, y + h * 0.72)
}

// ── 胜利覆盖层
function _drawHuarongWinOverlay() {
  var HR  = GameGlobal.Huarong
  var HUI = GameGlobal.HuarongUI
  var _bh = HR._boardH()
  roundRect(BOARD_X, BOARD_Y, BOARD_W, _bh, 16, 'rgba(15,10,40,0.93)')

  var cx = BOARD_X + BOARD_W / 2
  var cy = BOARD_Y + _bh / 2
  var ts = BOARD_W * 0.11

  // 标题
  setFont(ts * 1.05, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - ts * 2, 0, cx + ts * 2, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(245,166,35,0.5)'; ctx.shadowBlur = 18
  ctx.fillStyle = tg; ctx.fillText('挑战成功！', cx, cy - ts * 1.6)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // 统计数据
  setFont(ts * 0.55, '700'); ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText('共走 ' + HR.moves + ' 步', cx, cy - ts * 0.55)
  setFont(ts * 0.55, '700')
  ctx.fillText('用时 ' + GameGlobal.Timer.format(), cx, cy + ts * 0.1)

  // 最优成绩
  if (HR.best === HR.moves) {
    setFont(ts * 0.52, '900')
    ctx.fillStyle = '#f5a623'
    ctx.fillText('🏆  新纪录！', cx, cy + ts * 0.82)
  } else if (HR.best > 0) {
    setFont(ts * 0.44, '700')
    ctx.fillStyle = C.textDim
    ctx.fillText('历史最优 ' + HR.best + ' 步', cx, cy + ts * 0.82)
  }
}


// ================================================
//  华容道排行榜界面
// ================================================
GameGlobal.HuarongRankUI = {
  backBtn:     null,
  tabMovesBtn: null,
  tabTimeBtn:  null
}

// 触摸滚动支持
var _hrRankTouchStartY  = 0
var _hrRankScrollStart  = 0

GameGlobal.handleHuarongRankTouch = function(type, y) {
  if (type === 'start') {
    _hrRankTouchStartY = y
    _hrRankScrollStart = GameGlobal.HuarongRank.scrollY
  } else if (type === 'move') {
    var diff   = y - _hrRankTouchStartY
    var R      = GameGlobal.HuarongRank
    var list   = R.tab === 'moves' ? R.movesList : R.timeList
    var rowH   = SH * 0.072
    var maxScr = Math.max(0, list.length * rowH - SH * 0.52)
    R.scrollY  = Math.max(0, Math.min(maxScr, _hrRankScrollStart - diff))
  }
}

GameGlobal.drawHuarongRankScreen = function() {
  drawBg()
  GameGlobal.drawStars()

  var cx = SW / 2
  var R  = GameGlobal.HuarongRank
  var RUI = GameGlobal.HuarongRankUI
  var isMoves = R.tab === 'moves'
  var list    = isMoves ? R.movesList : R.timeList
  var myRank  = isMoves ? R.myMovesRank : R.myTimeRank
  var userInfo = wx.getStorageSync('userInfo') || {}

  // 标题
  setFont(SW * 0.068, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.2, 0, cx + SW * 0.2, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(233,69,96,0.3)'; ctx.shadowBlur = 12
  var _rankSz = GameGlobal.HuarongRank.currentSize || GameGlobal._huarongSize || 4
  ctx.fillStyle = tg; ctx.fillText('华容道排行榜（' + _rankSz + '×' + _rankSz + '）', cx, SH * 0.115)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // Tab 栏：步数榜 / 用时榜
  var tabY = SH * 0.165, tabW = BOARD_W / 2 - GAP / 2, tabH = BTN_H * 0.8
  var t1X  = BOARD_X, t2X = BOARD_X + tabW + GAP

  roundRect(t1X, tabY, tabW, tabH, 12,  isMoves ? C.accent : C.surface,  isMoves ? null : 'rgba(255,255,255,0.08)')
  roundRect(t2X, tabY, tabW, tabH, 12, !isMoves ? C.accent : C.surface, !isMoves ? null : 'rgba(255,255,255,0.08)')
  setFont(tabH * 0.34, '800')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle =  isMoves ? '#fff' : C.textDim; ctx.fillText('最少步数榜', t1X + tabW / 2, tabY + tabH / 2)
  ctx.fillStyle = !isMoves ? '#fff' : C.textDim; ctx.fillText('最速通关榜', t2X + tabW / 2, tabY + tabH / 2)
  RUI.tabMovesBtn = { x: t1X, y: tabY, w: tabW, h: tabH }
  RUI.tabTimeBtn  = { x: t2X, y: tabY, w: tabW, h: tabH }

  // 我的排名条
  var myBarY = tabY + tabH + GAP
  var myBarH = SH * 0.065
  if (myRank) {
    var myGrad = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
    myGrad.addColorStop(0, 'rgba(245,166,35,0.25)')
    myGrad.addColorStop(1, 'rgba(233,69,96,0.15)')
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, myGrad, 'rgba(245,166,35,0.5)')
    setFont(myBarH * 0.38, '900')
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f5a623'
    ctx.fillText('我  #' + myRank.rank, BOARD_X + PAD, myBarY + myBarH / 2)
    var myVal = isMoves ? String(myRank.time) + ' 步' : GameGlobal.formatTime(myRank.time)
    setFont(myBarH * 0.38, '900')
    ctx.textAlign = 'right'; ctx.fillStyle = '#f5a623'
    ctx.fillText(myVal, BOARD_X + BOARD_W - PAD, myBarY + myBarH / 2)
  } else {
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)')
    setFont(myBarH * 0.34, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('完成一局华容道即可上榜', cx, myBarY + myBarH / 2)
  }

  // 列表区域
  var listY = myBarY + myBarH + GAP
  var listH = SH * 0.58 - myBarH - GAP
  roundRect(BOARD_X, listY, BOARD_W, listH, 14, C.surface, 'rgba(255,255,255,0.05)')

  if (R.loading) {
    setFont(SW * 0.04, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('加载中...', cx, listY + listH / 2)
  } else if (R.error) {
    setFont(SW * 0.04, '700'); ctx.fillStyle = C.accent; ctx.textAlign = 'center'
    ctx.fillText(R.error, cx, listY + listH / 2)
  } else if (!list.length) {
    setFont(SW * 0.038, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('暂无数据，快来上榜！', cx, listY + listH / 2)
  } else {
    ctx.save()
    ctx.beginPath(); ctx.rect(BOARD_X, listY, BOARD_W, listH); ctx.clip()

    var rowH = listH / 8
    var rowPad = PAD * 0.8
    var rankColors = ['#f5a623', '#d4d4d4', '#e8935a']
    var myOpenid = myRank ? myRank.openid : null

    for (var i = 0; i < Math.min(list.length, 100); i++) {
      var item = list[i]
      var ry   = listY + i * rowH - R.scrollY
      if (ry + rowH < listY || ry > listY + listH) continue
      var rcy  = ry + rowH / 2

      var isMine = myRank && item.openid && item.openid === myOpenid
      if (isMine) {
        roundRect(BOARD_X + 2, ry, BOARD_W - 4, rowH, 0, 'rgba(245,166,35,0.18)')
      } else if (i % 2 === 0) {
        roundRect(BOARD_X + 2, ry, BOARD_W - 4, rowH, i === 0 ? 12 : 0, 'rgba(255,255,255,0.03)')
      }

      // 排名
      var rankColor = i < 3 ? rankColors[i] : (isMine ? '#f5a623' : C.textDim)
      setFont(rowH * 0.38, '900')
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = rankColor
      ctx.fillText(String(i + 1), BOARD_X + rowPad, rcy)

      // 头像
      var avatarR = rowH * 0.28, avatarX = BOARD_X + rowPad + rowH * 0.58
      ctx.beginPath(); ctx.arc(avatarX, rcy, avatarR, 0, Math.PI * 2)
      ctx.fillStyle = isMine ? 'rgba(245,166,35,0.25)' : 'rgba(255,255,255,0.08)'; ctx.fill()
      var avImg = item.avatarUrl && GameGlobal._avatarImgCache && GameGlobal._avatarImgCache[item.avatarUrl]
      if (avImg && avImg !== 'loading') {
        ctx.save()
        ctx.beginPath(); ctx.arc(avatarX, rcy, avatarR, 0, Math.PI * 2); ctx.clip()
        ctx.drawImage(avImg, avatarX - avatarR, rcy - avatarR, avatarR * 2, avatarR * 2)
        ctx.restore()
      } else {
        if (item.avatarUrl && (!GameGlobal._avatarImgCache || !GameGlobal._avatarImgCache[item.avatarUrl]))
          GameGlobal._loadHomeAvatar(item.avatarUrl)
        setFont(avatarR * 0.9, '700')
        ctx.textAlign = 'center'
        ctx.fillStyle = isMine ? '#f5a623' : C.textDim
        ctx.fillText((item.nickname || '?')[0], avatarX, rcy)
      }

      // 昵称
      setFont(rowH * (isMine ? 0.32 : 0.28), isMine ? '900' : '700')
      ctx.textAlign = 'left'; ctx.fillStyle = isMine ? '#fff' : C.textLight
      var name = item.nickname || '神秘玩家'
      if (name.length > 6) name = name.slice(0, 6) + '..'
      if (isMine) name = name + ' ★'
      ctx.fillText(name, BOARD_X + rowPad + rowH * 1.05, rcy)

      // 数值
      var valStr = isMoves ? String(item.time) + ' 步' : GameGlobal.formatTime(item.time)
      setFont(rowH * (isMine ? 0.38 : 0.34), isMine ? '900' : '700')
      ctx.textAlign = 'right'; ctx.fillStyle = isMine ? '#f5a623' : C.accent2
      ctx.fillText(valStr, BOARD_X + BOARD_W - rowPad, rcy)
    }

    ctx.restore()

    // 滚动条
    if (list.length > 8) {
      var scrollBarH = listH * (8 / list.length)
      var scrollBarY = listY + (R.scrollY / (list.length * rowH - listH)) * (listH - scrollBarH)
      roundRect(BOARD_X + BOARD_W - 4, scrollBarY, 3, scrollBarH, 2, 'rgba(255,255,255,0.25)')
    }
  }

  // 返回按钮
  var backY = listY + listH + GAP * 1.5
  drawBtn(BOARD_X, backY, BOARD_W, BTN_H, '返回华容道', C.surface, C.textLight)
  RUI.backBtn = { x: BOARD_X, y: backY, w: BOARD_W, h: BTN_H }
}