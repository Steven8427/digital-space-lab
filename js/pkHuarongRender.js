// ================================================
//  pkHuarongRender.js - 华容道 PK 游戏界面
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
//  PK 华容道游戏界面
// ================================================
GameGlobal.drawPKHuarongGame = function() {
  var pk = GameGlobal.PK, HR = GameGlobal.Huarong, cx = SW/2
  drawBg()

  if (!pk || pk.phase !== 'playing') return

  // ── 布局常量
  var barY   = Math.round(SH * 0.16)
  var barH   = Math.round(SH * 0.068)
  var vsW    = Math.round(SW * 0.1)
  var sboxW  = Math.floor((BOARD_W - vsW) / 2)

  // ── 状态栏：我方（步数）
  roundRect(BOARD_X, barY, sboxW, barH, 10, C.surface, 'rgba(46,204,113,0.4)')
  var myNickStr = pk.myNick.length > 5 ? pk.myNick.slice(0,5)+'.' : pk.myNick
  setFont(SW*0.026, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#2ecc71'
  ctx.fillText(myNickStr, BOARD_X + sboxW/2, barY + barH*0.3)
  var myStr = String(HR.moves) + '步'
  setFont(SW*0.042, '900')
  ctx.fillStyle = C.textLight
  ctx.fillText(myStr, BOARD_X + sboxW/2, barY + barH*0.74)

  // ── VS
  setFont(SW*0.030, '900')
  ctx.fillStyle = C.accent; ctx.textAlign = 'center'
  ctx.fillText('VS', BOARD_X + sboxW + vsW/2, barY + barH/2)

  // ── 状态栏：对方（步数）
  var opBX = BOARD_X + sboxW + vsW
  roundRect(opBX, barY, sboxW, barH, 10, C.surface,
    pk.opponentGameOver ? 'rgba(233,69,96,0.12)' : 'rgba(233,69,96,0.4)')
  var opNickStr = pk.opponentNick.length > 5 ? pk.opponentNick.slice(0,5)+'.' : pk.opponentNick
  setFont(SW*0.026, '700')
  ctx.fillStyle = C.accent
  ctx.fillText(opNickStr, opBX + sboxW/2, barY + barH*0.3)
  var opStr = String(pk.opponentScore) + '步'
  setFont(SW*0.042, '900')
  ctx.fillStyle = pk.opponentGameWon ? C.accent2 : C.textLight
  ctx.fillText(opStr, opBX + sboxW/2, barY + barH*0.74)

  // ── 计时器
  var timerY = barY + barH + Math.round(SH*0.006)
  var timerH = Math.round(SH*0.038)
  setFont(SW*0.040, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('⏱  ' + GameGlobal.Timer.format(), cx, timerY + timerH/2)

  // ── 对手进度提示
  var progY = timerY + timerH + Math.round(SH*0.004)
  if (pk.opponentGameWon) {
    setFont(SW*0.024, '700')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.accent2
    ctx.fillText('⚡ 对手已完成！加油！', cx, progY + Math.round(SH*0.012))
  }

  // ── 棋盘（临时覆盖 BOARD_Y 以便 cellXY/hitTest 正确工作）
  var pkBoardY = progY + Math.round(SH * (pk.opponentGameWon ? 0.038 : 0.022))
  var origBoardY = GameGlobal.BOARD_Y
  GameGlobal.BOARD_Y = pkBoardY
  pk._pkBoardY = pkBoardY  // 保存给 hitTest 用

  var _bh = HR._boardH()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8
  roundRect(BOARD_X, pkBoardY, BOARD_W, _bh, 16, C.board)
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'
  roundRect(BOARD_X, pkBoardY, BOARD_W, _bh, 16, null, 'rgba(255,255,255,0.05)')

  // 绘制所有格子（含滑动动画）
  HR.updateAnimations()
  var _cs = HR._cellSz(), _n = HR.size
  var _anims = HR._animTiles || []

  for (var r = 0; r < _n; r++) {
    for (var c = 0; c < _n; c++) {
      if (!HR.grid[r]) continue
      if (HR.grid[r][c] === 0) {
        var pos = HR.cellXY(r, c)
        roundRect(pos[0], pos[1], _cs, _cs, 10, 'rgba(0,0,0,0.22)')
      }
    }
  }
  var _animDest = {}
  for (var ai = 0; ai < _anims.length; ai++) {
    if (_anims[ai].progress < 1) _animDest[_anims[ai].toR + ',' + _anims[ai].toC] = true
  }
  for (var r = 0; r < _n; r++) {
    for (var c = 0; c < _n; c++) {
      if (!HR.grid[r]) continue
      var val = HR.grid[r][c]
      if (val === 0 || _animDest[r + ',' + c]) continue
      GameGlobal.drawHuarongTile(r, c, val)
    }
  }
  for (var ai = 0; ai < _anims.length; ai++) {
    var a = _anims[ai]
    if (a.progress >= 1) continue
    var ease = 1 - Math.pow(1 - a.progress, 3)
    var fromPos = HR.cellXY(a.fromR, a.fromC)
    var toPos   = HR.cellXY(a.toR, a.toC)
    var ax = fromPos[0] + (toPos[0] - fromPos[0]) * ease
    var ay = fromPos[1] + (toPos[1] - fromPos[1]) * ease
    GameGlobal.drawHuarongTile(a.toR, a.toC, a.value, ax, ay)
  }

  // 恢复 BOARD_Y
  GameGlobal.BOARD_Y = origBoardY

  // ── 认输按钮
  var btnY = pkBoardY + _bh + Math.round(SH*0.012)
  roundRect(BOARD_X+BOARD_W*0.3, btnY, BOARD_W*0.4, BTN_H*0.72, 12,
    'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)')
  setFont(BTN_H*0.26, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('举手认输', cx, btnY + BTN_H*0.36)
  pk.btns.surrenderBtn = { x:BOARD_X+BOARD_W*0.3, y:btnY, w:BOARD_W*0.4, h:BTN_H*0.72 }

  // ── 完成遮罩
  if (HR.solved && pk.phase === 'playing') {
    GameGlobal.BOARD_Y = pkBoardY
    roundRect(BOARD_X, pkBoardY, BOARD_W, _bh, 16, 'rgba(10,10,30,0.88)')
    setFont(SW*0.042, '900')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textLight
    ctx.fillText('🎉 已完成！', cx, pkBoardY+_bh*0.42)
    setFont(SW*0.028, '700')
    ctx.fillStyle = C.textDim
    ctx.fillText('等待对手结束...', cx, pkBoardY+_bh*0.62)
    GameGlobal.BOARD_Y = origBoardY
  }
}

