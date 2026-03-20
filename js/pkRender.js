// ================================================
//  pkRender.js - PK 公共界面（大厅/等待/倒计时/结果）
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
//  PK 大厅界面
// ================================================
GameGlobal.drawPKLobby = function() {
  drawBg()
  var cx = SW / 2
  var pk = GameGlobal.PK
  var isHR  = pk.gameType === 'huarong'
  var isSDK = pk.gameType === 'sudoku'
  pk.btns = {}

  // 标题
  setFont(SW * 0.072, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx-SW*0.2, 0, cx+SW*0.2, 0)
  tg.addColorStop(0, '#e94560'); tg.addColorStop(1, '#9b59b6')
  ctx.shadowColor = 'rgba(233,69,96,0.4)'; ctx.shadowBlur = 16
  ctx.fillStyle = tg; ctx.fillText('好友  PK', cx, SH * 0.13)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  setFont(SW * 0.033, '700')
  ctx.fillStyle = C.textDim
  ctx.fillText('邀请好友，决一高下！', cx, SH * 0.19)

  // 规则说明
  var ruleY = SH * 0.23, ruleH = (isHR || isSDK) ? SH * 0.13 : SH * 0.17
  roundRect(PAD, ruleY, BOARD_W, ruleH, 16, C.surface, 'rgba(255,255,255,0.06)')
  setFont(SW * 0.031, '700')
  ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
  var rules = isHR
    ? ['双方同时还原数字华容道', '先完成的赢，都完成则用时少的赢', '都未完成则步数少的赢']
    : isSDK
    ? ['双方同时解同一道数独', '先完成的赢，都完成则用时少的赢', '都未完成则填入更多格的赢']
    : pk.pkMode === 'endless'
    ? ['无尽模式：到2048不结束', '双方继续挑战更高分', '格满或认输才结束，最终比分数']
    : ['标准模式：先到2048获胜', '都到了2048 → 用时少的赢', '格满或认输判负']
  for (var i = 0; i < rules.length; i++) {
    ctx.fillText(rules[i], cx, ruleY + ruleH*(0.22 + i*0.3))
  }

  // ── 华容道尺寸选择器（仅华容道模式）
  var afterRuleY = ruleY + ruleH + GAP
  if (isHR) {
    if (!pk._pkHuarongSize) pk._pkHuarongSize = GameGlobal._huarongSize || 4

    setFont(SW*0.028, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('选择棋盘大小', cx, afterRuleY + GAP*0.3)

    var sizes = [3,4,5,6,7,8,9,10]
    var selSz = pk._pkHuarongSize
    var szW = Math.floor((BOARD_W - GAP*3) / 4)
    var szH = Math.round(SH*0.048)
    var szGapX = Math.floor((BOARD_W - szW*4) / 3)
    var szStartY = afterRuleY + GAP*1.5
    pk.btns.sizeBtns = []
    for (var si = 0; si < sizes.length; si++) {
      var sc = si % 4, sr = Math.floor(si / 4)
      var bx = BOARD_X + sc*(szW+szGapX)
      var by = szStartY + sr*(szH+GAP)
      var sz = sizes[si]
      var isSel = (sz === selSz)
      if (isSel) {
        var sg = ctx.createLinearGradient(bx,0,bx+szW,0)
        sg.addColorStop(0,'#e94560'); sg.addColorStop(1,'#9b59b6')
        roundRect(bx,by,szW,szH,10,sg)
      } else {
        roundRect(bx,by,szW,szH,10,C.surface,'rgba(255,255,255,0.12)')
      }
      setFont(szH*0.40,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillStyle = isSel ? '#fff' : C.textDim
      ctx.fillText(sz+'×'+sz, bx+szW/2, by+szH/2)
      pk.btns.sizeBtns.push({x:bx,y:by,w:szW,h:szH,size:sz})
    }
    afterRuleY = szStartY + 2*(szH+GAP) + GAP*0.5
  }

  // ── 数独难度选择器（仅数独模式）
  if (isSDK) {
    if (!pk._pkSudokuDiff) pk._pkSudokuDiff = GameGlobal._sudokuDiff || 'medium'

    setFont(SW*0.028, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('选择难度', cx, afterRuleY + GAP*0.3)

    var diffs     = ['easy', 'medium', 'hard', 'expert']
    var diffNames = ['简单', '普通', '困难', '专家']
    var selDiff   = pk._pkSudokuDiff
    var dW = Math.floor((BOARD_W - GAP*3) / 4)
    var dH = Math.round(SH*0.048)
    var dStartY = afterRuleY + GAP*1.5
    pk.btns.diffBtns = []
    for (var di = 0; di < diffs.length; di++) {
      var dbx = BOARD_X + di*(dW+GAP)
      var dby = dStartY
      var isDSel = (diffs[di] === selDiff)
      if (isDSel) {
        var dsg = ctx.createLinearGradient(dbx,0,dbx+dW,0)
        dsg.addColorStop(0,'#1e88e5'); dsg.addColorStop(1,'#42a5f5')
        roundRect(dbx,dby,dW,dH,10,dsg)
      } else {
        roundRect(dbx,dby,dW,dH,10,C.surface,'rgba(255,255,255,0.12)')
      }
      setFont(dH*0.40,'700'); ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillStyle = isDSel ? '#fff' : C.textDim
      ctx.fillText(diffNames[di], dbx+dW/2, dby+dH/2)
      pk.btns.diffBtns.push({x:dbx,y:dby,w:dW,h:dH,key:diffs[di]})
    }
    afterRuleY = dStartY + dH + GAP*1.5
  }

  // ── 2048 PK模式选择（仅2048时显示）
  if (!isHR && !isSDK) {
    if (!pk.pkMode) pk.pkMode = 'standard'
    setFont(SW * 0.028, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('PK模式', cx, afterRuleY + GAP * 0.3)

    var modeY = afterRuleY + GAP * 1.5
    var modeW = Math.floor((BOARD_W - GAP) / 2)
    var modeH = Math.round(SH * 0.055)

    // 标准模式
    var isStd = pk.pkMode === 'standard'
    if (isStd) {
      var mg = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + modeW, 0)
      mg.addColorStop(0, '#e94560'); mg.addColorStop(1, '#9b59b6')
      roundRect(BOARD_X, modeY, modeW, modeH, 10, mg)
    } else {
      roundRect(BOARD_X, modeY, modeW, modeH, 10, C.surface, 'rgba(255,255,255,0.12)')
    }
    setFont(modeH * 0.35, '700'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = isStd ? '#fff' : C.textDim
    ctx.fillText('⚡ 标准模式', BOARD_X + modeW / 2, modeY + modeH / 2)

    // 无尽模式
    var endX = BOARD_X + modeW + GAP
    var isEnd = pk.pkMode === 'endless'
    if (isEnd) {
      var mg2 = ctx.createLinearGradient(endX, 0, endX + modeW, 0)
      mg2.addColorStop(0, '#f39c12'); mg2.addColorStop(1, '#e67e22')
      roundRect(endX, modeY, modeW, modeH, 10, mg2)
    } else {
      roundRect(endX, modeY, modeW, modeH, 10, C.surface, 'rgba(255,255,255,0.12)')
    }
    ctx.fillStyle = isEnd ? '#fff' : C.textDim
    ctx.fillText('♾ 无尽模式', endX + modeW / 2, modeY + modeH / 2)

    pk.btns.modeBtns = [
      { x: BOARD_X, y: modeY, w: modeW, h: modeH, mode: 'standard' },
      { x: endX, y: modeY, w: modeW, h: modeH, mode: 'endless' }
    ]

    // 模式说明
    setFont(SW * 0.020, '600'); ctx.fillStyle = 'rgba(255,255,255,0.3)'
    var modeDesc = isStd ? '先到2048获胜，格满或认输判负' : '到2048不结束，格满或认输才结束'
    ctx.fillText(modeDesc, cx, modeY + modeH + GAP * 0.6)

    afterRuleY = modeY + modeH + GAP * 1.5
  }

  // 创建房间按钮
  var createY = afterRuleY
  var btnW = BOARD_W, btnH = BTN_H * 1.1
  ctx.shadowColor = 'rgba(233,69,96,0.4)'; ctx.shadowBlur = 12
  var gbg = ctx.createLinearGradient(PAD, 0, PAD+btnW, 0)
  gbg.addColorStop(0, '#e94560'); gbg.addColorStop(1, '#9b59b6')
  roundRect(PAD, createY, btnW, btnH, 16, gbg)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(btnH * 0.36, '900')
  ctx.fillStyle = '#fff'; ctx.fillText('创 建 房 间', cx, createY + btnH/2)
  pk.btns.createBtn = { x:PAD, y:createY, w:btnW, h:btnH }

  // 分割线
  var divY = createY + btnH + GAP*2
  setFont(SW*0.03, '700')
  ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
  ctx.fillText('— 或者输入好友的房间码 —', cx, divY)

  // 输入展示框
  var inputY = divY + GAP*1.8
  var inputH = BTN_H * 1.0
  roundRect(PAD, inputY, BOARD_W, inputH, 14, C.surface, 'rgba(255,255,255,0.15)')
  setFont(inputH * 0.42, '900')
  ctx.fillStyle = pk.inputCode ? C.textLight : C.textDim
  ctx.fillText(pk.inputCode || '_ _ _ _', cx, inputY + inputH/2)
  pk.btns.inputBox = { x:PAD, y:inputY, w:BOARD_W, h:inputH }

  // 数字键盘
  var kbY = inputY + inputH + GAP * 1.5
  var keys = ['1','2','3','4','5','6','7','8','9','删','0','加入']
  var kW = (BOARD_W - GAP*2) / 3, kH = BTN_H * 0.95
  pk.btns.keys = []
  for (var i = 0; i < keys.length; i++) {
    var col_i = i % 3, row_i = Math.floor(i/3)
    var kx = PAD + col_i*(kW+GAP), ky = kbY + row_i*(kH+GAP)
    var isJoin = keys[i] === '加入', isDel = keys[i] === '删'
    roundRect(kx, ky, kW, kH, 12,
      isJoin ? C.accent2 : (isDel ? 'rgba(255,80,80,0.15)' : C.surface),
      'rgba(255,255,255,0.06)')
    setFont(kH * 0.36, '800')
    ctx.fillStyle = isJoin ? '#fff' : (isDel ? C.accent : C.textLight)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(keys[i], kx+kW/2, ky+kH/2)
    pk.btns.keys.push({ x:kx, y:ky, w:kW, h:kH, key:keys[i] })
  }

  // 返回按钮（左上角）
  var backSz = Math.round(SH * 0.045)
  roundRect(PAD, SH*0.105, backSz*2, backSz, 10, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.1)')
  setFont(backSz*0.42, '700')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText('← 返回', PAD + backSz, SH*0.105 + backSz/2)
  pk.btns.backBtn = { x:PAD, y:SH*0.105, w:backSz*2, h:backSz }
}

// ================================================
//  等待室界面
// ================================================
GameGlobal.drawPKWaiting = function() {
  drawBg()
  var cx = SW/2, pk = GameGlobal.PK

  setFont(SW*0.055, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textLight
  ctx.fillText(pk.isHost ? '等待好友加入' : '等待游戏开始...', cx, SH*0.20)

  // 房间码大展示
  var codeBoxY = SH*0.28, codeBoxH = SH*0.16
  roundRect(PAD+BOARD_W*0.08, codeBoxY, BOARD_W*0.84, codeBoxH, 20,
    C.surface, 'rgba(245,166,35,0.35)')
  setFont(SW*0.032, '700')
  ctx.fillStyle = C.textDim; ctx.fillText('房间码', cx, codeBoxY + codeBoxH*0.25)
  setFont(SW*0.175, '900')
  var cg = ctx.createLinearGradient(cx-SW*0.2, 0, cx+SW*0.2, 0)
  cg.addColorStop(0, '#f5a623'); cg.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(245,166,35,0.4)'; ctx.shadowBlur = 12
  ctx.fillStyle = cg; ctx.fillText(pk.roomCode || '----', cx, codeBoxY + codeBoxH*0.72)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // 玩家状态卡
  var statusY = SH*0.50, statusH = SH*0.20
  roundRect(PAD, statusY, BOARD_W, statusH, 16, C.surface, 'rgba(255,255,255,0.06)')

  // 我方
  var avatarR = statusH*0.22
  ctx.beginPath(); ctx.arc(PAD+BOARD_W*0.22, statusY+statusH*0.4, avatarR, 0, Math.PI*2)
  ctx.fillStyle = 'rgba(46,204,113,0.7)'; ctx.fill()
  setFont(SW*0.033, '800')
  ctx.fillStyle = C.textLight
  ctx.fillText(pk.myNick.slice(0,5), PAD+BOARD_W*0.22, statusY+statusH*0.72)
  setFont(SW*0.024, '700')
  ctx.fillStyle = '#2ecc71'; ctx.fillText('✓ 已就绪', PAD+BOARD_W*0.22, statusY+statusH*0.90)

  // VS
  setFont(SW*0.072, '900')
  var vg = ctx.createLinearGradient(cx-30, 0, cx+30, 0)
  vg.addColorStop(0, '#e94560'); vg.addColorStop(1, '#f5a623')
  ctx.fillStyle = vg; ctx.fillText('VS', cx, statusY+statusH*0.5)

  // 对手
  var hasOp = pk.opponentNick !== '对手' || pk.opponentScore > 0
  ctx.beginPath(); ctx.arc(PAD+BOARD_W*0.78, statusY+statusH*0.4, avatarR, 0, Math.PI*2)
  ctx.fillStyle = hasOp ? 'rgba(46,204,113,0.7)' : 'rgba(100,100,120,0.4)'; ctx.fill()
  setFont(SW*0.033, '800')
  ctx.fillStyle = hasOp ? C.textLight : C.textDim
  ctx.fillText(hasOp ? pk.opponentNick.slice(0,5) : '等待中', PAD+BOARD_W*0.78, statusY+statusH*0.72)
  if (hasOp) {
    setFont(SW*0.024, '700'); ctx.fillStyle = '#2ecc71'
    ctx.fillText('✓ 已就绪', PAD+BOARD_W*0.78, statusY+statusH*0.90)
  }

  // 动态提示
  var dotCount = Math.floor(Date.now()/500) % 4
  setFont(SW*0.03, '700')
  ctx.fillStyle = C.textDim
  ctx.fillText(pk.isHost ? ('请告诉好友房间码，等待对方加入' + '·'.repeat(dotCount)) : ('正在连接' + '·'.repeat(dotCount+1)),
    cx, SH*0.76)

  // 取消按钮
  var cancelY = SH*0.82
  roundRect(PAD+BOARD_W*0.2, cancelY, BOARD_W*0.6, BTN_H*0.85, 12,
    'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)')
  setFont(BTN_H*0.3, '700')
  ctx.fillStyle = C.textDim; ctx.fillText('取 消', cx, cancelY+BTN_H*0.425)
  pk.btns.cancelBtn = { x:PAD+BOARD_W*0.2, y:cancelY, w:BOARD_W*0.6, h:BTN_H*0.85 }
}

// ================================================
//  倒计时界面
// ================================================
GameGlobal.drawPKCountdown = function() {
  drawBg()
  var cx = SW/2, pk = GameGlobal.PK

  setFont(SW*0.044, '800')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textDim
  ctx.fillText(pk.myNick.slice(0,5) + '  VS  ' + pk.opponentNick.slice(0,5), cx, SH*0.28)

  var num = pk.countdown > 0 ? String(pk.countdown) : 'GO!'
  setFont(SW*0.52, '900')
  var ng = ctx.createLinearGradient(cx-SW*0.3, 0, cx+SW*0.3, 0)
  ng.addColorStop(0, '#f5a623'); ng.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(233,69,96,0.6)'; ctx.shadowBlur = 40
  ctx.fillStyle = ng; ctx.fillText(num, cx, SH*0.52)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  setFont(SW*0.038, '700')
  ctx.fillStyle = C.textDim; ctx.fillText('准备好了吗？', cx, SH*0.78)
}

// ================================================
//  PK 结果界面
// ================================================
GameGlobal.drawPKResult = function() {
  drawBg()
  var cx = SW/2, pk = GameGlobal.PK, g = GameGlobal.Game, HR = GameGlobal.Huarong
  var SDK = GameGlobal.Sudoku
  var isHR  = pk.gameType === 'huarong'
  var isSDK = pk.gameType === 'sudoku'
  var isWin = pk.winner === 'me', isDraw = pk.winner === 'draw'

  if (isWin) {
    var glow = ctx.createRadialGradient(cx, SH*0.32, 0, cx, SH*0.32, SW*0.8)
    glow.addColorStop(0, 'rgba(245,166,35,0.18)'); glow.addColorStop(1, 'rgba(245,166,35,0)')
    ctx.fillStyle = glow; ctx.fillRect(0, 0, SW, SH)
  }

  var rText = isWin ? '🏆 胜利！' : isDraw ? '🤝 平局' : '💀 失败'
  var rColor = isWin ? C.accent2 : isDraw ? C.textLight : C.accent
  setFont(SW*0.12, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = isWin ? 'rgba(245,166,35,0.5)' : 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 20
  ctx.fillStyle = rColor; ctx.fillText(rText, cx, SH*0.18)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // 对比卡片
  var cardY = SH*0.27, cardH = SH*0.31
  roundRect(PAD, cardY, BOARD_W, cardH, 20, C.surface, 'rgba(255,255,255,0.07)')
  var half = BOARD_W/2

  // ── 我方数据
  var myScore, myStatus, myWon
  if (isHR) {
    myScore  = String(HR.moves) + ' 步'
    myWon    = HR.solved
    myStatus = myWon ? '✓ 已完成' : '✗ 未完成'
  } else if (isSDK) {
    var myUserF = 0, myGvn = 0
    if (SDK) for (var _r2 = 0; _r2 < 9; _r2++)
      for (var _c2 = 0; _c2 < 9; _c2++) {
        if (SDK.given[_r2][_c2]) myGvn++
        else if (SDK.grid[_r2][_c2] !== 0) myUserF++
      }
    var myTtl = 81 - myGvn
    myScore  = SDK ? (SDK.solved ? '已完成' : myUserF + '/' + myTtl) : '?'
    myWon    = SDK ? SDK.solved : false
    myStatus = myWon ? '✓ 已完成' : '✗ 未完成'
  } else {
    myScore  = String(g.score)
    myWon    = g.gameWon
    myStatus = myWon ? '✓ 达到2048' : '✗ 未到2048'
  }

  setFont(SW*0.029, '700')
  ctx.fillStyle = '#2ecc71'; ctx.textAlign = 'center'
  ctx.fillText('我', PAD+half*0.5, cardY+cardH*0.14)
  setFont(SW*0.063, '900')
  ctx.fillStyle = C.textLight
  ctx.fillText(myScore, PAD+half*0.5, cardY+cardH*0.37)
  setFont(SW*0.027, '700'); ctx.fillStyle = C.textDim
  ctx.fillText(myStatus, PAD+half*0.5, cardY+cardH*0.55)
  ctx.fillText('用时 ' + GameGlobal.Timer.format(), PAD+half*0.5, cardY+cardH*0.72)

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD+half, cardY+cardH*0.1); ctx.lineTo(PAD+half, cardY+cardH*0.9); ctx.stroke()

  setFont(SW*0.034, '900'); ctx.fillStyle = C.accent; ctx.textAlign = 'center'
  ctx.fillText('VS', cx, cardY+cardH*0.5)

  // ── 对手数据
  var opTime = pk.opponentTime > 0
    ? String(Math.floor(pk.opponentTime/60)).padStart(2,'0') + ':' + String(pk.opponentTime%60).padStart(2,'0')
    : '--:--'
  var opScore = isHR ? String(pk.opponentScore) + ' 步'
    : isSDK ? (pk.opponentGameWon ? '已完成' : pk.opponentScore + '/' + (pk.opponentTotal || myTtl || '?'))
    : String(pk.opponentScore)
  var opStatus = isHR
    ? (pk.opponentGameWon ? '✓ 已完成' : '✗ 未完成')
    : isSDK
    ? (pk.opponentGameWon ? '✓ 已完成' : '✗ 未完成')
    : (pk.opponentGameWon ? '✓ 达到2048' : '✗ 未到2048')

  setFont(SW*0.029, '700')
  ctx.fillStyle = C.accent
  ctx.fillText(pk.opponentNick.slice(0,5), PAD+half+half*0.5, cardY+cardH*0.14)
  setFont(SW*0.063, '900'); ctx.fillStyle = C.textLight
  ctx.fillText(opScore, PAD+half+half*0.5, cardY+cardH*0.37)
  setFont(SW*0.027, '700'); ctx.fillStyle = C.textDim
  ctx.fillText(opStatus, PAD+half+half*0.5, cardY+cardH*0.55)
  ctx.fillText('用时 ' + opTime, PAD+half+half*0.5, cardY+cardH*0.72)

  // 胜负原因
  setFont(SW*0.029, '700'); ctx.fillStyle = rColor
  var reason
  if (isHR) {
    reason = isDraw ? '势均力敌，平局！'
      : isWin ? (myWon && pk.opponentGameWon ? '你用时更少！' : myWon ? '你先完成了！' : '你的步数更少！')
      : pk.surrendered ? '你举手认输了'
      : (pk.opponentGameWon && !myWon ? '对手先完成了' : '对手步数更少')
  } else if (isSDK) {
    reason = isDraw ? '势均力敌，平局！'
      : isWin ? (myWon && pk.opponentGameWon ? '你用时更少！' : myWon ? '你先完成了！' : '你填入更多格！')
      : pk.surrendered ? '你举手认输了'
      : (pk.opponentGameWon && !myWon ? '对手先完成了' : '对手填入更多格')
  } else {
    var isStdMode = (pk.pkMode !== 'endless')
    if (isDraw) {
      reason = '势均力敌，平局！'
    } else if (isWin) {
      if (g.gameWon && pk.opponentGameWon) reason = '你用时更少！'
      else if (g.gameWon) reason = '你先到达2048！'
      else if (pk.opponentGameOver && !pk.opponentGameWon) reason = '对手格子满了！'
      else reason = '你的分数更高！'
    } else {
      if (pk.surrendered) reason = '你举手认输了'
      else if (pk.opponentGameWon && !g.gameWon) reason = '对手先到达2048'
      else if (g.gameOver && !g.gameWon) reason = '你的格子满了！'
      else reason = '对手分数更高'
    }
  }
  ctx.fillText(reason, cx, cardY+cardH+GAP*2.5)

  // 再来一局
  var replayY = cardY + cardH + SH*0.09
  ctx.shadowColor = 'rgba(233,69,96,0.4)'; ctx.shadowBlur = 10
  var rbg = ctx.createLinearGradient(PAD, 0, PAD+BOARD_W, 0)
  rbg.addColorStop(0, '#e94560'); rbg.addColorStop(1, '#9b59b6')
  roundRect(PAD, replayY, BOARD_W, BTN_H*1.05, 16, rbg)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(BTN_H*0.37, '900'); ctx.fillStyle = '#fff'
  ctx.fillText('再来一局', cx, replayY+BTN_H*0.525)
  pk.btns.replayBtn = { x:PAD, y:replayY, w:BOARD_W, h:BTN_H*1.05 }

  var homeY = replayY + BTN_H*1.05 + GAP*2
  roundRect(PAD, homeY, BOARD_W, BTN_H*0.82, 14, C.surface, 'rgba(255,255,255,0.08)')
  setFont(BTN_H*0.29, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('返回大厅', cx, homeY+BTN_H*0.41)
  pk.btns.homeBtn = { x:PAD, y:homeY, w:BOARD_W, h:BTN_H*0.82 }
}

// ================================================
//  统一绘制入口
// ================================================
// ================================================
//  PK 游戏界面
// ================================================

GameGlobal.drawPKScreen = function() {
  var ph = GameGlobal.PK.phase
  if      (ph === 'lobby')     GameGlobal.drawPKLobby()
  else if (ph === 'waiting')   GameGlobal.drawPKWaiting()
  else if (ph === 'countdown') GameGlobal.drawPKCountdown()
  else if (ph === 'playing') {
    if (GameGlobal.PK.gameType === 'huarong') GameGlobal.drawPKHuarongGame()
    else if (GameGlobal.PK.gameType === 'sudoku') GameGlobal.drawPKSudokuGame()
    else GameGlobal.drawPKGame()
  }
  else if (ph === 'result')    GameGlobal.drawPKResult()
}