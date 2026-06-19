// ================================================
//  gameConfig.js - 游戏参数集中配置 + 共享工具
//  想加新游戏 / 改主题色 / 改存储键 / 改排行榜类型，
//  统一在这里改，其它文件通过 GameGlobal.GAMES[id] 读取。
// ================================================

// ── 1. 每个游戏的参数（集中、可自定义） ──────────────
//   id        游戏标识（也是分享图 / 分享 query 用的 key）
//   name/icon 显示名与图标
//   c1/c2     主题渐变色
//   bestKey   本地最高分存储键（null = 无单一最高分）
//   lbType    云排行榜 type
//   scoreLine 分享图上的成绩文案（传入最高分）
GameGlobal.GAMES = {
  '2048': {
    id: '2048', name: '2048', icon: '🎮',
    c1: '#e94560', c2: '#f5a623',
    bestKey: '2048best', lbType: null,   // 2048 用 score / time 两个榜，见 rank.js
    scoreLine: function (b) { return b > 0 ? '最高 ' + b + ' 分' : '' }
  },
  'huarong': {
    id: 'huarong', name: '华容道', icon: '🧩',
    c1: '#1abc9c', c2: '#3498db',
    bestKey: 'huarongBest', lbType: null,   // 按尺寸：huarong_moves_NxN
    scoreLine: function (b) { return b > 0 ? b + ' 步通关' : '' }
  },
  'sudoku': {
    id: 'sudoku', name: '数独', icon: '🔢',
    c1: '#6c5ce7', c2: '#a29bfe',
    bestKey: 'sudokuBestTime', lbType: null,   // 按难度：sudoku_<diff>
    scoreLine: function (b) { if (b <= 0) return ''; var m = Math.floor(b / 60), s = b % 60; return '最快 ' + m + ':' + (s < 10 ? '0' + s : s) }
  },
  'survival': {
    id: 'survival', name: '生存模式', icon: '⚔',
    c1: '#e74c3c', c2: '#f39c12',
    bestKey: 'survivalBest', lbType: 'survival',
    scoreLine: function (b) { return b > 0 ? '击杀 ' + b : '' }
  },
  'tileMatch': {
    id: 'tileMatch', name: '三消堆叠', icon: '🧊',
    c1: '#2ecc71', c2: '#3498db',
    bestKey: 'tileMatchBest', lbType: 'tile_match',
    scoreLine: function (b) { return b > 0 ? '第 ' + b + ' 关' : '' }
  },
  // 兜底 / 首页分享
  'home': {
    id: 'home', name: '数字空间实验室', icon: '🌟',
    c1: '#f5a623', c2: '#9b59b6',
    bestKey: null, lbType: null,
    scoreLine: function () { return '' }
  }
}

// ── 2. 本地存储读缓存 ────────────────────────────────
//   目的：避免渲染热路径每帧同步 wx.getStorageSync。
//   策略：界面切换时 clear()，界面内全部走内存。最高分只在
//   游戏过程中变化（必然经过切屏），故进入界面重新读一次就不会脏。
GameGlobal.Store = {
  _c: {},
  get: function (key, def) {
    if (!(key in this._c)) {
      var v = wx.getStorageSync(key)
      this._c[key] = (v === '' || v === undefined || v === null) ? def : v
    }
    return this._c[key]
  },
  // 写穿透：写存储同时更新缓存（用于可能在同屏内更新的值）
  set: function (key, val) { this._c[key] = val; try { wx.setStorageSync(key, val) } catch (e) {} },
  refresh: function (key) { delete this._c[key] },
  clear: function () { this._c = {} }
}

// 便捷：按游戏 id 取最高分（走缓存）
GameGlobal.getBest = function (gameId) {
  var g = GameGlobal.GAMES[gameId]
  if (!g || !g.bestKey) return 0
  return GameGlobal.Store.get(g.bestKey, 0) || 0
}

// ── 3. 排行榜统一加载 ────────────────────────────────
//   消除各排行榜模块里重复的 cloud.callFunction 样板。
//   回调 cb(err, data, myRank)；各模块自行排序 / 写自己的状态。
GameGlobal.loadLeaderboard = function (type, cb) {
  wx.cloud.callFunction({
    name: 'leaderboard',
    data: { action: 'query', type: type, limit: 100 },
    success: function (res) {
      if (res.result && res.result.success) cb(null, res.result.data || [], res.result.myRank || null)
      else cb(new Error('加载失败'), [], null)
    },
    fail: function () { cb(new Error('网络错误'), [], null) }
  })
}
