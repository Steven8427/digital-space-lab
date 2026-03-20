// ================================================
//  themeSystem.js — 主题皮肤系统
//  购买的皮肤在这里定义颜色，装备后覆盖 GameGlobal.C
// ================================================

var _defaultC = {
  bg:'#1a1a2e', surface:'#16213e', board:'#0f3460',
  cellEmpty:'rgba(255,255,255,0.05)',
  accent:'#e94560', accent2:'#f5a623',
  textLight:'#eaeaea', textDim:'#8892a4', green:'#2ecc71'
}

var SKIN_THEMES = {
  skin_dark: {
    name:'暗黑', bg:'#0d0d0d', surface:'#1a1a1a', board:'#252525',
    cellEmpty:'rgba(255,255,255,0.04)', accent:'#e94560', accent2:'#f5a623',
    textLight:'#d0d0d0', textDim:'#666666'
  },
  skin_ocean: {
    name:'海洋', bg:'#0a1628', surface:'#0d2137', board:'#0f3460',
    cellEmpty:'rgba(100,180,255,0.08)', accent:'#00b4d8', accent2:'#48cae4',
    textLight:'#caf0f8', textDim:'#6096ba'
  },
  skin_forest: {
    name:'森林', bg:'#0b1a0b', surface:'#132a13', board:'#1a3a1a',
    cellEmpty:'rgba(100,200,100,0.06)', accent:'#2ecc71', accent2:'#27ae60',
    textLight:'#d4edda', textDim:'#6b9e6b'
  },
  skin_sunset: {
    name:'日落', bg:'#1a0a05', surface:'#2d1810', board:'#3d2015',
    cellEmpty:'rgba(255,150,50,0.06)', accent:'#e67e22', accent2:'#f39c12',
    textLight:'#fce4c0', textDim:'#b08060'
  },
  skin_neon: {
    name:'霓虹', bg:'#0a0015', surface:'#150025', board:'#1a0035',
    cellEmpty:'rgba(160,80,255,0.08)', accent:'#a855f7', accent2:'#06b6d4',
    textLight:'#e2d5f0', textDim:'#7c6b9e'
  },
  skin_gold: {
    name:'黄金', bg:'#1a1505', surface:'#2a2210', board:'#3a3015',
    cellEmpty:'rgba(255,215,0,0.06)', accent:'#ffd700', accent2:'#daa520',
    textLight:'#fff8dc', textDim:'#b8a060'
  }
}

// ── 应用主题
GameGlobal.applyTheme = function() {
  var AS = GameGlobal.AchieveShop
  if (!AS) return

  var skinId = AS.equipped && AS.equipped.theme
  var theme = skinId && SKIN_THEMES[skinId]
  var C = GameGlobal.C

  if (theme) {
    C.bg = theme.bg; C.surface = theme.surface; C.board = theme.board
    C.cellEmpty = theme.cellEmpty
    C.accent = theme.accent; C.accent2 = theme.accent2
    C.textLight = theme.textLight; C.textDim = theme.textDim
  } else {
    // 恢复默认
    C.bg = _defaultC.bg; C.surface = _defaultC.surface; C.board = _defaultC.board
    C.cellEmpty = _defaultC.cellEmpty
    C.accent = _defaultC.accent; C.accent2 = _defaultC.accent2
    C.textLight = _defaultC.textLight; C.textDim = _defaultC.textDim
  }
}

// ── 大厅通用：成就按钮 + 商店按钮（两列大按钮）
//    返回 { achieveBtn, shopBtn, endY }
GameGlobal.drawLobbyAchieveProps = function(game, y) {
  var ctx = GameGlobal.ctx, SW = GameGlobal.SW
  var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP
  var BOARD_W = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
  var C = GameGlobal.C, BTN_H = GameGlobal.BTN_H
  var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
  var AS = GameGlobal.AchieveShop
  var result = { achieveBtn: null, shopBtn: null, endY: y }
  if (!AS) return result

  var halfW = Math.floor((BOARD_W - GAP) / 2)
  var btnH = BTN_H * 1.05

  // ── 左：成就按钮（带进度）
  var prog = AS.getProgress(game)
  var ratio = prog.total > 0 ? prog.done / prog.total : 0

  roundRect(BOARD_X, y, halfW, btnH, 12, C.surface, 'rgba(243,156,18,0.25)')
  // 进度填充
  if (ratio > 0) roundRect(BOARD_X, y, halfW * ratio, btnH, 12, 'rgba(243,156,18,0.12)')

  setFont(btnH * 0.30, '800')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f39c12'
  ctx.fillText('🏆 成就 ' + prog.done + '/' + prog.total, BOARD_X + halfW / 2, y + btnH / 2)
  result.achieveBtn = { x: BOARD_X, y: y, w: halfW, h: btnH, game: game }

  // ── 右：商店按钮（带金币）
  var sx = BOARD_X + halfW + GAP
  roundRect(sx, y, halfW, btnH, 12, C.surface, 'rgba(108,92,231,0.25)')
  setFont(btnH * 0.30, '800')
  ctx.fillStyle = '#a29bfe'
  ctx.fillText('🛒 商店', sx + halfW / 2, y + btnH * 0.38)
  setFont(btnH * 0.22, '600')
  ctx.fillStyle = '#f39c12'
  ctx.fillText('🪙 ' + AS.coins, sx + halfW / 2, y + btnH * 0.72)
  result.shopBtn = { x: sx, y: y, w: halfW, h: btnH }

  result.endY = y + btnH
  return result
}

// ── 主题背景绘制（替代默认 drawBg + drawStars）
GameGlobal.drawThemeBg = function() {
  var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
  var C = GameGlobal.C, t = Date.now()
  var AS = GameGlobal.AchieveShop
  var skinId = (AS && AS.equipped) ? AS.equipped.theme : ''

  if (skinId === 'skin_dark') {
    // ══════ 暗夜深渊：纯黑 + 大红星 + 流星雨 ══════
    ctx.fillStyle = '#050505'; ctx.fillRect(0,0,SW,SH)
    // 暗红色雾
    var fog = ctx.createRadialGradient(SW*0.3,SH*0.2,0,SW*0.3,SH*0.2,SW*0.6)
    fog.addColorStop(0,'rgba(80,0,0,0.15)'); fog.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle=fog; ctx.fillRect(0,0,SW,SH)
    // 红色星星
    for (var i=0;i<70;i++) {
      var sx=(_skinStars[i].x*SW)%SW, sy=(_skinStars[i].y*SH)%SH
      var flk = 0.3 + Math.sin(t/400+i*7)*0.3
      ctx.beginPath(); ctx.arc(sx,sy,0.8+_skinStars[i].r*1.5,0,Math.PI*2)
      ctx.fillStyle='rgba(255,80,80,'+flk+')'; ctx.fill()
    }
    // 多条流星
    for (var mi=0;mi<3;mi++) {
      var mt = ((t/15+mi*400)%(SW*1.5))-SW*0.25
      var my = mi*SH*0.25+SH*0.1
      ctx.beginPath(); ctx.moveTo(mt,my); ctx.lineTo(mt-120,my+50)
      var mg=ctx.createLinearGradient(mt,my,mt-120,my+50)
      mg.addColorStop(0,'rgba(231,76,60,0.7)'); mg.addColorStop(1,'rgba(231,76,60,0)')
      ctx.strokeStyle=mg; ctx.lineWidth=2.5; ctx.stroke()
    }
  }
  else if (skinId === 'skin_ocean') {
    // ══════ 深海幻境：深蓝渐变 + 大气泡 + 波光 ══════
    var seaG=ctx.createLinearGradient(0,0,0,SH)
    seaG.addColorStop(0,'#020b18'); seaG.addColorStop(0.4,'#051830'); seaG.addColorStop(1,'#030a15')
    ctx.fillStyle=seaG; ctx.fillRect(0,0,SW,SH)
    // 光柱
    for (var li=0;li<3;li++) {
      var lx=SW*(0.2+li*0.3), lw=SW*0.08
      var lg=ctx.createLinearGradient(lx,0,lx,SH)
      lg.addColorStop(0,'rgba(0,180,216,0.08)'); lg.addColorStop(0.5,'rgba(0,180,216,0.03)'); lg.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=lg; ctx.fillRect(lx-lw/2,0,lw,SH)
    }
    // 气泡（大+亮）
    for (var i=0;i<35;i++) {
      var bx=(_skinStars[i].x*SW)%SW
      var speed = 800+i*200
      var by=((t/speed+_skinStars[i].y)%1.2)*SH
      var br=3+_skinStars[i].r*6
      ctx.beginPath(); ctx.arc(bx,SH-by,br,0,Math.PI*2)
      ctx.fillStyle='rgba(100,220,255,0.15)'; ctx.fill()
      ctx.strokeStyle='rgba(100,220,255,0.25)'; ctx.lineWidth=1; ctx.stroke()
      // 高光
      ctx.beginPath(); ctx.arc(bx-br*0.3,SH-by-br*0.3,br*0.3,0,Math.PI*2)
      ctx.fillStyle='rgba(200,240,255,0.3)'; ctx.fill()
    }
    // 多层波纹
    for (var wi=0;wi<3;wi++) {
      ctx.beginPath()
      var wy=SH*(0.3+wi*0.25)
      for (var wx2=0;wx2<SW;wx2+=4) {
        var wvy=wy+Math.sin(wx2/50+t/800+wi*2)*12+Math.sin(wx2/80-t/1200)*8
        if(wx2===0)ctx.moveTo(wx2,wvy);else ctx.lineTo(wx2,wvy)
      }
      ctx.strokeStyle='rgba(0,180,216,'+(0.12-wi*0.03)+')'; ctx.lineWidth=1.5; ctx.stroke()
    }
  }
  else if (skinId === 'skin_forest') {
    // ══════ 翡翠森林：深绿 + 大萤火虫 + 光斑 ══════
    var forG=ctx.createLinearGradient(0,0,0,SH)
    forG.addColorStop(0,'#030d03'); forG.addColorStop(0.6,'#051a05'); forG.addColorStop(1,'#020802')
    ctx.fillStyle=forG; ctx.fillRect(0,0,SW,SH)
    // 光斑
    for (var gi=0;gi<4;gi++) {
      var gx=SW*(0.15+gi*0.25)+Math.sin(t/3000+gi)*30
      var gy=SH*(0.2+gi*0.2)
      var gg=ctx.createRadialGradient(gx,gy,0,gx,gy,SW*0.15)
      gg.addColorStop(0,'rgba(46,204,113,0.08)'); gg.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=gg; ctx.fillRect(0,0,SW,SH)
    }
    // 萤火虫（大+明亮+拖尾）
    for (var i=0;i<50;i++) {
      var fx=(_skinStars[i].x*SW+Math.sin(t/1200+i*3)*40)%SW
      var fy=(_skinStars[i].y*SH+Math.cos(t/1500+i*5)*30)%SH
      var fr=2+Math.sin(t/200+i*8)*2
      // 发光晕
      var fg=ctx.createRadialGradient(fx,fy,0,fx,fy,fr*4)
      fg.addColorStop(0,'rgba(46,204,113,0.4)'); fg.addColorStop(1,'rgba(46,204,113,0)')
      ctx.fillStyle=fg; ctx.fillRect(fx-fr*4,fy-fr*4,fr*8,fr*8)
      // 核心
      ctx.beginPath(); ctx.arc(fx,fy,Math.max(1,fr),0,Math.PI*2)
      ctx.fillStyle='rgba(120,255,120,'+(0.5+Math.sin(t/150+i*6)*0.3)+')'; ctx.fill()
    }
  }
  else if (skinId === 'skin_sunset') {
    // ══════ 落日熔金：渐变天空 + 大太阳 + 云层 ══════
    var skyG=ctx.createLinearGradient(0,0,0,SH)
    skyG.addColorStop(0,'#1a0505'); skyG.addColorStop(0.3,'#3d1008'); skyG.addColorStop(0.6,'#1a0a02'); skyG.addColorStop(1,'#0a0503')
    ctx.fillStyle=skyG; ctx.fillRect(0,0,SW,SH)
    // 大太阳光晕
    var sunX=SW*0.65, sunY=SH*0.12
    for (var ri=3;ri>=0;ri--) {
      var sr=SW*(0.08+ri*0.08)
      var sg=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sr)
      sg.addColorStop(0,'rgba(243,156,18,'+(0.2-ri*0.04)+')'); sg.addColorStop(1,'rgba(243,156,18,0)')
      ctx.fillStyle=sg; ctx.fillRect(0,0,SW,SH)
    }
    // 金色粒子飘浮
    for (var i=0;i<40;i++) {
      var px2=(_skinStars[i].x*SW+Math.sin(t/2500+i)*20)%SW
      var py2=(_skinStars[i].y*SH+Math.cos(t/3000+i)*15)%SH
      var pa=0.2+Math.sin(t/300+i*4)*0.15
      ctx.beginPath(); ctx.arc(px2,py2,1+_skinStars[i].r,0,Math.PI*2)
      ctx.fillStyle='rgba(255,200,50,'+pa+')'; ctx.fill()
    }
    // 云层剪影
    for (var ci=0;ci<2;ci++) {
      var cx2=((t/(8000+ci*3000)+ci*0.5)%1.5-0.25)*SW
      var cy2=SH*(0.25+ci*0.15)
      ctx.beginPath(); ctx.arc(cx2,cy2,40,0,Math.PI*2); ctx.arc(cx2+30,cy2-10,30,0,Math.PI*2); ctx.arc(cx2+55,cy2,35,0,Math.PI*2)
      ctx.fillStyle='rgba(50,20,5,0.3)'; ctx.fill()
    }
  }
  else if (skinId === 'skin_neon') {
    // ══════ 霓虹都市：扫描线 + 大光带 + 网格地面 ══════
    ctx.fillStyle='#08001a'; ctx.fillRect(0,0,SW,SH)
    // 扫描线
    for (var ly=0;ly<SH;ly+=3) {
      ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(0,ly,SW,1.5)
    }
    // 紫蓝渐变光晕
    var ng=ctx.createRadialGradient(SW*0.5,SH*0.3,0,SW*0.5,SH*0.3,SW*0.5)
    ng.addColorStop(0,'rgba(168,85,247,0.12)'); ng.addColorStop(0.5,'rgba(6,182,212,0.06)'); ng.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle=ng; ctx.fillRect(0,0,SW,SH)
    // 水平扫描光带
    var bandY=(t/12)%SH
    var bandG=ctx.createLinearGradient(0,bandY-40,0,bandY+40)
    bandG.addColorStop(0,'rgba(168,85,247,0)'); bandG.addColorStop(0.5,'rgba(168,85,247,0.15)'); bandG.addColorStop(1,'rgba(168,85,247,0)')
    ctx.fillStyle=bandG; ctx.fillRect(0,bandY-40,SW,80)
    // 第二道光带
    var bandY2=((t/18)+SH*0.5)%SH
    var bandG2=ctx.createLinearGradient(0,bandY2-30,0,bandY2+30)
    bandG2.addColorStop(0,'rgba(6,182,212,0)'); bandG2.addColorStop(0.5,'rgba(6,182,212,0.1)'); bandG2.addColorStop(1,'rgba(6,182,212,0)')
    ctx.fillStyle=bandG2; ctx.fillRect(0,bandY2-30,SW,60)
    // 脉冲点
    for (var i=0;i<45;i++) {
      var nx2=(_skinStars[i].x*SW)%SW, ny2=(_skinStars[i].y*SH)%SH
      var pulse=0.2+Math.sin(t/200+i*9)*0.2
      ctx.beginPath(); ctx.arc(nx2,ny2,1.5+Math.sin(t/300+i)*0.8,0,Math.PI*2)
      ctx.fillStyle=i%2===0?'rgba(168,85,247,'+pulse+')':'rgba(6,182,212,'+pulse+')'; ctx.fill()
    }
    // 底部透视网格
    ctx.strokeStyle='rgba(168,85,247,0.08)'; ctx.lineWidth=1
    for (var gx=0;gx<SW;gx+=40) {
      ctx.beginPath(); ctx.moveTo(gx,SH*0.85); ctx.lineTo(SW/2+(gx-SW/2)*0.3,SH); ctx.stroke()
    }
  }
  else if (skinId === 'skin_gold') {
    // ══════ 至尊黄金：金色粒子瀑布 + 光芒四射 ══════
    var goldBg=ctx.createLinearGradient(0,0,0,SH)
    goldBg.addColorStop(0,'#0d0a02'); goldBg.addColorStop(0.4,'#1a1505'); goldBg.addColorStop(1,'#080500')
    ctx.fillStyle=goldBg; ctx.fillRect(0,0,SW,SH)
    // 中央大光芒
    var gcx=SW*0.5, gcy=SH*0.25
    for (var ri=0;ri<4;ri++) {
      var gr=SW*(0.1+ri*0.1)
      var gg2=ctx.createRadialGradient(gcx,gcy,0,gcx,gcy,gr)
      gg2.addColorStop(0,'rgba(255,215,0,'+(0.12-ri*0.025)+')'); gg2.addColorStop(1,'rgba(255,215,0,0)')
      ctx.fillStyle=gg2; ctx.fillRect(0,0,SW,SH)
    }
    // 光线放射
    ctx.save(); ctx.translate(gcx,gcy); ctx.rotate(t/5000)
    for (var ri2=0;ri2<12;ri2++) {
      var ra=ri2*Math.PI/6
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(ra)*SW*0.4,Math.sin(ra)*SW*0.4)
      ctx.strokeStyle='rgba(218,165,32,0.04)'; ctx.lineWidth=3; ctx.stroke()
    }
    ctx.restore()
    // 金色粒子（大量+明亮+下落）
    for (var i=0;i<60;i++) {
      var gx2=(_skinStars[i].x*SW)%SW
      var gy2=((t/(1500+i*80)+_skinStars[i].y)%1.3)*SH
      var gr2=1.5+Math.sin(t/150+i*5)*1.5
      // 发光
      var gg3=ctx.createRadialGradient(gx2,gy2,0,gx2,gy2,gr2*3)
      gg3.addColorStop(0,'rgba(255,215,0,0.35)'); gg3.addColorStop(1,'rgba(255,215,0,0)')
      ctx.fillStyle=gg3; ctx.fillRect(gx2-gr2*3,gy2-gr2*3,gr2*6,gr2*6)
      // 核心
      ctx.beginPath(); ctx.arc(gx2,gy2,Math.max(0.8,gr2),0,Math.PI*2)
      ctx.fillStyle='rgba(255,225,50,'+(0.4+Math.sin(t/100+i*7)*0.3)+')'; ctx.fill()
    }
  }
  else {
    // 默认：原始背景色
    ctx.fillStyle = C.bg; ctx.fillRect(0,0,SW,SH)
  }
}

// 预生成随机种子
var _skinStars = []
for (var _si2=0;_si2<80;_si2++) _skinStars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.5})

// ── 应用主题时设置背景渲染器
var _origApplyTheme = GameGlobal.applyTheme
GameGlobal.applyTheme = function() {
  _origApplyTheme()
  var AS = GameGlobal.AchieveShop
  var skinId = (AS && AS.equipped) ? AS.equipped.theme : ''
  // 有主题 → 设置渲染器；无主题 → 清空
  GameGlobal._themeBgRenderer = skinId ? function() { GameGlobal.drawThemeBg() } : null
}

// ── 启动时应用主题
;(function() {
  setTimeout(function() { if (GameGlobal.applyTheme) GameGlobal.applyTheme() }, 500)
})()