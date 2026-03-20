// ================================================
//  huarongLogic.js - 数字华容道核心逻辑（支持 3×3 ~ 10×10）
// ================================================

var SW = GameGlobal.SW, SH = GameGlobal.SH

// ── 颜色方案：按数值取模分10色
function _hrColor(v) {
  if (!v || v === 0) return null
  var groups = [
    { bg:'#4a90d9', fg:'#fff' },
    { bg:'#2ab5a0', fg:'#fff' },
    { bg:'#52b265', fg:'#fff' },
    { bg:'#e07b3a', fg:'#fff' },
    { bg:'#7c5cbf', fg:'#fff' },
    { bg:'#3d7fc7', fg:'#fff' },
    { bg:'#22a08c', fg:'#fff' },
    { bg:'#44a057', fg:'#fff' },
    { bg:'#cc6a2a', fg:'#fff' },
    { bg:'#6b4bae', fg:'#fff' }
  ]
  return groups[(v - 1) % groups.length]
}

GameGlobal.Huarong = {
  grid:    [],
  emptyR:  0,
  emptyC:  0,
  moves:   0,
  best:    0,
  solved:  false,
  started: false,
  size:    4,
  _animTiles: [],  // 滑动动画队列

  // ── 规范化尺寸（3~10）
  _normSize: function(n) {
    n = parseInt(n) || 4
    if (n < 3) n = 3
    if (n > 10) n = 10
    return n
  },

  // ── 动态格子大小（根据 BOARD_W 和 size）
  _cellSz: function() {
    var bw = GameGlobal.BOARD_W, gap = GameGlobal.GAP, n = this.size
    return Math.floor((bw - gap * (n + 1)) / n)
  },

  // ── 棋盘实际高度
  _boardH: function() {
    var cs = this._cellSz(), gap = GameGlobal.GAP, n = this.size
    return cs * n + gap * (n + 1)
  },

  // ── 获取颜色
  getColor: function(v) {
    return _hrColor(v)
  },

  // ── 初始化（传入 size）
  init: function(size) {
    this.size    = this._normSize(size || GameGlobal._huarongSize || 4)
    this.solved  = false
    this.started = false
    this.moves   = 0
    this._animTiles = []
    var bestKey  = 'huarongBest_' + this.size + 'x' + this.size
    this.best    = wx.getStorageSync(bestKey) || 0
    this._shuffle()
    GameGlobal.Timer.reset()
    GameGlobal.Timer.start()
  },

  // ── PK专用初始化（种子确保双方棋盘一致）
  initWithSeed: function(size, seed) {
    this.size    = this._normSize(size || 4)
    this.solved  = false
    this.started = false
    this.moves   = 0
    this._animTiles = []
    var bestKey  = 'huarongBest_' + this.size + 'x' + this.size
    this.best    = wx.getStorageSync(bestKey) || 0
    this._shuffleSeeded(seed)
    GameGlobal.Timer.reset()
    GameGlobal.Timer.start()
  },

  // ── 生成可解的随机排列
  _shuffle: function() {
    var n = this.size, total = n * n
    var arr = []
    for (var i = 1; i < total; i++) arr.push(i)
    arr.push(0)

    var attempts = 0
    do {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1))
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t
      }
      attempts++
      if (attempts > 1000) {
        for (var i = 0; i < total - 1; i++) arr[i] = i + 1
        arr[total - 1] = 0
        break
      }
    } while (!this._isSolvable(arr) || this._isGoal(arr))

    this.grid = []
    this.emptyR = n - 1; this.emptyC = n - 1
    for (var r = 0; r < n; r++) {
      this.grid[r] = []
      for (var c = 0; c < n; c++) {
        var v = arr[r * n + c]
        this.grid[r][c] = v
        if (v === 0) { this.emptyR = r; this.emptyC = c }
      }
    }
  },

  // ── 种子随机洗牌（PK用，确保双方棋盘一致）
  _shuffleSeeded: function(seed) {
    // 简单哈希种子 → 整数
    var h = 0
    var s = String(seed)
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0
    }
    // mulberry32 PRNG
    var state = Math.abs(h) || 1
    function rand() {
      state |= 0; state = (state + 0x6D2B79F5) | 0
      var t = Math.imul(state ^ (state >>> 15), 1 | state)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    var n = this.size, total = n * n
    var arr = []
    for (var i = 1; i < total; i++) arr.push(i)
    arr.push(0)

    var attempts = 0
    do {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1))
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t
      }
      attempts++
      if (attempts > 1000) {
        for (var i = 0; i < total - 1; i++) arr[i] = i + 1
        arr[total - 1] = 0
        break
      }
    } while (!this._isSolvable(arr) || this._isGoal(arr))

    this.grid = []
    this.emptyR = n - 1; this.emptyC = n - 1
    for (var r = 0; r < n; r++) {
      this.grid[r] = []
      for (var c = 0; c < n; c++) {
        var v = arr[r * n + c]
        this.grid[r][c] = v
        if (v === 0) { this.emptyR = r; this.emptyC = c }
      }
    }
  },

  // ── 可解性判断（通用 n×n）
  _isSolvable: function(arr) {
    var n = this.size
    var inv = 0
    for (var i = 0; i < arr.length - 1; i++) {
      if (arr[i] === 0) continue
      for (var j = i + 1; j < arr.length; j++) {
        if (arr[j] === 0) continue
        if (arr[i] > arr[j]) inv++
      }
    }
    var blankIdx = arr.indexOf(0)
    var blankRowFromBottom = n - Math.floor(blankIdx / n)
    if (n % 2 === 1) {
      return inv % 2 === 0
    } else {
      if (blankRowFromBottom % 2 === 0) return inv % 2 !== 0
      else return inv % 2 === 0
    }
  },

  // ── 是否已是目标状态
  _isGoal: function(arr) {
    var n = this.size, total = n * n
    for (var i = 0; i < total - 1; i++) if (arr[i] !== i + 1) return false
    return arr[total - 1] === 0
  },

  // ── 点击格子尝试移动
  tap: function(r, c) {
    if (this.solved) return false
    var n = this.size
    if (r < 0 || r >= n || c < 0 || c >= n) return false
    var er = this.emptyR, ec = this.emptyC
    var dr = Math.abs(r - er), dc = Math.abs(c - ec)
    if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return false

    var val = this.grid[r][c]
    this._animTiles = [{ value:val, fromR:r, fromC:c, toR:er, toC:ec, progress:0 }]

    this.grid[er][ec] = val
    this.grid[r][c]   = 0
    this.emptyR = r; this.emptyC = c
    this.moves++; this.started = true
    GameGlobal.Sound.play('move')

    if (this._checkSolved()) this._onSolved()
    return true
  },

  // ── 检查是否完成
  _checkSolved: function() {
    var n = this.size
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++) {
        var expected = r * n + c + 1
        if (r === n - 1 && c === n - 1) {
          if (this.grid[r][c] !== 0) return false
        } else {
          if (this.grid[r][c] !== expected) return false
        }
      }
    return true
  },

  // ── 完成处理
  _onSolved: function() {
    this.solved = true
    GameGlobal.Timer.stop()
    var bestKey = 'huarongBest_' + this.size + 'x' + this.size
    if (this.best === 0 || this.moves < this.best) {
      this.best = this.moves
      wx.setStorageSync(bestKey, this.best)
    }
    GameGlobal.HuarongRank.upload(this.moves, GameGlobal.Timer.seconds)
    GameGlobal.Sound.play('win')
  },

  // ── 滑动操作
  swipe: function(startR, startC, dir) {
    if (this.solved) return false
    var er = this.emptyR, ec = this.emptyC
    var count = 0
    var anims = []

    if (dir === 'right') {
      if (er !== startR || ec <= startC) return false
      count = ec - startC
      for (var c = ec - 1; c >= startC; c--) {
        anims.push({ value:this.grid[er][c], fromR:er, fromC:c, toR:er, toC:c+1, progress:0 })
        this.grid[er][c + 1] = this.grid[er][c]
      }
      this.grid[er][startC] = 0; this.emptyC = startC
    } else if (dir === 'left') {
      if (er !== startR || ec >= startC) return false
      count = startC - ec
      for (var c = ec + 1; c <= startC; c++) {
        anims.push({ value:this.grid[er][c], fromR:er, fromC:c, toR:er, toC:c-1, progress:0 })
        this.grid[er][c - 1] = this.grid[er][c]
      }
      this.grid[er][startC] = 0; this.emptyC = startC
    } else if (dir === 'down') {
      if (ec !== startC || er <= startR) return false
      count = er - startR
      for (var r = er - 1; r >= startR; r--) {
        anims.push({ value:this.grid[r][ec], fromR:r, fromC:ec, toR:r+1, toC:ec, progress:0 })
        this.grid[r + 1][ec] = this.grid[r][ec]
      }
      this.grid[startR][ec] = 0; this.emptyR = startR
    } else if (dir === 'up') {
      if (ec !== startC || er >= startR) return false
      count = startR - er
      for (var r = er + 1; r <= startR; r++) {
        anims.push({ value:this.grid[r][ec], fromR:r, fromC:ec, toR:r-1, toC:ec, progress:0 })
        this.grid[r - 1][ec] = this.grid[r][ec]
      }
      this.grid[startR][ec] = 0; this.emptyR = startR
    } else { return false }

    this._animTiles = anims
    this.moves += count; this.started = true
    GameGlobal.Sound.play('move')
    if (this._checkSolved()) this._onSolved()
    return true
  },

  // ── 更新动画
  updateAnimations: function() {
    if (!this._animTiles || this._animTiles.length === 0) return
    var allDone = true
    for (var i = 0; i < this._animTiles.length; i++) {
      var a = this._animTiles[i]
      if (a.progress < 1) {
        a.progress = Math.min(1, a.progress + 0.22)
        if (a.progress < 1) allDone = false
      }
    }
    if (allDone) this._animTiles = []
  },

  // ── 像素坐标转格子（动态 cellSz）
  cellXY: function(r, c) {
    var bx = GameGlobal.BOARD_X, by = GameGlobal.BOARD_Y
    var gap = GameGlobal.GAP, cs = this._cellSz()
    return [ bx + gap + c * (cs + gap),
             by + gap + r * (cs + gap) ]
  },

  // ── 触摸坐标命中测试
  hitTest: function(px, py) {
    var bx = GameGlobal.BOARD_X, by = GameGlobal.BOARD_Y
    var gap = GameGlobal.GAP, cs = this._cellSz()
    var bh = this._boardH(), bw = GameGlobal.BOARD_W
    var n = this.size
    if (px < bx || px > bx + bw) return null
    if (py < by || py > by + bh) return null
    var c = Math.floor((px - bx - gap) / (cs + gap))
    var r = Math.floor((py - by - gap) / (cs + gap))
    if (c < 0 || c >= n || r < 0 || r >= n) return null
    return [r, c]
  }
}

// ── 华容道排行榜
GameGlobal.HuarongRank = {
  tab:         'moves',
  loading:     false,
  error:       '',
  movesList:   [],
  timeList:    [],
  myMovesRank: null,
  myTimeRank:  null,
  scrollY:     0,
  currentSize: 4,

  load: function() {
    this.loading = true
    this.error   = ''
    this.scrollY = 0
    this.currentSize = GameGlobal._huarongSize || GameGlobal.Huarong.size || 4
    var sz     = this.currentSize
    var suffix = '_' + sz + 'x' + sz
    var self   = this, done = 0
    function onDone() { if (++done === 2) self.loading = false }

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'query', type: 'huarong_moves' + suffix, limit: 100 },
      success: function(res) {
        if (res.result && res.result.success) {
          var list = res.result.data || []
          list.sort(function(a, b) { return a.time - b.time })
          self.movesList = list
          var my = res.result.myRank || null
          if (my) {
            for (var i = 0; i < list.length; i++) {
              if (list[i].openid === my.openid) { my.rank = i + 1; break }
            }
          }
          self.myMovesRank = my
        } else { self.error = '加载失败' }
        onDone()
      },
      fail: function() { self.error = '网络错误'; onDone() }
    })

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'query', type: 'huarong_time' + suffix, limit: 100 },
      success: function(res) {
        if (res.result && res.result.success) {
          var list = res.result.data || []
          list.sort(function(a, b) { return a.time - b.time })
          self.timeList = list
          var my = res.result.myRank || null
          if (my) {
            for (var i = 0; i < list.length; i++) {
              if (list[i].openid === my.openid) { my.rank = i + 1; break }
            }
          }
          self.myTimeRank = my
        }
        onDone()
      },
      fail: function() { onDone() }
    })
  },

  upload: function(moves, timeSeconds) {
    var info     = wx.getStorageSync('userInfo') || {}
    var nickname = info.nickName  || '神秘玩家'
    var avatar   = info.avatarUrl || ''
    var sz       = GameGlobal.Huarong.size || 4
    var suffix   = '_' + sz + 'x' + sz

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'upload', type: 'huarong_moves' + suffix,
              nickname: nickname, avatarUrl: avatar,
              score: moves, time: moves },
      fail: function() {}
    })

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'upload', type: 'huarong_time' + suffix,
              nickname: nickname, avatarUrl: avatar,
              score: moves, time: timeSeconds },
      fail: function() {}
    })
  }
}