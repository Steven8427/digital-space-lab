// ================================================
//  gameLogic.js - 游戏核心逻辑
//  包含：棋盘、移动、合并、撤销道具
// ================================================

// ---- 从 GameGlobal 引入共享变量 ----
var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP, SIZE = GameGlobal.SIZE
var BOARD_W = GameGlobal.BOARD_W, BOARD_H = GameGlobal.BOARD_H
var BOARD_X = GameGlobal.BOARD_X, BOARD_Y = GameGlobal.BOARD_Y
var CELL_SZ = GameGlobal.CELL_SZ, BTN_H = GameGlobal.BTN_H
var TOP_PAD = GameGlobal.TOP_PAD, ROW1_H = GameGlobal.ROW1_H, ROW2_H = GameGlobal.ROW2_H
var C = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg = GameGlobal.drawBg, drawBtn = GameGlobal.drawBtn, inRect = GameGlobal.inRect


GameGlobal.Game = {
  grid:        [],
  score:       0,
  best:        0,
  prevGrid:    null,
  prevScore:   0,
  gameOver:    false,
  gameWon:     false,
  keepPlaying: false,
  tiles:       [],

  // ---- 撤销道具 ----
  // 每局免费1次，用完后提示
  undoItem: {
    total:   1,   // 每局免费次数
    left:    1,   // 剩余次数
    reset: function() { this.left = this.total }
  },

  init: function() {
    this.grid        = []
    for (var r = 0; r < SIZE; r++) {
      this.grid[r] = []
      for (var c = 0; c < SIZE; c++) this.grid[r][c] = 0
    }
    this.score       = 0
    this.best        = wx.getStorageSync('2048best') || 0
    this.prevGrid    = null
    this.prevScore   = 0
    this.gameOver    = false
    this.gameWon     = false
    this.keepPlaying = false
    this.undoItem.reset()   // 每局重置道具次数
    GameGlobal.Timer.reset()
    GameGlobal.Timer.start()
    this.addTile()
    this.addTile()
    this.buildTiles(null, null)
  },

  addTile: function() {
    var empty = []
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (this.grid[r][c] === 0) empty.push([r, c])
    if (!empty.length) return null
    var pos = empty[Math.floor(Math.random() * empty.length)]
    this.grid[pos[0]][pos[1]] = Math.random() < 0.9 ? 2 : 4
    return pos
  },

  cloneGrid: function() {
    var g = []
    for (var r = 0; r < SIZE; r++) {
      g[r] = []
      for (var c = 0; c < SIZE; c++) g[r][c] = this.grid[r][c]
    }
    return g
  },

  buildTiles: function(newPos, mergedPos, movements) {
    this.tiles = []
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (this.grid[r][c] === 0) continue
        var isNew    = !!(newPos    && newPos[0]    === r && newPos[1]    === c)
        var isMerged = false
        if (mergedPos) {
          for (var i = 0; i < mergedPos.length; i++) {
            if (mergedPos[i][0] === r && mergedPos[i][1] === c) { isMerged = true; break }
          }
        }
        // 查找滑动来源
        var fromR = r, fromC = c
        if (movements) {
          for (var m = 0; m < movements.length; m++) {
            if (movements[m].r === r && movements[m].c === c) {
              fromR = movements[m].fromR; fromC = movements[m].fromC; break
            }
          }
        }
        var needsSlide = (fromR !== r || fromC !== c) && !isNew
        this.tiles.push({ r:r, c:c, value:this.grid[r][c],
          scale: isNew ? 0 : 1, isNew:isNew, isMerged:isMerged, animProgress:0,
          fromR:fromR, fromC:fromC, slideProgress: needsSlide ? 0 : 1 })
      }
    }
  },

  compressLine: function(line) {
    var vals = [], srcIdx = []
    for (var i = 0; i < line.length; i++) {
      if (line[i] !== 0) { vals.push(line[i]); srcIdx.push(i) }
    }
    var result = [], mergedIdx = [], sources = [], i = 0
    while (i < vals.length) {
      if (i + 1 < vals.length && vals[i] === vals[i+1]) {
        var m = vals[i] * 2
        result.push(m); mergedIdx.push(result.length - 1)
        sources.push(srcIdx[i])   // primary source for merged tile
        this.score += m; i += 2
      } else { result.push(vals[i]); sources.push(srcIdx[i]); i++ }
    }
    while (result.length < SIZE) { result.push(0); sources.push(-1) }
    return { result:result, mergedIdx:mergedIdx, sources:sources }
  },

  move: function(dir) {
    if (this.gameOver) return
    if (this.gameWon && !this.keepPlaying) return

    this.prevGrid  = this.cloneGrid()
    this.prevScore = this.score

    var moved = false, mergedPositions = [], movements = []
    var isReversed = (dir === 'right' || dir === 'down')
    var isHoriz    = (dir === 'left'  || dir === 'right')

    for (var i = 0; i < SIZE; i++) {
      var line = []
      for (var j = 0; j < SIZE; j++)
        line[j] = isHoriz ? this.grid[i][j] : this.grid[j][i]
      if (isReversed) line.reverse()

      var res = this.compressLine(line)
      var result = res.result, mergedIdx = res.mergedIdx, sources = res.sources

      for (var j = 0; j < SIZE; j++) {
        var actualJ = isReversed ? (SIZE - 1 - j) : j
        var val = result[j]
        var r = isHoriz ? i : actualJ, c = isHoriz ? actualJ : i
        if (this.grid[r][c] !== val) moved = true
        this.grid[r][c] = val

        // 记录滑动来源
        if (val !== 0 && sources[j] >= 0) {
          var srcJ = sources[j]
          var actualSrcJ = isReversed ? (SIZE - 1 - srcJ) : srcJ
          var srcR = isHoriz ? i : actualSrcJ
          var srcC = isHoriz ? actualSrcJ : i
          movements.push({ r:r, c:c, fromR:srcR, fromC:srcC })
        }
      }
      for (var k = 0; k < mergedIdx.length; k++) {
        var mi = mergedIdx[k]
        var actualJ = isReversed ? (SIZE - 1 - mi) : mi
        mergedPositions.push([isHoriz ? i : actualJ, isHoriz ? actualJ : i])
      }
    }

    if (!moved) return

    if (this.score > this.best) {
      this.best = this.score
      wx.setStorageSync('2048best', this.best)
    }

    GameGlobal.Sound.play(mergedPositions.length > 0 ? 'merge' : 'move')
    var newPos = this.addTile()
    this.buildTiles(newPos, mergedPositions, movements)

    var hasWon = false
    for (var r = 0; r < SIZE && !hasWon; r++)
      for (var c = 0; c < SIZE && !hasWon; c++)
        if (this.grid[r][c] >= 2048) hasWon = true

    if (!this.gameWon && hasWon) {
      this.gameWon = true
      if (GameGlobal.currentScreen === 'pk') {
        var pkMode = GameGlobal.PK && GameGlobal.PK.pkMode
        if (pkMode === 'endless') {
          // 无尽模式：到2048不结束，继续玩
          this.keepPlaying = true
          GameGlobal.Sound.play('win')
        } else {
          // 标准模式：到2048结束
          GameGlobal.Timer.stop()
          var self = this
          setTimeout(function() { self.gameOver = true; GameGlobal.Sound.play('win') }, 500)
        }
      } else {
        // 单人模式：弹覆盖层
        GameGlobal.Timer.stop()
        var self = this
        setTimeout(function() { self.gameOver = true; GameGlobal.Sound.pauseBgm(); GameGlobal.Sound.play('win') }, 500)
      }
    } else if (!this.canMove()) {
      GameGlobal.Timer.stop()
      GameGlobal.Rank.upload(this.score, GameGlobal.Timer.seconds, false)
      var self = this
      setTimeout(function() { self.gameOver = true; GameGlobal.Sound.pauseBgm(); GameGlobal.Sound.play('lose') }, 400)
    }
  },

  // ---- 普通撤销（上一步，不消耗道具）----
  undo: function() {
    if (!this.prevGrid) return
    this.grid      = this.prevGrid
    this.score     = this.prevScore
    this.prevGrid  = null
    this.gameOver  = false
    this.gameWon   = false
    GameGlobal.Timer.resume()
    this.buildTiles(null, null)
    GameGlobal.Sound.play('click')
  },

  // ---- 道具撤销（免费1次，用完看广告获取）----
  useUndoItem: function() {
    if (!this.prevGrid) {
      wx.showToast({ title: '没有可以撤销的步骤', icon: 'none', duration: 1500 })
      return
    }
    if (this.undoItem.left > 0) {
      // 还有免费次数，直接使用
      this.undoItem.left--
      this.undo()
      var left = this.undoItem.left
      wx.showToast({ title: left > 0 ? '撤销成功！剩余' + left + '次' : '撤销成功！免费次数已用完', icon: 'success', duration: 1200 })
    } else {
      // 没有次数，弹广告
      GameGlobal.AdManager.showRewardedAd(function() {
        GameGlobal.Game.undo()
        wx.showToast({ title: '撤销成功！感谢观看', icon: 'success', duration: 1200 })
      })
    }
  },

  canMove: function() {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        if (this.grid[r][c] === 0) return true
        if (c < SIZE-1 && this.grid[r][c] === this.grid[r][c+1]) return true
        if (r < SIZE-1 && this.grid[r][c] === this.grid[r+1][c]) return true
      }
    return false
  },

  updateAnimations: function() {
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i]
      // 滑动动画
      if (t.slideProgress < 1) {
        t.slideProgress = Math.min(1, t.slideProgress + 0.18)
      }
      if (t.isNew) {
        t.scale = Math.min(1, t.scale + 0.14)
        if (t.scale >= 1) t.isNew = false
      }
      if (t.isMerged) {
        t.animProgress = (t.animProgress || 0) + 0.14
        t.scale = t.animProgress < 1 ? 1 + Math.sin(t.animProgress * Math.PI) * 0.22 : 1
        if (t.animProgress >= 1) t.isMerged = false
      }
    }
  }
}