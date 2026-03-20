// ================================================
//  sound.js - 音效系统（云存储版）
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

// 云存储 File ID 映射
var CLOUD_FILE_IDS = {
  bgm:   'cloud://cloud1-6gfj19793c24b47c.636c-cloud1-6gfj19793c24b47c-1406406015/audio/bgm.mp3',
  click: 'cloud://cloud1-6gfj19793c24b47c.636c-cloud1-6gfj19793c24b47c-1406406015/audio/click.mp3',
  lose:  'cloud://cloud1-6gfj19793c24b47c.636c-cloud1-6gfj19793c24b47c-1406406015/audio/lose.mp3',
  merge: 'cloud://cloud1-6gfj19793c24b47c.636c-cloud1-6gfj19793c24b47c-1406406015/audio/merge.mp3',
  move:  'cloud://cloud1-6gfj19793c24b47c.636c-cloud1-6gfj19793c24b47c-1406406015/audio/move.mp3',
  win:   'cloud://cloud1-6gfj19793c24b47c.636c-cloud1-6gfj19793c24b47c-1406406015/audio/win.mp3'
}

GameGlobal.Sound = {
  enabled:      true,
  musicEnabled: true,
  _audios:      {},
  _ready:       false,

  init: function() {
    this.enabled      = wx.getStorageSync('soundEnabled')  !== false
    this.musicEnabled = wx.getStorageSync('musicEnabled')  !== false
    this._loadFromCloud()
  },

  _loadFromCloud: function() {
    var self  = this
    var names = Object.keys(CLOUD_FILE_IDS)

    // 批量获取临时URL
    var fileList = names.map(function(n) { return { fileID: CLOUD_FILE_IDS[n] } })
    wx.cloud.getTempFileURL({
      fileList: fileList,
      success: function(res) {
        res.fileList.forEach(function(item, i) {
          if (item.tempFileURL) {
            try {
              var a = wx.createInnerAudioContext()
              a.src  = item.tempFileURL
              a.loop = (names[i] === 'bgm')
              a.obeyMuteSwitch = false
              a.onError(function() {})
              self._audios[names[i]] = a
            } catch(e) {}
          }
        })
        self._ready = true
        // 音频加载完后如果设置了播放bgm则启动
        if (self.musicEnabled) self.playBgm()
      },
      fail: function() {
        // 云存储加载失败，回退到本地文件
        self._loadLocal()
      }
    })
  },

  _loadLocal: function() {
    var self  = this
    var files = ['bgm', 'move', 'merge', 'win', 'lose', 'click']
    files.forEach(function(name) {
      try {
        var a = wx.createInnerAudioContext()
        a.src  = 'audio/' + name + '.mp3'
        a.loop = (name === 'bgm')
        a.obeyMuteSwitch = false
        a.onError(function() {})
        self._audios[name] = a
      } catch(e) {}
    })
    this._ready = true
  },

  play: function(name) {
    if (!this.enabled && name !== 'bgm') return
    if (name === 'bgm' && !this.musicEnabled) return
    var a = this._audios[name]
    if (!a) return
    // 胜利音效：先暂停背景音乐
    if (name === 'win') this.pauseBgm()
    try { if (name !== 'bgm') a.stop(); a.play() } catch(e) {}
  },

  playBgm: function() {
    // 先停止胜利音效（如果正在播放）
    try { if (this._audios.win) this._audios.win.stop() } catch(e) {}
    this.play('bgm')
  },
  pauseBgm: function() {
    try { if (this._audios.bgm) this._audios.bgm.pause() } catch(e) {}
  },

  toggleSound: function() {
    this.enabled = !this.enabled
    wx.setStorageSync('soundEnabled', this.enabled)
    if (this.enabled) this.play('click')
  },

  toggleMusic: function() {
    this.musicEnabled = !this.musicEnabled
    wx.setStorageSync('musicEnabled', this.musicEnabled)
    this.musicEnabled ? this.playBgm() : this.pauseBgm()
  }
}