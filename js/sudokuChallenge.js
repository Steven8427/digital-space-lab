// ================================================
//  sudokuChallenge.js - 数独闯关模式
//  1000关/包，固定种子，禁用提示检查
//  进度：本地缓存 + 云端同步（换手机不丢）
// ================================================

// ── 关卡难度映射（每包1000关）
function _chgDiffForLevel(lvl) {
  var n = ((lvl - 1) % 1000) + 1  // 包内关卡号 1-1000
  if (n <= 200)  return 'easy'
  if (n <= 400)  return 'medium'
  if (n <= 600)  return 'hard'
  if (n <= 800)  return 'expert'
  return 'hell'
}

function _chgDiffName(diff) {
  var m = { easy:'简单', medium:'普通', hard:'困难', expert:'专家', hell:'地狱' }
  return m[diff] || diff
}

// ── 关卡种子（全球统一）
function _chgSeedForLevel(lvl) {
  var pack = Math.ceil(lvl / 1000)
  var n    = ((lvl - 1) % 1000) + 1
  return 'challenge_p' + pack + '_lv' + n
}

// ================================================
//  闯关管理器
// ================================================
GameGlobal.SudokuChallenge = {
  level:     1,     // 当前要挑战的关卡
  totalTime: 0,     // 累计用时（秒）
  playing:   false, // 是否正在游戏中
  _levelStartTime: 0,  // 当前关开始时的累计时间
  _cloudLoaded: false, // 是否已从云端拉取过

  // ── 加载进度（本地优先，后台拉云端）
  loadProgress: function() {
    // 1. 先读本地（瞬间可用）
    this.level     = wx.getStorageSync('sdkChg_level') || 1
    this.totalTime = wx.getStorageSync('sdkChg_time')  || 0

    // 2. 后台从云端拉取，如果云端更高就覆盖本地
    if (!this._cloudLoaded) {
      this._syncFromCloud()
    }
  },

  // ── 从云端同步进度
  _syncFromCloud: function() {
    var self = this
    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'query', type: 'sudoku_challenge', limit: 1 },
      success: function(res) {
        self._cloudLoaded = true
        if (res.result && res.result.success && res.result.myRank) {
          var cloudLevel = (res.result.myRank.score || 0) + 1  // score=已通关数，level=下一关
          var cloudTime  = res.result.myRank.time || 0
          // 云端进度更高 → 覆盖本地
          if (cloudLevel > self.level) {
            self.level     = cloudLevel
            self.totalTime = cloudTime
            // 同步回本地缓存
            wx.setStorageSync('sdkChg_level', self.level)
            wx.setStorageSync('sdkChg_time',  self.totalTime)
            console.log('[闯关] 云端进度更高，已同步: 第' + cloudLevel + '关')
          }
        }
      },
      fail: function() {
        // 网络失败，用本地数据，下次再试
        self._cloudLoaded = false
      }
    })
  },

  // ── 保存进度（本地 + 云端）
  saveProgress: function() {
    // 本地缓存
    wx.setStorageSync('sdkChg_level', this.level)
    wx.setStorageSync('sdkChg_time',  this.totalTime)
    // 云端通过 uploadRank 保存（在 onSolved 中调用）
  },

  // ── 获取当前关卡信息
  getLevelInfo: function(lvl) {
    var l = lvl || this.level
    var pack = Math.ceil(l / 1000)
    var n    = ((l - 1) % 1000) + 1
    var diff = _chgDiffForLevel(l)
    return {
      level:    l,
      pack:     pack,
      inPack:   n,
      diff:     diff,
      diffName: _chgDiffName(diff),
      seed:     _chgSeedForLevel(l)
    }
  },

  // ── 开始关卡
  startLevel: function() {
    this.playing = true
    this._levelStartTime = this.totalTime
    var info = this.getLevelInfo()

    var SDK = GameGlobal.Sudoku
    SDK.difficulty = info.diff
    SDK.solved  = false
    SDK.started = false
    SDK.errors  = 0
    SDK.hints   = 0
    SDK.checks  = 0
    SDK.selR    = -1
    SDK.selC    = -1
    SDK.notesMode = false

    SDK.initWithSeed(info.diff, info.seed)
  },

  // ── 通关处理
  onSolved: function() {
    if (!this.playing) return
    this.playing = false

    var levelTime = GameGlobal.Timer.seconds
    this.totalTime = this._levelStartTime + levelTime

    this.level++
    this.saveProgress()

    // 上传排行榜（= 云端存进度）
    this.uploadRank()
  },

  // ── 上传排行榜（= 云端存进度）
  uploadRank: function() {
    var info     = wx.getStorageSync('userInfo') || {}
    var nickname = info.nickName  || '神秘玩家'
    var avatar   = info.avatarUrl || ''

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: {
        action: 'upload',
        type: 'sudoku_challenge',
        nickname: nickname,
        avatarUrl: avatar,
        score: this.level - 1,   // 已通关数
        time:  this.totalTime    // 累计用时
      },
      fail: function() {}
    })
  },

  // ── 重来本关
  restart: function() {
    this.totalTime = this._levelStartTime
    this.startLevel()
  }
}

// ================================================
//  闯关排行榜
// ================================================
GameGlobal.ChallengeRank = {
  loading: false,
  error:   '',
  list:    [],
  myRank:  null,
  scrollY: 0,

  load: function() {
    this.loading = true
    this.error   = ''
    this.scrollY = 0
    var self = this

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'query', type: 'sudoku_challenge', limit: 100 },
      success: function(res) {
        self.loading = false
        if (res.result && res.result.success) {
          var list = res.result.data || []
          // 按通关数降序，同关卡按用时升序
          list.sort(function(a, b) {
            if (b.score !== a.score) return b.score - a.score
            return a.time - b.time
          })
          self.list = list
          var my = res.result.myRank || null
          if (my) {
            for (var i = 0; i < list.length; i++) {
              if (list[i].openid === my.openid) { my.rank = i + 1; break }
            }
          }
          self.myRank = my
        }
      },
      fail: function() { self.loading = false }
    })
  }
}

// ── 初始化时加载存档
GameGlobal.SudokuChallenge.loadProgress()