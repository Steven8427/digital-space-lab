// ================================================
//  sudokuLogic.js - 数独核心逻辑（经典模式）
//  难度：easy / medium / hard / expert
// ================================================

var SW = GameGlobal.SW, SH = GameGlobal.SH

// ── 数独颜色方案（加亮版）
var _sdkColors = {
  given:    { bg: 'rgba(108,92,231,0.50)', fg: '#f0ecff' },
  user:     { bg: 'rgba(255,255,255,0.14)', fg: '#fff' },
  selected: { bg: 'rgba(162,155,254,0.60)', fg: '#fff' },
  sameNum:  { bg: 'rgba(162,155,254,0.35)', fg: '#f0ecff' },
  sameRC:   { bg: 'rgba(108,92,231,0.20)', fg: '#d5d0f0' },
  error:    { bg: 'rgba(233,69,96,0.50)',   fg: '#ff8a9a' },
  notes:    '#a0a8c0',
  gridLine: 'rgba(255,255,255,0.25)',
  boxLine:  'rgba(162,155,254,0.75)'
}

// ── 难度 → 提示数量（给出的数字个数）
var _sdkClues = {
  easy:   45,
  medium: 38,
  hard:   30,
  expert: 25,
  hell:   19
}

var _sdkDiffNames = {
  easy: '简单', medium: '普通', hard: '困难', expert: '专家', hell: '地狱'
}

// ================================================
//  数独生成器
// ================================================
function _sdkCanPlace(board, r, c, n) {
  for (var i = 0; i < 9; i++) if (board[r][i] === n) return false
  for (var i = 0; i < 9; i++) if (board[i][c] === n) return false
  var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
  for (var dr = 0; dr < 3; dr++)
    for (var dc = 0; dc < 3; dc++)
      if (board[br + dr][bc + dc] === n) return false
  return true
}

function _sdkGenSolution(randFn) {
  var board = []
  for (var r = 0; r < 9; r++) {
    board[r] = []
    for (var c = 0; c < 9; c++) board[r][c] = 0
  }

  function fill(pos) {
    if (pos === 81) return true
    var r = Math.floor(pos / 9), c = pos % 9
    var nums = [1,2,3,4,5,6,7,8,9]
    for (var i = 8; i > 0; i--) {
      var j = Math.floor(randFn() * (i + 1))
      var t = nums[i]; nums[i] = nums[j]; nums[j] = t
    }
    for (var ni = 0; ni < 9; ni++) {
      var n = nums[ni]
      if (_sdkCanPlace(board, r, c, n)) {
        board[r][c] = n
        if (fill(pos + 1)) return true
        board[r][c] = 0
      }
    }
    return false
  }

  fill(0)
  return board
}

function _sdkGenPuzzle(difficulty, randFn) {
  var solution = _sdkGenSolution(randFn)
  var clueCount = _sdkClues[difficulty] || 30

  var puzzle = []
  for (var r = 0; r < 9; r++) {
    puzzle[r] = []
    for (var c = 0; c < 9; c++) puzzle[r][c] = solution[r][c]
  }

  // 按随机顺序挖空
  var cells = []
  for (var i = 0; i < 81; i++) cells.push(i)
  for (var i = 80; i > 0; i--) {
    var j = Math.floor(randFn() * (i + 1))
    var t = cells[i]; cells[i] = cells[j]; cells[j] = t
  }

  var removed = 0, target = 81 - clueCount
  for (var ci = 0; ci < cells.length && removed < target; ci++) {
    var r = Math.floor(cells[ci] / 9), c = cells[ci] % 9
    puzzle[r][c] = 0
    removed++
  }

  return { puzzle: puzzle, solution: solution }
}

// ── mulberry32 PRNG（种子随机，PK用）
function _sdkPRNG(seed) {
  var h = 0
  var s = String(seed)
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  var state = Math.abs(h) || 1
  return function() {
    state |= 0; state = (state + 0x6D2B79F5) | 0
    var t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ================================================
//  数独游戏对象
// ================================================
GameGlobal.Sudoku = {
  grid:      [],
  solution:  [],
  given:     [],
  notes:     [],
  selR:      -1,
  selC:      -1,
  notesMode: false,
  errors:    0,
  hints:     0,
  maxHints:  0,   // 无免费次数，纯靠道具
  checks:    0,
  maxChecks: 0,   // 无免费次数，纯靠道具
  _hintUsed: 0,   // 本局已使用次数（上限4）
  checkMarks: [],   // 检查按钮标记的错误格子
  solved:    false,
  started:   false,
  difficulty: 'medium',
  _boardX:   0,
  _boardY:   0,
  _cellSz:   0,

  // ── 初始化（经典模式）
  init: function(diff) {
    this.difficulty = diff || GameGlobal._sudokuDiff || 'medium'
    GameGlobal._sudokuDiff = this.difficulty
    this.solved  = false
    this.started = false
    this.errors  = 0
    this.hints   = 0
    this.checks  = 0
    this._hintUsed = 0
    this.selR    = -1
    this.selC    = -1
    this.notesMode = false

    var result = _sdkGenPuzzle(this.difficulty, Math.random)
    this._setupBoard(result.puzzle, result.solution)

    GameGlobal.Timer.reset()
    GameGlobal.Timer.start()
  },

  // ── 种子初始化（PK用）
  initWithSeed: function(diff, seed) {
    this.difficulty = diff || 'medium'
    this.solved  = false
    this.started = false
    this.errors  = 0
    this.hints   = 0
    this.checks  = 0
    this._hintUsed = 0
    this.selR    = -1
    this.selC    = -1
    this.notesMode = false

    var randFn = _sdkPRNG(seed)
    var result = _sdkGenPuzzle(this.difficulty, randFn)
    this._setupBoard(result.puzzle, result.solution)

    GameGlobal.Timer.reset()
    GameGlobal.Timer.start()
  },

  _setupBoard: function(puzzle, solution) {
    this.grid     = []
    this.given    = []
    this.notes    = []
    this.checkMarks = []
    this.solution = solution

    for (var r = 0; r < 9; r++) {
      this.grid[r]  = []
      this.given[r] = []
      this.notes[r] = []
      this.checkMarks[r] = []
      for (var c = 0; c < 9; c++) {
        this.grid[r][c]  = puzzle[r][c]
        this.given[r][c] = puzzle[r][c] !== 0
        this.notes[r][c] = [false,false,false,false,false,false,false,false,false]
        this.checkMarks[r][c] = false
      }
    }
  },

  // ── 选择格子
  select: function(r, c) {
    if (r < 0 || r >= 9 || c < 0 || c >= 9) return
    if (this.selR === r && this.selC === c) {
      this.selR = -1; this.selC = -1
    } else {
      this.selR = r; this.selC = c
    }
    this.started = true
  },

  // ── 输入数字
  input: function(num) {
    if (this.solved) return
    if (this.selR < 0 || this.selC < 0) return
    var r = this.selR, c = this.selC
    if (this.given[r][c]) return

    this.started = true
    GameGlobal.Sound.play('move')

    if (this.notesMode) {
      this.notes[r][c][num - 1] = !this.notes[r][c][num - 1]
      if (this.grid[r][c] !== 0) this.grid[r][c] = 0
    } else {
      this.grid[r][c] = num
      this.notes[r][c] = [false,false,false,false,false,false,false,false,false]
      this._clearRelatedNotes(r, c, num)

      // 填入新数字时，清除之前的检查标记
      this.checkMarks[r][c] = false

      if (this._checkSolved()) {
        this._onSolved()
      }
    }
  },

  _clearRelatedNotes: function(r, c, num) {
    var idx = num - 1
    for (var i = 0; i < 9; i++) this.notes[r][i][idx] = false
    for (var i = 0; i < 9; i++) this.notes[i][c][idx] = false
    var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
    for (var dr = 0; dr < 3; dr++)
      for (var dc = 0; dc < 3; dc++)
        this.notes[br + dr][bc + dc][idx] = false
  },

  erase: function() {
    if (this.solved) return
    if (this.selR < 0 || this.selC < 0) return
    var r = this.selR, c = this.selC
    if (this.given[r][c]) return
    this.grid[r][c] = 0
    this.notes[r][c] = [false,false,false,false,false,false,false,false,false]
    this.checkMarks[r][c] = false
    GameGlobal.Sound.play('click')
  },

  // ── 提示（免费 maxHints 次，之后看广告）
  useHint: function() {
    if (this.solved) return false
    // 有道具且未达4次上限 → 用道具
    if (this._hintUsed < 4 && GameGlobal.AchieveShop && GameGlobal.AchieveShop.getPropCount('prop_hint') > 0) {
      GameGlobal.AchieveShop.useProp('prop_hint')
      this._hintUsed++
      return this._doHint()
    }
    // 道具用完或达上限 → 看广告（不限次数，不计入上限）
    var self = this
    GameGlobal.AdManager.showRewardedAd(function() {
      self._doHint()
    })
    return false
  },

  _doHint: function() {
    if (this.solved) return false
    var r = this.selR, c = this.selC

    if (r >= 0 && c >= 0 && !this.given[r][c] && this.grid[r][c] !== this.solution[r][c]) {
      this.grid[r][c] = this.solution[r][c]
      this.given[r][c] = true
      this.notes[r][c] = [false,false,false,false,false,false,false,false,false]
      this.checkMarks[r][c] = false
      this._clearRelatedNotes(r, c, this.solution[r][c])
      this.hints++
      this.started = true
      GameGlobal.Sound.play('move')
      wx.showToast({ title: '已填入正确数字', icon: 'none' })
      if (this._checkSolved()) this._onSolved()
      return true
    }

    for (var rr = 0; rr < 9; rr++) {
      for (var cc = 0; cc < 9; cc++) {
        if (!this.given[rr][cc] && this.grid[rr][cc] !== this.solution[rr][cc]) {
          this.grid[rr][cc] = this.solution[rr][cc]
          this.given[rr][cc] = true
          this.notes[rr][cc] = [false,false,false,false,false,false,false,false,false]
          this.checkMarks[rr][cc] = false
          this._clearRelatedNotes(rr, cc, this.solution[rr][cc])
          this.selR = rr; this.selC = cc
          this.hints++
          this.started = true
          GameGlobal.Sound.play('move')
          wx.showToast({ title: '已填入正确数字', icon: 'none' })
          if (this._checkSolved()) this._onSolved()
          return true
        }
      }
    }
    wx.showToast({ title: '没有可提示的格子', icon: 'none' })
    return false
  },

  // ── 检查（免费 maxChecks 次，之后看广告）
  checkAll: function() {
    if (this.solved) return
    // 有道具且未达4次上限 → 用道具
    if (this._hintUsed < 4 && GameGlobal.AchieveShop && GameGlobal.AchieveShop.getPropCount('prop_check') > 0) {
      GameGlobal.AchieveShop.useProp('prop_check')
      this._hintUsed++
      this._doCheck()
      return
    }
    // 道具用完或达上限 → 看广告（不限次数）
    var self = this
    GameGlobal.AdManager.showRewardedAd(function() {
      self._doCheck()
    })
  },

  _doCheck: function() {
    if (this.solved) return
    this.checks++
    var found = 0
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (!this.given[r][c] && this.grid[r][c] !== 0 && this.grid[r][c] !== this.solution[r][c]) {
          this.checkMarks[r][c] = true
          found++
        } else {
          this.checkMarks[r][c] = false
        }
      }
    }
    GameGlobal.Sound.play('click')
    if (found === 0) {
      var empty = 0
      for (var r = 0; r < 9; r++)
        for (var c = 0; c < 9; c++)
          if (this.grid[r][c] === 0) empty++
      wx.showToast({ title: empty > 0 ? '目前没有错误' : '全部正确！', icon: 'none' })
    } else {
      wx.showToast({ title: '发现 ' + found + ' 个错误', icon: 'none' })
    }
  },

  toggleNotes: function() {
    this.notesMode = !this.notesMode
    GameGlobal.Sound.play('click')
  },

  _checkSolved: function() {
    for (var r = 0; r < 9; r++)
      for (var c = 0; c < 9; c++)
        if (this.grid[r][c] !== this.solution[r][c]) return false
    return true
  },

  _onSolved: function() {
    this.solved = true
    GameGlobal.Timer.stop()
    GameGlobal.Sound.play('win')

    // 闯关模式不保存经典最佳/不上传经典排行榜
    var isChallenge = GameGlobal.SudokuChallenge && GameGlobal.SudokuChallenge.playing
    if (!isChallenge) {
      var bestKey = 'sudokuBest_' + this.difficulty
      var prevBest = wx.getStorageSync(bestKey) || 0
      var curTime  = GameGlobal.Timer.seconds
      if (prevBest === 0 || curTime < prevBest) {
        wx.setStorageSync(bestKey, curTime)
      }
      GameGlobal.SudokuRank.upload(this.difficulty, curTime, this.errors)
    }
  },

  hitTest: function(px, py) {
    var bx = this._boardX, by = this._boardY, cs = this._cellSz
    if (!cs) return null
    var boardSz = cs * 9
    if (px < bx || px > bx + boardSz) return null
    if (py < by || py > by + boardSz) return null
    var c = Math.floor((px - bx) / cs)
    var r = Math.floor((py - by) / cs)
    if (c < 0 || c >= 9 || r < 0 || r >= 9) return null
    return [r, c]
  },

  // ── 冲突检测：同行/同列/同宫有重复数字
  hasError: function(r, c) {
    var v = this.grid[r][c]
    if (v === 0) return false
    // 行检查
    for (var i = 0; i < 9; i++)
      if (i !== c && this.grid[r][i] === v) return true
    // 列检查
    for (var i = 0; i < 9; i++)
      if (i !== r && this.grid[i][c] === v) return true
    // 宫检查
    var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
    for (var dr = 0; dr < 3; dr++)
      for (var dc = 0; dc < 3; dc++)
        if ((br+dr !== r || bc+dc !== c) && this.grid[br+dr][bc+dc] === v) return true
    return false
  },

  // ── 检查按钮标记的错误
  hasCheckError: function(r, c) {
    if (!this.checkMarks[r]) return false
    return this.checkMarks[r][c] === true
  },

  getRemaining: function(num) {
    var count = 0
    for (var r = 0; r < 9; r++)
      for (var c = 0; c < 9; c++)
        if (this.grid[r][c] === num) count++
    return 9 - count
  },

  colors: _sdkColors,
  diffNames: _sdkDiffNames
}

// ================================================
//  数独排行榜
// ================================================
GameGlobal.SudokuRank = {
  tab:       'easy',
  loading:   false,
  error:     '',
  lists:     { easy:[], medium:[], hard:[], expert:[], hell:[] },
  myRanks:   { easy:null, medium:null, hard:null, expert:null, hell:null },
  scrollY:   0,

  load: function() {
    this.loading = true
    this.error   = ''
    this.scrollY = 0
    var self = this
    var tabs = ['easy', 'medium', 'hard', 'expert', 'hell']
    var done = 0
    var total = tabs.length

    for (var ti = 0; ti < tabs.length; ti++) {
      (function(tab) {
        wx.cloud.callFunction({
          name: 'leaderboard',
          data: { action: 'query', type: 'sudoku_' + tab, limit: 100 },
          success: function(res) {
            if (res.result && res.result.success) {
              var list = res.result.data || []
              list.sort(function(a, b) { return a.time - b.time })
              self.lists[tab] = list
              var my = res.result.myRank || null
              if (my) {
                for (var i = 0; i < list.length; i++) {
                  if (list[i].openid === my.openid) { my.rank = i + 1; break }
                }
              }
              self.myRanks[tab] = my
            }
            if (++done === total) self.loading = false
          },
          fail: function() {
            if (++done === total) self.loading = false
          }
        })
      })(tabs[ti])
    }
  },

  upload: function(difficulty, timeSeconds, errors) {
    var info     = wx.getStorageSync('userInfo') || {}
    var nickname = info.nickName  || '神秘玩家'
    var avatar   = info.avatarUrl || ''

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: {
        action: 'upload',
        type: 'sudoku_' + difficulty,
        nickname: nickname,
        avatarUrl: avatar,
        score: errors,
        time: timeSeconds
      },
      fail: function() {}
    })
  }
}

// ── Timer.formatSec 工具
if (!GameGlobal.Timer.formatSec) {
  GameGlobal.Timer.formatSec = function(sec) {
    var m = Math.floor(sec / 60), s = sec % 60
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  }
}