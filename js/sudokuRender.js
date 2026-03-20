// ================================================
//  sudokuRender.js - 数独界面绘制
//  包含：大厅、游戏界面、排行榜界面
// ================================================

var ctx     = GameGlobal.ctx
var SW      = GameGlobal.SW,  SH      = GameGlobal.SH
var PAD     = GameGlobal.PAD, GAP     = GameGlobal.GAP
var BOARD_W = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
var BTN_H   = GameGlobal.BTN_H
var TOP_PAD = GameGlobal.TOP_PAD, ROW1_H = GameGlobal.ROW1_H, ROW2_H = GameGlobal.ROW2_H
var C       = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg    = GameGlobal.drawBg,    drawBtn = GameGlobal.drawBtn
var inRect    = GameGlobal.inRect

// ================================================
//  数独大厅
// ================================================
GameGlobal.LobbySudokuUI = { startBtn:null, rankBtn:null, pkBtn:null, challengeBtn:null, backBtn:null, diffBtns:[] }

GameGlobal.drawLobbySudokuScreen = function() {
  drawBg(); GameGlobal.drawStars()
  var cx = SW / 2
  var L = GameGlobal.LobbySudokuUI
  L.diffBtns = []

  // 标题
  setFont(SW * 0.085, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.25, 0, cx + SW * 0.25, 0)
  tg.addColorStop(0, '#6c5ce7'); tg.addColorStop(1, '#a29bfe')
  ctx.shadowColor = 'rgba(108,92,231,0.4)'; ctx.shadowBlur = 18; ctx.fillStyle = tg
  ctx.fillText('数    独', cx, SH * 0.115)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(SW * 0.028, '600'); ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillText('填满数字，挑战最快时间！', cx, SH * 0.175)

  // 选择难度
  setFont(SW * 0.030, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
  ctx.fillText('选择难度', cx, SH * 0.222)

  var diffs = ['easy', 'medium', 'hard', 'expert', 'hell']
  var diffLabels = ['简单', '普通', '困难', '专家', '地狱']
  var selDiff = GameGlobal._sudokuDiff || 'medium'
  var dW = Math.floor((BOARD_W - GAP * 4) / 5)
  var dH = Math.round(SH * 0.057)

  for (var di = 0; di < diffs.length; di++) {
    var bx = BOARD_X + di * (dW + GAP)
    var by = SH * 0.248
    var isSel = (diffs[di] === selDiff)
    if (isSel && diffs[di] === 'hell') {
      var sg = ctx.createLinearGradient(bx, 0, bx + dW, 0)
      sg.addColorStop(0, '#c0392b'); sg.addColorStop(1, '#e74c3c')
      roundRect(bx, by, dW, dH, 10, sg)
    } else if (isSel) {
      var sg = ctx.createLinearGradient(bx, 0, bx + dW, 0)
      sg.addColorStop(0, '#6c5ce7'); sg.addColorStop(1, '#a29bfe')
      roundRect(bx, by, dW, dH, 10, sg)
    } else {
      roundRect(bx, by, dW, dH, 10, C.surface, diffs[di] === 'hell' ? 'rgba(192,57,43,0.25)' : 'rgba(255,255,255,0.12)')
    }
    setFont(dH * 0.38, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isSel ? '#fff' : (diffs[di] === 'hell' ? '#e74c3c' : C.textDim)
    ctx.fillText(diffLabels[di], bx + dW / 2, by + dH / 2)
    L.diffBtns.push({ x: bx, y: by, w: dW, h: dH, key: diffs[di] })
  }

  // 历史最优（按当前难度）
  var bestKey = 'sudokuBest_' + selDiff
  var best = wx.getStorageSync(bestKey) || 0
  var cardY = SH * 0.248 + dH + GAP * 1.5
  var cardH = BTN_H * 1.1
  roundRect(BOARD_X, cardY, BOARD_W, cardH, 14, C.surface, 'rgba(108,92,231,0.18)')
  setFont(SW * 0.026, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.textDim
  ctx.fillText(diffLabels[diffs.indexOf(selDiff)] + ' 最佳时间', cx, cardY + cardH * 0.3)
  setFont(best > 0 ? SW * 0.052 : SW * 0.032, '900')
  ctx.fillStyle = best > 0 ? '#a29bfe' : C.textDim
  ctx.fillText(best > 0 ? GameGlobal.Timer.formatSec(best) : '暂无记录', cx, cardY + cardH * 0.72)

  // 开始游戏
  var bY = cardY + cardH + GAP * 1.5, bH = BTN_H * 1.1
  ctx.shadowColor = 'rgba(108,92,231,0.5)'; ctx.shadowBlur = 20
  var gbg = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
  gbg.addColorStop(0, '#6c5ce7'); gbg.addColorStop(1, '#a29bfe')
  roundRect(BOARD_X, bY, BOARD_W, bH, 16, gbg)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(bH * 0.36, '900'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('开 始 游 戏', cx, bY + bH / 2)
  L.startBtn = { x: BOARD_X, y: bY, w: BOARD_W, h: bH }

  // 排行榜 + 好友PK
  var r2Y = bY + bH + GAP * 1.5, r2H = BTN_H * 0.95
  var hw = Math.floor((BOARD_W - GAP) / 2)
  var pkX = BOARD_X + hw + GAP
  roundRect(BOARD_X, r2Y, hw, r2H, 14, C.surface, 'rgba(162,155,254,0.35)')
  setFont(r2H * 0.34, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#a29bfe'; ctx.fillText('排 行 榜', BOARD_X + hw / 2, r2Y + r2H / 2)
  L.rankBtn = { x: BOARD_X, y: r2Y, w: hw, h: r2H }

  var pg = ctx.createLinearGradient(pkX, 0, pkX + hw, 0)
  pg.addColorStop(0, '#e94560'); pg.addColorStop(1, '#9b59b6')
  ctx.shadowColor = 'rgba(233,69,96,0.4)'; ctx.shadowBlur = 12
  roundRect(pkX, r2Y, hw, r2H, 14, pg)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(r2H * 0.30, '700'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'
  ctx.fillText('⚔ 好友PK', pkX + hw / 2, r2Y + r2H / 2)
  L.pkBtn = { x: pkX, y: r2Y, w: hw, h: r2H }

  // 闯关模式
  var cgY = r2Y + r2H + GAP * 1.2, cgH = BTN_H * 0.95
  var cgGrad = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
  cgGrad.addColorStop(0, '#f5a623'); cgGrad.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(245,166,35,0.4)'; ctx.shadowBlur = 12
  roundRect(BOARD_X, cgY, BOARD_W, cgH, 14, cgGrad)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(cgH * 0.34, '900'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'
  var chgLv = (GameGlobal.SudokuChallenge ? GameGlobal.SudokuChallenge.level : 1) - 1
  ctx.fillText('🏆 闯关模式' + (chgLv > 0 ? '  (第' + (chgLv+1) + '关)' : ''), cx, cgY + cgH / 2)
  L.challengeBtn = { x: BOARD_X, y: cgY, w: BOARD_W, h: cgH }

  // 返回主页
  var backY = cgY + cgH + GAP * 1.0, backH = BTN_H * 0.85

  // ── 成就 + 商店
  if (GameGlobal.drawLobbyAchieveProps) {
    var apResult = GameGlobal.drawLobbyAchieveProps('sudoku', backY)
    L._achieveBtn = apResult.achieveBtn
    L._shopBtn = apResult.shopBtn
    backY = (apResult.endY || backY) + GAP * 0.8
  }

  roundRect(BOARD_X, backY, BOARD_W, backH, 14, C.surface, 'rgba(255,255,255,0.06)')
  setFont(backH * 0.34, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
  ctx.fillText('← 返回主页', cx, backY + backH / 2)
  L.backBtn = { x: BOARD_X, y: backY, w: BOARD_W, h: backH }
}

// ================================================
//  数独游戏界面
// ================================================
GameGlobal.SudokuUI = {
  settingBtn: null, newBtn: null, overlayBtn: null,
  notesBtn: null, eraseBtn: null, hintBtn: null, checkBtn: null, numBtns: null, backBtn: null
}

GameGlobal.drawSudokuScreen = function() {
  drawBg()
  GameGlobal.drawStars()

  var cx  = SW / 2
  var SDK = GameGlobal.Sudoku
  var SUI = GameGlobal.SudokuUI

  if (!SDK.grid || !SDK.grid.length) {
    SDK.init(GameGlobal._sudokuDiff || 'medium')
  }

  // ── 第一排：设置 + 难度 + 计时器
  var row1Y  = TOP_PAD
  var iconSz = ROW1_H
  roundRect(PAD, row1Y, iconSz, iconSz, 12, C.surface, 'rgba(255,255,255,0.12)')
  setFont(iconSz * 0.30, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textLight; ctx.fillText('设置', PAD + iconSz / 2, row1Y + iconSz / 2)
  SUI.settingBtn = { x: PAD, y: row1Y, w: iconSz, h: iconSz }

  // 难度标签
  var infoW = Math.floor((BOARD_W - iconSz - GAP * 2) / 2)
  var infoX1 = PAD + iconSz + GAP
  roundRect(infoX1, row1Y, infoW, ROW1_H, 12, C.surface, 'rgba(108,92,231,0.2)')
  setFont(infoW * 0.16, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.textDim
  ctx.fillText('难度', infoX1 + infoW / 2, row1Y + ROW1_H * 0.3)
  setFont(infoW * 0.22, '900'); ctx.fillStyle = '#a29bfe'
  ctx.fillText(SDK.diffNames[SDK.difficulty] || '普通', infoX1 + infoW / 2, row1Y + ROW1_H * 0.72)

  // 计时器
  var infoX2 = infoX1 + infoW + GAP
  roundRect(infoX2, row1Y, infoW, ROW1_H, 12, C.surface, 'rgba(255,255,255,0.1)')
  setFont(infoW * 0.16, '700')
  ctx.fillStyle = C.textDim; ctx.fillText('时间', infoX2 + infoW / 2, row1Y + ROW1_H * 0.3)
  setFont(infoW * 0.22, '900')
  ctx.fillStyle = C.textLight
  ctx.fillText(GameGlobal.Timer.format(), infoX2 + infoW / 2, row1Y + ROW1_H * 0.72)

  // ── 棋盘
  var boardTop = row1Y + ROW1_H + Math.round(SH * 0.018)
  var cellSz = Math.floor(BOARD_W / 9)
  var boardSz = cellSz * 9
  var boardLeft = Math.floor(cx - boardSz / 2)

  SDK._boardX = boardLeft
  SDK._boardY = boardTop
  SDK._cellSz = cellSz

  // ★ 棋盘底色 — 可见的深蓝底 + 明亮边框
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4
  roundRect(boardLeft - 4, boardTop - 4, boardSz + 8, boardSz + 8, 10, '#151a35')
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'
  roundRect(boardLeft - 4, boardTop - 4, boardSz + 8, boardSz + 8, 10, null, 'rgba(162,155,254,0.6)')

  // ★ 绘制每个格子
  var selNum = (SDK.selR >= 0 && SDK.selC >= 0) ? SDK.grid[SDK.selR][SDK.selC] : 0

  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var cx2 = boardLeft + c * cellSz
      var cy2 = boardTop + r * cellSz
      var val = SDK.grid[r][c]
      var isGiven  = SDK.given[r][c]
      var isSel    = (r === SDK.selR && c === SDK.selC)
      var isError  = SDK.hasError(r, c)
      var isCheckErr = SDK.hasCheckError ? SDK.hasCheckError(r, c) : false

      // ★ 背景色 — 高对比度
      var sameRow = (SDK.selR >= 0 && r === SDK.selR)
      var sameCol = (SDK.selC >= 0 && c === SDK.selC)
      var sameBox = (SDK.selR >= 0 && SDK.selC >= 0 &&
        Math.floor(r/3) === Math.floor(SDK.selR/3) &&
        Math.floor(c/3) === Math.floor(SDK.selC/3))

      var bgColor
      if (isSel) {
        bgColor = 'rgba(162,155,254,0.70)'   // 选中 — 亮紫
      } else if (isCheckErr) {
        bgColor = 'rgba(233,69,96,0.55)'     // 检查标记错误 — 红
      } else if (isError) {
        bgColor = 'rgba(233,69,96,0.40)'     // 行列宫冲突 — 浅红
      } else if (selNum > 0 && val === selNum && val !== 0) {
        bgColor = 'rgba(162,155,254,0.45)'   // 相同数字 — 中紫
      } else if (sameRow || sameCol || sameBox) {
        bgColor = 'rgba(108,92,231,0.30)'    // 同行列宫 — 淡紫
      } else if (isGiven) {
        bgColor = 'rgba(80,70,160,0.25)'     // 给定格 — 可见紫底
      } else {
        bgColor = 'rgba(200,200,255,0.08)'   // 空白格 — 微亮
      }

      ctx.fillStyle = bgColor
      ctx.fillRect(cx2, cy2, cellSz, cellSz)

      if (val !== 0) {
        var fgColor = (isError || isCheckErr) ? '#ff8a9a' : (isGiven ? '#e0d8ff' : '#ffffff')
        setFont(cellSz * 0.50, isGiven ? '900' : '700')
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = fgColor
        ctx.fillText(String(val), cx2 + cellSz / 2, cy2 + cellSz / 2)
      } else {
        // 笔记
        var noteArr = SDK.notes[r][c]
        var hasNotes = false
        for (var ni = 0; ni < 9; ni++) if (noteArr[ni]) { hasNotes = true; break }
        if (hasNotes) {
          var nfs = cellSz * 0.22
          setFont(nfs, '600')
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillStyle = 'rgba(162,155,254,0.7)'
          for (var ni = 0; ni < 9; ni++) {
            if (!noteArr[ni]) continue
            var nr = Math.floor(ni / 3), nc = ni % 3
            var nx = cx2 + (nc + 0.5) * (cellSz / 3)
            var ny = cy2 + (nr + 0.5) * (cellSz / 3)
            ctx.fillText(String(ni + 1), nx, ny)
          }
        }
      }
    }
  }

  // ★ 网格线 — 明显细线
  ctx.strokeStyle = 'rgba(255,255,255,0.30)'; ctx.lineWidth = 1
  for (var i = 0; i <= 9; i++) {
    var px = boardLeft + i * cellSz
    var py = boardTop + i * cellSz
    ctx.beginPath(); ctx.moveTo(px, boardTop); ctx.lineTo(px, boardTop + boardSz); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(boardLeft, py); ctx.lineTo(boardLeft + boardSz, py); ctx.stroke()
  }
  // ★ 粗线（3x3宫格边界）— 高亮
  ctx.strokeStyle = 'rgba(162,155,254,0.90)'; ctx.lineWidth = 3
  for (var i = 0; i <= 3; i++) {
    var px = boardLeft + i * 3 * cellSz
    var py = boardTop + i * 3 * cellSz
    ctx.beginPath(); ctx.moveTo(px, boardTop); ctx.lineTo(px, boardTop + boardSz); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(boardLeft, py); ctx.lineTo(boardLeft + boardSz, py); ctx.stroke()
  }

  // ── ★ 数字按钮区（1-9）— 更突出
  var numY = boardTop + boardSz + Math.round(SH * 0.016)
  var numW = Math.floor((BOARD_W - GAP * 8) / 9)
  var numH = Math.round(SH * 0.062)
  SUI.numBtns = []

  for (var ni = 0; ni < 9; ni++) {
    var nx = BOARD_X + ni * (numW + GAP)
    var num = ni + 1
    var rem = SDK.getRemaining(num)
    var isActive = rem > 0

    if (isActive) {
      // ★ 实心深色底 + 紫色边框
      roundRect(nx, numY, numW, numH, 8, '#1a1540', 'rgba(162,155,254,0.5)')
      // 顶部微光
      var nbg = ctx.createLinearGradient(nx, numY, nx, numY + numH * 0.4)
      nbg.addColorStop(0, 'rgba(162,155,254,0.25)'); nbg.addColorStop(1, 'rgba(162,155,254,0)')
      roundRect(nx + 1, numY + 1, numW - 2, numH * 0.4, 7, nbg)
    } else {
      roundRect(nx, numY, numW, numH, 8, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.06)')
    }

    setFont(numH * 0.40, '900')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isActive ? '#e8e4ff' : 'rgba(255,255,255,0.15)'
    ctx.fillText(String(num), nx + numW / 2, numY + numH * 0.42)

    // 剩余数量小字
    if (rem > 0) {
      setFont(numH * 0.19, '600')
      ctx.fillStyle = 'rgba(162,155,254,0.6)'
      ctx.fillText(String(rem), nx + numW / 2, numY + numH * 0.80)
    }

    SUI.numBtns.push({ x: nx, y: numY, w: numW, h: numH, num: num })
  }

  // ── ★ 工具栏：笔记 + 提示 + 擦除 + 检查 + 新局（5列）
  var toolY = numY + numH + Math.round(SH * 0.012)
  var toolH = Math.round(SH * 0.048)
  var toolW5 = Math.floor((BOARD_W - GAP * 4) / 5)

  // 笔记按钮
  var notesActive = SDK.notesMode
  var notesBg = notesActive ? '#3d2d8f' : '#151030'
  roundRect(BOARD_X, toolY, toolW5, toolH, 10, notesBg, notesActive ? 'rgba(162,155,254,0.6)' : 'rgba(255,255,255,0.15)')
  setFont(toolH * 0.34, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = notesActive ? '#e8e4ff' : C.textDim
  ctx.fillText('✏ 笔记', BOARD_X + toolW5 / 2, toolY + toolH / 2)
  SUI.notesBtn = { x: BOARD_X, y: toolY, w: toolW5, h: toolH }

  // 擦除按钮
  var eraseX = BOARD_X + toolW5 + GAP
  roundRect(eraseX, toolY, toolW5, toolH, 10, '#151030', 'rgba(255,255,255,0.15)')
  setFont(toolH * 0.34, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('🗑 擦除', eraseX + toolW5 / 2, toolY + toolH / 2)
  SUI.eraseBtn = { x: eraseX, y: toolY, w: toolW5, h: toolH }

  // ★ 提示按钮（有道具且<4次→绿色道具数；否则→橙色广告）
  var hintX = eraseX + toolW5 + GAP
  var hintProp = GameGlobal.AchieveShop ? GameGlobal.AchieveShop.getPropCount('prop_hint') : 0
  var hintCanProp = hintProp > 0 && (SDK._hintUsed || 0) < 4
  roundRect(hintX, toolY, toolW5, toolH, 10,
    hintCanProp ? '#0a2a15' : '#1a1520',
    hintCanProp ? 'rgba(46,204,113,0.5)' : 'rgba(233,160,50,0.35)')
  setFont(toolH * 0.34, '700')
  ctx.fillStyle = hintCanProp ? '#2ecc71' : '#f5a623'
  ctx.fillText(hintCanProp ? '💡 ' + hintProp : '💡 ▶', hintX + toolW5 / 2, toolY + toolH / 2)
  SUI.hintBtn = { x: hintX, y: toolY, w: toolW5, h: toolH }

  // ★ 检查按钮（同理）
  var checkX = hintX + toolW5 + GAP
  var checkProp = GameGlobal.AchieveShop ? GameGlobal.AchieveShop.getPropCount('prop_check') : 0
  var checkCanProp = checkProp > 0 && (SDK._hintUsed || 0) < 4
  roundRect(checkX, toolY, toolW5, toolH, 10,
    checkCanProp ? '#0a152a' : '#1a1520',
    checkCanProp ? 'rgba(52,152,219,0.5)' : 'rgba(233,160,50,0.35)')
  setFont(toolH * 0.34, '700')
  ctx.fillStyle = checkCanProp ? '#3498db' : '#f5a623'
  ctx.fillText(checkCanProp ? '🔍 ' + checkProp : '🔍 ▶', checkX + toolW5 / 2, toolY + toolH / 2)
  SUI.checkBtn = { x: checkX, y: toolY, w: toolW5, h: toolH }

  // 再来一局
  var newX = checkX + toolW5 + GAP
  roundRect(newX, toolY, toolW5, toolH, 10, '#151030', 'rgba(255,255,255,0.15)')
  setFont(toolH * 0.34, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('🔄 新局', newX + toolW5 / 2, toolY + toolH / 2)
  SUI.newBtn = { x: newX, y: toolY, w: toolW5, h: toolH }

  // ── 返回按钮
  var backY = toolY + toolH + Math.round(SH * 0.010)
  var backH = Math.round(SH * 0.042)
  roundRect(BOARD_X, backY, BOARD_W, backH, 10, '#151030', 'rgba(255,255,255,0.08)')
  setFont(backH * 0.38, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
  ctx.fillText('← 返回大厅', SW / 2, backY + backH / 2)
  SUI.backBtn = { x: BOARD_X, y: backY, w: BOARD_W, h: backH }

  // ── 完成覆盖层
  if (SDK.solved) {
    _drawSudokuWinOverlay()
  }
}

// ── 胜利覆盖层
function _drawSudokuWinOverlay() {
  var SDK = GameGlobal.Sudoku
  var SUI = GameGlobal.SudokuUI
  var boardSz = SDK._cellSz * 9

  roundRect(SDK._boardX - 4, SDK._boardY - 4, boardSz + 8, boardSz + 8, 10, 'rgba(12,14,34,0.95)')

  var cx = SDK._boardX + boardSz / 2
  var cy = SDK._boardY + boardSz / 2
  var ts = boardSz * 0.11

  // 标题
  setFont(ts * 1.1, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - ts * 2, 0, cx + ts * 2, 0)
  tg.addColorStop(0, '#6c5ce7'); tg.addColorStop(1, '#a29bfe')
  ctx.shadowColor = 'rgba(108,92,231,0.5)'; ctx.shadowBlur = 18
  ctx.fillStyle = tg; ctx.fillText('挑战成功！', cx, cy - ts * 1.8)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // 统计
  setFont(ts * 0.55, '700'); ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText('难度：' + (SDK.diffNames[SDK.difficulty] || '普通'), cx, cy - ts * 0.4)
  ctx.fillText('用时：' + GameGlobal.Timer.format(), cx, cy + ts * 0.3)

  // 最佳时间
  var bestKey = 'sudokuBest_' + SDK.difficulty
  var best = wx.getStorageSync(bestKey) || 0
  if (best === GameGlobal.Timer.seconds) {
    setFont(ts * 0.52, '900'); ctx.fillStyle = '#f5a623'
    ctx.fillText('🏆  新纪录！', cx, cy + ts * 1.3)
  } else if (best > 0) {
    setFont(ts * 0.44, '700'); ctx.fillStyle = C.textDim
    ctx.fillText('最佳 ' + GameGlobal.Timer.formatSec(best), cx, cy + ts * 1.3)
  }

  // 再来一局按钮
  var bw = boardSz * 0.7, bh = BTN_H * 0.95
  var bx = cx - bw / 2, by = cy + ts * 1.9
  roundRect(bx, by, bw, bh, 14, '#fff')
  setFont(bh * 0.36, '900'); ctx.fillStyle = '#1a1a2e'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('再来一局', cx, by + bh / 2)
  SUI.overlayBtn = { x: bx, y: by, w: bw, h: bh }
}

// ================================================
//  数独排行榜界面
// ================================================
GameGlobal.SudokuRankUI = { backBtn: null, tabBtns: [] }

// 触摸滚动
var _sdkRankTouchStartY = 0
var _sdkRankScrollStart = 0

GameGlobal.handleSudokuRankTouch = function(type, y) {
  if (type === 'start') {
    _sdkRankTouchStartY = y
    _sdkRankScrollStart = GameGlobal.SudokuRank.scrollY
  } else if (type === 'move') {
    var diff   = y - _sdkRankTouchStartY
    var R      = GameGlobal.SudokuRank
    var list   = R.lists[R.tab] || []
    var rowH   = SH * 0.072
    var maxScr = Math.max(0, list.length * rowH - SH * 0.52)
    R.scrollY  = Math.max(0, Math.min(maxScr, _sdkRankScrollStart - diff))
  }
}

GameGlobal.drawSudokuRankScreen = function() {
  drawBg(); GameGlobal.drawStars()

  var cx  = SW / 2
  var R   = GameGlobal.SudokuRank
  var RUI = GameGlobal.SudokuRankUI
  RUI.tabBtns = []

  var list   = R.lists[R.tab] || []
  var myRank = R.myRanks[R.tab] || null
  var userInfo = wx.getStorageSync('userInfo') || {}

  // 标题
  setFont(SW * 0.068, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.2, 0, cx + SW * 0.2, 0)
  tg.addColorStop(0, '#6c5ce7'); tg.addColorStop(1, '#a29bfe')
  ctx.shadowColor = 'rgba(108,92,231,0.3)'; ctx.shadowBlur = 12
  ctx.fillStyle = tg; ctx.fillText('数独排行榜', cx, SH * 0.115)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // Tab 栏
  var tabs = ['easy', 'medium', 'hard', 'expert', 'hell']
  var tabLabels = ['简单', '普通', '困难', '专家', '地狱']
  var tabY = SH * 0.165, tabH = BTN_H * 0.75
  var tabW = Math.floor((BOARD_W - GAP * 4) / 5)

  for (var ti = 0; ti < tabs.length; ti++) {
    var tx = BOARD_X + ti * (tabW + GAP)
    var isCur = (R.tab === tabs[ti])
    if (isCur && tabs[ti] === 'hell') {
      var tgr = ctx.createLinearGradient(tx, 0, tx + tabW, 0)
      tgr.addColorStop(0, '#c0392b'); tgr.addColorStop(1, '#e74c3c')
      roundRect(tx, tabY, tabW, tabH, 10, tgr)
    } else if (isCur) {
      var tgr = ctx.createLinearGradient(tx, 0, tx + tabW, 0)
      tgr.addColorStop(0, '#6c5ce7'); tgr.addColorStop(1, '#a29bfe')
      roundRect(tx, tabY, tabW, tabH, 10, tgr)
    } else {
      roundRect(tx, tabY, tabW, tabH, 10, C.surface, tabs[ti] === 'hell' ? 'rgba(192,57,43,0.15)' : 'rgba(255,255,255,0.08)')
    }
    setFont(tabH * 0.38, '700')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isCur ? '#fff' : (tabs[ti] === 'hell' ? '#e74c3c' : C.textDim)
    ctx.fillText(tabLabels[ti], tx + tabW / 2, tabY + tabH / 2)
    RUI.tabBtns.push({ x: tx, y: tabY, w: tabW, h: tabH, key: tabs[ti] })
  }

  // 我的排名条
  var myBarY = tabY + tabH + GAP
  var myBarH = SH * 0.065
  if (myRank) {
    var myGrad = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + BOARD_W, 0)
    myGrad.addColorStop(0, 'rgba(108,92,231,0.25)')
    myGrad.addColorStop(1, 'rgba(162,155,254,0.15)')
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, myGrad, 'rgba(162,155,254,0.5)')
    setFont(myBarH * 0.38, '900')
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#a29bfe'
    ctx.fillText('我  #' + myRank.rank, BOARD_X + PAD, myBarY + myBarH / 2)
    setFont(myBarH * 0.38, '900')
    ctx.textAlign = 'right'; ctx.fillStyle = '#a29bfe'
    ctx.fillText(GameGlobal.formatTime(myRank.time), BOARD_X + BOARD_W - PAD, myBarY + myBarH / 2)
  } else {
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)')
    setFont(myBarH * 0.34, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('完成一局数独即可上榜', cx, myBarY + myBarH / 2)
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
        roundRect(BOARD_X + 2, ry, BOARD_W - 4, rowH, 0, 'rgba(162,155,254,0.18)')
      } else if (i % 2 === 0) {
        roundRect(BOARD_X + 2, ry, BOARD_W - 4, rowH, i === 0 ? 12 : 0, 'rgba(255,255,255,0.03)')
      }

      // 排名
      var rankColor = i < 3 ? rankColors[i] : (isMine ? '#a29bfe' : C.textDim)
      setFont(rowH * 0.38, '900')
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = rankColor
      ctx.fillText(String(i + 1), BOARD_X + rowPad, rcy)

      // 头像
      var avatarR = rowH * 0.28, avatarX = BOARD_X + rowPad + rowH * 0.58
      ctx.beginPath(); ctx.arc(avatarX, rcy, avatarR, 0, Math.PI * 2)
      ctx.fillStyle = isMine ? 'rgba(162,155,254,0.25)' : 'rgba(255,255,255,0.08)'; ctx.fill()
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
        ctx.fillStyle = isMine ? '#a29bfe' : C.textDim
        ctx.fillText((item.nickname || '?')[0], avatarX, rcy)
      }

      // 昵称
      setFont(rowH * (isMine ? 0.32 : 0.28), isMine ? '900' : '700')
      ctx.textAlign = 'left'; ctx.fillStyle = isMine ? '#fff' : C.textLight
      var name = item.nickname || '神秘玩家'
      if (name.length > 6) name = name.slice(0, 6) + '..'
      if (isMine) name = name + ' ★'
      ctx.fillText(name, BOARD_X + rowPad + rowH * 1.05, rcy)

      // 时间
      setFont(rowH * (isMine ? 0.38 : 0.34), isMine ? '900' : '700')
      ctx.textAlign = 'right'; ctx.fillStyle = isMine ? '#a29bfe' : '#82c8ff'
      ctx.fillText(GameGlobal.formatTime(item.time), BOARD_X + BOARD_W - rowPad, rcy)
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
  drawBtn(BOARD_X, backY, BOARD_W, BTN_H, '返回数独大厅', C.surface, C.textLight)
  RUI.backBtn = { x: BOARD_X, y: backY, w: BOARD_W, h: BTN_H }
}