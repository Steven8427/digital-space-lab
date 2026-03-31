// ================================================
//  tileMatchLogic.js — 三消堆叠（类羊了个羊）
//  点击自由方块 → 进入槽位 → 三个一样消除
//  道具：撤回 / 移出3个 / 打乱
// ================================================

var SW = GameGlobal.SW, SH = GameGlobal.SH

// ── 图标池（12种）- 保留emoji作为fallback
var TILE_ICONS = ['🌸','🏀','💎','👑','⭐','🎲','🎈','🍎','🔔','☘','🪙','🍇']

// ── 云存储图片加载
var _CLOUD_BASE = 'cloud://cloud1-6gfj19793c24b47c.636c-cloud1-6gfj19793c24b47c-1406406015/tileMatch/picture/'
var _IMG_FILES = [
  'icon_0.png', 'icon_1.png', 'icon_2.png', 'icon_3.png',
  'icon_4.png', 'icon_5.png', 'icon_6.png', 'icon_7.png',
  'icon_8.png', 'icon_9.png', 'icon_10.png', 'icon_11.png'
]
var _CARD_FILES = [
  'card_0.png', 'card_1.png'
]

// 图片缓存
var _tileImgs = {}   // { url: Image | 'loading' }

function _loadTileImg(fileID, key) {
  if (_tileImgs[key]) return
  _tileImgs[key] = 'loading'
  console.log('[tileMatch] 加载图片:', key, fileID)
  wx.cloud.getTempFileURL({
    fileList: [{ fileID: fileID }],
    success: function(res) {
      var url = res.fileList[0] && res.fileList[0].tempFileURL
      if (!url) { console.warn('[tileMatch] 无URL:', key); _tileImgs[key] = null; return }
      var img = wx.createImage()
      img.onload = function() { _tileImgs[key] = img; console.log('[tileMatch] 图片就绪:', key) }
      img.onerror = function() { console.warn('[tileMatch] 加载失败:', key); _tileImgs[key] = null }
      img.src = url
    },
    fail: function(err) { console.error('[tileMatch] getTempFileURL失败:', key, err); _tileImgs[key] = null }
  })
}

// 预加载所有图片
function _preloadTileImages() {
  for (var i = 0; i < _IMG_FILES.length; i++) {
    _loadTileImg(_CLOUD_BASE + _IMG_FILES[i], 'icon_' + i)
  }
  for (var i = 0; i < _CARD_FILES.length; i++) {
    _loadTileImg(_CLOUD_BASE + _CARD_FILES[i], 'card_' + i)
  }
}
_preloadTileImages()

// ============================================================
//  关卡布局（Tile Match 风格）
//  - 形状模板定义每层哪些格子有方块
//  - 底层比顶层多1行1列，边缘露出立体感
//  - 奇数层偏移半格
//  - 总数保证是3的倍数
// ============================================================

// 预定义形状模板（1=有方块，0=空）
var SHAPES = {
  // 矩形
  rect: function(rows, cols) {
    var g = []
    for (var r = 0; r < rows; r++) {
      var row = []
      for (var c = 0; c < cols; c++) row.push(1)
      g.push(row)
    }
    return g
  },
  // 菱形
  diamond: function(size) {
    var g = [], n = size * 2 - 1
    for (var r = 0; r < n; r++) {
      var row = [], mid = Math.abs(r - (size - 1))
      for (var c = 0; c < n; c++) {
        var dc = Math.abs(c - (size - 1))
        row.push((mid + dc) < size ? 1 : 0)
      }
      g.push(row)
    }
    return g
  },
  // 倒三角
  invTriangle: function(cols, rows) {
    var g = []
    for (var r = 0; r < rows; r++) {
      var row = [], skip = r
      for (var c = 0; c < cols; c++) {
        row.push(c >= skip && c < cols - skip ? 1 : 0)
      }
      g.push(row)
    }
    return g
  },
  // 心形
  heart: function() {
    return [
      [0,1,1,0,1,1,0],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],
      [0,0,1,1,1,0,0],
      [0,0,0,1,0,0,0]
    ]
  },
  // 十字
  cross: function() {
    return [
      [0,1,1,0],
      [1,1,1,1],
      [1,1,1,1],
      [0,1,1,0]
    ]
  }
}

// 获取某个关卡的形状和参数
function _getLevelConfig(level) {
  var scale = Math.floor(level / 10)

  // 基础行列数随关卡增加
  var baseRows = Math.min(7, 3 + Math.floor(level / 6) + scale)
  var baseCols = Math.min(8, 4 + Math.floor(level / 5) + scale)

  // 形状按难度阶段循环，每个阶段内有变化
  var phase = level % 12
  var shape

  if (phase === 0)       shape = SHAPES.rect(Math.min(5, 3 + scale), Math.min(6, 4 + scale))         // 小矩形入门
  else if (phase === 1)  shape = SHAPES.diamond(Math.min(4, 2 + scale))                               // 菱形
  else if (phase === 2)  shape = SHAPES.rect(Math.min(6, 4 + scale), Math.min(7, 5 + scale))         // 大矩形
  else if (phase === 3)  shape = SHAPES.cross()                                                        // 十字
  else if (phase === 4)  shape = SHAPES.invTriangle(Math.min(7, 5 + scale), Math.min(6, 4 + scale))  // 倒三角
  else if (phase === 5)  shape = SHAPES.heart()                                                        // 心形
  else if (phase === 6)  shape = SHAPES.diamond(Math.min(5, 3 + scale))                               // 大菱形
  else if (phase === 7)  shape = SHAPES.rect(baseRows, baseCols)                                       // 满矩形
  else if (phase === 8)  shape = SHAPES.invTriangle(baseCols, baseRows)                                // 满倒三角
  else if (phase === 9)  shape = SHAPES.cross()                                                        // 十字变体
  else if (phase === 10) shape = SHAPES.heart()                                                        // 心形
  else                   shape = SHAPES.diamond(Math.min(5, 3 + scale))                               // 大菱形

  return shape
}

function _genLayout(level) {
  // 图标种类：前几关少（容易配对），后面多（更难）
  var typeCnt = Math.min(12, 4 + Math.floor(level / 3))
  // 层数：渐进增加，更早出现3层
  var layers = Math.min(4, 2 + Math.floor(level / 6))

  // 顶层形状
  var topShape = _getLevelConfig(level)
  var shapeRows = topShape.length
  var shapeCols = topShape[0].length

  // 底层比顶层多1行1列（每一层都多一圈）
  var maxRows = shapeRows + (layers - 1)
  var maxCols = shapeCols + (layers - 1)

  // 可用区域
  var areaTop = SH * 0.16, areaBot = SH * 0.75
  var areaH = areaBot - areaTop
  var areaW = SW * 0.96
  var cx = SW * 0.5

  // 计算方块大小
  var needW = maxCols + 0.2
  var needH = maxRows + 0.2
  var tileW = Math.min(areaW / needW, areaH / needH, SW * 0.20)
  tileW = Math.max(SW * 0.10, tileW)
  var tileH = tileW
  var sp = tileW * 1.06  // 方块间距稍大于方块尺寸，留出呼吸感

  var tiles = [], id = 0

  for (var L = 0; L < layers; L++) {
    // 当前层的行列数：底层最大，顶层=形状大小
    var lRows = shapeRows + (layers - 1 - L)
    var lCols = shapeCols + (layers - 1 - L)

    // 每层向右下偏移几像素（仅视觉深度效果，不是半格）
    var depthOff = sp * 0.06
    var offX = L * depthOff
    var offY = L * depthOff

    // 居中对齐
    var layerW = lCols * sp
    var layerH = lRows * sp
    var ox = cx - layerW / 2 + offX
    var oy = areaTop + (areaH - layerH) / 2 + offY

    // 顶层：使用形状模板
    // 非顶层：填满矩形（底层露出边缘）
    var isTopLayer = (L === layers - 1)

    for (var r = 0; r < lRows; r++) {
      for (var c = 0; c < lCols; c++) {
        if (isTopLayer) {
          // 顶层按形状放置
          if (r >= topShape.length || c >= topShape[0].length || !topShape[r][c]) continue
        }
        tiles.push({
          id: id++, layer: L, w: tileW, h: tileH, type: -1, removed: false,
          x: ox + c * sp,
          y: oy + r * sp
        })
      }
    }
  }

  // 确保总数是3的倍数
  while (tiles.length % 3 !== 0) {
    var maxL = 0
    for (var i = 0; i < tiles.length; i++) if (tiles[i].layer > maxL) maxL = tiles[i].layer
    var topT = []
    for (var i = 0; i < tiles.length; i++) if (tiles[i].layer === maxL) topT.push(i)
    if (topT.length > 0) tiles.splice(topT[topT.length - 1], 1)
    else break
  }

  // 分配类型（3个一组）
  var types = []
  for (var s = 0; s < Math.ceil(tiles.length / 3); s++) {
    var t = s % typeCnt
    types.push(t, t, t)
  }
  types = types.slice(0, tiles.length)
  for (var i = types.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var tmp = types[i]; types[i] = types[j]; types[j] = tmp
  }
  for (var i = 0; i < tiles.length; i++) {
    tiles[i].type = types[i]
    tiles[i].id = i
  }

  return { tiles: tiles, tileW: tileW, tileH: tileH, typeCnt: typeCnt }
}

// ============================================================
//  判断方块是否自由（羊了个羊规则）
//  只要有任何更高层的方块与之有重叠（哪怕1像素），就算被压
// ============================================================
function _isFree(tile, allTiles) {
  if (tile.removed) return false
  for (var i = 0; i < allTiles.length; i++) {
    var t = allTiles[i]
    if (t.removed || t.id === tile.id) continue
    if (t.layer <= tile.layer) continue
    // 严格重叠判断：任何重叠都算被压
    if (t.x < tile.x + tile.w && t.x + t.w > tile.x &&
        t.y < tile.y + tile.h && t.y + t.h > tile.y) {
      return false
    }
  }
  return true
}

// ================================================
GameGlobal.TileMatch = {
  level: 1,
  tiles: [],
  tray: [],         // 槽位（最多7个）
  trayMax: 7,
  tileW: 0, tileH: 0,
  typeCnt: 0,
  gameOver: false,
  victory: false,
  score: 0,          // 消除的总数
  combo: 0,

  // 道具
  props: { undo: 1, moveOut: 1, shuffle: 1 },
  _history: [],      // 撤回历史

  // 动画
  _anims: [],        // { tile, fromX, fromY, toX, toY, t, dur }
  _elimAnims: [],    // { tiles, t }

  init: function(level) {
    this.level = level || 1
    this.tray = []
    this.gameOver = false
    this.victory = false
    this.score = 0
    this.combo = 0
    this._history = []
    this._anims = []
    this._elimAnims = []
    this.holdArea = []

    // 每3关重置道具为1次免费
    this.props = { undo: 1, moveOut: 1, shuffle: 1 }

    var layout = _genLayout(this.level)
    this.tiles = layout.tiles
    this.tileW = layout.tileW
    this.tileH = layout.tileH
    this.typeCnt = layout.typeCnt
  },

  // ── 点击方块
  tapTile: function(x, y) {
    if (this.gameOver || this.victory) return

    // 找点击位置最高层的自由方块
    var hit = null
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i]
      if (t.removed) continue
      if (x < t.x || x > t.x + t.w || y < t.y || y > t.y + t.h) continue
      if (!_isFree(t, this.tiles)) continue
      if (!hit || t.layer > hit.layer || (t.layer === hit.layer && t.id > hit.id)) {
        hit = t
      }
    }
    if (!hit) return

    // 记录撤回历史
    this._history.push({ tileId: hit.id, type: hit.type })

    // 移入槽位（带飞行动画）
    hit.removed = true
    hit._pickTime = Date.now()
    hit._flyFrom = { x: hit.x, y: hit.y }  // 起飞位置
    this.tray.push({ type: hit.type, tileId: hit.id })
    GameGlobal.Sound.play('click')

    // 排序槽位（相同类型放一起）
    this._sortTray()

    // 检查三消
    this._checkEliminate()

    // 检查游戏结束
    if (this.tray.length >= this.trayMax) {
      this.gameOver = true
      GameGlobal.Sound.play('lose')
      this._saveResult()
    }
  },

  _sortTray: function() {
    // 把新加入的方块插到同类型旁边（不完全排序，保持其他位置不变）
    if (this.tray.length <= 1) return
    var last = this.tray[this.tray.length - 1]
    // 找同类型的位置
    for (var i = 0; i < this.tray.length - 1; i++) {
      if (this.tray[i].type === last.type) {
        // 插到同类型后面
        this.tray.splice(this.tray.length - 1, 1)
        this.tray.splice(i + 1, 0, last)
        return
      }
    }
  },

  _checkEliminate: function() {
    // 找3个相同的
    var counts = {}
    for (var i = 0; i < this.tray.length; i++) {
      var t = this.tray[i].type
      counts[t] = (counts[t] || 0) + 1
    }

    var eliminated = false
    for (var type in counts) {
      if (counts[type] >= 3) {
        // 记录消除的槽位索引（用于动画）
        var elimIndices = []
        var removed = 0
        for (var i = this.tray.length - 1; i >= 0; i--) {
          if (this.tray[i].type == type && removed < 3) {
            elimIndices.push(i)
            removed++
          }
        }
        // 记录消除动画数据
        this._elimAnim = {
          time: Date.now(),
          type: parseInt(type),
          positions: elimIndices.slice()
        }
        // 移除
        elimIndices.sort(function(a,b){ return b-a })
        for (var ei = 0; ei < elimIndices.length; ei++) {
          this.tray.splice(elimIndices[ei], 1)
        }
        this.score += 3
        this.combo++
        eliminated = true
        this._elimFlash = Date.now()
        GameGlobal.Sound.play('merge')
        break
      }
    }

    if (eliminated) {
      // 可能连消
      var self = this
      setTimeout(function() { self._checkEliminate() }, 200)
    }

    // 检查是否全部消除（棋盘+槽位+暂存区都为空）
    var remaining = 0
    for (var i = 0; i < this.tiles.length; i++) {
      if (!this.tiles[i].removed) remaining++
    }
    if (remaining === 0 && this.tray.length === 0 && this.holdArea.length === 0) {
      this.victory = true
      GameGlobal.Sound.play('win')
      this._saveResult()
    }
  },

  // ── 道具：撤回
  propUndo: function() {
    if (this._history.length === 0) return false
    if (this.props.undo <= 0) {
      // 看广告
      var self = this
      GameGlobal.AdManager.showRewardedAd(function() {
        self._doUndo()
      })
      return false
    }
    this.props.undo--
    return this._doUndo()
  },

  _doUndo: function() {
    if (this._history.length === 0) return false
    var last = this._history.pop()
    // 从槽位移除
    for (var i = this.tray.length - 1; i >= 0; i--) {
      if (this.tray[i].tileId === last.tileId) {
        this.tray.splice(i, 1); break
      }
    }
    // 恢复方块
    for (var i = 0; i < this.tiles.length; i++) {
      if (this.tiles[i].id === last.tileId) {
        this.tiles[i].removed = false; break
      }
    }
    this.gameOver = false
    GameGlobal.Sound.play('click')
    return true
  },

  // ── 道具：移出3个（从槽位移到暂存区，最多叠3层=9个）
  holdArea: [],   // 暂存区
  propMoveOut: function() {
    if (this.tray.length === 0) return false
    if (this.holdArea.length >= 9) { wx.showToast({title:'暂存区已满(最多3层)',icon:'none'}); return false }
    if (this.props.moveOut <= 0) {
      var self = this
      GameGlobal.AdManager.showRewardedAd(function() { self._doMoveOut() })
      return false
    }
    this.props.moveOut--
    return this._doMoveOut()
  },

  _doMoveOut: function() {
    var count = Math.min(3, this.tray.length)
    for (var i = 0; i < count; i++) {
      this.holdArea.push(this.tray.shift())
    }
    this.gameOver = false
    GameGlobal.Sound.play('click')
    return true
  },

  // ── 道具：打乱（重新分配所有未消除方块的类型）
  propShuffle: function() {
    if (this.props.shuffle <= 0) {
      var self = this
      GameGlobal.AdManager.showRewardedAd(function() { self._doShuffle() })
      return false
    }
    this.props.shuffle--
    return this._doShuffle()
  },

  _doShuffle: function() {
    var active = []
    for (var i = 0; i < this.tiles.length; i++) {
      if (!this.tiles[i].removed) active.push(i)
    }
    // 收集所有类型
    var types = []
    for (var i = 0; i < active.length; i++) {
      types.push(this.tiles[active[i]].type)
    }
    // 打乱
    for (var i = types.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1))
      var tmp = types[i]; types[i] = types[j]; types[j] = tmp
    }
    // 重新分配
    for (var i = 0; i < active.length; i++) {
      this.tiles[active[i]].type = types[i]
    }
    GameGlobal.Sound.play('click')
    return true
  },

  // ── 保存结果
  _saveResult: function() {
    if (this.victory) {
      var best = wx.getStorageSync('tileMatchBest') || 0
      if (this.level > best) wx.setStorageSync('tileMatchBest', this.level)
      // 成就
      if (GameGlobal.AchieveShop) {
        GameGlobal.AchieveShop.addCoins(15)
      }
    }
    // 排行榜
    var info = wx.getStorageSync('userInfo') || {}
    var best = wx.getStorageSync('tileMatchBest') || 0
    wx.cloud.callFunction({
      name: 'leaderboard',
      data: {
        action: 'upload', type: 'tile_match',
        nickname: info.nickName || '神秘玩家',
        avatarUrl: info.avatarUrl || '',
        score: best, time: 0
      },
      fail: function() {}
    })
  },

  // ── 点击暂存区方块 → 放回槽位
  tapHoldArea: function(idx) {
    if (idx < 0 || idx >= this.holdArea.length) return
    if (this.tray.length >= this.trayMax) {
      wx.showToast({ title: '槽位已满', icon: 'none' }); return
    }
    var item = this.holdArea.splice(idx, 1)[0]
    this.tray.push(item)
    this._sortTray()
    this._checkEliminate()
    if (this.tray.length >= this.trayMax) {
      this.gameOver = true
      GameGlobal.Sound.play('lose')
      this._saveResult()
    }
    GameGlobal.Sound.play('click')
  },

  // ── 判断方块是否自由
  isFree: _isFree,
  TILE_ICONS: TILE_ICONS,
  // 图片访问
  getIconImg: function(typeIdx) {
    var k = 'icon_' + (typeIdx % 12)
    var img = _tileImgs[k]
    return (img && img !== 'loading') ? img : null
  },
  getCardImg: function(free) {
    var k = free ? 'card_0' : 'card_1'
    var img = _tileImgs[k]
    return (img && img !== 'loading') ? img : null
  }
}