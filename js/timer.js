// ================================================
//  timer.js - 计时器
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


GameGlobal.Timer = {
  seconds:   0,
  running:   false,
  _interval: null,

  start: function() {
    if (this.running) return
    this.running   = true
    var self       = this
    this._interval = setInterval(function() { if (self.running) self.seconds++ }, 1000)
  },

  stop: function() {
    this.running = false
    if (this._interval) { clearInterval(this._interval); this._interval = null }
  },

  reset: function() { this.stop(); this.seconds = 0 },

  resume: function() { if (!this.running) this.start() },

  format: function() {
    var m = Math.floor(this.seconds / 60)
    var s = this.seconds % 60
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0')
  }
}