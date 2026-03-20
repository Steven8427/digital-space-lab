// ================================================
//  layout.js - 画布、布局常量、颜色、绘图工具
//  所有变量挂到 GameGlobal，跨文件共享
// ================================================

var canvas = wx.createCanvas()
var ctx    = canvas.getContext('2d')
GameGlobal.canvas = canvas
GameGlobal.ctx    = ctx

// 高清渲染
var sysInfo = wx.getSystemInfoSync()
var DPR     = sysInfo.pixelRatio || 1
var SW      = canvas.width
var SH      = canvas.height
canvas.width  = SW * DPR
canvas.height = SH * DPR
ctx.scale(DPR, DPR)
GameGlobal.DPR = DPR
GameGlobal.SW  = SW
GameGlobal.SH  = SH

// ---- 布局参数 ----
var SIZE    = 4
var PAD     = Math.round(SW * 0.05)
var GAP     = Math.round(SW * 0.025)
var BOARD_W = SW - PAD * 2
var CELL_SZ = (BOARD_W - GAP * (SIZE + 1)) / SIZE
var BOARD_H = CELL_SZ * SIZE + GAP * (SIZE + 1)
var TOP_PAD = Math.round(SH * 0.13)
var ROW1_H  = Math.round(SH * 0.075)
var ROW2_H  = Math.round(SH * 0.048)
var BOARD_Y = TOP_PAD + ROW1_H + ROW2_H + Math.round(SH * 0.030)
var BOARD_X = PAD
var BTN_H   = Math.round(SH * 0.062)
GameGlobal.SIZE    = SIZE
GameGlobal.PAD     = PAD
GameGlobal.GAP     = GAP
GameGlobal.BOARD_W = BOARD_W
GameGlobal.CELL_SZ = CELL_SZ
GameGlobal.BOARD_H = BOARD_H
GameGlobal.TOP_PAD = TOP_PAD
GameGlobal.ROW1_H  = ROW1_H
GameGlobal.ROW2_H  = ROW2_H
GameGlobal.BOARD_Y = BOARD_Y
GameGlobal.BOARD_X = BOARD_X
GameGlobal.BTN_H   = BTN_H

// ---- 颜色主题 ----
GameGlobal.C = {
  bg:        '#1a1a2e',
  surface:   '#16213e',
  board:     '#0f3460',
  cellEmpty: 'rgba(255,255,255,0.05)',
  accent:    '#e94560',
  accent2:   '#f5a623',
  textLight: '#eaeaea',
  textDim:   '#8892a4',
  green:     '#2ecc71',
  tiles: {
    2:    { bg:'#eee4da', fg:'#776e65' },
    4:    { bg:'#ede0c8', fg:'#776e65' },
    8:    { bg:'#f2b179', fg:'#fff' },
    16:   { bg:'#f59563', fg:'#fff' },
    32:   { bg:'#f67c5f', fg:'#fff' },
    64:   { bg:'#f65e3b', fg:'#fff' },
    128:  { bg:'#edcf72', fg:'#fff' },
    256:  { bg:'#edcc61', fg:'#fff' },
    512:  { bg:'#9b59b6', fg:'#fff' },
    1024: { bg:'#e94560', fg:'#fff' },
    2048: { bg:'#f5a623', fg:'#fff' }
  },
  tileHi: { bg:'#00d2ff', fg:'#fff' }
}

// ---- 绘图工具（挂到 GameGlobal） ----
GameGlobal.roundRect = function(x, y, w, h, r, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  if (fill)   { ctx.fillStyle = fill;     ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke() }
}

GameGlobal.setFont = function(size, weight) {
  ctx.font = (weight || '700') + ' ' + Math.round(size) + 'px sans-serif'
}

GameGlobal.drawBg = function() {
  // 如果有主题背景渲染器，优先使用
  if (GameGlobal._themeBgRenderer) {
    GameGlobal._themeBgRenderer()
    return
  }
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, SW, SH)
  var g1 = ctx.createRadialGradient(SW*0.85, SH*0.05, 0, SW*0.85, SH*0.05, SW*0.7)
  g1.addColorStop(0, 'rgba(233,69,96,0.18)'); g1.addColorStop(1, 'rgba(233,69,96,0)')
  ctx.fillStyle = g1; ctx.fillRect(0, 0, SW, SH)
  var g2 = ctx.createRadialGradient(SW*0.1, SH*0.95, 0, SW*0.1, SH*0.95, SW*0.7)
  g2.addColorStop(0, 'rgba(245,166,35,0.12)'); g2.addColorStop(1, 'rgba(245,166,35,0)')
  ctx.fillStyle = g2; ctx.fillRect(0, 0, SW, SH)
}

GameGlobal.drawBtn = function(x, y, w, h, text, bg, fg) {
  roundRect(x, y, w, h, 14, bg, 'rgba(255,255,255,0.08)')
  setFont(h * 0.36, '800')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = fg; ctx.fillText(text, x + w/2, y + h/2)
}

GameGlobal.inRect = function(x, y, rect) {
  if (!rect) return false
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
}