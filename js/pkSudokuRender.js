// ================================================
//  pkSudokuRender.js - 数独 PK 游戏界面
// ================================================

var ctx      = GameGlobal.ctx
var SW       = GameGlobal.SW, SH = GameGlobal.SH
var PAD      = GameGlobal.PAD, GAP = GameGlobal.GAP
var BOARD_W  = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
var CELL_SZ  = GameGlobal.CELL_SZ, BTN_H = GameGlobal.BTN_H
var SIZE     = GameGlobal.SIZE
var C        = GameGlobal.C
var roundRect  = GameGlobal.roundRect
var setFont    = GameGlobal.setFont
var drawBg     = GameGlobal.drawBg
var drawBtn    = GameGlobal.drawBtn
var inRect     = GameGlobal.inRect

// ================================================
//  PK 数独游戏界面
// ================================================
GameGlobal.drawPKSudokuGame = function() {
  var pk = GameGlobal.PK, SDK = GameGlobal.Sudoku, cx = SW/2
  drawBg()

  if (!pk || !SDK || pk.phase !== 'playing') return

  // ── 布局常量
  var barY   = Math.round(SH * 0.16)
  var barH   = Math.round(SH * 0.068)
  var vsW    = Math.round(SW * 0.1)
  var sboxW  = Math.floor((BOARD_W - vsW) / 2)

  // ── 状态栏：我方（用户已填/待填）
  roundRect(BOARD_X, barY, sboxW, barH, 10, C.surface, 'rgba(46,204,113,0.4)')
  var myNickStr = pk.myNick.length > 5 ? pk.myNick.slice(0,5)+'.' : pk.myNick
  setFont(SW*0.026, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#2ecc71'
  ctx.fillText(myNickStr, BOARD_X + sboxW/2, barY + barH*0.3)
  // 只统计用户填入的格子（不含given预填）
  var myUserFilled = 0, myGivenCount = 0
  for (var _r = 0; _r < 9; _r++)
    for (var _c = 0; _c < 9; _c++) {
      if (SDK.given[_r][_c]) myGivenCount++
      else if (SDK.grid[_r][_c] !== 0) myUserFilled++
    }
  var myTotal = 81 - myGivenCount
  setFont(SW*0.042, '900')
  ctx.fillStyle = C.textLight
  ctx.fillText(myUserFilled + '/' + myTotal, BOARD_X + sboxW/2, barY + barH*0.74)

  // ── VS
  setFont(SW*0.030, '900')
  ctx.fillStyle = C.accent; ctx.textAlign = 'center'
  ctx.fillText('VS', BOARD_X + sboxW + vsW/2, barY + barH/2)

  // ── 状态栏：对方
  var opBX = BOARD_X + sboxW + vsW
  roundRect(opBX, barY, sboxW, barH, 10, C.surface,
    pk.opponentGameOver ? 'rgba(233,69,96,0.12)' : 'rgba(233,69,96,0.4)')
  var opNickStr = pk.opponentNick.length > 5 ? pk.opponentNick.slice(0,5)+'.' : pk.opponentNick
  setFont(SW*0.026, '700')
  ctx.fillStyle = C.accent
  ctx.fillText(opNickStr, opBX + sboxW/2, barY + barH*0.3)
  var opTotal = pk.opponentTotal || myTotal
  var opStr = pk.opponentScore + '/' + opTotal
  setFont(SW*0.042, '900')
  ctx.fillStyle = pk.opponentGameWon ? C.accent2 : C.textLight
  ctx.fillText(opStr, opBX + sboxW/2, barY + barH*0.74)

  // ── 计时器
  var timerY = barY + barH + Math.round(SH*0.004)
  var timerH = Math.round(SH*0.036)
  setFont(SW*0.038, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('⏱  ' + GameGlobal.Timer.format(), cx, timerY + timerH/2)

  // 对手完成提示
  var hintY = timerY + timerH
  if (pk.opponentGameWon) {
    setFont(SW*0.024, '700')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.accent2
    ctx.fillText('⚡ 对手已完成！加油！', cx, hintY + Math.round(SH*0.010))
    hintY += Math.round(SH*0.022)
  }

  // ── 棋盘
  var boardTop  = hintY + Math.round(SH*0.010)
  // 计算格子大小（确保棋盘 + 数字按钮 + 认输按钮不超出屏幕）
  var availH   = SH*0.86 - boardTop  // 留底部空间
  var maxBoardH = availH - Math.round(SH*0.12) // 减去数字按钮+认输按钮空间
  var cellSz   = Math.min(Math.floor(BOARD_W / 9), Math.floor(maxBoardH / 9))
  var boardSz  = cellSz * 9
  var boardLeft = Math.floor(cx - boardSz / 2)

  // 保存给 hitTest 用
  pk._pkSudokuBoardX = boardLeft
  pk._pkSudokuBoardY = boardTop
  pk._pkSudokuCellSz = cellSz

  // 棋盘底色
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4
  roundRect(boardLeft - 4, boardTop - 4, boardSz + 8, boardSz + 8, 8, '#1b2838')
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'
  roundRect(boardLeft - 4, boardTop - 4, boardSz + 8, boardSz + 8, 8, null, 'rgba(100,180,255,0.40)')

  // 绘制格子
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
      if (isSel)          bgColor = 'rgba(66,165,245,0.50)'
      else if (isError)   bgColor = 'rgba(244,67,54,0.45)'
      else if (selNum > 0 && val === selNum && val !== 0) bgColor = 'rgba(66,165,245,0.28)'
      else if (sameRow || sameCol || sameBox) bgColor = 'rgba(100,180,255,0.14)'
      else if (isGiven)   bgColor = 'rgba(200,220,255,0.10)'
      else                bgColor = 'rgba(255,255,255,0.03)'

      ctx.fillStyle = bgColor
      ctx.fillRect(cx2, cy2, cellSz, cellSz)

      if (val !== 0) {
        var fgColor = isError ? '#ff5252' : (isGiven ? '#e8eaf6' : '#64b5f6')
        setFont(cellSz * 0.48, isGiven ? '900' : '700')
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = fgColor
        ctx.fillText(String(val), cx2 + cellSz/2, cy2 + cellSz/2)
      } else {
        // 笔记
        var noteArr = SDK.notes[r][c]
        var hasNotes = false
        for (var ni = 0; ni < 9; ni++) if (noteArr[ni]) { hasNotes = true; break }
        if (hasNotes) {
          setFont(cellSz * 0.22, '600')
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillStyle = 'rgba(100,181,246,0.65)'
          for (var ni = 0; ni < 9; ni++) {
            if (!noteArr[ni]) continue
            var nr = Math.floor(ni / 3), nc = ni % 3
            ctx.fillText(String(ni + 1), cx2 + (nc + 0.5) * (cellSz / 3), cy2 + (nr + 0.5) * (cellSz / 3))
          }
        }
      }
    }
  }

  // 网格线
  ctx.strokeStyle = 'rgba(100,180,255,0.25)'; ctx.lineWidth = 1
  for (var i = 0; i <= 9; i++) {
    var px = boardLeft + i * cellSz, py = boardTop + i * cellSz
    ctx.beginPath(); ctx.moveTo(px, boardTop); ctx.lineTo(px, boardTop + boardSz); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(boardLeft, py); ctx.lineTo(boardLeft + boardSz, py); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(100,180,255,0.75)'; ctx.lineWidth = 2.5
  for (var i = 0; i <= 3; i++) {
    var px = boardLeft + i * 3 * cellSz, py = boardTop + i * 3 * cellSz
    ctx.beginPath(); ctx.moveTo(px, boardTop); ctx.lineTo(px, boardTop + boardSz); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(boardLeft, py); ctx.lineTo(boardLeft + boardSz, py); ctx.stroke()
  }

  // ── 数字按钮（1-9）
  var numY = boardTop + boardSz + Math.round(SH*0.010)
  var numW = Math.floor((BOARD_W - GAP*8) / 9)
  var numH = Math.round(SH*0.050)
  pk.btns.numBtns = []
  for (var ni = 0; ni < 9; ni++) {
    var nx = BOARD_X + ni*(numW+GAP)
    var num = ni + 1
    var rem = SDK.getRemaining(num)
    var isActive = rem > 0

    if (isActive) {
      roundRect(nx, numY, numW, numH, 6, '#1b2838', 'rgba(100,180,255,0.50)')
    } else {
      roundRect(nx, numY, numW, numH, 6, 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.06)')
    }
    setFont(numH*0.42, '900')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isActive ? '#e3f2fd' : 'rgba(255,255,255,0.12)'
    ctx.fillText(String(num), nx + numW/2, numY + numH/2)

    pk.btns.numBtns.push({ x:nx, y:numY, w:numW, h:numH, num:num })
  }

  // ── 笔记 + 擦除 + 认输（一行三按钮）
  var toolY = numY + numH + Math.round(SH*0.010)
  var toolW3 = Math.floor((BOARD_W - GAP*2) / 3)
  var toolH  = Math.round(SH*0.042)

  // 笔记
  var notesActive = SDK.notesMode
  roundRect(BOARD_X, toolY, toolW3, toolH, 8,
    notesActive ? '#1a3a5c' : '#1b2838',
    notesActive ? 'rgba(66,165,245,0.6)' : 'rgba(255,255,255,0.15)')
  setFont(toolH*0.38, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = notesActive ? '#64b5f6' : C.textDim
  ctx.fillText('✏ 笔记', BOARD_X + toolW3/2, toolY + toolH/2)
  pk.btns.notesBtn = { x:BOARD_X, y:toolY, w:toolW3, h:toolH }

  // 擦除
  var eraseX = BOARD_X + toolW3 + GAP
  roundRect(eraseX, toolY, toolW3, toolH, 8, '#1b2838', 'rgba(255,255,255,0.15)')
  setFont(toolH*0.38, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('🗑 擦除', eraseX + toolW3/2, toolY + toolH/2)
  pk.btns.eraseBtn = { x:eraseX, y:toolY, w:toolW3, h:toolH }

  // 认输
  var surrX = eraseX + toolW3 + GAP
  roundRect(surrX, toolY, toolW3, toolH, 8, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.12)')
  setFont(toolH*0.38, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('🏳 认输', surrX + toolW3/2, toolY + toolH/2)
  pk.btns.surrenderBtn = { x:surrX, y:toolY, w:toolW3, h:toolH }

  // ── 完成遮罩
  if (SDK.solved && pk.phase === 'playing') {
    roundRect(boardLeft - 4, boardTop - 4, boardSz + 8, boardSz + 8, 8, 'rgba(10,10,30,0.90)')
    setFont(SW*0.042, '900')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textLight
    ctx.fillText('🎉 已完成！', cx, boardTop + boardSz*0.42)
    setFont(SW*0.028, '700')
    ctx.fillStyle = C.textDim
    ctx.fillText('等待对手结束...', cx, boardTop + boardSz*0.58)
  }
}