// ================================================
//  profile.js - 用户昵称设置模块
// ================================================

var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
var PAD = GameGlobal.PAD, GAP = GameGlobal.GAP
var BOARD_W = GameGlobal.BOARD_W, BOARD_X = GameGlobal.BOARD_X
var BTN_H = GameGlobal.BTN_H
var C = GameGlobal.C
var roundRect = GameGlobal.roundRect, setFont = GameGlobal.setFont
var drawBg = GameGlobal.drawBg, inRect = GameGlobal.inRect

// 主页头像图片缓存
GameGlobal._avatarImgCache = {}
GameGlobal._loadHomeAvatar = function(url) {
  if (!url || GameGlobal._avatarImgCache[url]) return
  GameGlobal._avatarImgCache[url] = 'loading'  // 防止重复请求
  wx.downloadFile({
    url: url,
    success: function(res) {
      if (res.statusCode !== 200) return
      var img = wx.createImage()
      img.onload  = function() { GameGlobal._avatarImgCache[url] = img }
      img.onerror = function() { delete GameGlobal._avatarImgCache[url] }
      img.src = res.tempFilePath
    },
    fail: function() { delete GameGlobal._avatarImgCache[url] }
  })
}

// 键盘输入状态
var _keyboardOpen  = false
var _keyboardValue = ''
var _keyboardCb    = null   // 确认后的回调 function(name)

// 监听键盘输入变化
wx.onKeyboardInput(function(res) {
  _keyboardValue = res.value || ''
})

// 监听键盘确认（点完成/回车）
wx.onKeyboardConfirm(function(res) {
  _keyboardValue = res.value || ''
  _closeKeyboard(true)
})

// 监听键盘关闭
wx.offKeyboardComplete && wx.offKeyboardComplete()
wx.onKeyboardComplete(function() {
  _closeKeyboard(false)
})

function _openKeyboard(defaultVal, cb) {
  _keyboardValue = defaultVal || ''
  _keyboardCb    = cb
  _keyboardOpen  = true
  wx.showKeyboard({
    defaultValue: defaultVal || '',
    maxLength:    8,
    multiple:     false,
    confirmHold:  false,
    confirmType:  'done'
  })
}

function _closeKeyboard(confirmed) {
  if (!_keyboardOpen) return
  _keyboardOpen = false
  wx.hideKeyboard({})
  if (confirmed && _keyboardCb) {
    var name = (_keyboardValue || '').trim()
    if (name) _keyboardCb(name)
    else wx.showToast({ title: '昵称不能为空', icon: 'none' })
  }
  _keyboardCb = null
}

// 微信授权按钮（覆盖在canvas上的原生按钮）
var _wxInfoBtn = null

function _createWxBtn(x, y, w, h) {
  // 销毁旧的
  if (_wxInfoBtn) { try { _wxInfoBtn.destroy() } catch(e) {} _wxInfoBtn = null }

  _wxInfoBtn = wx.createUserInfoButton({
    type: 'text',
    text: '',           // 透明覆盖，canvas自己画样式
    style: {
      left: x, top: y, width: w, height: h,
      lineHeight: h,
      backgroundColor: 'rgba(0,0,0,0)',  // 完全透明
      color: 'rgba(0,0,0,0)',
      textAlign: 'center',
      fontSize: 14,
      borderRadius: 16,
      borderWidth: 0
    },
    withCredentials: false
  })

  _wxInfoBtn.onTap(function(res) {
    var info = res && res.userInfo
    if (info && info.nickName && info.nickName !== '微信用户') {
      var name = info.nickName.slice(0, 8)
      var avatar = info.avatarUrl || ''
      wx.setStorageSync('userInfo', { nickName: name, avatarUrl: avatar })
      try { _wxInfoBtn.destroy() } catch(e) {}
      _wxInfoBtn = null
      // 同步更新排行榜昵称和头像
      wx.cloud.callFunction({
        name: 'leaderboard',
        data: { action: 'updateProfile', nickname: name, avatarUrl: avatar },
        fail: function() {}
      })
      GameGlobal.Sound.play('click')
      GameGlobal.currentScreen = 'home'
      GameGlobal.Sound.playBgm()
    } else {
      // 用户拒绝或取消，提示重试
      wx.showToast({ title: '请授权使用微信昵称', icon: 'none' })
    }
  })
}

function _destroyWxBtn() {
  if (_wxInfoBtn) { try { _wxInfoBtn.destroy() } catch(e) {} _wxInfoBtn = null }
}

GameGlobal.Profile = {
  wxBtn:    null,
  inputBtn: null,
  skipBtn:  null,
  confirmBtn: null,
  cancelBtn:  null,

  authWithWeChat: function() {
    // 由 drawProfileScreen 在绘制按钮时调用 _createWxBtn
  },

  startInput: function() {
    _openKeyboard('', function(name) {
      GameGlobal.Profile.saveName(name)
    })
  },

  saveName: function(name) {
    _destroyWxBtn()
    if (name.length > 8) name = name.slice(0, 8)
    GameGlobal.Profile._checkAndSave(name, function() {
      GameGlobal.Sound.play('click')
      GameGlobal.currentScreen = 'home'
      GameGlobal.Sound.playBgm()
    })
  },

  // 本地关键词黑名单（拼音/变体/敏感词）
  _localCheck: function(name) {
    // 同时检测原文（中文）和小写（英文拼音）
    var s  = name.toLowerCase().replace(/\s+/g, '').replace(/[​-‏]/g, '')
    var s2 = name.replace(/\s+/g, '')  // 保留中文原文用于匹配
    var banned = [
      // ── 领导人
      '习近平','习大大','近平','毛泽东','毛主席','邓小平','江泽民','胡锦涛','李克强','温家宝','李强','王岐山',
      'xijinping','jinping','xjp','maozedong','zedong','dengxiaoping','xiaoping',
      // ── 敏感事件/地区
      '六四','天安门','法轮功','法轮大法','藏独','台独','港独','文化大革命','文革','大跃进',
      'tiananmen','liusi','falungong','falun','1989','8964',
      // ── 生殖器（中文+拼音+谐音）
      '屌','吊','叼','diao','鸡巴','jb','j8','j吧','屄','逼','叱','骚逼','骚货','骚穴','骚b',
      '阴茎','阴道','阴部','龟头','睾丸','奶子','肉棒','肉穴','淫',
      'diao','jiba','bi','biaozi',
      // ── 性行为
      '操','艹','干你','日你','肏','做爱','性交','口交','肛交','手淫','自慰','射精',
      '强奸','轮奸','乱伦','约炮','打炮','干炮','上你','搞你',
      // ── 粗口
      '傻逼','煞笔','沙雕','傻叉','傻x','傻X',
      '操你','操你妈','操你爹','你妈的','妈的','他妈','草你妈','草泥马',
      '去死','狗日','狗杂种','杂种','贱人','婊子','妓女','援交','卖淫',
      '王八蛋','混蛋','批','臭逼','骂','滚蛋',
      // ── 英文粗口
      'fuck','fuk','f*ck','fucker','fucking','shit','bitch','asshole',
      'bastard','cunt','cock','dick','pussy','whore','slut','nigger','nigga',
      'cnm','nmsl','wdnmd','shabi','caoni','cao ni','sha bi',
      // ── 暴力
      '杀死','杀你','打死你','弄死','灭了你',
    ]
    for (var i = 0; i < banned.length; i++) {
      var w = banned[i]
      if (s.indexOf(w) !== -1) return true          // 匹配英文/拼音
      if (s2.indexOf(w) !== -1) return true          // 匹配中文
    }
    return false
  },

  _checkAndSave: function(name, onPass) {
    // 第一道：本地黑名单
    if (GameGlobal.Profile._localCheck(name)) {
      wx.showModal({ title: '昵称含有违规内容', content: '请换一个昵称试试', showCancel: false })
      return
    }
    wx.showLoading({ title: '检测中...' })
    wx.cloud.callFunction({
      name: 'checkNickname',
      data: { nickname: name },
      success: function(res) {
        wx.hideLoading()
        if (res.result && res.result.blocked) {
          wx.showModal({ title: '昵称含有违规内容', content: '请换一个昵称试试', showCancel: false })
        } else {
          wx.setStorageSync('userInfo', { nickName: name, avatarUrl: (wx.getStorageSync('userInfo')||{}).avatarUrl||'' })
          if (onPass) onPass()
        }
      },
      fail: function() {
        // 检测失败不阻断用户
        wx.hideLoading()
        wx.setStorageSync('userInfo', { nickName: name, avatarUrl: (wx.getStorageSync('userInfo')||{}).avatarUrl||'' })
        if (onPass) onPass()
      }
    })
  },

  privacyAgreed: false,

  skip: function() {
    _destroyWxBtn()
    if (!GameGlobal.Profile.privacyAgreed) {
      wx.showToast({ title: '请先同意隐私协议', icon: 'none' }); return
    }
    wx.requirePrivacyAuthorize({
      success: function() {
        wx.setStorageSync('userInfo', { nickName: '神秘玩家', avatarUrl: '' })
        GameGlobal.Sound.play('click')
        GameGlobal.currentScreen = 'home'
        GameGlobal.Sound.playBgm()
      },
      fail: function() { wx.showToast({ title: '需要同意隐私协议才能继续', icon: 'none' }) }
    })
  },

  // 设置页改名（可直接传入name，或不传则弹键盘）
  editName: function(name) {
    if (name) {
      // 直接保存（来自键盘确认回调）
      if (name.length > 8) name = name.slice(0, 8)
      var info = wx.getStorageSync('userInfo') || {}
      info.nickName = name
      wx.setStorageSync('userInfo', info)
      wx.showToast({ title: '已改为「' + name + '」', icon: 'success', duration: 1500 })
      return
    }
    var current = (wx.getStorageSync('userInfo') || {}).nickName || ''
    _openKeyboard(current, function(n) {
      if (n.length > 8) n = n.slice(0, 8)
      GameGlobal.Profile._checkAndSave(n, function() {
        wx.showToast({ title: '已改为「' + n + '」', icon: 'success', duration: 1500 })
      })
    })
  },

  // 更换头像：弹选择框（相册 or 微信头像）
  _reAuthWeChat: function() {
    // 头像修改暂时关闭
    wx.showToast({ title: '头像暂不支持修改', icon: 'none' })
  },

  // 从相册选图 → 客户端审核 → 保存
  _chooseFromAlbum: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: function(res) {
        var file = res.tempFiles[0]
        wx.showLoading({ title: '审核中...' })

        // 用微信客户端内容安全接口审核（无需云函数权限）
        wx.imgSecCheck({
          filePath: file.tempFilePath,
          success: function() {
            // 审核通过：把图片存到本地，用 tempFilePath 当头像
            // 同时上传到云存储持久化
            wx.cloud.uploadFile({
              cloudPath: 'avatars/' + Date.now() + '.jpg',
              filePath: file.tempFilePath,
              success: function(upRes) {
                wx.hideLoading()
                // 获取临时访问URL
                wx.cloud.getTempFileURL({
                  fileList: [upRes.fileID],
                  success: function(urlRes) {
                    var tempUrl = urlRes.fileList[0].tempFileURL
                    var stored = wx.getStorageSync('userInfo') || {}
                    stored.avatarUrl    = tempUrl
                    stored.avatarFileID = upRes.fileID
                    wx.setStorageSync('userInfo', stored)
                    GameGlobal._avatarImgCache = {}
                    GameGlobal._loadHomeAvatar(tempUrl)
                    wx.showToast({ title: '头像已更新', icon: 'success' })
                  },
                  fail: function() {
                    // 获取URL失败就直接用本地临时路径
                    wx.hideLoading()
                    var stored = wx.getStorageSync('userInfo') || {}
                    stored.avatarUrl = file.tempFilePath
                    wx.setStorageSync('userInfo', stored)
                    GameGlobal._avatarImgCache = {}
                    GameGlobal._loadHomeAvatar(file.tempFilePath)
                    wx.showToast({ title: '头像已更新', icon: 'success' })
                  }
                })
              },
              fail: function() {
                wx.hideLoading()
                // 上传失败就先用本地临时路径（重启后会消失）
                var stored = wx.getStorageSync('userInfo') || {}
                stored.avatarUrl = file.tempFilePath
                wx.setStorageSync('userInfo', stored)
                GameGlobal._avatarImgCache = {}
                GameGlobal._loadHomeAvatar(file.tempFilePath)
                wx.showToast({ title: '头像已更新（本地）', icon: 'success' })
              }
            })
          },
          fail: function(err) {
            wx.hideLoading()
            // errCode 87014 = 内容违规
            if (err && err.errCode === 87014) {
              wx.showModal({
                title: '图片不符合规范',
                content: '该图片含有违规内容，请换一张',
                showCancel: false
              })
            } else {
              // 其他错误（网络等）直接放行
              var stored = wx.getStorageSync('userInfo') || {}
              stored.avatarUrl = file.tempFilePath
              wx.setStorageSync('userInfo', stored)
              GameGlobal._avatarImgCache = {}
              GameGlobal._loadHomeAvatar(file.tempFilePath)
              wx.showToast({ title: '头像已更新', icon: 'success' })
            }
          }
        })
      }
    })
  },

  // 使用微信头像（原生授权按钮）
  _useWxAvatar: function() {
    wx.getUserProfile({
      desc: '用于更新您的头像和昵称',
      success: function(res) {
        var info = res.userInfo
        if (!info) return
        var stored = wx.getStorageSync('userInfo') || {}
        if (info.nickName && info.nickName !== '微信用户') {
          stored.nickName = info.nickName.slice(0, 8)
        }
        // 下载头像并上传到云存储（永久链接，其他用户可见）
        if (info.avatarUrl) {
          wx.downloadFile({
            url: info.avatarUrl,
            success: function(dl) {
              var ext = '.jpg'
              var cloudPath = 'avatars/' + (wx.getStorageSync('openid') || Date.now()) + ext
              wx.cloud.uploadFile({
                cloudPath: cloudPath,
                filePath: dl.tempFilePath,
                success: function(up) {
                  wx.cloud.getTempFileURL({
                    fileList: [{ fileID: up.fileID }],
                    success: function(r) {
                      var url = r.fileList[0] && r.fileList[0].tempFileURL
                      if (url) stored.avatarUrl = url
                      stored.cloudAvatarFileID = up.fileID
                      wx.setStorageSync('userInfo', stored)
                      GameGlobal._avatarImgCache = {}
                      GameGlobal._loadHomeAvatar(stored.avatarUrl)
                      var oldNick = (wx.getStorageSync('userInfo') || {}).nickName || ''
                      wx.cloud.callFunction({
                        name: 'leaderboard',
                        data: { action: 'updateProfile', nickname: stored.nickName, avatarUrl: stored.avatarUrl, oldNickname: oldNick },
                        fail: function() {}
                      })
                      wx.showToast({ title: '资料已更新', icon: 'success' })
                    }
                  })
                },
                fail: function() {
                  // 上传失败降级使用原始URL
                  stored.avatarUrl = info.avatarUrl
                  wx.setStorageSync('userInfo', stored)
                  GameGlobal._avatarImgCache = {}
                  GameGlobal._loadHomeAvatar(stored.avatarUrl)
                  wx.showToast({ title: '资料已更新', icon: 'success' })
                }
              })
            },
            fail: function() {
              stored.avatarUrl = info.avatarUrl
              wx.setStorageSync('userInfo', stored)
              GameGlobal._avatarImgCache = {}
              GameGlobal._loadHomeAvatar(stored.avatarUrl)
              wx.showToast({ title: '资料已更新', icon: 'success' })
            }
          })
        } else {
          wx.setStorageSync('userInfo', stored)
          wx.showToast({ title: '昵称已更新', icon: 'success' })
        }
      },
      fail: function() {
        wx.showToast({ title: '请授权获取头像', icon: 'none' })
      }
    })
  },

  // 键盘打开时是否需要绘制输入框覆盖层
  isTyping: function() { return _keyboardOpen },
  getValue: function() { return _keyboardValue }
}

// ---- 玩家资料弹出层 ----
GameGlobal.UserProfileUI = { editBtn:null, avatarBtn:null, logoutBtn:null, backBtn:null }

GameGlobal.drawUserProfileScreen = function() {
  // 半透明遮罩
  drawBg()
  var UI = GameGlobal.UserProfileUI
  var cx = SW/2
  var uinfo = wx.getStorageSync('userInfo') || {}
  var nickName = uinfo.nickName || '神秘玩家'
  var avatarUrl = uinfo.avatarUrl || ''

  // 卡片背景
  var cardW = BOARD_W, cardH = SH*0.60
  var cardX = BOARD_X, cardY = SH*0.18
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10
  roundRect(cardX, cardY, cardW, cardH, 24, C.surface, 'rgba(255,255,255,0.1)')
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'

  // 顶部渐变条
  var hdrH = cardH*0.28
  var hdrGrad = ctx.createLinearGradient(cardX, cardY, cardX+cardW, cardY+hdrH)
  hdrGrad.addColorStop(0, 'rgba(233,69,96,0.4)')
  hdrGrad.addColorStop(1, 'rgba(155,89,182,0.4)')
  roundRect(cardX, cardY, cardW, hdrH, 24, hdrGrad)
  // 底部裁掉圆角
  ctx.fillStyle = hdrGrad
  ctx.fillRect(cardX, cardY+hdrH-16, cardW, 16)

  // 头像圆（大）
  var avR = Math.round(SW*0.11)
  var avX = cx, avY = cardY + hdrH*0.82
  ctx.beginPath(); ctx.arc(avX, avY, avR+3, 0, Math.PI*2)
  ctx.fillStyle = C.surface; ctx.fill()
  ctx.beginPath(); ctx.arc(avX, avY, avR, 0, Math.PI*2)
  var avGrad = ctx.createRadialGradient(avX, avY, 0, avX, avY, avR)
  avGrad.addColorStop(0, 'rgba(245,166,35,0.4)')
  avGrad.addColorStop(1, 'rgba(233,69,96,0.2)')
  ctx.fillStyle = avGrad; ctx.fill()

  var avImg = avatarUrl ? GameGlobal._avatarImgCache[avatarUrl] : null
  if (avImg && avImg !== 'loading') {
    ctx.save()
    ctx.beginPath(); ctx.arc(avX, avY, avR, 0, Math.PI*2); ctx.clip()
    ctx.drawImage(avImg, avX-avR, avY-avR, avR*2, avR*2)
    ctx.restore()
  } else {
    setFont(avR*0.9, '900')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = C.textLight; ctx.fillText(nickName[0], avX, avY)
  }

  // 换头像小按钮暂时关闭
  UI.avatarBtn = null

  // 昵称
  var nickY = cardY + hdrH + avR*1.1
  setFont(SW*0.058, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = C.textLight; ctx.fillText(nickName, cx, nickY)

  // 三个按钮
  var btnW = cardW*0.8, btnH = BTN_H*0.95, btnX = cx - btnW/2

  // 修改昵称（暂时关闭）
  UI.editBtn = null
  var btn1Y = nickY + SW*0.08

  // 退出登录
  var btn2Y = btn1Y
  roundRect(btnX, btn2Y, btnW, btnH, 14, 'rgba(255,255,255,0.05)', 'rgba(233,69,96,0.4)')
  setFont(btnH*0.34, '700'); ctx.fillStyle = C.accent
  ctx.fillText('退出登录', cx, btn2Y+btnH/2)
  UI.logoutBtn = { x:btnX, y:btn2Y, w:btnW, h:btnH }

  // 返回
  var btn3Y = btn2Y + btnH + GAP*1.5
  roundRect(btnX, btn3Y, btnW, btnH*0.8, 14, C.surface, 'rgba(255,255,255,0.08)')
  setFont(btnH*0.30, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('返回', cx, btn3Y+btnH*0.40)
  UI.backBtn = { x:btnX, y:btn3Y, w:btnW, h:btnH*0.8 }
}

// ---- 昵称设置界面绘制 ----
GameGlobal.drawProfileScreen = function() {
  drawBg()
  var P = GameGlobal.Profile

  // 星星
  var stars = GameGlobal.stars || []
  GameGlobal.starTick = (GameGlobal.starTick || 0) + 0.02
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i]
    s.a = 0.3 + Math.abs(Math.sin(GameGlobal.starTick * s.sp * 100 + s.x)) * 0.7
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2)
    ctx.fillStyle = 'rgba(255,255,255,' + s.a + ')'; ctx.fill()
  }

  var cx = SW / 2

  // 头像占位圆
  var iconR = SW*0.14, iconY = SH*0.2
  ctx.beginPath(); ctx.arc(cx, iconY, iconR, 0, Math.PI*2)
  var iconGrad = ctx.createRadialGradient(cx, iconY, 0, cx, iconY, iconR)
  iconGrad.addColorStop(0, 'rgba(245,166,35,0.4)')
  iconGrad.addColorStop(1, 'rgba(233,69,96,0.2)')
  ctx.fillStyle = iconGrad; ctx.fill()
  ctx.strokeStyle = 'rgba(245,166,35,0.6)'; ctx.lineWidth = 2; ctx.stroke()
  setFont(iconR*1.1, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText('?', cx, iconY)

  setFont(SW*0.062, '900')
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx-SW*0.2, 0, cx+SW*0.2, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(1, '#e94560')
  ctx.shadowColor = 'rgba(233,69,96,0.3)'; ctx.shadowBlur = 10
  ctx.fillStyle = tg; ctx.fillText('设置你的昵称', cx, SH*0.36)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  setFont(SW*0.032, '700')
  ctx.fillStyle = C.textDim
  ctx.fillText('昵称将显示在排行榜和PK对战中', cx, SH*0.42)

  var btnW = BOARD_W, btnH = BTN_H*1.1, btnX = BOARD_X

  // 键盘打开时：显示输入预览框 + 确认/取消
  if (P.isTyping()) {
    var boxY = SH*0.48, boxH = BTN_H*1.2
    roundRect(btnX, boxY, btnW, boxH, 14, 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.3)')
    var val = P.getValue()
    setFont(boxH*0.38, '700')
    ctx.fillStyle = val ? C.textLight : C.textDim
    ctx.fillText(val || '输入中...', cx, boxY+boxH/2)

    // 确认按钮
    var cfmY = boxY + boxH + GAP*1.5, cfmW = (btnW-GAP)/2
    var cfmGrad = ctx.createLinearGradient(btnX, 0, btnX+cfmW, 0)
    cfmGrad.addColorStop(0, '#e94560'); cfmGrad.addColorStop(1, '#9b59b6')
    roundRect(btnX, cfmY, cfmW, BTN_H, 14, cfmGrad)
    setFont(BTN_H*0.36, '900'); ctx.fillStyle = '#fff'
    ctx.fillText('✓ 确认', btnX+cfmW/2, cfmY+BTN_H/2)
    P.confirmBtn = { x:btnX, y:cfmY, w:cfmW, h:BTN_H }

    // 取消按钮
    var canX = btnX+cfmW+GAP
    roundRect(canX, cfmY, cfmW, BTN_H, 14, C.surface, 'rgba(255,255,255,0.1)')
    setFont(BTN_H*0.34, '700'); ctx.fillStyle = C.textDim
    ctx.fillText('✕ 取消', canX+cfmW/2, cfmY+BTN_H/2)
    P.cancelBtn = { x:canX, y:cfmY, w:cfmW, h:BTN_H }
    return
  }

  // 只允许使用微信昵称
  var btn1Y = SH*0.52

  // ① 使用微信昵称
  ctx.shadowColor = 'rgba(7,193,96,0.4)'; ctx.shadowBlur = 14
  var wxGrad = ctx.createLinearGradient(btnX, 0, btnX+btnW, 0)
  wxGrad.addColorStop(0, '#07c160'); wxGrad.addColorStop(1, '#06ad56')
  roundRect(btnX, btn1Y, btnW, btnH, 16, wxGrad)
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
  setFont(btnH*0.36, '900'); ctx.fillStyle = '#fff'
  ctx.fillText('使用微信昵称', cx, btn1Y+btnH/2)
  P.wxBtn = { x:btnX, y:btn1Y, w:btnW, h:btnH }
  P.inputBtn = null
  // 每次都重建原生按钮确保能点到
  if (_wxInfoBtn) { try { _wxInfoBtn.destroy() } catch(e) {} ; _wxInfoBtn = null }
  // wx.getUserProfile 在 game.js 点击时直接调用

  // ② 跳过
  var btn3Y = btn1Y+btnH+GAP*1.5
  roundRect(btnX, btn3Y, btnW, btnH*0.8, 16, C.surface, 'rgba(255,255,255,0.08)')
  setFont(btnH*0.30, '700'); ctx.fillStyle = C.textDim
  ctx.fillText('跳过，以「神秘玩家」参与', cx, btn3Y+btnH*0.40)
  P.skipBtn = { x:btnX, y:btn3Y, w:btnW, h:btnH*0.8 }

  // ── 隐私协议区域（底部）
  var privY = btn3Y + btnH*0.8 + GAP*2.5
  var agreed = P.privacyAgreed

  // 复选框
  var cbSize = Math.round(SW*0.048), cbX = cx - SW*0.30, cbY = privY - cbSize/2
  roundRect(cbX, cbY, cbSize, cbSize, 5, agreed ? '#07c160' : 'rgba(255,255,255,0.12)',
            agreed ? null : 'rgba(255,255,255,0.3)')
  if (agreed) {
    setFont(cbSize*0.75, '900'); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText('✓', cbX+cbSize/2, cbY+cbSize/2)
  }
  P.privacyCbBtn = { x:cbX-GAP, y:cbY-GAP, w:cbSize+GAP*2, h:cbSize+GAP*2 }

  // 文字 + 协议链接
  setFont(SW*0.028, '600'); ctx.textBaseline='middle'
  ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.textAlign='left'
  ctx.fillText('我已阅读并同意', cbX+cbSize+GAP*1.2, privY)
  var preW = ctx.measureText('我已阅读并同意').width
  var linkX = cbX+cbSize+GAP*1.2+preW+GAP*0.4
  setFont(SW*0.028, '700'); ctx.fillStyle='#07c160'
  ctx.fillText('《隐私保护指引》', linkX, privY)
  var linkW = ctx.measureText('《隐私保护指引》').width
  P.privacyLinkBtn = { x:linkX-GAP, y:privY-SW*0.020, w:linkW+GAP*2, h:SW*0.040 }

  setFont(SW*0.023, '400'); ctx.textAlign='center'; ctx.textBaseline='middle'
  ctx.fillStyle='rgba(255,255,255,0.18)'
  ctx.fillText('点击使用前请先同意隐私协议', cx, privY+SW*0.040)
}