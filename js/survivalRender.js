// ================================================
//  survivalRender.js v4 — 吸血鬼幸存者视觉
//  武器特效、敌人血条、玩家HP、投射物
// ================================================
var ctx=GameGlobal.ctx, SW=GameGlobal.SW, SH=GameGlobal.SH
var PAD=GameGlobal.PAD, GAP=GameGlobal.GAP
var BOARD_W=GameGlobal.BOARD_W, BOARD_X=GameGlobal.BOARD_X
var BTN_H=GameGlobal.BTN_H, C=GameGlobal.C
var roundRect=GameGlobal.roundRect, setFont=GameGlobal.setFont
var drawBg=GameGlobal.drawBg, drawBtn=GameGlobal.drawBtn, inRect=GameGlobal.inRect

var _bgStars=[]
for(var _si=0;_si<100;_si++) _bgStars.push({x:Math.random()*3000,y:Math.random()*3000,r:0.5+Math.random()*1.5,b:0.2+Math.random()*0.4})

// ── 大厅
GameGlobal.LobbySurvivalUI={startBtn:null,rankBtn:null,backBtn:null}
GameGlobal.drawLobbySurvivalScreen=function(){
  drawBg(); var cx=SW/2,L=GameGlobal.LobbySurvivalUI
  setFont(SW*0.080,'900');ctx.textAlign='center';ctx.textBaseline='middle'
  var tg=ctx.createLinearGradient(cx-SW*0.25,0,cx+SW*0.25,0)
  tg.addColorStop(0,'#e74c3c');tg.addColorStop(1,'#f39c12')
  ctx.shadowColor='rgba(231,76,60,0.5)';ctx.shadowBlur=18;ctx.fillStyle=tg
  ctx.fillText('数字生存',cx,SH*0.13);ctx.shadowBlur=0;ctx.shadowColor='transparent'

  setFont(SW*0.028,'600');ctx.fillStyle='rgba(255,255,255,0.45)'
  ctx.fillText('武器射击，生存10分钟！',cx,SH*0.19)

  var best=wx.getStorageSync('survivalBest')||0
  var cardY=SH*0.26,cardH=BTN_H*1.5
  roundRect(BOARD_X,cardY,BOARD_W,cardH,14,C.surface,'rgba(231,76,60,0.18)')
  setFont(SW*0.026,'700');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=C.textDim
  ctx.fillText('最佳击杀记录',cx,cardY+cardH*0.30)
  setFont(best>0?SW*0.065:SW*0.035,'900');ctx.fillStyle=best>0?'#e74c3c':C.textDim
  ctx.fillText(best>0?best+'击杀':'暂无记录',cx,cardY+cardH*0.72)

  var infoY=cardY+cardH+GAP*2
  setFont(SW*0.024,'600');ctx.fillStyle='rgba(255,255,255,0.35)';ctx.textAlign='center'
  ctx.fillText('🔪 武器自动攻击周围敌人',cx,infoY)
  ctx.fillText('⚠️ 碰到敌人会掉血',cx,infoY+SH*0.035)
  ctx.fillText('🏆 升级选择新武器和强化',cx,infoY+SH*0.070)

  var btnY=SH*0.56
  var bg=ctx.createLinearGradient(BOARD_X,0,BOARD_X+BOARD_W,0);bg.addColorStop(0,'#e74c3c');bg.addColorStop(1,'#f39c12')
  roundRect(BOARD_X,btnY,BOARD_W,BTN_H*1.3,16,bg)
  setFont(BTN_H*0.42,'900');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff'
  ctx.fillText('开 始 生 存',cx,btnY+BTN_H*0.65)
  L.startBtn={x:BOARD_X,y:btnY,w:BOARD_W,h:BTN_H*1.3}

  var rkY=btnY+BTN_H*1.3+GAP
  roundRect(BOARD_X,rkY,BOARD_W,BTN_H,12,C.surface,'rgba(255,255,255,0.08)')
  setFont(BTN_H*0.36,'700');ctx.fillStyle=C.textLight;ctx.fillText('🏆  排 行 榜',cx,rkY+BTN_H/2)
  L.rankBtn={x:BOARD_X,y:rkY,w:BOARD_W,h:BTN_H}

  var bkY=rkY+BTN_H+GAP*1.5
  roundRect(BOARD_X,bkY,BOARD_W,BTN_H*0.85,12,C.surface,'rgba(255,255,255,0.06)')
  setFont(BTN_H*0.34,'700');ctx.fillStyle=C.textDim;ctx.fillText('← 返回主页',cx,bkY+BTN_H*0.425)
  L.backBtn={x:BOARD_X,y:bkY,w:BOARD_W,h:BTN_H*0.85}
}

// ================================================
//  游戏界面
// ================================================
GameGlobal.SurvivalUI={skillBtns:[],retryBtn:null,exitBtn:null,settingBtn:null}

GameGlobal.drawSurvivalScreen=function(){
  var S=GameGlobal.Survival; if(!S||(!S.running&&!S.gameOver)) return
  S.update()
  var cam=S.camera, p=S.player

  // 背景
  ctx.fillStyle='#06081a';ctx.fillRect(0,0,SW,SH)
  for(var si=0;si<_bgStars.length;si++){
    var st=_bgStars[si],sx=((st.x-cam.x*0.3)%SW+SW)%SW,sy=((st.y-cam.y*0.3)%SH+SH)%SH
    ctx.beginPath();ctx.arc(sx,sy,st.r,0,Math.PI*2);ctx.fillStyle='rgba(180,200,255,'+(st.b+Math.sin(Date.now()/800+si)*0.12)+')';ctx.fill()
  }
  var gs=S.GRID_SIZE,offX=-(cam.x%gs+gs)%gs,offY=-(cam.y%gs+gs)%gs
  ctx.strokeStyle='rgba(100,140,255,0.05)';ctx.lineWidth=1;ctx.setLineDash([2,gs-2])
  for(var gx=offX;gx<SW;gx+=gs){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,SH);ctx.stroke()}
  for(var gy=offY;gy<SH;gy+=gs){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(SW,gy);ctx.stroke()}
  ctx.setLineDash([])

  // 边界
  _drawBorder(cam)

  // 粒子
  var pts=S.particles
  for(var pi=0;pi<pts.length;pi++){var pt=pts[pi],a=1-pt.age/pt.life;var px2=pt.x-cam.x,py2=pt.y-cam.y
    ctx.beginPath();ctx.arc(px2,py2,pt.r*a,0,Math.PI*2);ctx.fillStyle=pt.color+_ah(a);ctx.fill()}

  // 火焰圈
  for(var ri=0;ri<S._rings.length;ri++){
    var rr=S._rings[ri],rx=rr.x-cam.x,ry=rr.y-cam.y
    ctx.beginPath();ctx.arc(rx,ry,rr.r,0,Math.PI*2)
    ctx.strokeStyle='rgba(231,76,60,'+(0.7*(1-rr.r/rr.maxR))+')';ctx.lineWidth=4;ctx.stroke()
  }

  // 冰冻光环
  var hasAura=false
  for(var wi=0;wi<S.weapons.length;wi++){if(S.weapons[wi].id==='aura'){hasAura=S.weapons[wi];break}}
  if(hasAura){
    var px3=p.x-cam.x,py3=p.y-cam.y
    ctx.beginPath();ctx.arc(px3,py3,hasAura.range,0,Math.PI*2)
    ctx.fillStyle='rgba(93,173,226,0.06)';ctx.fill()
    ctx.strokeStyle='rgba(93,173,226,0.2)';ctx.lineWidth=1.5;ctx.stroke()
  }

  // 敌人
  for(var i=0;i<S.enemies.length;i++){
    var e=S.enemies[i],ex=e.x-cam.x,ey=e.y-cam.y
    if(ex<-50||ex>SW+50||ey<-50||ey>SH+50) continue
    _drawEnemy(ex,ey,e)
  }

  // Boss
  if(S.boss) _drawBoss(S.boss.x-cam.x,S.boss.y-cam.y,S.boss)

  // 投射物
  for(var i=0;i<S.projectiles.length;i++){
    var pr=S.projectiles[i],prx=pr.x-cam.x,pry=pr.y-cam.y
    ctx.beginPath();ctx.arc(prx,pry,5,0,Math.PI*2)
    ctx.fillStyle='#a29bfe';ctx.fill()
    ctx.beginPath();ctx.arc(prx,pry,3,0,Math.PI*2)
    ctx.fillStyle='#fff';ctx.fill()
  }

  // 闪电
  for(var li=0;li<S._lightnings.length;li++){
    var ln=S._lightnings[li],a2=ln.life/0.25
    ctx.beginPath();ctx.moveTo(ln.x1-cam.x,ln.y1-cam.y)
    // 锯齿闪电
    var dx=ln.x2-ln.x1,dy=ln.y2-ln.y1,segs=5
    for(var si2=1;si2<=segs;si2++){
      var t=si2/segs, ox=(Math.random()-0.5)*20, oy=(Math.random()-0.5)*20
      if(si2===segs){ox=0;oy=0}
      ctx.lineTo(ln.x1+dx*t+ox-cam.x, ln.y1+dy*t+oy-cam.y)
    }
    ctx.strokeStyle='rgba(93,173,226,'+a2+')';ctx.lineWidth=3;ctx.stroke()
    ctx.strokeStyle='rgba(255,255,255,'+(a2*0.6)+')';ctx.lineWidth=1;ctx.stroke()
  }

  // 旋转飞刀
  for(var wi=0;wi<S.weapons.length;wi++){
    var w=S.weapons[wi]; if(w.id!=='orbit') continue
    for(var k=0;k<w.count;k++){
      var a=S.elapsed*2.5+k*(Math.PI*2/w.count)
      var kx=p.x+Math.cos(a)*w.range-cam.x, ky=p.y+Math.sin(a)*w.range-cam.y
      ctx.save();ctx.translate(kx,ky);ctx.rotate(a+Math.PI/2)
      // 飞刀形状
      ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(4,6);ctx.lineTo(-4,6);ctx.closePath()
      ctx.fillStyle='#ecf0f1';ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.stroke()
      ctx.restore()
    }
  }

  // 玩家
  _drawPlayer(p.x-cam.x,p.y-cam.y,p,cam)

  // HUD
  _drawHUD(S)
  _drawJoystick(S.joystick)

  if(S._waveActive){var wa=0.5+Math.sin(Date.now()/200)*0.3
    setFont(SW*0.038,'900');ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillStyle='rgba(231,76,60,'+wa+')';ctx.fillText('⚠ 怪物潮来袭！',SW/2,SH*0.14)}

  if(S.levelUp) _drawWeaponSelect(S)
  if(S.gameOver) _drawGameOver(S)
}

function _ah(a){var h=Math.round(Math.max(0,Math.min(1,a))*255).toString(16);return h.length<2?'0'+h:h}

// ── 敌人（不同类型不同形状 + 血条）
function _drawEnemy(x,y,e){
  var r=GameGlobal.Survival.enemyRadius(e.type)
  var flash=e._flashTimer&&e._flashTimer>0
  var t=Date.now()

  ctx.save();ctx.translate(x,y)

  if(e.type==='tank'){
    ctx.rotate(t/2000);var s=r*1.5
    ctx.fillStyle=flash?'#fff':'#6c3483';ctx.fillRect(-s/2,-s/2,s,s)
    ctx.strokeStyle='#9b59b6';ctx.lineWidth=2;ctx.strokeRect(-s/2,-s/2,s,s)
  }else if(e.type==='dash'){
    ctx.rotate(Math.PI/4);var s=r*1.3
    ctx.fillStyle=flash?'#fff':'#e67e22';ctx.fillRect(-s/2,-s/2,s,s)
    ctx.strokeStyle='#f39c12';ctx.lineWidth=1.5;ctx.strokeRect(-s/2,-s/2,s,s)
  }else if(e.type==='split'){
    _drawHex2(0,0,r,flash?'#fff':'#af7ac5')
    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1.5;ctx.stroke()
  }else if(e.type==='swarm'){
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2)
    ctx.fillStyle=flash?'#fff':'#e74c3c';ctx.fill()
  }else{
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2)
    ctx.fillStyle=flash?'#fff':'#c0392b';ctx.fill()
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;ctx.stroke()
  }
  ctx.restore()

  // 减速效果
  if(e._slowed&&e._slowed>0){
    ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2)
    ctx.strokeStyle='rgba(93,173,226,0.5)';ctx.lineWidth=2;ctx.stroke()
  }

  // 数字（血量）
  setFont(Math.min(r*0.8,14),'900');ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillStyle='#fff';ctx.fillText(Math.ceil(e.hp),x,y)

  // 血条
  if(e.hp<e.maxHp){
    var bw=r*2.2, bh=3, bx=x-bw/2, by=y-r-6
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(bx,by,bw,bh)
    ctx.fillStyle='#2ecc71';ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),bh)
  }
}

function _drawHex2(x,y,r,fill){
  ctx.beginPath();for(var i=0;i<6;i++){var a=Math.PI/6+i*Math.PI/3;var hx=x+Math.cos(a)*r,hy=y+Math.sin(a)*r;if(i===0)ctx.moveTo(hx,hy);else ctx.lineTo(hx,hy)}
  ctx.closePath();ctx.fillStyle=fill;ctx.fill()
}

// ── Boss
function _drawBoss(x,y,b){
  var r=42,t=Date.now()
  for(var rn=3;rn>=1;rn--){var pulse=0.7+Math.sin(t/300+rn)*0.3;ctx.beginPath();ctx.arc(x,y,r+rn*8,0,Math.PI*2);ctx.fillStyle='rgba(231,76,60,'+(0.05*pulse)+')';ctx.fill()}

  ctx.save();ctx.translate(x,y);ctx.rotate(t/1500)
  ctx.beginPath();for(var i=0;i<8;i++){var a=i*Math.PI/4;ctx.moveTo(Math.cos(a)*(r+4),Math.sin(a)*(r+4));ctx.lineTo(Math.cos(a)*(r+14),Math.sin(a)*(r+14))}
  ctx.strokeStyle='rgba(243,156,18,0.4)';ctx.lineWidth=3;ctx.stroke();ctx.restore()

  var flash=b._flashTimer&&b._flashTimer>0
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2)
  ctx.fillStyle=flash?'#fff':'#c0392b';ctx.fill();ctx.strokeStyle='#f39c12';ctx.lineWidth=3;ctx.stroke()

  setFont(14,'900');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff'
  ctx.fillText('👑BOSS',x,y-8);setFont(12,'800');ctx.fillText(Math.ceil(b.hp),x,y+10)

  // Boss血条
  var bw=r*2.5,bh=5,bx=x-bw/2,by=y-r-12
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(bx,by,bw,bh)
  ctx.fillStyle='#e74c3c';ctx.fillRect(bx,by,bw*(b.hp/b.maxHp),bh)
}

// ── 玩家
function _drawPlayer(x,y,p,cam){
  var r=22
  // 拖尾
  var tr=p._trail||[]
  for(var i=0;i<tr.length;i++){var a2=(i+1)/tr.length*0.2;ctx.beginPath();ctx.arc(tr[i].x-cam.x,tr[i].y-cam.y,r*(0.3+i/tr.length*0.5),0,Math.PI*2);ctx.fillStyle='rgba(52,152,219,'+a2+')';ctx.fill()}

  // 无敌闪烁
  if(p._iFrames>0 && Math.floor(Date.now()/80)%2===0) return

  // 护盾视觉不需要了（改成HP系统）
  ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.fillStyle='rgba(52,152,219,0.15)';ctx.fill()

  // 六边形主体
  ctx.save();ctx.translate(x,y)
  _drawHex2(0,0,r,'#2980b9')
  var pg=ctx.createRadialGradient(-r*0.2,-r*0.2,0,0,0,r)
  pg.addColorStop(0,'rgba(52,152,219,0.5)');pg.addColorStop(1,'rgba(41,128,185,0)')
  _drawHex2(0,0,r,pg);ctx.strokeStyle='#5dade2';ctx.lineWidth=2;ctx.stroke()
  ctx.restore()

  // HP条
  var hpW=r*2.5, hpH=4, hpX=x-hpW/2, hpY=y+r+6
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(hpX,hpY,hpW,hpH)
  var hpRatio=Math.max(0,p.hp/p.maxHp)
  ctx.fillStyle=hpRatio>0.5?'#2ecc71':hpRatio>0.25?'#f39c12':'#e74c3c'
  ctx.fillRect(hpX,hpY,hpW*hpRatio,hpH)
}

// ── HUD
function _drawHUD(S){
  var p=S.player
  var g=ctx.createLinearGradient(0,0,0,SH*0.11);g.addColorStop(0,'rgba(6,8,26,0.9)');g.addColorStop(1,'rgba(6,8,26,0)')
  ctx.fillStyle=g;ctx.fillRect(0,0,SW,SH*0.11)

  // HP
  var hpW=SW*0.35, hpH=8, hpX=PAD, hpY=SH*0.025
  ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(hpX,hpY,hpW,hpH)
  var hpR=Math.max(0,p.hp/p.maxHp)
  ctx.fillStyle=hpR>0.5?'#2ecc71':hpR>0.25?'#f39c12':'#e74c3c'
  ctx.fillRect(hpX,hpY,hpW*hpR,hpH)
  setFont(SW*0.020,'700');ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#fff'
  ctx.fillText(Math.ceil(p.hp)+'/'+p.maxHp, hpX, hpY+hpH+SH*0.012)

  // 等级
  setFont(SW*0.024,'800');ctx.fillStyle='#f39c12'
  ctx.fillText(p.level>=20?'Lv.MAX':'Lv.'+p.level, PAD+hpW+GAP, SH*0.030)

  // XP条
  var xpN=(p.level<20)?LEVEL_XP_R[p.level]||999:1,xpR=p.level>=20?1:Math.min(1,p.xp/xpN)
  var xpX=PAD+hpW+GAP,xpW=SW*0.18,xpH=4,xpY=SH*0.045
  ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(xpX,xpY,xpW,xpH)
  if(xpR>0){ctx.fillStyle='#f39c12';ctx.fillRect(xpX,xpY,xpW*xpR,xpH)}

  // 时间
  var tl=Math.max(0,S.GAME_DURATION-S.elapsed),mm=Math.floor(tl/60),ss=Math.floor(tl%60)
  setFont(SW*0.038,'900');ctx.textAlign='center';ctx.fillStyle=tl<60?'#e74c3c':'#fff'
  ctx.fillText(String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0'),SW/2,SH*0.035)

  // 击杀
  setFont(SW*0.022,'700');ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,0.5)'
  ctx.fillText('击杀 '+p.kills, SW-PAD, SH*0.028)

  // 武器图标
  var wIcons='';for(var i=0;i<S.weapons.length;i++){var def=_WDEFS[S.weapons[i].id];wIcons+=(def?def.icon:'?')+'Lv'+S.weapons[i].level+' '}
  if(wIcons){setFont(SW*0.018,'600');ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillText(wIcons.trim(),SW-PAD,SH*0.058)}

  // 设置按钮（右上，明显）
  var stW=SW*0.13, stH=SW*0.075, stX=SW-PAD-stW, stY=SH*0.10
  roundRect(stX,stY,stW,stH,10,C.surface,'rgba(255,255,255,0.25)')
  setFont(stH*0.42,'700');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#eee'
  ctx.fillText('⚙ 设置',stX+stW/2,stY+stH/2)
  GameGlobal.SurvivalUI.settingBtn={x:stX,y:stY,w:stW,h:stH}
}
var _WDEFS={orbit:{icon:'🔪'},bolt:{icon:'🔮'},lightning:{icon:'⚡'},aura:{icon:'❄'},ring:{icon:'🔥'}}
var LEVEL_XP_R=[0,25,60,110,180,270,380,510,660,830,1020,1230,1460,1710,1980,2270,2580,2910,3260,3630]

// ── 摇杆
function _drawJoystick(js){
  if(!js.active){setFont(SW*0.022,'600');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillText('按住屏幕移动',SW*0.25,SH*0.93);return}
  ctx.beginPath();ctx.arc(js.baseX,js.baseY,50,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fill()
  ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=2;ctx.stroke()
  ctx.beginPath();ctx.arc(js.stickX,js.stickY,20,0,Math.PI*2)
  var jg=ctx.createRadialGradient(js.stickX,js.stickY,0,js.stickX,js.stickY,20)
  jg.addColorStop(0,'rgba(52,152,219,0.6)');jg.addColorStop(1,'rgba(52,152,219,0.2)');ctx.fillStyle=jg;ctx.fill()
  ctx.strokeStyle='rgba(52,152,219,0.8)';ctx.lineWidth=2;ctx.stroke()
}

function _drawBorder(cam){
  var MW=3000,MH=3000;ctx.strokeStyle='rgba(231,76,60,0.4)';ctx.lineWidth=3
  var lx=-cam.x,rx=MW-cam.x,ty=-cam.y,by2=MH-cam.y
  if(lx>0){ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,SH);ctx.stroke()}
  if(rx<SW){ctx.beginPath();ctx.moveTo(rx,0);ctx.lineTo(rx,SH);ctx.stroke()}
  if(ty>0){ctx.beginPath();ctx.moveTo(0,ty);ctx.lineTo(SW,ty);ctx.stroke()}
  if(by2<SH){ctx.beginPath();ctx.moveTo(0,by2);ctx.lineTo(SW,by2);ctx.stroke()}
}

// ================================================
//  武器选择（升级时）
// ================================================
function _drawWeaponSelect(S){
  var WEAPON_DEFS = S.WEAPON_DEFS || {}
  ctx.fillStyle='rgba(6,8,26,0.93)';ctx.fillRect(0,0,SW,SH)
  var cx=SW/2
  setFont(SW*0.055,'900');ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillStyle='#f39c12';ctx.fillText('升级！',cx,SH*0.16)
  setFont(SW*0.030,'700');ctx.fillStyle='#fff';ctx.fillText('等级 '+S.player.level+' — 选择一项',cx,SH*0.23)

  var UI=GameGlobal.SurvivalUI;UI.skillBtns=[]
  var chs=S.weaponChoices, cardW=BOARD_W*0.90, cardH=SH*0.13, startY=SH*0.30

  for(var i=0;i<chs.length;i++){
    var ch=chs[i],cy=startY+i*(cardH+GAP),cardX=cx-cardW/2
    var def=WEAPON_DEFS[ch.id]

    if(ch.type==='new'){
      roundRect(cardX,cy,cardW,cardH,14,'rgba(46,204,113,0.1)','rgba(46,204,113,0.3)')
      setFont(cardH*0.35,'700');ctx.textAlign='left';ctx.textBaseline='middle'
      ctx.fillStyle='#fff';ctx.fillText(def.icon,cardX+PAD,cy+cardH*0.4)
      setFont(cardH*0.20,'800');ctx.fillStyle='#2ecc71'
      ctx.fillText('新武器: '+def.name,cardX+PAD+cardH*0.5,cy+cardH*0.32)
      setFont(cardH*0.15,'600');ctx.fillStyle=C.textDim
      ctx.fillText(def.desc,cardX+PAD+cardH*0.5,cy+cardH*0.58)
      setFont(cardH*0.13,'700');ctx.fillStyle='#2ecc71'
      ctx.fillText('NEW',cardX+cardW-PAD*3,cy+cardH*0.5)
    }else if(ch.type==='upgrade'){
      roundRect(cardX,cy,cardW,cardH,14,'rgba(243,156,18,0.1)','rgba(243,156,18,0.3)')
      setFont(cardH*0.35,'700');ctx.textAlign='left';ctx.textBaseline='middle'
      ctx.fillStyle='#fff';ctx.fillText(def?def.icon:'⬆',cardX+PAD,cy+cardH*0.4)
      setFont(cardH*0.20,'800');ctx.fillStyle='#f39c12'
      ctx.fillText((def?def.name:ch.id)+' Lv'+(ch.w.level+1),cardX+PAD+cardH*0.5,cy+cardH*0.32)
      setFont(cardH*0.15,'600');ctx.fillStyle=C.textDim
      ctx.fillText('伤害↑ 效果↑',cardX+PAD+cardH*0.5,cy+cardH*0.58)
    }else if(ch.type==='heal'){
      roundRect(cardX,cy,cardW,cardH,14,'rgba(46,204,113,0.08)','rgba(46,204,113,0.2)')
      setFont(cardH*0.35,'700');ctx.textAlign='left';ctx.textBaseline='middle'
      ctx.fillStyle='#fff';ctx.fillText('💚',cardX+PAD,cy+cardH*0.4)
      setFont(cardH*0.20,'800');ctx.fillStyle='#2ecc71'
      ctx.fillText('回复30HP',cardX+PAD+cardH*0.5,cy+cardH*0.45)
    }else{
      roundRect(cardX,cy,cardW,cardH,14,'rgba(52,152,219,0.08)','rgba(52,152,219,0.2)')
      setFont(cardH*0.35,'700');ctx.textAlign='left';ctx.textBaseline='middle'
      ctx.fillStyle='#fff';ctx.fillText('⚡',cardX+PAD,cy+cardH*0.4)
      setFont(cardH*0.20,'800');ctx.fillStyle='#5dade2'
      ctx.fillText('移速提升',cardX+PAD+cardH*0.5,cy+cardH*0.45)
    }
    UI.skillBtns.push({x:cardX,y:cy,w:cardW,h:cardH})
  }
}

// ================================================
//  结算
// ================================================
function _drawGameOver(S){
  ctx.fillStyle='rgba(6,8,26,0.94)';ctx.fillRect(0,0,SW,SH)
  var cx=SW/2,p=S.player
  setFont(SW*0.065,'900');ctx.textAlign='center';ctx.textBaseline='middle'
  if(S.victory){var tg=ctx.createLinearGradient(cx-SW*0.2,0,cx+SW*0.2,0);tg.addColorStop(0,'#f39c12');tg.addColorStop(1,'#e74c3c');ctx.fillStyle=tg;ctx.fillText('胜利！',cx,SH*0.18)}
  else{ctx.fillStyle='#e74c3c';ctx.fillText('游戏结束',cx,SH*0.18)}

  var cdY=SH*0.28,cdH=SH*0.30
  roundRect(BOARD_X,cdY,BOARD_W,cdH,16,C.surface,'rgba(255,255,255,0.06)')
  var items=[{l:'击杀数',v:String(p.kills),c:'#e74c3c'},{l:'存活时间',v:_fmt(S.elapsed),c:'#2ecc71'},{l:'等级',v:p.level>=20?'MAX':'Lv.'+p.level,c:'#f39c12'},{l:'武器数',v:String(S.weapons.length),c:'#3498db'}]
  var ih=cdH/4
  for(var i=0;i<items.length;i++){var iy=cdY+ih*i+ih/2;setFont(SW*0.028,'700');ctx.textAlign='left';ctx.fillStyle=C.textDim;ctx.fillText(items[i].l,BOARD_X+PAD*2,iy);setFont(SW*0.040,'900');ctx.textAlign='right';ctx.fillStyle=items[i].c;ctx.fillText(items[i].v,BOARD_X+BOARD_W-PAD*2,iy)}

  var bY1=cdY+cdH+GAP*2;var bg2=ctx.createLinearGradient(BOARD_X,0,BOARD_X+BOARD_W,0);bg2.addColorStop(0,'#e74c3c');bg2.addColorStop(1,'#f39c12')
  roundRect(BOARD_X,bY1,BOARD_W,BTN_H*1.1,14,bg2);setFont(BTN_H*0.38,'900');ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('再来一局',cx,bY1+BTN_H*0.55)
  GameGlobal.SurvivalUI.retryBtn={x:BOARD_X,y:bY1,w:BOARD_W,h:BTN_H*1.1}
  var bY2=bY1+BTN_H*1.1+GAP;roundRect(BOARD_X,bY2,BOARD_W,BTN_H*0.9,12,C.surface,'rgba(255,255,255,0.08)')
  setFont(BTN_H*0.34,'700');ctx.fillStyle=C.textDim;ctx.fillText('返回大厅',cx,bY2+BTN_H*0.45)
  GameGlobal.SurvivalUI.exitBtn={x:BOARD_X,y:bY2,w:BOARD_W,h:BTN_H*0.9}
}

function _fmt(s){var m=Math.floor(s/60),ss=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0')}

// ── 排行榜（同v3保持不变）
GameGlobal.SurvivalRank={list:[],myRank:null,scrollY:0,loading:false,load:function(){this.loading=true;this.scrollY=0;var self=this;wx.cloud.callFunction({name:'leaderboard',data:{action:'query',type:'survival',limit:100},success:function(r){if(r.result&&r.result.success){self.list=r.result.data||[];self.myRank=r.result.myRank||null}self.loading=false},fail:function(){self.loading=false}})}}
GameGlobal.SurvivalRankUI={backBtn:null}
GameGlobal.drawSurvivalRankScreen=function(){drawBg();var cx=SW/2,R=GameGlobal.SurvivalRank,RUI=GameGlobal.SurvivalRankUI;setFont(SW*0.050,'900');ctx.textAlign='center';ctx.textBaseline='middle';var tg=ctx.createLinearGradient(cx-SW*0.2,0,cx+SW*0.2,0);tg.addColorStop(0,'#e74c3c');tg.addColorStop(1,'#f39c12');ctx.fillStyle=tg;ctx.fillText('生存排行榜',cx,SH*0.09);setFont(SW*0.025,'600');ctx.fillStyle=C.textDim;ctx.fillText('击杀数排名',cx,SH*0.135);if(R.loading){setFont(SW*0.035,'700');ctx.fillStyle=C.textDim;ctx.fillText('加载中...',cx,SH*0.4);RUI.backBtn={x:BOARD_X,y:SH*0.88,w:BOARD_W,h:BTN_H};drawBtn(BOARD_X,SH*0.88,BOARD_W,BTN_H,'返回',C.surface,C.textLight);return}var myBarY=SH*0.17,myBarH=SH*0.065;if(R.myRank){roundRect(BOARD_X,myBarY,BOARD_W,myBarH,10,'rgba(231,76,60,0.15)','rgba(231,76,60,0.4)');setFont(SW*0.030,'900');ctx.textAlign='left';ctx.fillStyle='#e74c3c';ctx.fillText('我  #'+R.myRank.rank,BOARD_X+PAD,myBarY+myBarH/2);ctx.textAlign='right';ctx.fillText(R.myRank.score+'',BOARD_X+BOARD_W-PAD,myBarY+myBarH/2)}else{roundRect(BOARD_X,myBarY,BOARD_W,myBarH,10,C.surface,'rgba(255,255,255,0.05)');setFont(SW*0.028,'700');ctx.textAlign='center';ctx.fillStyle=C.textDim;ctx.fillText('完成一局即可上榜',cx,myBarY+myBarH/2)}var listY=myBarY+myBarH+GAP,rowH=SH*0.065,list=R.list;ctx.save();ctx.beginPath();ctx.rect(0,listY,SW,SH*0.65);ctx.clip();for(var i=0;i<list.length;i++){var ry=listY+i*rowH-R.scrollY;if(ry+rowH<listY||ry>listY+SH*0.65)continue;roundRect(BOARD_X,ry+2,BOARD_W,rowH-4,8,C.surface,'rgba(255,255,255,0.04)');setFont(SW*0.028,'800');ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=i<3?'#f39c12':C.textDim;ctx.fillText((i+1)+'',BOARD_X+PAD,ry+rowH/2);setFont(SW*0.028,'700');ctx.fillStyle=C.textLight;ctx.fillText(list[i].nickname||'???',BOARD_X+PAD*3,ry+rowH/2);setFont(SW*0.032,'900');ctx.textAlign='right';ctx.fillStyle='#e74c3c';ctx.fillText(String(list[i].score||0),BOARD_X+BOARD_W-PAD,ry+rowH/2)}ctx.restore();var bkY=SH*0.88;drawBtn(BOARD_X,bkY,BOARD_W,BTN_H,'返回',C.surface,C.textLight);RUI.backBtn={x:BOARD_X,y:bkY,w:BOARD_W,h:BTN_H}}

var _svRTY=0,_svRSS=0
GameGlobal.handleSurvivalRankTouch=function(type,y){var R=GameGlobal.SurvivalRank;if(type==='start'){_svRTY=y;_svRSS=R.scrollY}else if(type==='move'){var mx=Math.max(0,R.list.length*SH*0.065-SH*0.65);R.scrollY=Math.max(0,Math.min(mx,_svRSS-(y-_svRTY)))}}