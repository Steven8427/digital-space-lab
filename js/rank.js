// ================================================
//  rank.js - 排行榜模块（前100名 + 自己排名）
// ================================================

var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP, SIZE = GameGlobal.SIZE
var BOARD_W = GameGlobal.BOARD_W, BOARD_H = GameGlobal.BOARD_H
var BOARD_X = GameGlobal.BOARD_X, BOARD_Y = GameGlobal.BOARD_Y
var CELL_SZ = GameGlobal.CELL_SZ, BTN_H = GameGlobal.BTN_H
var TOP_PAD = GameGlobal.TOP_PAD, ROW1_H = GameGlobal.ROW1_H, ROW2_H = GameGlobal.ROW2_H
var C = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg = GameGlobal.drawBg, drawBtn = GameGlobal.drawBtn, inRect = GameGlobal.inRect

GameGlobal.Rank = {
  tab:         'score',
  loading:     false,
  error:       '',
  scoreList:   [],
  timeList:    [],
  myScoreRank: null,
  myTimeRank:  null,
  scrollY:     0,       // 当前滚动偏移（像素）
  backBtn:     null,
  tabScoreBtn: null,
  tabTimeBtn:  null,

  load: function() {
    this.loading = true
    this.error   = ''
    this.scrollY = 0
    var self = this, done = 0
    function onDone() { if (++done === 2) self.loading = false }

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'query', type: 'score', limit: 100 },
      success: function(res) {
        if (res.result && res.result.success) {
          self.scoreList   = res.result.data
          self.myScoreRank = res.result.myRank || null
        } else { self.error = '加载失败' }
        onDone()
      },
      fail: function() { self.error = '网络错误'; onDone() }
    })

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'query', type: 'time', limit: 100 },
      success: function(res) {
        if (res.result && res.result.success) {
          self.timeList   = res.result.data
          self.myTimeRank = res.result.myRank || null
        }
        onDone()
      },
      fail: function() { onDone() }
    })
  },

  upload: function(score, timeSeconds, uploadTime) {
    var info      = wx.getStorageSync('userInfo') || {}
    var nickname  = info.nickName  || '神秘玩家'
    var avatarUrl = info.avatarUrl || ''

    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action:'upload', type:'score', nickname:nickname, avatarUrl:avatarUrl, score:score, time:timeSeconds },
      fail: function() {}
    })

    if (uploadTime) {
      wx.cloud.callFunction({
        name: 'leaderboard',
        data: { action:'upload', type:'time', nickname:nickname, avatarUrl:avatarUrl, score:score, time:timeSeconds },
        fail: function() {}
      })
    }
  }
}

GameGlobal.formatTime = function(seconds) {
  var m = Math.floor(seconds / 60), s = seconds % 60
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0')
}

// ── 触摸滚动支持
var _rankTouchStartY = 0
var _rankScrollStart = 0

GameGlobal.handleRankTouch = function(type, y) {
  if (type === 'start') {
    _rankTouchStartY = y
    _rankScrollStart = GameGlobal.Rank.scrollY
  } else if (type === 'move') {
    var diff = y - _rankTouchStartY
    var Rank = GameGlobal.Rank
    var isScore = Rank.tab === 'score'
    var list = isScore ? Rank.scoreList : Rank.timeList
    var rowH = SH * 0.072
    var maxScroll = Math.max(0, list.length * rowH - SH * 0.52)
    Rank.scrollY = Math.max(0, Math.min(maxScroll, _rankScrollStart - diff))
  }
}

// ---- 排行榜界面绘制 ----
GameGlobal.drawRankScreen = function() {
  drawBg()
  var cx = SW / 2
  var Rank = GameGlobal.Rank
  var isScore = Rank.tab === 'score'
  var list = isScore ? Rank.scoreList : Rank.timeList
  var myRank = isScore ? Rank.myScoreRank : Rank.myTimeRank
  var userInfo = wx.getStorageSync('userInfo') || {}

  // 标题
  setFont(SW * 0.072, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW*0.2, 0, cx + SW*0.2, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(233,69,96,0.3)'; ctx.shadowBlur = 12
  ctx.fillStyle = tg; ctx.fillText('排  行  榜', cx, SH * 0.075)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // Tab
  var tabY = SH * 0.135, tabW = BOARD_W / 2 - GAP / 2, tabH = BTN_H * 0.8
  var tab1X = BOARD_X, tab2X = BOARD_X + tabW + GAP
  roundRect(tab1X, tabY, tabW, tabH, 12,  isScore ? C.accent : C.surface,  isScore ? null : 'rgba(255,255,255,0.08)')
  roundRect(tab2X, tabY, tabW, tabH, 12, !isScore ? C.accent : C.surface, !isScore ? null : 'rgba(255,255,255,0.08)')
  setFont(tabH * 0.36, '800')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle =  isScore ? '#fff' : C.textDim; ctx.fillText('最高分榜',  tab1X + tabW/2, tabY + tabH/2)
  ctx.fillStyle = !isScore ? '#fff' : C.textDim; ctx.fillText('最速通关榜', tab2X + tabW/2, tabY + tabH/2)
  Rank.tabScoreBtn = { x: tab1X, y: tabY, w: tabW, h: tabH }
  Rank.tabTimeBtn  = { x: tab2X, y: tabY, w: tabW, h: tabH }

  // 我的排名条（始终显示在列表上方）
  var myBarY = tabY + tabH + GAP
  var myBarH = SH * 0.065
  if (myRank) {
    // 高亮自己
    var myGrad = ctx.createLinearGradient(BOARD_X, 0, BOARD_X+BOARD_W, 0)
    myGrad.addColorStop(0, 'rgba(245,166,35,0.25)')
    myGrad.addColorStop(1, 'rgba(233,69,96,0.15)')
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, myGrad, 'rgba(245,166,35,0.5)')
    setFont(myBarH*0.38, '900')
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f5a623'
    ctx.fillText('我  #' + myRank.rank, BOARD_X + PAD, myBarY + myBarH/2)
    var myVal = isScore ? String(myRank.score) + ' 分' : GameGlobal.formatTime(myRank.time)
    setFont(myBarH*0.38, '900')
    ctx.textAlign = 'right'; ctx.fillStyle = '#f5a623'
    ctx.fillText(myVal, BOARD_X + BOARD_W - PAD, myBarY + myBarH/2)
    if (myRank.rank > 100) {
      setFont(myBarH*0.28, '600'); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText('（未进入前100名榜单）', cx, myBarY + myBarH*0.78)
    }
  } else {
    roundRect(BOARD_X, myBarY, BOARD_W, myBarH, 10, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)')
    setFont(myBarH*0.34, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textDim; ctx.fillText('完成一局游戏即可上榜', cx, myBarY + myBarH/2)
  }

  // 列表区域
  var listY  = myBarY + myBarH + GAP
  var listH  = SH * 0.62 - myBarH - GAP
  roundRect(BOARD_X, listY, BOARD_W, listH, 14, C.surface, 'rgba(255,255,255,0.05)')

  if (Rank.loading) {
    setFont(SW * 0.04, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('加载中...', cx, listY + listH/2)
  } else if (Rank.error) {
    setFont(SW * 0.04, '700'); ctx.fillStyle = C.accent; ctx.textAlign = 'center'
    ctx.fillText(Rank.error, cx, listY + listH/2)
  } else if (!list.length) {
    setFont(SW * 0.038, '700'); ctx.fillStyle = C.textDim; ctx.textAlign = 'center'
    ctx.fillText('暂无数据，快来上榜！', cx, listY + listH/2)
  } else {
    // 裁剪列表区域
    ctx.save()
    ctx.beginPath()
    ctx.rect(BOARD_X, listY, BOARD_W, listH)
    ctx.clip()

    var rowH = listH / 8
    var rowPad = PAD * 0.8
    var rankColors = ['#f5a623', '#d4d4d4', '#e8935a']
    var myOpenid = myRank ? myRank.openid : null

    for (var i = 0; i < Math.min(list.length, 100); i++) {
      var item = list[i]
      var ry   = listY + i * rowH - Rank.scrollY
      if (ry + rowH < listY || ry > listY + listH) continue  // 不在视口跳过
      var rcy  = ry + rowH / 2

      // 自己高亮背景
      var isMine = myRank && item.openid && item.openid === myOpenid
      if (isMine) {
        roundRect(BOARD_X + 2, ry, BOARD_W - 4, rowH, 0, 'rgba(245,166,35,0.18)')
      } else if (i % 2 === 0) {
        roundRect(BOARD_X + 2, ry, BOARD_W - 4, rowH, i === 0 ? 12 : 0, 'rgba(255,255,255,0.03)')
      }

      // 排名数字
      var rankColor = i < 3 ? rankColors[i] : (isMine ? '#f5a623' : C.textDim)
      setFont(rowH * 0.38, '900')
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillStyle = rankColor
      ctx.fillText(String(i + 1), BOARD_X + rowPad, rcy)

      // 头像圆（双位数排名往右移）
      var rankW = (i >= 9) ? rowH * 0.72 : rowH * 0.58
      var avatarR = rowH * 0.28, avatarX = BOARD_X + rowPad + rankW
      ctx.beginPath(); ctx.arc(avatarX, rcy, avatarR, 0, Math.PI*2)
      ctx.fillStyle = isMine ? 'rgba(245,166,35,0.25)' : 'rgba(255,255,255,0.08)'; ctx.fill()
      // 尝试显示头像图片
      var avImg = item.avatarUrl && GameGlobal._avatarImgCache && GameGlobal._avatarImgCache[item.avatarUrl]
      if (avImg && avImg !== 'loading') {
        ctx.save()
        ctx.beginPath(); ctx.arc(avatarX, rcy, avatarR, 0, Math.PI*2); ctx.clip()
        ctx.drawImage(avImg, avatarX-avatarR, rcy-avatarR, avatarR*2, avatarR*2)
        ctx.restore()
      } else {
        // 异步加载头像
        if (item.avatarUrl && (!GameGlobal._avatarImgCache || !GameGlobal._avatarImgCache[item.avatarUrl])) {
          GameGlobal._loadHomeAvatar(item.avatarUrl)
        }
        setFont(avatarR * 0.9, '700')
        ctx.textAlign = 'center'
        ctx.fillStyle = isMine ? '#f5a623' : C.textDim
        ctx.fillText((item.nickname || '?')[0], avatarX, rcy)
      }

      // 昵称
      setFont(rowH * (isMine ? 0.32 : 0.28), isMine ? '900' : '700')
      ctx.textAlign = 'left'
      ctx.fillStyle = isMine ? '#fff' : C.textLight
      var name = item.nickname || '神秘玩家'
      if (name.length > 6) name = name.slice(0, 6) + '..'
      if (isMine) name = name + ' ★'
      ctx.fillText(name, avatarX + avatarR + rowPad * 0.4, rcy)

      // 分数/时间
      var valStr = isScore ? String(item.score) + ' 分' : GameGlobal.formatTime(item.time)
      setFont(rowH * (isMine ? 0.38 : 0.34), isMine ? '900' : '700')
      ctx.textAlign = 'right'
      ctx.fillStyle = isMine ? '#f5a623' : C.accent2
      ctx.fillText(valStr, BOARD_X + BOARD_W - rowPad, rcy)
    }

    ctx.restore()

    // 滚动条
    if (list.length > 8) {
      var scrollBarH = listH * (8 / list.length)
      var scrollBarY = listY + (Rank.scrollY / (list.length * rowH - listH)) * (listH - scrollBarH)
      roundRect(BOARD_X + BOARD_W - 4, scrollBarY, 3, scrollBarH, 2, 'rgba(255,255,255,0.25)')
    }
  }

  // 返回按钮
  var backY = listY + listH + GAP * 1.5
  drawBtn(BOARD_X, backY, BOARD_W, BTN_H, '← 返回大厅', C.surface, C.textLight)
  Rank.backBtn = { x: BOARD_X, y: backY, w: BOARD_W, h: BTN_H }
}