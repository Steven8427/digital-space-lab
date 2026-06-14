// ================================================
//  shareCard.js - 动态生成分享卡片图
//  用离屏 canvas 画一张带玩家成绩的分享图，
//  导出临时文件路径供 onShareAppMessage / shareAppMessage 使用。
//  生成失败时静默降级（imageUrl 用 ''，微信会自动截图兜底）。
// ================================================

;(function () {
  var CARD_W = 500, CARD_H = 400   // 微信分享图推荐比例 5:4

  // 各游戏主题色（与首页卡片呼应）
  var THEMES = {
    '2048':      { c1: '#e94560', c2: '#f5a623', icon: '🎮', name: '2048' },
    'huarong':   { c1: '#1abc9c', c2: '#3498db', icon: '🧩', name: '华容道' },
    'sudoku':    { c1: '#6c5ce7', c2: '#a29bfe', icon: '🔢', name: '数独' },
    'survival':  { c1: '#e74c3c', c2: '#f39c12', icon: '⚔', name: '生存模式' },
    'tileMatch': { c1: '#2ecc71', c2: '#3498db', icon: '🧊', name: '三消堆叠' },
    'home':      { c1: '#f5a623', c2: '#9b59b6', icon: '🌟', name: '数字空间实验室' }
  }

  function _roundRect(c, x, y, w, h, r) {
    c.beginPath()
    c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r)
    c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r)
    c.arcTo(x, y, x + w, y, r)
    c.closePath()
  }

  var ShareCard = {
    _canvas: null,        // 复用同一个离屏 canvas，避免反复创建
    _cache: {},           // key -> tempFilePath
    _lastLine: {},        // key -> 上次生成用的 scoreLine（变化才重绘）
    _busy: {},            // key -> 正在生成

    // 同步取已生成好的分享图路径（给 onShareAppMessage 用）
    get: function (key) { return this._cache[key] || '' },

    // 生成某游戏的分享图。scoreLine 形如「最高 1234 分」，可为空字符串
    generate: function (key, scoreLine) {
      scoreLine = scoreLine || ''
      var theme = THEMES[key] || THEMES.home
      // 已有且文案没变，跳过
      if (this._cache[key] && this._lastLine[key] === scoreLine) return
      if (this._busy[key]) return
      this._busy[key] = true

      var self = this
      try {
        if (!this._canvas) {
          // 注意：layout.js 已创建主 canvas，这里拿到的是离屏 canvas
          this._canvas = wx.createCanvas()
        }
        var canvas = this._canvas
        canvas.width = CARD_W
        canvas.height = CARD_H
        var c = canvas.getContext('2d')
        this._draw(c, theme, scoreLine)

        canvas.toTempFilePath({
          x: 0, y: 0, width: CARD_W, height: CARD_H,
          destWidth: CARD_W, destHeight: CARD_H,
          fileType: 'jpg', quality: 0.92,
          success: function (res) {
            if (res && res.tempFilePath) {
              self._cache[key] = res.tempFilePath
              self._lastLine[key] = scoreLine
            }
            self._busy[key] = false
          },
          fail: function () { self._busy[key] = false }
        })
      } catch (e) {
        this._busy[key] = false
      }
    },

    _draw: function (c, theme, scoreLine) {
      // 背景渐变
      var bg = c.createLinearGradient(0, 0, CARD_W, CARD_H)
      bg.addColorStop(0, '#1a1a2e'); bg.addColorStop(1, '#16213e')
      c.fillStyle = bg
      c.fillRect(0, 0, CARD_W, CARD_H)

      // 顶部品牌名
      c.textAlign = 'center'; c.textBaseline = 'middle'
      c.font = 'bold 30px sans-serif'
      c.fillStyle = 'rgba(255,255,255,0.85)'
      c.fillText('数字空间实验室', CARD_W / 2, 54)

      // 中部大图标
      c.font = '96px sans-serif'
      c.fillText(theme.icon, CARD_W / 2, 158)

      // 游戏名（渐变字）
      var tg = c.createLinearGradient(CARD_W / 2 - 130, 0, CARD_W / 2 + 130, 0)
      tg.addColorStop(0, theme.c1); tg.addColorStop(1, theme.c2)
      c.font = 'bold 46px sans-serif'
      c.fillStyle = tg
      c.fillText(theme.name, CARD_W / 2, 236)

      // 成绩文案（可选）
      if (scoreLine) {
        c.font = 'bold 28px sans-serif'
        c.fillStyle = '#f5d76e'
        c.fillText(scoreLine, CARD_W / 2, 288)
      }

      // 底部 CTA 胶囊
      var bw = 250, bh = 56, bx = (CARD_W - bw) / 2, by = 318
      var cg = c.createLinearGradient(bx, 0, bx + bw, 0)
      cg.addColorStop(0, theme.c1); cg.addColorStop(1, theme.c2)
      c.fillStyle = cg
      _roundRect(c, bx, by, bw, bh, bh / 2)
      c.fill()
      c.font = 'bold 27px sans-serif'
      c.fillStyle = '#fff'
      c.fillText('👉 点击一起玩', CARD_W / 2, by + bh / 2 + 1)
    }
  }

  GameGlobal.ShareCard = ShareCard
})()
