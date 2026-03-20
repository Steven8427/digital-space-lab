// ================================================
//  sudokuChallengeRender.js - 闯关模式界面
//  包含：闯关大厅、闯关游戏、闯关排行榜
// ================================================

var ctx     = GameGlobal.ctx
var SW      = GameGlobal.SW,  SH      = GameGlobal.SH
var PAD     = GameGlobal.PAD, GAP     = GameGlobal.GAP
var BOARD_W = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
var BTN_H   = GameGlobal.BTN_H
var TOP_PAD = GameGlobal.TOP_PAD, ROW1_H = GameGlobal.ROW1_H
var C       = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg    = GameGlobal.drawBg,    drawBtn = GameGlobal.drawBtn
var inRect    = GameGlobal.inRect

// ================================================
//  闯关大厅
// ================================================
GameGlobal.ChallengeUI = {
  startBtn: null, rankBtn: null, backBtn: null
}

GameGlobal.drawChallengeScreen = function() {
  drawBg(); GameGlobal.drawStars()

  var cx  = SW / 2
  var CHG = GameGlobal.SudokuChallenge
  var CUI = GameGlobal.ChallengeUI
  var info = CHG.getLevelInfo()

  // ── 标题
  setFont(SW * 0.078, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.25, 0, cx + SW * 0.25, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(245,166,35,0.4)'; ctx.shadowBlur = 18; ctx.fillStyle = tg
  ctx.fillText('闯 关 模 式', cx, SH * 0.11)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(SW * 0.026, '600'); ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText('固定关卡 · 全球统一 · 无提示无检查', cx, SH * 0.165)

  // ── 进度卡片
  var cardY = SH * 0.21, cardH = SH * 0.28
  var cardGrad = ctx.createLinearGradient(BOARD_X, cardY, BOARD_X, cardY + cardH)
  cardGrad.addColorStop(0, 'rgba(245,166,35,0.12)'); cardGrad.addColorStop(1, 'rgba(233,69,96,0.08)')
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4
  roundRect(BOARD_X, cardY, BOARD_W, cardH, 18, cardGrad, 'rgba(245,166,35,0.3)')
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'

  // 当前包
  setFont(SW * 0.026, '700'); ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillText('关卡包 ' + info.pack, cx, cardY + cardH * 0.10)

  // 关卡大字
  setFont(SW * 0.13, '900')
  var lvGrad = ctx.createLinearGradient(cx - SW * 0.15, 0, cx + SW * 0.15, 0)
  lvGrad.addColorStop(0, '#f5a623'); lvGrad.addColorStop(1, '#e94560')
  ctx.fillStyle = lvGrad
  ctx.fillText('第 ' + info.inPack + ' 关', cx, cardY + cardH * 0.36)

  // 难度标签
  var diffColors = { easy:'#2ecc71', medium:'#3498db', hard:'#e67e22', expert:'#e74c3c', hell:'#8e44ad' }
  var diffClr = diffColors[info.diff] || '#fff'
  var tagW = SW * 0.2, tagH = SH * 0.032
  roundRect(cx - tagW/2, cardY + cardH * 0.52, tagW, tagH, tagH/2, diffClr)
  setFont(tagH * 0.55, '900'); ctx.fillStyle = '#fff'
  ctx.fillText(info.diffName, cx, cardY + cardH * 0.52 + tagH/2)

  // 进度条
  var barX = BOARD_X + PAD * 2, barW = BOARD_W - PAD * 4
  var barY2 = cardY + cardH * 0.68, barH2 = SH * 0.012
  roundRect(barX, barY2, barW, barH2, barH2/2, 'rgba(255,255,255,0.1)')
  var progress = Math.min(1, (info.inPack - 1) / 1000)
  if (progress > 0) {
    var pGrad = ctx.createLinearGradient(barX, 0, barX + barW * progress, 0)
    pGrad.addColorStop(0, '#f5a623'); pGrad.addColorStop(1, '#e94560')
    roundRect(barX, barY2, Math.max(barH2, barW * progress), barH2, barH2/2, pGrad)
  }
  setFont(SW * 0.022, '600'); ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText(info.inPack + ' / 1000', cx, barY2 + barH2 + SH * 0.018)

  // 累计用时 + 已通关数
  var statY = cardY + cardH * 0.88
  setFont(SW * 0.024, '600'); ctx.fillStyle = 'rgba(255,255,255,0.5)'
  var passedLvl = CHG.level - 1
  var totalStr = '已通关 ' + passedLvl + ' 关'
  if (CHG.totalTime > 0) totalStr += '  ·  累计 ' + GameGlobal.Timer.formatSec(CHG.totalTime)
  ctx.fillText(totalStr, cx, statY)

  // ── 继续闯关按钮
  var btnY = cardY + cardH + GAP * 2, btnH = BTN_H * 1.15
  ctx.shadowColor = 'rgba(245,166,35,0.5)'; ctx.shadowBlur = 20
  var btnGrad = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
  btnGrad.addColorStop(0, '#f5a623'); btnGrad.addColorStop(1, '#e94560')
  roundRect(BOARD_X, btnY, BOARD_W, btnH, 16, btnGrad)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(btnH * 0.36, '900'); ctx.fillStyle = '#fff'
  ctx.fillText(passedLvl === 0 ? '开 始 闯 关' : '继 续 闯 关', cx, btnY + btnH / 2)
  CUI.startBtn = { x: BOARD_X, y: btnY, w: BOARD_W, h: btnH }

  // ── 排行榜按钮
  var r2Y = btnY + btnH + GAP * 1.5, r2H = BTN_H * 0.95
  roundRect(BOARD_X, r2Y, BOARD_W, r2H, 14, C.surface, 'rgba(245,166,35,0.25)')
  setFont(r2H * 0.34, '700'); ctx.fillStyle = '#f5a623'
  ctx.fillText('🏆  闯关排行榜', cx, r2Y + r2H / 2)
  CUI.rankBtn = { x: BOARD_X, y: r2Y, w: BOARD_W, h: r2H }

  // ── 返回
  var bkY = r2Y + r2H + GAP * 1.5, bkH = BTN_H * 0.85
  roundRect(BOARD_X, bkY, BOARD_W, bkH, 14, C.surface, 'rgba(255,255,255,0.06)')
  setFont(bkH * 0.34, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('← 返回数独大厅', cx, bkY + bkH / 2)
  CUI.backBtn = { x: BOARD_X, y: bkY, w: BOARD_W, h: bkH }
}


// ================================================
//  闯关游戏界面
// ================================================
GameGlobal.ChallengeGameUI = {
  notesBtn: null, eraseBtn: null, restartBtn: null,
  numBtns: null, backBtn: null, nextBtn: null
}

GameGlobal.drawChallengeGameScreen = function() {
  drawBg(); GameGlobal.drawStars()

  var cx  = SW / 2
  var SDK = GameGlobal.Sudoku
  var CHG = GameGlobal.SudokuChallenge
  var GUI = GameGlobal.ChallengeGameUI
  var info = CHG.getLevelInfo()

  if (!SDK.grid || !SDK.grid.length) return

  // ── 顶栏：关卡 + 难度 + 时间
  var row1Y  = TOP_PAD
  var iconSz = ROW1_H
  var infoW3 = Math.floor((BOARD_W - GAP * 2) / 3)

  // 关卡
  roundRect(BOARD_X, row1Y, infoW3, ROW1_H, 12, C.surface, 'rgba(245,166,35,0.25)')
  setFont(infoW3 * 0.15, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.textDim
  ctx.fillText('关卡', BOARD_X + infoW3 / 2, row1Y + ROW1_H * 0.3)
  setFont(infoW3 * 0.22, '900'); ctx.fillStyle = '#f5a623'
  ctx.fillText('第' + info.inPack + '关', BOARD_X + infoW3 / 2, row1Y + ROW1_H * 0.72)

  // 难度
  var infoX2 = BOARD_X + infoW3 + GAP
  var diffColors = { easy:'#2ecc71', medium:'#3498db', hard:'#e67e22', expert:'#e74c3c', hell:'#8e44ad' }
  roundRect(infoX2, row1Y, infoW3, ROW1_H, 12, C.surface, 'rgba(255,255,255,0.1)')
  setFont(infoW3 * 0.15, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('难度', infoX2 + infoW3 / 2, row1Y + ROW1_H * 0.3)
  setFont(infoW3 * 0.22, '900'); ctx.fillStyle = diffColors[info.diff] || '#fff'
  ctx.fillText(info.diffName, infoX2 + infoW3 / 2, row1Y + ROW1_H * 0.72)

  // 时间
  var infoX3 = infoX2 + infoW3 + GAP
  roundRect(infoX3, row1Y, infoW3, ROW1_H, 12, C.surface, 'rgba(255,255,255,0.1)')
  setFont(infoW3 * 0.15, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('时间', infoX3 + infoW3 / 2, row1Y + ROW1_H * 0.3)
  setFont(infoW3 * 0.22, '900'); ctx.fillStyle = C.textLight
  ctx.fillText(GameGlobal.Timer.format(), infoX3 + infoW3 / 2, row1Y + ROW1_H * 0.72)

  // ── 棋盘
  var boardTop = row1Y + ROW1_H + Math.round(SH * 0.018)
  var cellSz   = Math.floor(BOARD_W / 9)
  var boardSz  = cellSz * 9
  var boardLeft = Math.floor(cx - boardSz / 2)

  SDK._boardX = boardLeft
  SDK._boardY = boardTop
  SDK._cellSz = cellSz

  // 棋盘底色
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4
  roundRect(boardLeft - 4, boardTop - 4, boardSz + 8, boardSz + 8, 10, '#0c0e22')
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'
  roundRect(boardLeft - 4, boardTop - 4, boardSz + 8, boardSz + 8, 10, null, 'rgba(245,166,35,0.25)')

  // 格子
  var selNum = (SDK.selR >= 0 && SDK.selC >= 0) ? SDK.grid[SDK.selR][SDK.selC] : 0

  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var cx2 = boardLeft + c * cellSz
      var cy2 = boardTop + r * cellSz
      var val = SDK.grid[r][c]
      var isGiven = SDK.given[r][c]
      var isSel   = (r === SDK.selR && c === SDK.selC)
      var isError = SDK.hasError(r, c)

      var sameRow = (SDK.selR >= 0 && r === SDK.selR)
      var sameCol = (SDK.selC >= 0 && c === SDK.selC)
      var sameBox = (SDK.selR >= 0 && SDK.selC >= 0 &&
        Math.floor(r/3) === Math.floor(SDK.selR/3) &&
        Math.floor(c/3) === Math.floor(SDK.selC/3))

      var bgColor
      if (isSel)          bgColor = 'rgba(245,166,35,0.50)'
      else if (isError)   bgColor = 'rgba(233,69,96,0.35)'
      else if (selNum > 0 && val === selNum && val !== 0) bgColor = 'rgba(245,166,35,0.25)'
      else if (sameRow || sameCol || sameBox) bgColor = 'rgba(245,166,35,0.10)'
      else if (isGiven)   bgColor = 'rgba(245,166,35,0.06)'
      else                bgColor = 'rgba(255,255,255,0.03)'

      ctx.fillStyle = bgColor
      ctx.fillRect(cx2, cy2, cellSz, cellSz)

      if (val !== 0) {
        var fgColor = isError ? '#ff6b81' : (isGiven ? '#e8d5b0' : '#f5c563')
        setFont(cellSz * 0.48, isGiven ? '900' : '700')
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = fgColor
        ctx.fillText(String(val), cx2 + cellSz / 2, cy2 + cellSz / 2)
      } else {
        var noteArr = SDK.notes[r][c]
        var hasNotes = false
        for (var ni = 0; ni < 9; ni++) if (noteArr[ni]) { hasNotes = true; break }
        if (hasNotes) {
          var nfs = cellSz * 0.22
          setFont(nfs, '600')
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillStyle = 'rgba(245,166,35,0.55)'
          for (var ni = 0; ni < 9; ni++) {
            if (!noteArr[ni]) continue
            var nr = Math.floor(ni / 3), nc = ni % 3
            ctx.fillText(String(ni + 1),
              cx2 + (nc + 0.5) * (cellSz / 3),
              cy2 + (nr + 0.5) * (cellSz / 3))
          }
        }
      }
    }
  }

  // 网格线
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1
  for (var i = 0; i <= 9; i++) {
    var px = boardLeft + i * cellSz, py = boardTop + i * cellSz
    ctx.beginPath(); ctx.moveTo(px, boardTop); ctx.lineTo(px, boardTop + boardSz); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(boardLeft, py); ctx.lineTo(boardLeft + boardSz, py); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(245,166,35,0.55)'; ctx.lineWidth = 2.5
  for (var i = 0; i <= 3; i++) {
    var px = boardLeft + i * 3 * cellSz, py = boardTop + i * 3 * cellSz
    ctx.beginPath(); ctx.moveTo(px, boardTop); ctx.lineTo(px, boardTop + boardSz); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(boardLeft, py); ctx.lineTo(boardLeft + boardSz, py); ctx.stroke()
  }

  // ── 数字按钮（1-9）
  var numY = boardTop + boardSz + Math.round(SH * 0.016)
  var numW = Math.floor((BOARD_W - GAP * 8) / 9)
  var numH = Math.round(SH * 0.062)
  GUI.numBtns = []

  for (var ni = 0; ni < 9; ni++) {
    var nx = BOARD_X + ni * (numW + GAP)
    var num = ni + 1
    var rem = SDK.getRemaining(num)
    var isActive = rem > 0

    if (isActive) {
      roundRect(nx, numY, numW, numH, 8, '#1a1508', 'rgba(245,166,35,0.45)')
      var nbg = ctx.createLinearGradient(nx, numY, nx, numY + numH * 0.4)
      nbg.addColorStop(0, 'rgba(245,166,35,0.2)'); nbg.addColorStop(1, 'rgba(245,166,35,0)')
      roundRect(nx + 1, numY + 1, numW - 2, numH * 0.4, 7, nbg)
    } else {
      roundRect(nx, numY, numW, numH, 8, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.06)')
    }

    setFont(numH * 0.40, '900')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isActive ? '#f5d9a0' : 'rgba(255,255,255,0.15)'
    ctx.fillText(String(num), nx + numW / 2, numY + numH * 0.42)

    if (rem > 0) {
      setFont(numH * 0.19, '600')
      ctx.fillStyle = 'rgba(245,166,35,0.5)'
      ctx.fillText(String(rem), nx + numW / 2, numY + numH * 0.80)
    }

    GUI.numBtns.push({ x: nx, y: numY, w: numW, h: numH, num: num })
  }

  // ── 工具栏：笔记 + 擦除 + 重来（只有3个，禁用提示检查）
  var toolY = numY + numH + Math.round(SH * 0.012)
  var toolH = Math.round(SH * 0.048)
  var toolW3 = Math.floor((BOARD_W - GAP * 2) / 3)

  // 笔记
  var notesActive = SDK.notesMode
  roundRect(BOARD_X, toolY, toolW3, toolH, 10,
    notesActive ? '#3d2d0f' : '#151030',
    notesActive ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.15)')
  setFont(toolH * 0.34, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = notesActive ? '#f5d9a0' : C.textDim
  ctx.fillText('✏ 笔记', BOARD_X + toolW3 / 2, toolY + toolH / 2)
  GUI.notesBtn = { x: BOARD_X, y: toolY, w: toolW3, h: toolH }

  // 擦除
  var eraseX = BOARD_X + toolW3 + GAP
  roundRect(eraseX, toolY, toolW3, toolH, 10, '#151030', 'rgba(255,255,255,0.15)')
  setFont(toolH * 0.34, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('🗑 擦除', eraseX + toolW3 / 2, toolY + toolH / 2)
  GUI.eraseBtn = { x: eraseX, y: toolY, w: toolW3, h: toolH }

  // 重来
  var restX = eraseX + toolW3 + GAP
  roundRect(restX, toolY, toolW3, toolH, 10, '#151030', 'rgba(233,69,96,0.15)')
  setFont(toolH * 0.34, '700'); ctx.fillStyle = '#e94560'
  ctx.fillText('🔄 重来', restX + toolW3 / 2, toolY + toolH / 2)
  GUI.restartBtn = { x: restX, y: toolY, w: toolW3, h: toolH }

  // 返回
  var backY = toolY + toolH + Math.round(SH * 0.010)
  var backH = Math.round(SH * 0.042)
  roundRect(BOARD_X, backY, BOARD_W, backH, 10, '#151030', 'rgba(255,255,255,0.08)')
  setFont(backH * 0.38, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
  ctx.fillText('← 退出闯关', cx, backY + backH / 2)
  GUI.backBtn = { x: BOARD_X, y: backY, w: BOARD_W, h: backH }

  // ── 通关覆盖层
  if (SDK.solved) {
    _drawChallengeWinOverlay()
  }
}

// ── 通关覆盖层
function _drawChallengeWinOverlay() {
  var cx  = SW / 2
  var CHG = GameGlobal.SudokuChallenge
  var GUI = GameGlobal.ChallengeGameUI
  // 当前 level 已经 +1 了，所以完成的是 level-1
  var passedLevel = CHG.level - 1
  var passedInfo  = CHG.getLevelInfo(passedLevel)

  // 遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, SW, SH)

  var cy = SH * 0.42
  var ts = SW * 0.08

  // 星星装饰
  setFont(ts * 1.8, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(245,166,35,0.5)'
  ctx.fillText('⭐', cx - ts * 2.5, cy - ts * 3)
  ctx.fillText('⭐', cx + ts * 2.5, cy - ts * 3)

  setFont(ts * 1.3, '900')
  var tg = ctx.createLinearGradient(cx - SW * 0.25, 0, cx + SW * 0.25, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(245,166,35,0.5)'; ctx.shadowBlur = 20
  ctx.fillStyle = tg; ctx.fillText('通关成功！', cx, cy - ts * 1.5)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  setFont(ts * 0.55, '700'); ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText('第 ' + passedInfo.inPack + ' 关  ·  ' + passedInfo.diffName, cx, cy - ts * 0.3)
  ctx.fillText('用时：' + GameGlobal.Timer.format(), cx, cy + ts * 0.35)

  setFont(ts * 0.45, '600'); ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText('累计用时 ' + GameGlobal.Timer.formatSec(CHG.totalTime), cx, cy + ts * 1.0)

  // 下一关按钮
  var btnW = BOARD_W * 0.7, btnH2 = BTN_H * 1.1
  var btnX = cx - btnW / 2, btnY2 = cy + ts * 2.0
  ctx.shadowColor = 'rgba(245,166,35,0.5)'; ctx.shadowBlur = 16
  var bg = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0)
  bg.addColorStop(0, '#f5a623'); bg.addColorStop(1, '#e94560')
  roundRect(btnX, btnY2, btnW, btnH2, 14, bg)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(btnH2 * 0.36, '900'); ctx.fillStyle = '#fff'
  ctx.fillText('下 一 关 ▶', cx, btnY2 + btnH2 / 2)
  GUI.nextBtn = { x: btnX, y: btnY2, w: btnW, h: btnH2 }
}


// ================================================
//  闯关排行榜
// ================================================
GameGlobal.ChallengeRankUI = { backBtn: null }

// 滚动
var _chgRankTouchStartY = 0
var _chgRankScrollStart = 0

GameGlobal.handleChallengeRankTouch = function(type, y) {
  if (type === 'start') {
    _chgRankTouchStartY = y
    _chgRankScrollStart = GameGlobal.ChallengeRank.scrollY
  } else if (type === 'move') {
    var diff   = y - _chgRankTouchStartY
    var R      = GameGlobal.ChallengeRank
    var rowH   = SH * 0.072
    var maxScr = Math.max(0, R.list.length * rowH - SH * 0.52)
    R.scrollY  = Math.max(0, Math.min(maxScr, _chgRankScrollStart - diff))
  }
}

GameGlobal.drawChallengeRankScreen = function() {
  drawBg(); GameGlobal.drawStars()

  var cx  = SW / 2
  var R   = GameGlobal.ChallengeRank
  var RUI = GameGlobal.ChallengeRankUI
  var list = R.list || []
  var myRank = R.myRank

  // 标题
  setFont(SW * 0.065, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.2, 0, cx + SW * 0.2, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(245,166,35,0.3)'; ctx.shadowBlur = 12
  ctx.fillStyle = tg; ctx.fillText('闯关排行榜', cx, SH * 0.115)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // 我的排名条
  var myBarY = SH * 0.17, myBarH = SH * 0.065
  if (myRank) {
    var myGrad = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
    myGrad.addColorStop(0, 'rgba(245,166,35,0.2)')
    myGrad.addColorStop(1, 'rgba(233,69,96,0.12)')
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, myGrad, 'rgba(245,166,35,0.4)')
    setFont(myBarH * 0.38, '900')
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f5a623'
    ctx.fillText('我  #' + myRank.rank, BOARD_X + PAD, myBarY + myBarH / 2)
    setFont(myBarH * 0.34, '900')
    ctx.textAlign = 'right'; ctx.fillStyle = '#f5a623'
    ctx.fillText('第' + myRank.score + '关', BOARD_X + BOARD_W - PAD, myBarY + myBarH / 2)
  } else {
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)')
    setFont(myBarH * 0.34, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('完成闯关第1关即可上榜', cx, myBarY + myBarH / 2)
  }

  // 列表
  var listY = myBarY + myBarH + GAP
  var listH = SH * 0.62
  roundRect(BOARD_X, listY, BOARD_W, listH, 14, C.surface, 'rgba(255,255,255,0.05)')

  if (R.loading) {
    setFont(SW * 0.04, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('加载中...', cx, listY + listH / 2)
  } else if (!list.length) {
    setFont(SW * 0.038, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('暂无数据，快来闯关上榜！', cx, listY + listH / 2)
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
        roundRect(BOARD_X + 2, ry, BOARD_W - 4, rowH, 0, 'rgba(245,166,35,0.15)')
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
      ctx.fillStyle = isMine ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.08)'; ctx.fill()
      var avImg = item.avatarUrl && GameGlobal._avatarImgCache && GameGlobal._avatarImgCache[item.avatarUrl]
      if (avImg && avImg !== 'loading') {
        ctx.save()
        ctx.beginPath(); ctx.arc(avatarX, rcy, avatarR, 0, Math.PI * 2); ctx.clip()
        ctx.drawImage(avImg, avatarX - avatarR, rcy - avatarR, avatarR * 2, avatarR * 2)
        ctx.restore()
      } else {
        if (item.avatarUrl && (!GameGlobal._avatarImgCache || !GameGlobal._avatarImgCache[item.avatarUrl]))
          GameGlobal._loadHomeAvatar(item.avatarUrl)
        setFont(avatarR * 0.9, '700'); ctx.textAlign = 'center'
        ctx.fillStyle = isMine ? '#f5a623' : C.textDim
        ctx.fillText((item.nickname || '?')[0], avatarX, rcy)
      }

      // 昵称
      setFont(rowH * (isMine ? 0.32 : 0.28), isMine ? '900' : '700')
      ctx.textAlign = 'left'; ctx.fillStyle = isMine ? '#fff' : C.textLight
      var name = item.nickname || '神秘玩家'
      if (name.length > 6) name = name.slice(0, 6) + '..'
      if (isMine) name = name + ' ★'
      ctx.fillText(name, BOARD_X + rowPad + rowH * 1.05, rcy - rowH * 0.12)

      // 通关数 + 用时
      setFont(rowH * 0.24, '600')
      ctx.fillStyle = isMine ? 'rgba(245,166,35,0.7)' : 'rgba(255,255,255,0.4)'
      ctx.fillText('累计 ' + GameGlobal.Timer.formatSec(item.time || 0), BOARD_X + rowPad + rowH * 1.05, rcy + rowH * 0.18)

      // 关卡数（右侧大字）
      setFont(rowH * (isMine ? 0.42 : 0.36), '900')
      ctx.textAlign = 'right'; ctx.fillStyle = isMine ? '#f5a623' : '#82c8ff'
      ctx.fillText('第' + (item.score || 0) + '关', BOARD_X + BOARD_W - rowPad, rcy)
    }

    ctx.restore()

    // 滚动条
    if (list.length > 8) {
      var scrollBarH = listH * (8 / list.length)
      var scrollBarY = listY + (R.scrollY / (list.length * rowH - listH)) * (listH - scrollBarH)
      roundRect(BOARD_X + BOARD_W - 4, scrollBarY, 3, scrollBarH, 2, 'rgba(245,166,35,0.4)')
    }
  }

  // 返回
  var backY = listY + listH + GAP * 1.5
  drawBtn(BOARD_X, backY, BOARD_W, BTN_H, '返回', C.surface, C.textLight)
  RUI.backBtn = { x: BOARD_X, y: backY, w: BOARD_W, h: BTN_H }
}