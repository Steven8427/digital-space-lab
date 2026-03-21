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

// ── 关卡布局：对称金字塔/菱形
function _genLayout(level) {
  var layers = Math.min(8, 2 + Math.floor(level / 4))
  var typeCnt = Math.min(12, 8 + Math.floor(level / 10))
  var setsPerType = Math.min(8, 1 + Math.floor(level / 5))
  var totalTiles = typeCnt * setsPerType * 3

  var tiles = [], id = 0

  var cx = SW * 0.5

  var templates = _makeTemplates(layers, totalTiles, level)

  // 计算需要的行列数
  var maxRows = 0, maxCols = 0
  for (var L2 = 0; L2 < templates.length; L2++) {
    if (templates[L2].length > maxRows) maxRows = templates[L2].length
    if (templates[L2][0] && templates[L2][0].length > maxCols) maxCols = templates[L2][0].length
  }

  // 可用区域：顶栏下方 到 槽位上方
  var areaTop = SH * 0.12, areaBot = SH * 0.72
  var areaH = areaBot - areaTop
  var areaW = SW * 0.96

  // 根据可用空间反算方块大小（确保不超出）
  // +0.5 给层偏移留余量（半格偏移）
  var needH = maxRows + 0.5
  var needW = maxCols + 0.5
  var fitByH = areaH / needH
  var fitByW = areaW / needW
  var tileW = Math.min(fitByH, fitByW, SW * 0.22)
  tileW = Math.max(SW * 0.12, tileW)
  var tileH = tileW
  var sp = tileW  // 间距=方块大小（紧密排列）

  // 棋盘居中
  var boardH = maxRows * sp + sp * 0.5  // +半格偏移
  var topY = areaTop + Math.max(0, (areaH - boardH) / 2)

  var screenL = (SW - areaW) / 2   // 左边界
  var screenR = screenL + areaW    // 右边界
  var screenB = areaBot            // 下边界

  for (var L = 0; L < templates.length; L++) {
    var tmpl = templates[L]
    var rows = tmpl.length, cols = tmpl[0].length
    var layerW = cols * sp
    // 每层偏移半格（相对上一层），交替方向
    var offX = (L % 2) * sp * 0.5
    var offY = (L % 2) * sp * 0.5
    var ox = cx - layerW / 2 + offX
    var oy = topY + offY
    // 边界钳制：确保这一层不超出可用区域
    if (ox < screenL) ox = screenL
    if (ox + layerW > screenR) ox = screenR - layerW

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (!tmpl[r][c]) continue
        tiles.push({
          id: id++, layer: L, w: tileW, h: tileH, type: -1, removed: false,
          x: ox + c * sp,
          y: oy + r * sp
        })
      }
    }
  }

  // 裁剪/补充到 totalTiles
  while (tiles.length > totalTiles) tiles.splice(Math.floor(Math.random() * tiles.length), 1)
  while (tiles.length < totalTiles) {
    var rt = tiles[Math.floor(Math.random() * tiles.length)]
    var nx = rt.x + (rt.layer % 2 ? sp * 0.5 : 0)
    var ny = rt.y + (rt.layer % 2 ? sp * 0.45 : 0)
    // 钳制在屏幕内
    if (nx + tileW > screenR) nx = screenR - tileW
    if (nx < screenL) nx = screenL
    if (ny + tileH > screenB) ny = screenB - tileH
    if (ny < areaTop) ny = areaTop
    tiles.push({ id: id++, layer: rt.layer, w: tileW, h: tileH, type: -1, removed: false,
      x: nx, y: ny })
  }

  // 分配类型
  var types = []
  for (var t = 0; t < typeCnt; t++) for (var s = 0; s < setsPerType; s++) types.push(t, t, t)
  for (var i = types.length-1; i > 0; i--) { var j = Math.floor(Math.random()*(i+1)); var tmp=types[i]; types[i]=types[j]; types[j]=tmp }
  for (var i = 0; i < tiles.length; i++) tiles[i].type = types[i % types.length]
  for (var i = 0; i < tiles.length; i++) tiles[i].id = i

  return { tiles: tiles, tileW: tileW, tileH: tileH, typeCnt: typeCnt }
}

// ── 生成对称模板
function _makeTemplates(layers, total, level) {
  var templates = []
  var tilesPlaced = 0

  for (var L = 0; L < layers; L++) {
    // 底层最大，上层逐渐缩小
    var maxCols = Math.max(2, Math.min(7, Math.ceil(Math.sqrt(total / layers * 1.5)) - Math.floor(L * 0.5)))
    var maxRows = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(total / layers * 0.8)) - Math.floor(L * 0.4)))

    // 生成对称的菱形/金字塔形状
    var grid = []
    var centerR = (maxRows - 1) / 2
    var centerC = (maxCols - 1) / 2

    for (var r = 0; r < maxRows; r++) {
      var row = []
      for (var c = 0; c < maxCols; c++) {
        // 到中心的距离（曼哈顿）
        var distR = Math.abs(r - centerR) / Math.max(1, centerR)
        var distC = Math.abs(c - centerC) / Math.max(1, centerC)
        var dist = (distR + distC) / 2

        // 菱形：距离越远越可能为空
        // 底层填充率高，上层填充率低
        var fillRate = L === 0 ? 0.85 : 0.75 - L * 0.03
        var keep = dist < fillRate

        // 对称性：如果左边有，右边镜像也有
        row.push(keep ? 1 : 0)
      }
      // 强制左右对称
      for (var c = 0; c < Math.floor(maxCols / 2); c++) {
        var mirror = maxCols - 1 - c
        if (row[c] || row[mirror]) { row[c] = 1; row[mirror] = 1 }
      }
      grid.push(row)
    }

    // 强制上下对称
    for (var r = 0; r < Math.floor(maxRows / 2); r++) {
      var mr = maxRows - 1 - r
      for (var c = 0; c < maxCols; c++) {
        if (grid[r][c] || grid[mr][c]) { grid[r][c] = 1; grid[mr][c] = 1 }
      }
    }

    templates.push(grid)
  }

  return templates
}

// ── 判断方块是否自由（没有被上层覆盖）
// ── 判断方块是否自由
function _isFree(tile, allTiles) {
  if (tile.removed) return false
  for (var i = 0; i < allTiles.length; i++) {
    var t = allTiles[i]
    if (t.removed || t.id === tile.id) continue
    // 只有更高层的方块才算遮挡，同层方块不互相遮挡
    if (t.layer <= tile.layer) continue
    // 检测重叠（重叠面积超过方块面积5%才算被盖住）
    var overlapX = Math.min(t.x + t.w, tile.x + tile.w) - Math.max(t.x, tile.x)
    var overlapY = Math.min(t.y + t.h, tile.y + tile.h) - Math.max(t.y, tile.y)
    if (overlapX > 0 && overlapY > 0) {
      var overlapArea = overlapX * overlapY
      var tileArea = tile.w * tile.h
      if (overlapArea > tileArea * 0.05) return false
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

    // 找到点击位置所有方块，取最高层的
    var candidates = []
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i]
      if (t.removed) continue
      if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) {
        candidates.push(t)
      }
    }
    if (candidates.length === 0) return

    // 按层从高到低排序
    candidates.sort(function(a, b) { return b.layer - a.layer })
    
    // 取最高层的那个，且必须是自由的
    var hit = null
    for (var i = 0; i < candidates.length; i++) {
      if (_isFree(candidates[i], this.tiles)) {
        hit = candidates[i]; break
      }
    }
    if (!hit) return

    // 记录撤回历史
    this._history.push({ tileId: hit.id, type: hit.type })

    // 移入槽位
    hit.removed = true
    hit._pickTime = Date.now()  // 动画时间戳
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
        // 移除3个
        var removed = 0
        for (var i = this.tray.length - 1; i >= 0; i--) {
          if (this.tray[i].type == type && removed < 3) {
            this.tray.splice(i, 1)
            removed++
          }
        }
        this.score += 3
        this.combo++
        eliminated = true
        this._elimFlash = Date.now()  // 消除闪光
        GameGlobal.Sound.play('merge')
        break  // 一次只消一组
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

  // ── 道具：移出3个（从槽位移到暂存区，暂存区最多3个）
  holdArea: [],   // 暂存区
  propMoveOut: function() {
    if (this.tray.length === 0) return false
    if (this.holdArea.length >= 3) { wx.showToast({title:'暂存区已满',icon:'none'}); return false }
    if (this.props.moveOut <= 0) {
      var self = this
      GameGlobal.AdManager.showRewardedAd(function() { self._doMoveOut() })
      return false
    }
    this.props.moveOut--
    return this._doMoveOut()
  },

  _doMoveOut: function() {
    var count = Math.min(3, this.tray.length, 3 - this.holdArea.length)
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