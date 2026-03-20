// ================================================
//  pk2048Render.js - 2048 PK 游戏界面
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

GameGlobal.drawPKGame = function() {
  var pk = GameGlobal.PK, g = GameGlobal.Game, cx = SW/2
  drawBg()

  // 防止初始化未完成时渲染
  if (!pk || !pk.myNick || pk.phase !== 'playing') return

  // ── 布局常量（PK专用，从顶部重新算）
  var barY   = Math.round(SH * 0.16)       // 状态栏顶部（往下移）
  var barH   = Math.round(SH * 0.068)      // 状态栏高度
  var vsW    = Math.round(SW * 0.1)
  var sboxW  = Math.floor((BOARD_W - vsW) / 2)

  // ── PK模式标签
  var modeLabel = (pk.pkMode === 'endless') ? '♾ 无尽模式' : '⚡ 标准模式'
  var modeColor = (pk.pkMode === 'endless') ? '#f39c12' : '#e94560'
  setFont(SW * 0.022, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = modeColor; ctx.fillText(modeLabel, cx, barY - SW * 0.02)

  // ── 状态栏：我方
  roundRect(BOARD_X, barY, sboxW, barH, 10, C.surface, 'rgba(46,204,113,0.4)')
  var myNickStr = pk.myNick.length > 5 ? pk.myNick.slice(0,5)+'.' : pk.myNick
  setFont(SW*0.026, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#2ecc71'
  ctx.fillText(myNickStr, BOARD_X + sboxW/2, barY + barH*0.3)
  var myStr = String(g.score)
  setFont(SW*(myStr.length<=4?0.052:myStr.length<=6?0.040:0.031), '900')
  ctx.fillStyle = C.textLight
  ctx.fillText(myStr, BOARD_X + sboxW/2, barY + barH*0.74)

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
  var opStr = String(pk.opponentScore)
  setFont(SW*(opStr.length<=4?0.052:opStr.length<=6?0.040:0.031), '900')
  ctx.fillStyle = pk.opponentGameWon ? C.accent2 : C.textLight
  ctx.fillText(opStr, opBX + sboxW/2, barY + barH*0.74)

  // ── 计时器
  var timerY = barY + barH + Math.round(SH*0.006)
  var timerH = Math.round(SH*0.038)
  setFont(SW*0.040, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('⏱  ' + GameGlobal.Timer.format(), cx, timerY + timerH/2)

  // ── 对手进度条（基于最大方块离2048的距离）
  var progY = timerY + timerH + Math.round(SH*0.004)
  var progH = Math.round(SH*0.012)
  // 对手最大方块进度：log2(maxTile)/log2(2048) = log2(maxTile)/11
  var opMaxTile = pk._opponentMaxTile || 2
  var opProg = pk.opponentGameWon ? 1 : Math.min(Math.log2(Math.max(2, opMaxTile)) / 11, 1)
  roundRect(BOARD_X, progY, BOARD_W, progH, progH/2, 'rgba(255,255,255,0.06)')
  if (opProg > 0) {
    var pgrd = ctx.createLinearGradient(BOARD_X, 0, BOARD_X+BOARD_W, 0)
    pgrd.addColorStop(0, '#e94560'); pgrd.addColorStop(1, '#f5a623')
    roundRect(BOARD_X, progY, Math.max(progH, Math.round(BOARD_W*opProg)), progH, progH/2, pgrd)
  }
  setFont(SW*0.020, '700')
  ctx.fillStyle = C.textDim; ctx.textAlign = 'right'
  ctx.fillText('对手 ' + Math.round(opProg*100) + '%', BOARD_X+BOARD_W, progY-2)

  // 对手到2048提示
  if (pk.opponentGameWon) {
    setFont(SW*0.024, '700')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.accent2
    ctx.fillText('⚡ 对手已到达2048！加油！', cx, progY + progH + Math.round(SH*0.012))
  }

  // ── 棋盘（PK专用位置，从进度条下方开始）
  var pkBoardY = progY + progH + Math.round(SH * (pk.opponentGameWon ? 0.030 : 0.018))
  var pkCellSz = (BOARD_W - GAP*(SIZE+1)) / SIZE
  var pkBoardH = pkCellSz*SIZE + GAP*(SIZE+1)

  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8
  roundRect(BOARD_X, pkBoardY, BOARD_W, pkBoardH, 16, C.board)
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'
  roundRect(BOARD_X, pkBoardY, BOARD_W, pkBoardH, 16, null, 'rgba(255,255,255,0.05)')

  // 空格子
  for (var r = 0; r < SIZE; r++)
    for (var cc = 0; cc < SIZE; cc++)
      roundRect(BOARD_X+GAP+cc*(pkCellSz+GAP), pkBoardY+GAP+r*(pkCellSz+GAP), pkCellSz, pkCellSz, 10, C.cellEmpty)

  // 方块动画 + 绘制
  g.updateAnimations()
  for (var i = 0; i < g.tiles.length; i++) {
    var t = g.tiles[i]
    var tx = BOARD_X+GAP+t.c*(pkCellSz+GAP)
    var ty = pkBoardY+GAP+t.r*(pkCellSz+GAP)
    var sc = t.scale
    var col = C.tiles[t.value] || C.tileHi
    if (t.value >= 128) { ctx.shadowColor = col.bg; ctx.shadowBlur = 10 }
    roundRect(tx+pkCellSz*(1-sc)/2, ty+pkCellSz*(1-sc)/2, pkCellSz*sc, pkCellSz*sc, 10*sc, col.bg)
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
    var digs = String(t.value).length
    setFont(pkCellSz*(digs<=2?0.42:digs===3?0.32:0.25)*sc, '900')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = col.fg
    ctx.fillText(String(t.value), tx+pkCellSz/2, ty+pkCellSz/2+1)
  }

  // ── 认输按钮
  var btnY = pkBoardY + pkBoardH + Math.round(SH*0.012)
  roundRect(BOARD_X+BOARD_W*0.3, btnY, BOARD_W*0.4, BTN_H*0.72, 12,
    'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)')
  setFont(BTN_H*0.26, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('举手认输', cx, btnY + BTN_H*0.36)
  pk.btns.surrenderBtn = { x:BOARD_X+BOARD_W*0.3, y:btnY, w:BOARD_W*0.4, h:BTN_H*0.72 }

  // ── 我方结束遮罩
  if (g.gameOver && pk.phase === 'playing') {
    roundRect(BOARD_X, pkBoardY, BOARD_W, pkBoardH, 16, 'rgba(10,10,30,0.88)')
    setFont(SW*0.042, '900')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    var isStdMode = (pk.pkMode !== 'endless')
    if (g.gameWon) {
      ctx.fillStyle = '#f5a623'
      ctx.fillText('🎉 你到达2048！', cx, pkBoardY+pkBoardH*0.42)
      setFont(SW*0.028, '700'); ctx.fillStyle = C.textDim
      ctx.fillText(isStdMode ? '胜利！等待结算...' : '等待对手结束...', cx, pkBoardY+pkBoardH*0.58)
    } else {
      ctx.fillStyle = '#e74c3c'
      ctx.fillText('💔 游戏结束', cx, pkBoardY+pkBoardH*0.42)
      setFont(SW*0.028, '700'); ctx.fillStyle = C.textDim
      ctx.fillText(isStdMode ? '失败！等待结算...' : '等待对手结束...', cx, pkBoardY+pkBoardH*0.58)
    }
  }
}