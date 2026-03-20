// ================================================
//  pk.js - 好友PK模块（轮询版，兼容微信小游戏）
//  界面：PK大厅 → 等待室 → 倒计时 → PK游戏 → 结果
// ================================================

// ---- 从 GameGlobal 引入共享变量 ----
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
//  PK 状态机
// ================================================
GameGlobal.PK = {
  phase: 'lobby',   // 'lobby' | 'waiting' | 'countdown' | 'playing' | 'result'

  roomId:   null,
  roomCode: null,
  isHost:   false,

  opponentScore:    0,
  opponentTime:     0,
  opponentGameWon:  false,
  opponentGameOver: false,
  opponentNick:     '对手',

  myNick:    '',
  countdown: 3,
  winner:    null,   // 'me' | 'opponent' | 'draw'
  surrendered: false,  // 是否主动认输
  pkMode: 'standard',  // 'standard'=到2048结束 | 'endless'=无尽模式
  inputCode: '',
  btns:      {},

  // ── 轮询句柄（替代 db.watch）────────────────
  _pollTimer:    null,
  _pollLock:     false,   // 防止并发请求
  _countTimer:   null,

  // ── 进入大厅 ──────────────────────────────
  enterLobby: function() {
    this.phase            = 'lobby'
    this.roomId           = null
    this.roomCode         = null
    this.isHost           = false
    this.inputCode        = ''
    this.opponentScore    = 0
    this.opponentTime     = 0
    this.opponentGameWon  = false
    this.opponentGameOver = false
    this.opponentNick     = '对手'
    this.countdown        = 3
    this.winner           = null
    this.surrendered      = false
    this.pkMode           = 'standard'
    this._lastSync        = 0
    this._roomHuarongSize = null
    this._stopPoll()
    this._clearCountTimer()

    var info = wx.getStorageSync('userInfo') || {}
    this.myNick = info.nickName || '神秘玩家'
  },

  // ── 创建房间 ──────────────────────────────
  createRoom: function() {
    var self = this
    wx.showLoading({ title: '创建中...' })
    var createData = { action: 'create', nickName: self.myNick, gameType: self.gameType || '2048', pkMode: self.pkMode || 'standard' }
    if (self.gameType === 'huarong') {
      createData.huarongSize = self._pkHuarongSize || GameGlobal._huarongSize || 4
    }
    if (self.gameType === 'sudoku') {
      createData.sudokuDiff = self._pkSudokuDiff || 'medium'
    }
    wx.cloud.callFunction({
      name: 'pk',
      data: createData,
      success: function(res) {
        wx.hideLoading()
        if (res.result && res.result.success) {
          self.roomId   = res.result.roomId
          self.roomCode = res.result.roomCode
          self.isHost   = true
          self.phase    = 'waiting'
          if (self.gameType === 'huarong') {
            self._roomHuarongSize = self._pkHuarongSize || GameGlobal._huarongSize || 4
          }
          self._startPoll()
        } else {
          wx.showToast({ title: '创建失败，请重试', icon: 'none' })
        }
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // ── 加入房间 ──────────────────────────────
  joinRoom: function(code) {
    if (!code || code.length !== 4) {
      wx.showToast({ title: '请输入4位房间码', icon: 'none' })
      return
    }
    var self = this
    wx.showLoading({ title: '加入中...' })
    wx.cloud.callFunction({
      name: 'pk',
      data: { action: 'join', roomCode: code, nickName: self.myNick, gameType: self.gameType || '2048' },
      success: function(res) {
        wx.hideLoading()
        if (res.result && res.result.success) {
          self.roomId   = res.result.roomId
          self.roomCode = code
          self.isHost   = false
          // 读取房间的gameType（以房主选择为准）
          var room = res.result.room
          if (room) {
            console.log('[PK] 加入房间 gameType=' + room.gameType + ' pkMode=' + room.pkMode)
            self.gameType = room.gameType || self.gameType
            if (room.pkMode) self.pkMode = room.pkMode
            if (room.huarongSize) self._pkHuarongSize = room.huarongSize
            if (room.sudokuDiff) self._pkSudokuDiff = room.sudokuDiff
          }
          self.phase    = 'waiting'
          self._startPoll()   // ★ 轮询代替 watch
        } else {
          wx.showToast({ title: (res.result && res.result.msg) || '加入失败', icon: 'none' })
        }
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // ── 开始轮询 ──────────────────────────────
  // 等待室/游戏中每1秒查一次房间状态
  _startPoll: function() {
    var self = this
    this._stopPoll()
    this._pollLock = false
    this._pollTimer = setInterval(function() {
      self._pollRoom()
    }, 2000)   // 每1.2秒一次，避免太频繁
  },

  _stopPoll: function() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
    this._pollLock = false
  },

  // ── 轮询查询房间状态 ──────────────────────
  _pollRoom: function() {
    if (this._pollLock) return   // 上次请求还没返回，跳过
    if (!this.roomId) return
    var self = this
    this._pollLock = true
    wx.cloud.callFunction({
      name: 'pk',
      data: { action: 'getRoom', roomId: self.roomId },
      success: function(res) {
        self._pollLock = false
        if (res.result && res.result.success && res.result.room) {
          self._onRoomChange(res.result.room)
        }
      },
      fail: function() {
        self._pollLock = false
      }
    })
  },

  // ── 房间数据变化处理（原来是 watch 回调，现在是轮询结果）──
  _onRoomChange: function(room) {
    // 读取房间里的华容道尺寸（云函数存的）
    if (room.huarongSize && !this._roomHuarongSize) {
      this._roomHuarongSize = room.huarongSize
    }
    // 读取PK模式
    if (room.pkMode) this.pkMode = room.pkMode
    // 读取数独难度
    if (room.sudokuDiff) this._pkSudokuDiff = room.sudokuDiff
    // 读取游戏类型（以房间为准）
    if (room.gameType) this.gameType = room.gameType

    // 更新对手信息
    if (this.isHost && room.guest) {
      this.opponentNick     = room.guest.nickName  || '对手'
      this.opponentScore    = room.guest.score     || 0
      this.opponentTime     = room.guest.time      || 0
      this.opponentGameWon  = room.guest.gameWon   || false
      this.opponentGameOver = room.guest.gameOver  || false
      this._opponentMaxTile = room.guest.maxTile   || 2
    } else if (!this.isHost && room.host) {
      this.opponentNick     = room.host.nickName   || '对手'
      this.opponentScore    = room.host.score      || 0
      this.opponentTime     = room.host.time       || 0
      this.opponentGameWon  = room.host.gameWon    || false
      this.opponentGameOver = room.host.gameOver   || false
      this._opponentMaxTile = room.host.maxTile    || 2
    }

    // 状态机：等待 → 倒计时
    if (room.status === 'countdown' && this.phase === 'waiting') {
      this.phase     = 'countdown'
      this.countdown = 3
      this._startCountdown()
    }

    // 状态机：倒计时 → 游戏
    if (room.status === 'playing' && this.phase === 'countdown') {
      this._launchGame()
    }

    // 华容道PK：对手先完成 → 立即判负结束
    if (this.gameType === 'huarong' && this.phase === 'playing' && this.opponentGameWon) {
      var HR = GameGlobal.Huarong
      if (!HR.solved) {
        // 对手先完成，我输了
        this._huarongFinish('opponent')
      }
      // 如果我也完成了，由 _huarongFinish('me') 在 tap/swipe 里已经处理
    }

    // 状态机：游戏 → 结果（云函数标记finished时）
    if (room.status === 'finished' && this.phase === 'playing') {
      this._onFinished(room)
    }
  },

  // ── 倒计时 3-2-1 ──────────────────────────
  _startCountdown: function() {
    var self = this
    this._clearCountTimer()
    this._countTimer = setInterval(function() {
      self.countdown--
      GameGlobal.Sound.play('click')
      if (self.countdown <= 0) {
        self._clearCountTimer()
        // 房主负责把房间状态改为 playing
        if (self.isHost) {
          wx.cloud.callFunction({
            name: 'pk',
            data: { action: 'startGame', roomId: self.roomId },
            fail: function() {}
          })
        }
        // guest 等待下一次轮询检测到 playing 状态
      }
    }, 1000)
  },

  _clearCountTimer: function() {
    if (this._countTimer) {
      clearInterval(this._countTimer)
      this._countTimer = null
    }
  },

  // ── 华容道PK即时结算（先完成者胜）────────────
  _huarongFinish: function(winner) {
    if (this.phase === 'result') return  // 防止重复
    GameGlobal.Timer.stop()
    this._stopPoll()
    this._clearCountTimer()
    this.phase  = 'result'
    this.winner = winner
    GameGlobal.Sound.play(winner === 'me' ? 'win' : 'lose')
  },

  // ── 启动游戏 ──────────────────────────────
  _launchGame: function() {
    this.phase = 'playing'
    if (this.gameType === 'huarong') {
      var sz = this._roomHuarongSize || GameGlobal._huarongSize || 4
      GameGlobal.Huarong.initWithSeed(sz, this.roomCode)
    } else if (this.gameType === 'sudoku') {
      var SDK = GameGlobal.Sudoku
      var diff = this._pkSudokuDiff || 'medium'
      SDK.difficulty = diff
      SDK.solved = false; SDK.started = false; SDK.errors = 0
      SDK.selR = -1; SDK.selC = -1; SDK.notesMode = false
      SDK.initWithSeed(diff, this.roomCode)  // 用房间码做种子，双方同题
    } else {
      GameGlobal.Game.pkInit()
    }
  },

  // ── 每次移动后同步到云端 ──────────────────
  syncMove: function() {
    if (this.phase !== 'playing' || !this.roomId) return
    var now = Date.now()
    if (now - this._lastSync < 600) return
    this._lastSync = now

    var syncData = { action: 'update', roomId: this.roomId }
    if (this.gameType === 'huarong') {
      var HR = GameGlobal.Huarong
      syncData.score    = HR.moves
      syncData.moves    = HR.moves
      syncData.time     = GameGlobal.Timer.seconds
      syncData.gameWon  = HR.solved
      syncData.gameOver = HR.solved
      syncData.solved   = HR.solved
    } else if (this.gameType === 'sudoku') {
      var SDK = GameGlobal.Sudoku
      // 统计用户已填的格子数
      var filled = 0
      if (SDK) for(var r=0;r<9;r++) for(var c=0;c<9;c++) if(!SDK.given[r][c]&&SDK.grid[r][c]!==0) filled++
      syncData.score    = filled
      syncData.time     = GameGlobal.Timer.seconds
      syncData.gameWon  = SDK ? SDK.solved : false
      syncData.gameOver = SDK ? SDK.solved : false
      syncData.solved   = SDK ? SDK.solved : false
    } else {
      var g = GameGlobal.Game
      syncData.score    = g.score
      syncData.time     = GameGlobal.Timer.seconds
      syncData.gameWon  = g.gameWon
      syncData.gameOver = g.gameOver
      // 同步最大方块（用于对手进度条）
      var mt = 0; for(var r=0;r<4;r++) for(var c=0;c<4;c++) if(g.grid[r]&&g.grid[r][c]>mt) mt=g.grid[r][c]
      syncData.maxTile  = mt
    }

    wx.cloud.callFunction({ name: 'pk', data: syncData, fail: function() {} })
  },

  // ── 认输 ──────────────────────────────────
  surrender: function() {
    var self = this
    wx.showModal({
      title: '确认认输？', content: '认输后本局判负',
      confirmText: '认输', cancelText: '继续',
      success: function(res) {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'pk',
            data: { action: 'surrender', roomId: self.roomId },
            success: function() { self.surrendered = true },
            fail: function() {}
          })
          if (self.gameType === 'huarong') {
            GameGlobal.Huarong.solved = true
          } else if (self.gameType === 'sudoku') {
            if (GameGlobal.Sudoku) GameGlobal.Sudoku.solved = true
          } else {
            GameGlobal.Game.gameOver = true
          }
          GameGlobal.Timer.stop()
        }
      }
    })
  },

  // ── 游戏结束处理 ──────────────────────────
  _onFinished: function(room) {
    GameGlobal.Timer.stop()
    if (this.gameType === 'huarong') {
      GameGlobal.Huarong.solved = true
    } else if (this.gameType === 'sudoku') {
      if (GameGlobal.Sudoku) GameGlobal.Sudoku.solved = true
    } else {
      GameGlobal.Game.gameOver = true
    }
    this._stopPoll()
    this._clearCountTimer()
    this.phase = 'result'

    var myRole = this.isHost ? 'host' : 'guest'
    if      (room.winner === 'draw')    this.winner = 'draw'
    else if (room.winner === myRole)    this.winner = 'me'
    else                                this.winner = 'opponent'

    GameGlobal.Sound.play(this.winner === 'me' ? 'win' : 'lose')
  },

  // ── 退出PK ────────────────────────────────
  exit: function() {
    this._stopPoll()
    this._clearCountTimer()
    GameGlobal.Timer.stop()
    this.phase = 'lobby'
    GameGlobal.currentScreen = this.gameType === 'huarong' ? 'lobbyHuarong'
      : this.gameType === 'sudoku' ? 'lobbySudoku' : 'lobby2048'
    GameGlobal.Sound.playBgm()
  }
}

// ================================================
//  Game 扩展：pkInit（PK专用初始化）
// ================================================
GameGlobal.Game.pkInit = function() {
  var g = this
  g.grid = []
  for (var r = 0; r < SIZE; r++) {
    g.grid[r] = []
    for (var c = 0; c < SIZE; c++) g.grid[r][c] = 0
  }
  g.score       = 0
  g.best        = wx.getStorageSync('2048best') || 0
  g.prevGrid    = null
  g.prevScore   = 0
  g.gameOver    = false
  g.gameWon     = false
  g.keepPlaying = false
  GameGlobal.Timer.reset()
  GameGlobal.Timer.start()
  g.addTile()
  g.addTile()
  g.buildTiles(null, null)
}

// ================================================
//  PK 大厅界面
// ================================================
GameGlobal.drawPKLobby = function() {
  drawBg()
  var cx = SW / 2
  var pk = GameGlobal.PK
  var isHR = pk.gameType === 'huarong'
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
  var ruleY = SH * 0.23, ruleH = isHR ? SH * 0.13 : SH * 0.17
  roundRect(PAD, ruleY, BOARD_W, ruleH, 16, C.surface, 'rgba(255,255,255,0.06)')
  setFont(SW * 0.031, '700')
  ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
  var rules = isHR
    ? ['双方同时还原数字华容道', '先完成的赢，都完成则用时少的赢', '都未完成则步数少的赢']
    : pk.gameType === 'sudoku'
    ? ['双方同时开始数独对决', '先完成的赢，都完成则用时少的赢']
    : pk.pkMode === 'endless'
    ? ['双方同时开始，无尽模式', '到2048不结束，继续挑战更高分', '格满或认输才结束，最终比分数']
    : ['双方同时开始，标准模式', '先到2048的赢，都到了比用时', '格满或认输判负']
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

  // ── 2048 PK模式选择（仅2048）
  if (!isHR && pk.gameType !== 'sudoku') {
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
  var isHR = pk.gameType === 'huarong'
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
  var opScore  = isHR ? String(pk.opponentScore) + ' 步' : String(pk.opponentScore)
  var opStatus = isHR
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
  } else {
    reason = isDraw ? '势均力敌，平局！'
      : isWin ? (g.gameWon && pk.opponentGameWon ? '你用时更少！' : g.gameWon ? '你先到达2048！' : '你的分数更高！')
      : pk.surrendered ? '你举手认输了'
      : (pk.opponentGameWon && !g.gameWon ? '对手先到达2048' : '对手分数更高')
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

  // ── 对手进度条
  var progY = timerY + timerH + Math.round(SH*0.004)
  var progH = Math.round(SH*0.012)
  var opProg = pk.opponentGameWon ? 1 : Math.min(pk.opponentScore/2048, 1)
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
    ctx.fillStyle = C.textLight
    ctx.fillText(g.gameWon ? '🎉 你到达2048！' : '游戏结束', cx, pkBoardY+pkBoardH*0.42)
    setFont(SW*0.028, '700')
    ctx.fillStyle = C.textDim
    ctx.fillText('等待对手结束...', cx, pkBoardY+pkBoardH*0.62)
  }
}

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

// ================================================
//  触摸处理
// ================================================
GameGlobal.handlePKTap = function(x, y) {
  var pk = GameGlobal.PK, btns = pk.btns

  if (pk.phase === 'lobby') {
    // 华容道尺寸选择
    if (btns.sizeBtns) {
      for (var si = 0; si < btns.sizeBtns.length; si++) {
        if (inRect(x, y, btns.sizeBtns[si])) {
          GameGlobal.Sound.play('click')
          pk._pkHuarongSize = btns.sizeBtns[si].size
          return
        }
      }
    }
    // PK模式选择
    if (btns.modeBtns) {
      for (var mi = 0; mi < btns.modeBtns.length; mi++) {
        if (inRect(x, y, btns.modeBtns[mi])) {
          GameGlobal.Sound.play('click')
          pk.pkMode = btns.modeBtns[mi].mode
          return
        }
      }
    }
    // 数独难度选择
    if (btns.diffBtns) {
      for (var di = 0; di < btns.diffBtns.length; di++) {
        if (inRect(x, y, btns.diffBtns[di])) {
          GameGlobal.Sound.play('click')
          pk._pkSudokuDiff = btns.diffBtns[di].key
          return
        }
      }
    }
    if (inRect(x, y, btns.createBtn)) {
      GameGlobal.Sound.play('click'); pk.createRoom()
    } else if (inRect(x, y, btns.backBtn)) {
      GameGlobal.Sound.play('click'); pk.exit()
    } else if (btns.keys) {
      for (var i = 0; i < btns.keys.length; i++) {
        if (inRect(x, y, btns.keys[i])) {
          GameGlobal.Sound.play('click')
          var k = btns.keys[i].key
          if (k === '删')       { pk.inputCode = pk.inputCode.slice(0,-1) }
          else if (k === '加入') { pk.joinRoom(pk.inputCode) }
          else if (pk.inputCode.length < 4) { pk.inputCode += k }
          break
        }
      }
    }

  } else if (pk.phase === 'waiting') {
    if (inRect(x, y, btns.cancelBtn)) {
      GameGlobal.Sound.play('click')
      pk._stopPoll()
      pk.phase = 'lobby'
    }

  } else if (pk.phase === 'playing') {
    if (inRect(x, y, btns.surrenderBtn)) pk.surrender()
    else if (pk.gameType === 'huarong') {
      var HR = GameGlobal.Huarong
      if (!HR.solved) {
        var origBY = GameGlobal.BOARD_Y
        GameGlobal.BOARD_Y = pk._pkBoardY || origBY
        var cell = HR.hitTest(x, y)
        GameGlobal.BOARD_Y = origBY
        if (cell) {
          HR.tap(cell[0], cell[1])
          if (HR.solved) {
            pk._lastSync = 0
            pk.syncMove()
            pk._huarongFinish('me')
          } else {
            pk.syncMove()
          }
        }
      }
    } else if (pk.gameType === 'sudoku') {
      var SDK = GameGlobal.Sudoku
      if (SDK && !SDK.solved) {
        // 笔记按钮
        if (btns.notesBtn && inRect(x, y, btns.notesBtn)) {
          SDK.notesMode = !SDK.notesMode; GameGlobal.Sound.play('click')
        }
        // 擦除按钮
        else if (btns.eraseBtn && inRect(x, y, btns.eraseBtn)) {
          if (SDK.selR >= 0 && SDK.selC >= 0 && !SDK.given[SDK.selR][SDK.selC]) {
            SDK.grid[SDK.selR][SDK.selC] = 0
            SDK.notes[SDK.selR][SDK.selC] = [false,false,false,false,false,false,false,false,false]
            GameGlobal.Sound.play('click')
            pk.syncMove()
          }
        }
        // 数字按钮
        else if (btns.numBtns) {
          var numHit = false
          for (var ni = 0; ni < btns.numBtns.length; ni++) {
            if (inRect(x, y, btns.numBtns[ni])) {
              SDK.input(btns.numBtns[ni].num)
              GameGlobal.Sound.play('click')
              pk.syncMove()
              if (SDK.solved) {
                pk._lastSync = 0
                pk.syncMove()
              }
              numHit = true; break
            }
          }
          if (!numHit) {
            // 棋盘点击选格子
            var bx = pk._pkSudokuBoardX, by = pk._pkSudokuBoardY, cs = pk._pkSudokuCellSz
            if (bx != null && x >= bx && y >= by && x <= bx + cs*9 && y <= by + cs*9) {
              var sc = Math.floor((x - bx) / cs)
              var sr = Math.floor((y - by) / cs)
              if (sr >= 0 && sr < 9 && sc >= 0 && sc < 9) {
                SDK.selR = sr; SDK.selC = sc
                GameGlobal.Sound.play('click')
              }
            }
          }
        } else {
          // 棋盘点击选格子（无数字按钮时）
          var bx2 = pk._pkSudokuBoardX, by2 = pk._pkSudokuBoardY, cs2 = pk._pkSudokuCellSz
          if (bx2 != null && x >= bx2 && y >= by2 && x <= bx2 + cs2*9 && y <= by2 + cs2*9) {
            var sc2 = Math.floor((x - bx2) / cs2)
            var sr2 = Math.floor((y - by2) / cs2)
            if (sr2 >= 0 && sr2 < 9 && sc2 >= 0 && sc2 < 9) {
              SDK.selR = sr2; SDK.selC = sc2
              GameGlobal.Sound.play('click')
            }
          }
        }
      }
    }

  } else if (pk.phase === 'result') {
    if (inRect(x, y, btns.replayBtn)) {
      GameGlobal.Sound.play('click')
      pk.enterLobby()
      GameGlobal.currentScreen = 'pk'
    } else if (inRect(x, y, btns.homeBtn)) {
      GameGlobal.Sound.play('click')
      pk.exit()
    }
  }
}

GameGlobal.handlePKSwipe = function(dx, dy, sx, sy) {
  var pk = GameGlobal.PK
  if (pk.phase !== 'playing') return
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
  var dir = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down'  : 'up')

  if (pk.gameType === 'huarong') {
    var HR = GameGlobal.Huarong
    if (HR.solved) return
    var origBY = GameGlobal.BOARD_Y
    GameGlobal.BOARD_Y = pk._pkBoardY || origBY
    var cell = HR.hitTest(sx, sy)
    GameGlobal.BOARD_Y = origBY
    if (cell) {
      HR.swipe(cell[0], cell[1], dir)
      if (HR.solved) {
        pk._lastSync = 0
        pk.syncMove()
        pk._huarongFinish('me')
      } else {
        pk.syncMove()
      }
    }
  } else if (pk.gameType === 'sudoku') {
    // 数独不用滑动
    return
  } else {
    if (GameGlobal.Game.gameOver) return
    GameGlobal.Game.move(dir)
    pk.syncMove()
    // gameOver是setTimeout设置的，需要延迟后再强制同步一次
    setTimeout(function() {
      if (GameGlobal.Game.gameOver || GameGlobal.Game.gameWon) {
        pk._lastSync = 0
        pk.syncMove()
      }
    }, 600)
  }
}