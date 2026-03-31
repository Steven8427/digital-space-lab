// ================================================
//  数字空间实验室 - 入口文件
//  所有功能已拆分到 js/ 各模块
//  v2.3 - PK模块拆分版
// ================================================

// ── 1. 初始化云开发
var _localCfg = {}; try { _localCfg = require('./config.local.js') } catch(e) {}
wx.cloud.init({ env: _localCfg.cloudEnv || 'YOUR_CLOUD_ENV_ID', traceUser: true })
console.log('[game.js] v2.4 闯关模式版 已加载')

// ── 2. 加载模块（顺序很重要！layout 必须第一个）
require('./js/layout.js')    // canvas、尺寸、颜色、绘图工具 → GameGlobal
require('./js/sound.js')     // GameGlobal.Sound
require('./js/timer.js')     // GameGlobal.Timer
require('./js/gameLogic.js') // GameGlobal.Game
require('./js/ad.js')        // GameGlobal.AdManager
require('./js/profile.js')   // GameGlobal.Profile, drawProfileScreen
require('./js/rank.js')      // GameGlobal.Rank, drawRankScreen
try { require('./js/render.js') } catch(e) { console.error('render.js 加载失败', e) }
try { require('./js/huarongLogic.js') } catch(e) { console.error('huarongLogic.js 加载失败', e) }
try { require('./js/huarongRender.js') } catch(e) { console.error('huarongRender.js 加载失败', e) }
try { require('./js/sudokuLogic.js') } catch(e) { console.error('sudokuLogic.js 加载失败', e) }
try { require('./js/sudokuRender.js') } catch(e) { console.error('sudokuRender.js 加载失败', e) }
try { require('./js/sudokuChallenge.js') } catch(e) { console.error('sudokuChallenge.js 加载失败', e) }
try { require('./js/sudokuChallengeRender.js') } catch(e) { console.error('sudokuChallengeRender.js 加载失败', e) }
try { require('./js/survivalSprites.js') } catch(e) { console.error('survivalSprites.js 加载失败', e) }
try { require('./js/survivalLogic.js') } catch(e) { console.error('survivalLogic.js 加载失败', e) }
try { require('./js/survivalRender.js') } catch(e) { console.error('survivalRender.js 加载失败', e) }
try { require('./js/achieveShop.js') } catch(e) { console.error('achieveShop.js 加载失败', e) }
try { require('./js/achieveShopRender.js') } catch(e) { console.error('achieveShopRender.js 加载失败', e) }
try { require('./js/themeSystem.js') } catch(e) { console.error('themeSystem.js 加载失败', e) }
try { require('./js/tileMatchLogic.js') } catch(e) { console.error('tileMatchLogic.js 加载失败', e) }
try { require('./js/tileMatchRender.js') } catch(e) { console.error('tileMatchRender.js 加载失败', e) }

// ── 2.5 小游戏切后台 / 切回前台时同步数据
wx.onHide(function() {
  // 切后台时立即同步，防止数据丢失
  if (GameGlobal.AchieveShop && GameGlobal.AchieveShop._syncToCloud) {
    if (GameGlobal.AchieveShop._saveTimer) {
      clearTimeout(GameGlobal.AchieveShop._saveTimer)
      GameGlobal.AchieveShop._saveTimer = null
    }
    GameGlobal.AchieveShop._syncToCloud()
    console.log('[lifecycle] 切后台，数据已同步')
  }
})

wx.onShow(function() {
  // 切回前台时拉取最新云端数据（多设备场景）
  if (GameGlobal.AchieveShop && GameGlobal.AchieveShop._syncFromCloud) {
    GameGlobal.AchieveShop._syncFromCloud()
    console.log('[lifecycle] 切前台，拉取云端数据')
  }
})

// ── 3. 当前界面状态
var currentScreen = 'loading'
var _loadingProgress = 0
var _loadingDone = false
var _loadingStartTime = Date.now()

// 让 GameGlobal.currentScreen 和 currentScreen 双向同步
try {
  Object.defineProperty(GameGlobal, 'currentScreen', {
    get: function() { return currentScreen },
    set: function(v) { currentScreen = v },
    configurable: true
  })
} catch(e) {}

// ── 4. 切屏函数（挂到 GameGlobal 供各模块调用）
GameGlobal.setScreen = function(name) {
  GameGlobal.Sound.play('click')
  // 清理残留定时器
  if (GameGlobal.Game && GameGlobal.Game._clearGameOverTimer) GameGlobal.Game._clearGameOverTimer()
  currentScreen = name
  if (name === 'home')         { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm() }
  if (name === 'lobby2048')    { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm() }
  if (name === 'lobbyHuarong') { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm() }
  if (name === 'game')         { GameGlobal.Game.init();  GameGlobal.Sound.playBgm() }
  if (name === 'settings')     { GameGlobal.Timer.stop() }
  if (name === 'rank')         { GameGlobal.Timer.stop(); GameGlobal.Rank.load() }
  if (name === 'pk')           { GameGlobal.Timer.stop(); GameGlobal.Sound.pauseBgm() }
  if (name === 'huarong')      { if (GameGlobal.Huarong) { GameGlobal.Huarong.init(); GameGlobal.Sound.playBgm() } }
  if (name === 'huarongRank')  { if (GameGlobal.HuarongRank) { GameGlobal.HuarongRank.load(); GameGlobal.HuarongRank.scrollY = 0 } }
  if (name === 'lobbySudoku')  { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm() }
  if (name === 'sudoku')       { if (GameGlobal.Sudoku) { GameGlobal.Sudoku.init(); GameGlobal.Sound.playBgm() } }
  if (name === 'sudokuRank')   { if (GameGlobal.SudokuRank) { GameGlobal.SudokuRank.load(); GameGlobal.SudokuRank.scrollY = 0 } }
  if (name === 'sudokuChallenge') { GameGlobal.Timer.stop(); if (GameGlobal.SudokuChallenge) GameGlobal.SudokuChallenge.loadProgress() }
  if (name === 'sudokuChallengeRank') { if (GameGlobal.ChallengeRank) { GameGlobal.ChallengeRank.load(); GameGlobal.ChallengeRank.scrollY = 0 } }
  if (name === 'lobbySurvival')  { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm() }
  if (name === 'survival')      { if (GameGlobal.Survival) { GameGlobal.Survival.init(); GameGlobal.Sound.pauseBgm() } }
  if (name === 'survivalRank')  { if (GameGlobal.SurvivalRank) { GameGlobal.SurvivalRank.load(); GameGlobal.SurvivalRank.scrollY = 0 } }
  if (name === 'lobbyTile')     { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm() }
  if (name === 'tileMatch')     { if (GameGlobal.TileMatch) { GameGlobal.TileMatch.init(GameGlobal.TileMatch.level || 1); GameGlobal.Sound.playBgm() } }
  if (name === 'tileMatchRank') { if (GameGlobal.TileMatchRank) { GameGlobal.TileMatchRank.load(); GameGlobal.TileMatchRank.scrollY = 0 } }
}

// ── 5. 触摸处理
var touchStartX = 0, touchStartY = 0

wx.onTouchStart(function(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  if (currentScreen === 'rank') {
    GameGlobal.handleRankTouch('start', touchStartY)
  }
  if (currentScreen === 'huarongRank') {
    if (GameGlobal.handleHuarongRankTouch) GameGlobal.handleHuarongRankTouch('start', touchStartY)
  }
  if (currentScreen === 'sudokuRank') {
    if (GameGlobal.handleSudokuRankTouch) GameGlobal.handleSudokuRankTouch('start', touchStartY)
  }
  if (currentScreen === 'sudokuChallengeRank') {
    if (GameGlobal.handleChallengeRankTouch) GameGlobal.handleChallengeRankTouch('start', touchStartY)
  }
  if (currentScreen === 'admin') {
    if (GameGlobal.handleAdminTouch) GameGlobal.handleAdminTouch('start', touchStartY)
  }
  if (currentScreen === 'survivalRank') {
    if (GameGlobal.handleSurvivalRankTouch) GameGlobal.handleSurvivalRankTouch('start', touchStartY)
  }
  if (currentScreen === 'survival') {
    if (GameGlobal.Survival) GameGlobal.Survival.joystickStart(touchStartX, touchStartY)
  }
  if (currentScreen === 'achievement') {
    if (GameGlobal.handleAchieveTouch) GameGlobal.handleAchieveTouch('start', touchStartY)
  }
  if (currentScreen === 'shop') {
    if (GameGlobal.handleShopTouch) GameGlobal.handleShopTouch('start', touchStartY)
  }
  if (currentScreen === 'tileMatchRank') {
    if (GameGlobal.handleTileMatchRankTouch) GameGlobal.handleTileMatchRankTouch('start', touchStartY)
  }
})

wx.onTouchMove(function(e) {
  if (currentScreen === 'rank') {
    GameGlobal.handleRankTouch('move', e.touches[0].clientY)
  }
  if (currentScreen === 'huarongRank') {
    if (GameGlobal.handleHuarongRankTouch) GameGlobal.handleHuarongRankTouch('move', e.touches[0].clientY)
  }
  if (currentScreen === 'sudokuRank') {
    if (GameGlobal.handleSudokuRankTouch) GameGlobal.handleSudokuRankTouch('move', e.touches[0].clientY)
  }
  if (currentScreen === 'sudokuChallengeRank') {
    if (GameGlobal.handleChallengeRankTouch) GameGlobal.handleChallengeRankTouch('move', e.touches[0].clientY)
  }
  if (currentScreen === 'admin') {
    if (GameGlobal.handleAdminTouch) GameGlobal.handleAdminTouch('move', e.touches[0].clientY)
  }
  if (currentScreen === 'survivalRank') {
    if (GameGlobal.handleSurvivalRankTouch) GameGlobal.handleSurvivalRankTouch('move', e.touches[0].clientY)
  }
  if (currentScreen === 'survival') {
    if (GameGlobal.Survival) GameGlobal.Survival.joystickMove(e.touches[0].clientX, e.touches[0].clientY)
  }
  if (currentScreen === 'achievement') {
    if (GameGlobal.handleAchieveTouch) GameGlobal.handleAchieveTouch('move', e.touches[0].clientY)
  }
  if (currentScreen === 'shop') {
    if (GameGlobal.handleShopTouch) GameGlobal.handleShopTouch('move', e.touches[0].clientY)
  }
  if (currentScreen === 'tileMatchRank') {
    if (GameGlobal.handleTileMatchRankTouch) GameGlobal.handleTileMatchRankTouch('move', e.touches[0].clientY)
  }
})

wx.onTouchEnd(function(e) {
  try {
  // 生存模式摇杆释放
  if (currentScreen === 'survival' && GameGlobal.Survival) {
    GameGlobal.Survival.joystickEnd()
  }

  var x  = e.changedTouches[0].clientX
  var y  = e.changedTouches[0].clientY
  var dx = x - touchStartX
  var dy = y - touchStartY

  // 点击
  if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
    handleTap(x, y)
    return
  }

  // 滑动
  if (currentScreen === 'game' && !GameGlobal.Game.gameOver) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    GameGlobal.Game.move(Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down'  : 'up'))
  } else if (currentScreen === 'pk') {
    if (GameGlobal.handlePKSwipe) GameGlobal.handlePKSwipe(dx, dy, touchStartX, touchStartY)
  } else if (currentScreen === 'huarong') {
    if (!GameGlobal.Huarong) return
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    var hrDir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down'  : 'up')
    var hrCell = GameGlobal.Huarong.hitTest(touchStartX, touchStartY)
    if (hrCell) GameGlobal.Huarong.swipe(hrCell[0], hrCell[1], hrDir)
  }
  } catch(e2) { console.error('touchEnd 出错:', e2) }
})

function handleTap(x, y) {
  var inRect = GameGlobal.inRect
  try {

  if (currentScreen === 'profile') {
    var P = GameGlobal.Profile
    if (P.isTyping()) {
      if      (inRect(x, y, P.confirmBtn)) { var v = P.getValue().trim(); if(v) P.saveName(v); else wx.showToast({title:'昵称不能为空',icon:'none'}) }
      else if (inRect(x, y, P.cancelBtn))  { wx.hideKeyboard({}); GameGlobal.currentScreen = 'profile' }
    } else {
      // ── 隐私协议复选框
      if (P.privacyCbBtn && inRect(x, y, P.privacyCbBtn)) {
        P.privacyAgreed = !P.privacyAgreed
        GameGlobal.Sound.play('click')
      // ── 隐私协议链接
      } else if (P.privacyLinkBtn && inRect(x, y, P.privacyLinkBtn)) {
        wx.openPrivacyContract({ fail: function() {} })
      } else if (P.wxBtn && inRect(x, y, P.wxBtn)) {
        if (!P.privacyAgreed) {
          wx.showToast({ title: '请先勾选同意隐私协议', icon: 'none' }); return
        }
        // 防重复点击
        if (GameGlobal._profileLoading) return
        GameGlobal._profileLoading = true
        setTimeout(function() { GameGlobal._profileLoading = false }, 3000)
        // 直接调用 wx.getUserProfile（新版微信推荐方式）
        wx.getUserProfile({
          desc: '用于显示您的昵称和头像',
          success: function(res) {
            var info = res.userInfo
            if (info && info.nickName && info.nickName !== '微信用户') {
              var name = info.nickName.slice(0, 8)
              var rawAvatar = info.avatarUrl || ''
              function finishLogin(avatarUrl) {
                wx.setStorageSync('userInfo', { nickName: name, avatarUrl: avatarUrl })
                var oldNick = (wx.getStorageSync('userInfo') || {}).nickName || ''
                wx.cloud.callFunction({
                  name: 'leaderboard',
                  data: { action: 'updateProfile', nickname: name, avatarUrl: avatarUrl, oldNickname: oldNick },
                  fail: function() {}
                })
                GameGlobal.Sound.play('click')
                GameGlobal.currentScreen = 'home'
                GameGlobal.Sound.playBgm()
              }
              // 上传头像到云存储获取永久链接
              if (rawAvatar) {
                wx.downloadFile({
                  url: rawAvatar,
                  success: function(dl) {
                    wx.cloud.uploadFile({
                      cloudPath: 'avatars/' + Date.now() + '.jpg',
                      filePath: dl.tempFilePath,
                      success: function(up) {
                        wx.cloud.getTempFileURL({
                          fileList: [{ fileID: up.fileID }],
                          success: function(r) {
                            var url = r.fileList[0] && r.fileList[0].tempFileURL
                            finishLogin(url || rawAvatar)
                          },
                          fail: function() { finishLogin(rawAvatar) }
                        })
                      },
                      fail: function() { finishLogin(rawAvatar) }
                    })
                  },
                  fail: function() { finishLogin(rawAvatar) }
                })
              } else {
                finishLogin('')
              }
            } else {
              wx.showToast({ title: '获取昵称失败，请重试', icon: 'none' })
            }
          },
          fail: function() {
            wx.showToast({ title: '请授权使用微信昵称', icon: 'none' })
          }
        })
      } else if (inRect(x, y, P.skipBtn)) {
        if (!P.privacyAgreed) {
          wx.showToast({ title: '请先勾选同意隐私协议', icon: 'none' }); return
        }
        GameGlobal.Profile.skip()
      }
    }

  } else if (currentScreen === 'home') {
    var H = GameGlobal.Home
    // 隐藏入口：连续点击标题区域5次进入管理后台
    if (!GameGlobal._adminTaps) GameGlobal._adminTaps = 0
    if (!GameGlobal._adminTapTime) GameGlobal._adminTapTime = 0
    var titleZone = { x: SW*0.2, y: SH*0.25, w: SW*0.6, h: SH*0.25 }
    if (inRect(x, y, titleZone)) {
      var now2 = Date.now()
      if (now2 - GameGlobal._adminTapTime > 2000) GameGlobal._adminTaps = 0
      GameGlobal._adminTaps++
      GameGlobal._adminTapTime = now2
      if (GameGlobal._adminTaps >= 5) {
        GameGlobal._adminTaps = 0
        currentScreen = 'adminLogin'
      }
    }
    if (inRect(x, y, H.avatarBtn))   { GameGlobal.Sound.play('click'); currentScreen = 'userProfile' }
    else if (H.btn2048    && inRect(x, y, H.btn2048))    GameGlobal.setScreen('lobby2048')
    else if (H.btnHuarong && inRect(x, y, H.btnHuarong)) GameGlobal.setScreen('lobbyHuarong')
    else if (H.btnSudoku  && inRect(x, y, H.btnSudoku))  GameGlobal.setScreen('lobbySudoku')
    else if (H.btnSurvival && inRect(x, y, H.btnSurvival)) GameGlobal.setScreen('lobbySurvival')
    else if (H.btnTile && inRect(x, y, H.btnTile)) GameGlobal.setScreen('lobbyTile')
    else if (H.achieveBtn && inRect(x, y, H.achieveBtn)) { GameGlobal.Sound.play('click'); GameGlobal._achScrollY = 0; GameGlobal._achShopFrom = 'home'; currentScreen = 'achievement' }
    else if (H.shopBtn && inRect(x, y, H.shopBtn)) { GameGlobal.Sound.play('click'); GameGlobal._shopScrollY = 0; GameGlobal._achShopFrom = 'home'; currentScreen = 'shop' }
    else if (H.settingBtn && inRect(x, y, H.settingBtn)) {
      GameGlobal._fromGame = 'home'
      GameGlobal.setScreen('settings')
    }

  } else if (currentScreen === 'game') {
    var GU = GameGlobal.GameUI, G = GameGlobal.Game
    if (GU.helpBtn && inRect(x, y, GU.helpBtn)) {
      GameGlobal.TutorialUI.page = 0
      GameGlobal.TutorialUI._from = 'game'
      GameGlobal._tutorialFor = '2048'
      if (!GameGlobal.Game.gameOver) GameGlobal.Timer.stop()
      currentScreen = 'tutorial'
    } else if (inRect(x, y, GU.settingBtn)) {
      GameGlobal._fromGame = 'game'
      GameGlobal._tutorialFor = '2048'
      GameGlobal.setScreen('settings')
    } else if (!G.gameOver && inRect(x, y, GU.undoItemBtn)) {
      if (!G.prevGrid) {
        wx.showToast({ title: '没有可以撤销的步骤', icon: 'none' }); return
      }
      // 优先级：免费 > 道具 > 广告
      if (G.undoItem.left > 0) {
        G.useUndoItem()
      } else if (GameGlobal.AchieveShop && GameGlobal.AchieveShop.getPropCount('prop_undo') > 0) {
        GameGlobal.AchieveShop.useProp('prop_undo')
        G.undo()  // 统一调用 undo()，确保定时器被取消
        wx.showToast({ title: '撤销成功（道具）', icon: 'success' })
      } else {
        G.useUndoItem() // 走广告流程
      }
    } else if (!G.gameOver && inRect(x, y, GU.newBtn)) {
      GameGlobal.Sound.play('click')
      if (G.score > 0) {
        wx.showModal({
          title: '新游戏', content: '确定要开始新一局吗？当前游戏将会消失',
          confirmText: '确定', cancelText: '取消',
          success: function(res) {
            if (res.confirm) { G.init(); GameGlobal.Sound.playBgm() }
          }
        })
      } else {
        G.init(); GameGlobal.Sound.playBgm()
      }
    } else if (G.gameOver && inRect(x, y, GU.overlayBtn)) {
      GameGlobal.Sound.play('click')
      // 成就系统
      if (GameGlobal.AchieveShop) {
        var maxT = 0; for(var r=0;r<4;r++) for(var c=0;c<4;c++) if(G.grid[r][c]>maxT) maxT=G.grid[r][c]
        GameGlobal.AchieveShop.onGameEvent('2048_play', { won:G.gameWon, score:G.score, maxTile:maxT })
      }
      if (G.gameWon && !G.keepPlaying) {
        GameGlobal.Rank.upload(G.score, GameGlobal.Timer.seconds, true)
      }
      G.init(); GameGlobal.Sound.playBgm()
    } else if (G.gameOver && G.gameWon && !G.keepPlaying && inRect(x, y, GU.continueBtn)) {
      GameGlobal.Sound.play('click')
      G.gameOver = false; G.keepPlaying = true
      GameGlobal.Timer.resume()
    }

  } else if (currentScreen === 'rank') {
    var R = GameGlobal.Rank
    if      (inRect(x, y, R.tabScoreBtn)) { R.tab = 'score'; R.scrollY = 0 }
    else if (inRect(x, y, R.tabTimeBtn))  { R.tab = 'time';  R.scrollY = 0 }
    else if (inRect(x, y, R.backBtn)) {
      GameGlobal.Sound.play('click'); currentScreen = 'lobby2048'; GameGlobal.Sound.playBgm()
    }

  } else if (currentScreen === 'pk') {
    if (GameGlobal.handlePKTap) GameGlobal.handlePKTap(x, y)

  } else if (currentScreen === 'userProfile') {
    var UI = GameGlobal.UserProfileUI
    var P  = GameGlobal.Profile
    if (P.isTyping()) {
      if      (inRect(x, y, P.confirmBtn)) { var v = P.getValue().trim(); if(v) P.editName(v); }
      else if (inRect(x, y, P.cancelBtn))  { wx.hideKeyboard({}) }
    } else {
      if (UI.editBtn && inRect(x, y, UI.editBtn)) {
        P.editName()
      } else if (UI.avatarBtn && inRect(x, y, UI.avatarBtn)) {
        // 头像修改暂时关闭
        GameGlobal.Profile._reAuthWeChat()
      } else if (inRect(x, y, UI.logoutBtn)) {
        wx.showModal({
          title: '退出登录',
          content: '确认退出？退出后需要重新设置昵称',
          confirmText: '退出', cancelText: '取消',
          success: function(res) {
            if (res.confirm) {
              wx.removeStorageSync('userInfo')
              GameGlobal.Sound.play('click')
              currentScreen = 'profile'
            }
          }
        })
      } else if (inRect(x, y, UI.backBtn)) {
        GameGlobal.Sound.play('click')
        currentScreen = 'home'
      }
    }

  } else if (currentScreen === 'adminLogin') {
    var AI = GameGlobal.AdminUI
    var AD = GameGlobal._adminData
    if (inRect(x, y, AI.pwdBox)) {
      wx.showKeyboard({ defaultValue: AD.loginPwd||'', maxLength:20, confirmType:'done' })
      wx.onKeyboardInput(function(res) { AD.loginPwd = res.value })
      wx.onKeyboardConfirm(function() { wx.hideKeyboard({}) })
    } else if (inRect(x, y, AI.confirmBtn)) {
      if (AD.loginPwd === 'longlong1234') {
        AD.loggedIn = true; AD.key = AD.loginPwd
        AD.stats = null; AD.users = []; AD.logs = []; AD.tab = 'stats'
        currentScreen = 'admin'
      } else {
        wx.showToast({ title:'密钥错误', icon:'error' })
        AD.loginPwd = ''
      }
    } else if (inRect(x, y, AI.backBtn)) {
      currentScreen = 'home'
    }

  } else if (currentScreen === 'admin') {
    var AI = GameGlobal.AdminUI
    var AD = GameGlobal._adminData
    if (inRect(x, y, AI.backBtn)) {
      currentScreen = 'home'
    } else if (AI.refreshBtn && inRect(x, y, AI.refreshBtn)) {
      AD.stats = null; AD.loading = false
    } else if (AI.debugCoinBtn && inRect(x, y, AI.debugCoinBtn)) {
      if (GameGlobal.AchieveShop) {
        GameGlobal.AchieveShop.debugSetCoins(100000)
        wx.showToast({ title: '金币已设为100000', icon: 'success' })
      }
    } else if (AI.debugClearPropsBtn && inRect(x, y, AI.debugClearPropsBtn)) {
      if (GameGlobal.AchieveShop) {
        GameGlobal.AchieveShop.propCounts = {}
        GameGlobal.AchieveShop._save()
        wx.showToast({ title: '道具已清空', icon: 'success' })
      }
    } else if (AI.debugClearSkinsBtn && inRect(x, y, AI.debugClearSkinsBtn)) {
      if (GameGlobal.AchieveShop) {
        GameGlobal.AchieveShop.owned = { skin_default: true }
        GameGlobal.AchieveShop.equipped = {}
        if (GameGlobal.applyTheme) GameGlobal.applyTheme()
        GameGlobal.AchieveShop._save()
        wx.showToast({ title: '皮肤已清空，恢复默认', icon: 'success' })
      }
    } else if (AI.debugClearAchBtn && inRect(x, y, AI.debugClearAchBtn)) {
      if (GameGlobal.AchieveShop) {
        GameGlobal.AchieveShop.unlocked = {}
        GameGlobal.AchieveShop._save()
        wx.showToast({ title: '成就已全部重置', icon: 'success' })
      }
    } else if (inRect(x, y, AI.tab0)) { AD.tab='stats'; AD.stats=null; AD.loading=false; AD.statsScrollY=0 }
    else if (inRect(x, y, AI.tab1)) { AD.tab='users'; AD.users=[]; AD.page=1; AD.loading=false; AD._usersLoaded=false }
    else if (inRect(x, y, AI.tab2)) { AD.tab='logs'; AD.logs=[]; AD.page=1; AD.loading=false; AD._logsLoaded=false }
    // 搜索按钮
    else if (AI.searchBtn && inRect(x, y, AI.searchBtn)) {
      if (AD.keyword) {
        // 已有搜索词，点击清除
        AD.keyword = ''; AD.page = 1; AD.users = []; AD.loading = false; AD._usersLoaded = false
      } else {
        // 打开键盘搜索
        wx.showKeyboard({ defaultValue: '', maxLength: 12, confirmType: 'search' })
        wx.onKeyboardInput(function(res) { AD._searchTmp = res.value })
        wx.onKeyboardConfirm(function() {
          wx.offKeyboardInput(); wx.offKeyboardConfirm()
          AD.keyword = AD._searchTmp || ''; AD.page = 1; AD.users = []; AD.loading = false; AD._usersLoaded = false
          wx.hideKeyboard({})
        })
      }
    }
    // 翻页
    else if (AI.prevBtn && inRect(x, y, AI.prevBtn)) {
      AD.page = Math.max(1, AD.page - 1)
      if (AD.tab === 'users') { AD.users = []; AD.loading = false; AD._usersLoaded = false }
      if (AD.tab === 'logs')  { AD.logs  = []; AD.loading = false; AD._logsLoaded = false }
    }
    else if (AI.nextBtn && inRect(x, y, AI.nextBtn)) {
      AD.page++
      if (AD.tab === 'users') { AD.users = []; AD.loading = false; AD._usersLoaded = false }
      if (AD.tab === 'logs')  { AD.logs  = []; AD.loading = false; AD._logsLoaded = false }
    }
    // 日志过滤
    else if (AI.filter0 && inRect(x, y, AI.filter0)) { AD.logFilter='all'; AD.logs=[]; AD.page=1; AD.loading=false; AD._logsLoaded=false }
    else if (AI.filter1 && inRect(x, y, AI.filter1)) { AD.logFilter='score_upload'; AD.logs=[]; AD.page=1; AD.loading=false; AD._logsLoaded=false }
    else {
      // 封禁/解封 + 删除按钮
      for (var di = 0; di < 50; di++) {
        var banB = AI['banBtn' + di]
        if (banB && inRect(x, y, banB)) {
          var act = banB.banned ? 'unbanUser' : 'banUser'
          var msg = banB.banned ? '确定解封「' + banB.nick + '」？' : '确定封禁「' + banB.nick + '」？'
          ;(function(action2, oid) {
            wx.showModal({
              title: banB.banned ? '解封用户' : '封禁用户', content: msg,
              confirmText: '确定', cancelText: '取消',
              success: function(res) {
                if (res.confirm) {
                  wx.cloud.callFunction({
                    name: 'adminAPI',
                    data: { action: action2, openid: oid, adminKey: AD.key },
                    success: function() { AD.users = []; AD.loading = false; AD._usersLoaded = false; wx.showToast({ title: '操作成功', icon: 'success' }) }
                  })
                }
              }
            })
          })(act, banB.openid)
          break
        }
        var delB = AI['delBtn' + di]
        if (delB && inRect(x, y, delB)) {
          ;(function(oid, nick) {
            wx.showModal({
              title: '删除用户', content: '确定删除「' + nick + '」？\n将同时删除排行榜记录',
              confirmText: '删除', cancelText: '取消',
              success: function(res) {
                if (res.confirm) {
                  wx.cloud.callFunction({
                    name: 'adminAPI',
                    data: { action: 'deleteUser', openid: oid, adminKey: AD.key },
                    success: function() { AD.users = []; AD.stats = null; AD.loading = false; AD._usersLoaded = false; wx.showToast({ title: '已删除', icon: 'success' }) }
                  })
                }
              }
            })
          })(delB.openid, delB.nick)
          break
        }
      }
    }

  } else if (currentScreen === 'tutorial') {
    var T = GameGlobal.TutorialUI
    if (T.nextBtn && inRect(x, y, T.nextBtn)) {
      T.page++
    } else if (T.prevBtn && inRect(x, y, T.prevBtn)) {
      T.page--
    } else if (inRect(x, y, T.backBtn)) {
      var from = T._from || 'home'
      if (from === 'game' && !GameGlobal.Game.gameOver) GameGlobal.Timer.resume()
      currentScreen = (from === 'settings') ? 'settings' : from
    }

  } else if (currentScreen === 'settings') {
    var SU = GameGlobal.SettingsUI
    // _fromGame: 'home' | 'game' | 'huarong' — 明确标记来源，不串值
    var _fg = GameGlobal._fromGame || 'home'
    if      (inRect(x, y, SU.soundRow))   { GameGlobal.Sound.toggleSound() }
    else if (inRect(x, y, SU.musicRow))   { GameGlobal.Sound.toggleMusic() }
    else if (SU.tutBtn && inRect(x, y, SU.tutBtn)) {
      GameGlobal.Sound.play('click')
      GameGlobal.TutorialUI.page = 0
      GameGlobal.TutorialUI._from = 'settings'
      GameGlobal._tutorialFor = (_fg === 'huarong') ? 'huarong' : (_fg === 'sudoku' || _fg === 'sudokuChallenge') ? 'sudoku' : '2048'
      currentScreen = 'tutorial'
    }
    else if (SU.editNameBtn && inRect(x, y, SU.editNameBtn)) {
      GameGlobal.Profile.startInput()
    } else if (inRect(x, y, SU.backBtn)) {
      GameGlobal.Sound.play('click')
      if (_fg === 'huarong') {
        // 返回华容道游戏
        currentScreen = 'huarong'
        if (GameGlobal.Huarong && !GameGlobal.Huarong.solved) GameGlobal.Timer.resume()
      } else if (_fg === 'sudoku') {
        // 返回数独游戏
        currentScreen = 'sudoku'
        if (GameGlobal.Sudoku && !GameGlobal.Sudoku.solved) GameGlobal.Timer.resume()
      } else if (_fg === 'sudokuChallenge') {
        currentScreen = 'sudokuChallengeGame'
        if (GameGlobal.Sudoku && !GameGlobal.Sudoku.solved) GameGlobal.Timer.resume()
      } else if (_fg === 'game') {
        // 返回2048游戏
        currentScreen = 'game'
        if (!GameGlobal.Game.gameOver) GameGlobal.Timer.resume()
      } else if (_fg === 'survival') {
        currentScreen = 'survival'
        if (GameGlobal.Survival) GameGlobal.Survival.paused = false
      } else if (_fg === 'tileMatch') {
        currentScreen = 'tileMatch'
      } else {
        // 从主界面来：返回主界面（没有游戏可返回）
        currentScreen = 'home'
        GameGlobal.Sound.playBgm()
      }
    } else if (inRect(x, y, SU.homeBtn)) {
      GameGlobal.Sound.play('click')
      if (_fg === 'huarong') {
        // 返回华容道大厅
        var HR = GameGlobal.Huarong
        if (HR && !HR.solved && HR.started) {
          wx.showModal({
            title: '返回大厅', content: '当前进度将会丢失，确认返回？',
            confirmText: '返回', cancelText: '继续',
            success: function(res) {
              if (res.confirm) { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm(); currentScreen = 'lobbyHuarong' }
              else { currentScreen = 'huarong'; if (!HR.solved) GameGlobal.Timer.resume() }
            }
          })
        } else {
          GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm(); currentScreen = 'lobbyHuarong'
        }
      } else if (_fg === 'sudoku') {
        // 返回数独大厅
        var SDK = GameGlobal.Sudoku
        if (SDK && !SDK.solved && SDK.started) {
          wx.showModal({
            title: '返回大厅', content: '当前进度将会丢失，确认返回？',
            confirmText: '返回', cancelText: '继续',
            success: function(res) {
              if (res.confirm) { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm(); currentScreen = 'lobbySudoku' }
              else { currentScreen = 'sudoku'; if (!SDK.solved) GameGlobal.Timer.resume() }
            }
          })
        } else {
          GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm(); currentScreen = 'lobbySudoku'
        }
      } else if (_fg === 'sudokuChallenge') {
        wx.showModal({
          title: '退出闯关', content: '当前关卡进度不会保存，确定退出？',
          confirmText: '退出', cancelText: '继续',
          success: function(res) {
            if (res.confirm) { GameGlobal.Timer.stop(); currentScreen = 'sudokuChallenge' }
            else { currentScreen = 'sudokuChallengeGame'; if (GameGlobal.Sudoku && !GameGlobal.Sudoku.solved) GameGlobal.Timer.resume() }
          }
        })
      } else if (_fg === 'game') {
        if (G && !G.gameOver && G.score > 0) {
          wx.showModal({
            title: '返回大厅', content: '确定要返回吗？本局游戏将会消失',
            confirmText: '返回', cancelText: '继续游戏',
            success: function(res) {
              if (res.confirm) {
                GameGlobal.Rank.upload(G.score, GameGlobal.Timer.seconds, false)
                GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm(); currentScreen = 'lobby2048'
              } else {
                currentScreen = 'game'
                if (!G.gameOver) GameGlobal.Timer.resume()
              }
            }
          })
        } else {
          if (G && G.score > 0) GameGlobal.Rank.upload(G.score, GameGlobal.Timer.seconds, false)
          GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm(); currentScreen = 'lobby2048'
        }
      } else if (_fg === 'survival') {
        var _SV = GameGlobal.Survival
        if (_SV && !_SV.gameOver) {
          wx.showModal({
            title: '返回大厅', content: '确定要返回吗？当前游戏将会结束',
            confirmText: '返回', cancelText: '继续',
            success: function(res) {
              if (res.confirm) { GameGlobal.Sound.playBgm(); currentScreen = 'lobbySurvival' }
              else { currentScreen = 'survival'; if (_SV) _SV.paused = false }
            }
          })
        } else {
          GameGlobal.Sound.playBgm(); currentScreen = 'lobbySurvival'
        }
      } else if (_fg === 'tileMatch') {
        var _TM = GameGlobal.TileMatch
        if (_TM && !_TM.gameOver && !_TM.victory) {
          wx.showModal({
            title: '返回大厅', content: '确定要返回吗？当前关卡进度将丢失',
            confirmText: '返回', cancelText: '继续',
            success: function(res) {
              if (res.confirm) { GameGlobal.Sound.playBgm(); currentScreen = 'lobbyTile' }
              else { currentScreen = 'tileMatch' }
            }
          })
        } else {
          GameGlobal.Sound.playBgm(); currentScreen = 'lobbyTile'
        }
      } else {
        // 从主界面来：直接返回主界面
        currentScreen = 'home'
        GameGlobal.Sound.playBgm()
      }
    }

  } else if (currentScreen === 'lobby2048') {
    var L2 = GameGlobal.Lobby2048UI
    if (L2.startBtn && inRect(x, y, L2.startBtn)) {
      GameGlobal._fromGame = 'game'
      GameGlobal.setScreen('game')
    } else if (L2.rankBtn && inRect(x, y, L2.rankBtn)) {
      GameGlobal.setScreen('rank')
    } else if (L2.pkBtn && inRect(x, y, L2.pkBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'pk'
      if (GameGlobal.PK) { GameGlobal.PK.gameType = '2048'; GameGlobal.PK.enterLobby() }
    } else if (L2.backBtn && inRect(x, y, L2.backBtn)) {
      GameGlobal.setScreen('home')
    } else if (L2._achieveBtn && inRect(x, y, L2._achieveBtn)) {
      GameGlobal.Sound.play('click'); GameGlobal._achTab = '2048'; GameGlobal._achScrollY = 0; GameGlobal._achShopFrom = 'lobby2048'; currentScreen = 'achievement'
    } else if (L2._shopBtn && inRect(x, y, L2._shopBtn)) {
      GameGlobal.Sound.play('click'); GameGlobal._shopTab = 'prop'; GameGlobal._shopScrollY = 0; GameGlobal._achShopFrom = currentScreen; currentScreen = 'shop'
    }

  } else if (currentScreen === 'lobbyHuarong') {
    var LH = GameGlobal.LobbyHuarongUI
    if (!LH) return
    // 尺寸按钮
    var _szHit = false
    if (LH.sizeBtns && LH.sizeBtns.length) {
      for (var _si = 0; _si < LH.sizeBtns.length; _si++) {
        if (inRect(x, y, LH.sizeBtns[_si])) {
          GameGlobal._huarongSize = LH.sizeBtns[_si].size
          GameGlobal.Sound.play('click'); _szHit = true; break
        }
      }
    }
    if (!_szHit) {
    if (LH.startBtn && inRect(x, y, LH.startBtn)) {
      GameGlobal.Sound.play('click')
      GameGlobal._fromGame = 'huarong'
      GameGlobal.setScreen('huarong')
    } else if (LH.rankBtn && inRect(x, y, LH.rankBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'huarongRank'
      if (GameGlobal.HuarongRank) GameGlobal.HuarongRank.load()
    } else if (LH.pkBtn && inRect(x, y, LH.pkBtn)) {
      GameGlobal.Sound.play('click')
      if (GameGlobal.PK) {
        GameGlobal.PK.gameType = 'huarong'
        GameGlobal.PK.enterLobby()
      }
      currentScreen = 'pk'
    } else if (LH.backBtn && inRect(x, y, LH.backBtn)) {
      GameGlobal.setScreen('home')
    } else if (LH._achieveBtn && inRect(x, y, LH._achieveBtn)) {
      GameGlobal.Sound.play('click'); GameGlobal._achTab = 'huarong'; GameGlobal._achScrollY = 0; GameGlobal._achShopFrom = 'lobbyHuarong'; currentScreen = 'achievement'
    } else if (LH._shopBtn && inRect(x, y, LH._shopBtn)) {
      GameGlobal.Sound.play('click'); GameGlobal._shopTab = 'prop'; GameGlobal._shopScrollY = 0; GameGlobal._achShopFrom = currentScreen; currentScreen = 'shop'
    }
    } // end if(!_szHit)

  // ──────────────────────────────────────────────
  } else if (currentScreen === 'huarong') {
    var HUI = GameGlobal.HuarongUI
    var HR  = GameGlobal.Huarong
    if (!HUI || !HR) return

    if (HUI.newBtn && inRect(x, y, HUI.newBtn)) {
      GameGlobal.Sound.play('click')
      if (!HR.solved && HR.started) {
        wx.showModal({
          title: '新游戏', content: '确定要开始新一局吗？当前进度将丢失',
          confirmText: '确定', cancelText: '取消',
          success: function(res) {
            if (res.confirm) {
              if (GameGlobal.AchieveShop) GameGlobal.AchieveShop.onGameEvent('huarong_play', { size:HR.size, moves:HR.moves })
              GameGlobal.setScreen('huarong')
            }
          }
        })
      } else {
        if (HR.solved && GameGlobal.AchieveShop) {
          GameGlobal.AchieveShop.onGameEvent('huarong_play', { size:HR.size, moves:HR.moves })
        }
        GameGlobal.setScreen('huarong')
      }
    } else if (HUI.rankBtn && inRect(x, y, HUI.rankBtn)) {
      GameGlobal.Sound.play('click')
      GameGlobal.Timer.stop()
      currentScreen = 'huarongRank'
      if (GameGlobal.HuarongRank) GameGlobal.HuarongRank.load()
    } else if (HUI.settingBtn && inRect(x, y, HUI.settingBtn)) {
      GameGlobal._fromGame = 'huarong'
      GameGlobal._tutorialFor = 'huarong'
      GameGlobal.setScreen('settings')
    } else if (!HR.solved) {
      var cell = HR.hitTest(x, y)
      if (cell) HR.tap(cell[0], cell[1])
    }

  } else if (currentScreen === 'huarongRank') {
    var RUI = GameGlobal.HuarongRankUI
    var R   = GameGlobal.HuarongRank
    if (!RUI || !R) return
    if      (RUI.tabMovesBtn && inRect(x, y, RUI.tabMovesBtn)) { R.tab = 'moves'; R.scrollY = 0 }
    else if (RUI.tabTimeBtn  && inRect(x, y, RUI.tabTimeBtn))  { R.tab = 'time';  R.scrollY = 0 }
    else if (RUI.backBtn     && inRect(x, y, RUI.backBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'lobbyHuarong'
      GameGlobal.Sound.playBgm()
    }

  // ──────────── 数独大厅 ────────────
  } else if (currentScreen === 'lobbySudoku') {
    var LS = GameGlobal.LobbySudokuUI
    if (!LS) return
    var _diffHit = false
    if (LS.diffBtns && LS.diffBtns.length) {
      for (var _di = 0; _di < LS.diffBtns.length; _di++) {
        if (inRect(x, y, LS.diffBtns[_di])) {
          GameGlobal._sudokuDiff = LS.diffBtns[_di].key
          GameGlobal.Sound.play('click'); _diffHit = true; break
        }
      }
    }
    if (!_diffHit) {
    if (LS.startBtn && inRect(x, y, LS.startBtn)) {
      GameGlobal.Sound.play('click')
      GameGlobal._fromGame = 'sudoku'
      GameGlobal.setScreen('sudoku')
    } else if (LS.rankBtn && inRect(x, y, LS.rankBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'sudokuRank'
      if (GameGlobal.SudokuRank) GameGlobal.SudokuRank.load()
    } else if (LS.pkBtn && inRect(x, y, LS.pkBtn)) {
      GameGlobal.Sound.play('click')
      if (GameGlobal.PK) {
        GameGlobal.PK.gameType = 'sudoku'
        GameGlobal.PK.enterLobby()
      }
      currentScreen = 'pk'
    } else if (LS.challengeBtn && inRect(x, y, LS.challengeBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'sudokuChallenge'
      if (GameGlobal.SudokuChallenge) GameGlobal.SudokuChallenge.loadProgress()
    } else if (LS.backBtn && inRect(x, y, LS.backBtn)) {
      GameGlobal.setScreen('home')
    } else if (LS._achieveBtn && inRect(x, y, LS._achieveBtn)) {
      GameGlobal.Sound.play('click'); GameGlobal._achTab = 'sudoku'; GameGlobal._achScrollY = 0; GameGlobal._achShopFrom = 'lobbySudoku'; currentScreen = 'achievement'
    } else if (LS._shopBtn && inRect(x, y, LS._shopBtn)) {
      GameGlobal.Sound.play('click'); GameGlobal._shopTab = 'prop'; GameGlobal._shopScrollY = 0; GameGlobal._achShopFrom = currentScreen; currentScreen = 'shop'
    }
    } // end if(!_diffHit)

  // ──────────── 数独游戏 ────────────
  } else if (currentScreen === 'sudoku') {
    var SUI = GameGlobal.SudokuUI
    var SDK = GameGlobal.Sudoku
    if (!SUI || !SDK) return

    if (SDK.solved && SUI.overlayBtn && inRect(x, y, SUI.overlayBtn)) {
      GameGlobal.Sound.play('click')
      // 成就系统
      if (GameGlobal.AchieveShop) {
        GameGlobal.AchieveShop.onGameEvent('sudoku_play', { diff:SDK.difficulty, errors:SDK.errors||0, time:GameGlobal.Timer.seconds })
      }
      GameGlobal.setScreen('sudoku')
    } else if (SUI.settingBtn && inRect(x, y, SUI.settingBtn)) {
      GameGlobal._fromGame = 'sudoku'
      GameGlobal._tutorialFor = 'sudoku'
      GameGlobal.setScreen('settings')
    } else if (SUI.newBtn && inRect(x, y, SUI.newBtn)) {
      GameGlobal.Sound.play('click')
      if (SDK.started && !SDK.solved) {
        wx.showModal({
          title: '新游戏', content: '确定要开始新一局吗？当前进度将丢失',
          confirmText: '确定', cancelText: '取消',
          success: function(res) {
            if (res.confirm) GameGlobal.setScreen('sudoku')
          }
        })
      } else {
        GameGlobal.setScreen('sudoku')
      }
    } else if (SUI.notesBtn && inRect(x, y, SUI.notesBtn)) {
      SDK.toggleNotes()
    } else if (SUI.hintBtn && inRect(x, y, SUI.hintBtn)) {
      SDK.useHint()
    } else if (SUI.checkBtn && inRect(x, y, SUI.checkBtn)) {
      SDK.checkAll()
    } else if (SUI.eraseBtn && inRect(x, y, SUI.eraseBtn)) {
      SDK.erase()
    } else if (SUI.backBtn && inRect(x, y, SUI.backBtn)) {
      if (SDK.started && !SDK.solved) {
        wx.showModal({
          title: '返回大厅', content: '确定要返回吗？当前进度将丢失',
          confirmText: '返回', cancelText: '继续',
          success: function(res) {
            if (res.confirm) { GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm(); currentScreen = 'lobbySudoku' }
          }
        })
      } else {
        GameGlobal.Timer.stop(); GameGlobal.Sound.playBgm(); currentScreen = 'lobbySudoku'
      }
    } else if (!SDK.solved) {
      // 数字按钮
      if (SUI.numBtns) {
        for (var ni = 0; ni < SUI.numBtns.length; ni++) {
          if (inRect(x, y, SUI.numBtns[ni])) {
            SDK.input(SUI.numBtns[ni].num); break
          }
        }
      }
      // 点击棋盘选格子
      var cell = SDK.hitTest(x, y)
      if (cell) SDK.select(cell[0], cell[1])
    }

  // ──────────── 数独排行榜 ────────────
  } else if (currentScreen === 'sudokuRank') {
    var SRUI = GameGlobal.SudokuRankUI
    var SR   = GameGlobal.SudokuRank
    if (!SRUI || !SR) return
    if (SRUI.tabBtns) {
      for (var ti = 0; ti < SRUI.tabBtns.length; ti++) {
        if (inRect(x, y, SRUI.tabBtns[ti])) {
          SR.tab = SRUI.tabBtns[ti].key; SR.scrollY = 0
          GameGlobal.Sound.play('click'); break
        }
      }
    }
    if (SRUI.backBtn && inRect(x, y, SRUI.backBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'lobbySudoku'
      GameGlobal.Sound.playBgm()
    }

  // ──────────── 闯关大厅 ────────────
  } else if (currentScreen === 'sudokuChallenge') {
    var CUI = GameGlobal.ChallengeUI
    if (!CUI) return
    if (CUI.startBtn && inRect(x, y, CUI.startBtn)) {
      GameGlobal.Sound.play('click')
      GameGlobal._fromGame = 'sudokuChallenge'
      GameGlobal.SudokuChallenge.startLevel()
      currentScreen = 'sudokuChallengeGame'
    } else if (CUI.rankBtn && inRect(x, y, CUI.rankBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'sudokuChallengeRank'
      if (GameGlobal.ChallengeRank) GameGlobal.ChallengeRank.load()
    } else if (CUI.backBtn && inRect(x, y, CUI.backBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'lobbySudoku'
    }

  // ──────────── 闯关游戏 ────────────
  } else if (currentScreen === 'sudokuChallengeGame') {
    var GUI = GameGlobal.ChallengeGameUI
    var SDK = GameGlobal.Sudoku
    var CHG = GameGlobal.SudokuChallenge
    if (!GUI || !SDK) return

    // 通关后点下一关
    if (SDK.solved && GUI.nextBtn && inRect(x, y, GUI.nextBtn)) {
      GameGlobal.Sound.play('click')
      CHG.startLevel()
      return
    }
    if (GUI.notesBtn && inRect(x, y, GUI.notesBtn)) {
      SDK.toggleNotes()
    } else if (GUI.eraseBtn && inRect(x, y, GUI.eraseBtn)) {
      SDK.erase()
    } else if (GUI.restartBtn && inRect(x, y, GUI.restartBtn)) {
      wx.showModal({
        title: '重来本关', content: '确定要重新开始第' + CHG.getLevelInfo().inPack + '关吗？',
        confirmText: '重来', cancelText: '取消',
        success: function(res) { if (res.confirm) CHG.restart() }
      })
    } else if (GUI.backBtn && inRect(x, y, GUI.backBtn)) {
      wx.showModal({
        title: '退出闯关', content: '当前关卡进度不会保存，确定退出？',
        confirmText: '退出', cancelText: '继续',
        success: function(res) {
          if (res.confirm) {
            GameGlobal.Timer.stop()
            currentScreen = 'sudokuChallenge'
          }
        }
      })
    } else if (!SDK.solved) {
      // 数字按钮
      if (GUI.numBtns) {
        for (var ni = 0; ni < GUI.numBtns.length; ni++) {
          if (inRect(x, y, GUI.numBtns[ni])) {
            SDK.input(GUI.numBtns[ni].num)
            // 闯关通关检测
            if (SDK.solved && CHG.playing) {
              CHG.onSolved()
              // 成就系统
              if (GameGlobal.AchieveShop) {
                GameGlobal.AchieveShop.onGameEvent('sudoku_challenge', { level: CHG.level })
              }
            }
            return
          }
        }
      }
      // 点格子
      var hit = SDK.hitTest(x, y)
      if (hit) {
        SDK.select(hit[0], hit[1])
        GameGlobal.Sound.play('click')
      }
    }

  // ──────────── 闯关排行榜 ────────────
  } else if (currentScreen === 'sudokuChallengeRank') {
    var CRUI = GameGlobal.ChallengeRankUI
    if (!CRUI) return
    if (CRUI.backBtn && inRect(x, y, CRUI.backBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'sudokuChallenge'
    }

  // ──────────── 生存大厅 ────────────
  } else if (currentScreen === 'lobbySurvival') {
    var LS = GameGlobal.LobbySurvivalUI
    if (!LS) return
    if (LS.startBtn && inRect(x, y, LS.startBtn)) {
      GameGlobal.setScreen('survival')
    } else if (LS.rankBtn && inRect(x, y, LS.rankBtn)) {
      GameGlobal.setScreen('survivalRank')
    } else if (LS.shopBtn && inRect(x, y, LS.shopBtn)) {
      GameGlobal.Sound.play('click')
      GameGlobal.setScreen('survivalShop')
    } else if (LS.backBtn && inRect(x, y, LS.backBtn)) {
      GameGlobal.setScreen('home')
    }

  // ──────────── 生存游戏 ────────────
  } else if (currentScreen === 'survival') {
    var SV = GameGlobal.Survival
    var SUI = GameGlobal.SurvivalUI
    if (!SV) return

    // 技能/武器选择
    if (SV.levelUp && SUI.skillBtns) {
      for (var si = 0; si < SUI.skillBtns.length; si++) {
        if (inRect(x, y, SUI.skillBtns[si])) {
          GameGlobal.Sound.play('click')
          SV.selectWeapon(si)
          return
        }
      }
      // 刷新按钮
      if (SUI.refreshBtn && inRect(x, y, SUI.refreshBtn)) {
        if (SV.refreshChoices()) {
          GameGlobal.Sound.play('click')
        }
        return
      }
    }

    // 游戏结束按钮
    if (SV.gameOver) {
      if (SUI.retryBtn && inRect(x, y, SUI.retryBtn)) {
        GameGlobal.Sound.play('click')
        SV.init()
      } else if (SUI.exitBtn && inRect(x, y, SUI.exitBtn)) {
        GameGlobal.Sound.play('click')
        currentScreen = 'lobbySurvival'
        GameGlobal.Sound.playBgm()
      }
    } else if (!SV.levelUp && SUI.settingBtn && inRect(x, y, SUI.settingBtn)) {
      GameGlobal.Sound.play('click')
      SV.paused = true
      GameGlobal._fromGame = 'survival'
      GameGlobal.setScreen('settings')
    }

  // ──────────── 生存排行榜 ────────────
  } else if (currentScreen === 'survivalRank') {
    var SRUI = GameGlobal.SurvivalRankUI
    if (!SRUI) return
    if (SRUI.backBtn && inRect(x, y, SRUI.backBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'lobbySurvival'
    }

  // ──────────── 生存商店 ────────────
  } else if (currentScreen === 'survivalShop') {
    if (GameGlobal.handleSurvivalShopTap) GameGlobal.handleSurvivalShopTap(x, y)

  // ──────────── 三消大厅 ────────────
  } else if (currentScreen === 'lobbyTile') {
    var LT = GameGlobal.LobbyTileUI
    if (!LT) return
    if (LT.startBtn && inRect(x, y, LT.startBtn)) {
      var savedLevel = wx.getStorageSync('tileMatchBest') || 0
      GameGlobal.TileMatch.level = savedLevel + 1  // 从下一关开始
      GameGlobal.setScreen('tileMatch')
    } else if (LT.rankBtn && inRect(x, y, LT.rankBtn)) {
      GameGlobal.setScreen('tileMatchRank')
    } else if (LT.backBtn && inRect(x, y, LT.backBtn)) {
      GameGlobal.setScreen('home')
    }

  // ──────────── 三消游戏 ────────────
  } else if (currentScreen === 'tileMatch') {
    var TM = GameGlobal.TileMatch
    var TMUI = GameGlobal.TileMatchUI
    if (!TM) return

    if (TM.victory && TMUI.nextBtn && inRect(x, y, TMUI.nextBtn)) {
      GameGlobal.Sound.play('click')
      TM.level++
      TM.init(TM.level)
    } else if (TM.gameOver && !TM.victory && TMUI.retryBtn && inRect(x, y, TMUI.retryBtn)) {
      GameGlobal.Sound.play('click')
      TM.init(TM.level)
    } else if (TM.gameOver && !TM.victory && TMUI.exitBtn && inRect(x, y, TMUI.exitBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'lobbyTile'
      GameGlobal.Sound.playBgm()
    } else if (!TM.gameOver && !TM.victory) {
      // 退出按钮
      if (TMUI.backBtn && inRect(x, y, TMUI.backBtn)) {
        GameGlobal.Sound.play('click')
        wx.showModal({
          title: '退出游戏', content: '确定要退出吗？当前关卡进度将丢失',
          confirmText: '退出', cancelText: '继续',
          success: function(res) {
            if (res.confirm) {
              currentScreen = 'lobbyTile'
              GameGlobal.Sound.playBgm()
            }
          }
        })
        return
      }
      // 设置按钮
      if (TMUI.settingBtn && inRect(x, y, TMUI.settingBtn)) {
        GameGlobal.Sound.play('click')
        GameGlobal._fromGame = 'tileMatch'
        GameGlobal.setScreen('settings')
        return
      }
      // 道具
      if (TMUI.undoBtn && inRect(x, y, TMUI.undoBtn)) { TM.propUndo() }
      else if (TMUI.moveOutBtn && inRect(x, y, TMUI.moveOutBtn)) { TM.propMoveOut() }
      else if (TMUI.shuffleBtn && inRect(x, y, TMUI.shuffleBtn)) { TM.propShuffle() }
      else {
        // 检查暂存区点击
        var holdHit = false
        if (TMUI.holdBtns) {
          for (var hi = 0; hi < TMUI.holdBtns.length; hi++) {
            if (inRect(x, y, TMUI.holdBtns[hi])) { TM.tapHoldArea(TMUI.holdBtns[hi].idx); holdHit = true; break }
          }
        }
        if (!holdHit) TM.tapTile(x, y)
      }
    }

  // ──────────── 三消排行榜 ────────────
  } else if (currentScreen === 'tileMatchRank') {
    var TMRUI = GameGlobal.TileMatchRankUI
    if (!TMRUI) return
    if (TMRUI.backBtn && inRect(x, y, TMRUI.backBtn)) {
      GameGlobal.Sound.play('click')
      currentScreen = 'lobbyTile'
    }

  // ──────────── 成就页面 ────────────
  } else if (currentScreen === 'achievement') {
    var AUI = GameGlobal.AchieveUI
    if (AUI.backBtn && inRect(x, y, AUI.backBtn)) {
      GameGlobal.Sound.play('click'); currentScreen = GameGlobal._achShopFrom || 'home'
    }
    if (AUI.tabBtns) {
      for (var ti = 0; ti < AUI.tabBtns.length; ti++) {
        if (inRect(x, y, AUI.tabBtns[ti])) {
          GameGlobal._achTab = AUI.tabBtns[ti].key
          GameGlobal._achScrollY = 0
          GameGlobal.Sound.play('click'); break
        }
      }
    }

  // ──────────── 商城页面 ────────────
  } else if (currentScreen === 'shop') {
    var SUI2 = GameGlobal.ShopUI
    if (SUI2.backBtn && inRect(x, y, SUI2.backBtn)) {
      GameGlobal.Sound.play('click'); currentScreen = GameGlobal._achShopFrom || 'home'
    }
    if (SUI2.tabBtns) {
      for (var ti = 0; ti < SUI2.tabBtns.length; ti++) {
        if (inRect(x, y, SUI2.tabBtns[ti])) {
          GameGlobal._shopTab = SUI2.tabBtns[ti].key
          GameGlobal._shopScrollY = 0
          GameGlobal.Sound.play('click'); break
        }
      }
    }
    if (SUI2.itemBtns) {
      for (var bi = 0; bi < SUI2.itemBtns.length; bi++) {
        var btn = SUI2.itemBtns[bi]
        if (inRect(x, y, btn)) {
          GameGlobal.Sound.play('click')
          if (btn.action === 'buy') {
            var result = GameGlobal.AchieveShop.buyItem(btn.id)
            wx.showToast({ title: result.msg, icon: result.ok ? 'success' : 'none' })
          } else if (btn.action === 'equip') {
            GameGlobal.AchieveShop.equipSkin(btn.id)
            if (GameGlobal.applyTheme) GameGlobal.applyTheme()
            wx.showToast({ title: '已装备', icon: 'success' })
          }
          break
        }
      }
    }
  }
  } catch(e) { console.error('handleTap 出错:', currentScreen, e) }
}

// ── 6. 加载 PK 模块
try { require('./js/pk.js') } catch(e) { console.error('pk.js 加载失败', e) }
try { require('./js/pkRender.js') } catch(e) { console.error('pkRender.js 加载失败', e) }
try { require('./js/pk2048Render.js') } catch(e) { console.error('pk2048Render.js 加载失败', e) }
try { require('./js/pkHuarongRender.js') } catch(e) { console.error('pkHuarongRender.js 加载失败', e) }
try { require('./js/pkSudokuRender.js') } catch(e) { console.error('pkSudokuRender.js 加载失败', e) }
try { require('./js/adminRender.js') } catch(e) { console.error('adminRender.js 加载失败', e) }

// ── 7. 加载界面渲染
GameGlobal.drawLoadingScreen = function() {
  var ctx = GameGlobal.ctx, SW = GameGlobal.SW, SH = GameGlobal.SH
  var t = Date.now()

  // 深色背景
  ctx.fillStyle = '#0a0a1e'; ctx.fillRect(0, 0, SW, SH)

  // 动态粒子
  for (var i = 0; i < 40; i++) {
    var px = (Math.sin(t / 2000 + i * 0.8) * 0.5 + 0.5) * SW
    var py = (Math.cos(t / 2500 + i * 1.1) * 0.5 + 0.5) * SH
    var pa = 0.15 + Math.sin(t / 300 + i * 5) * 0.1
    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(245,166,35,' + pa + ')'; ctx.fill()
  }

  var cx = SW / 2

  // Logo文字
  var setFont = GameGlobal.setFont
  setFont(SW * 0.12, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  var tg = ctx.createLinearGradient(cx - SW * 0.3, 0, cx + SW * 0.3, 0)
  tg.addColorStop(0, '#f5a623'); tg.addColorStop(0.5, '#e94560'); tg.addColorStop(1, '#9b59b6')
  ctx.fillStyle = tg
  ctx.fillText('数字空间', cx, SH * 0.32)
  ctx.fillText('实验室', cx, SH * 0.32 + SW * 0.15)

  // 副标题
  setFont(SW * 0.03, '600'); ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillText('DIGITAL SPACE LAB', cx, SH * 0.32 + SW * 0.27)

  // 进度条
  var barW = SW * 0.55, barH = 6
  var barX = cx - barW / 2, barY = SH * 0.62

  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  GameGlobal.roundRect(barX, barY, barW, barH, 3, 'rgba(255,255,255,0.08)')

  // 动画进度
  var elapsed = (t - _loadingStartTime) / 1000
  var targetProgress = _loadingDone ? 1 : Math.min(0.85, elapsed / 2.0)
  _loadingProgress += (targetProgress - _loadingProgress) * 0.08

  var pg = ctx.createLinearGradient(barX, 0, barX + barW * _loadingProgress, 0)
  pg.addColorStop(0, '#f5a623'); pg.addColorStop(1, '#e94560')
  GameGlobal.roundRect(barX, barY, barW * _loadingProgress, barH, 3, pg)

  // 加载提示文字（滚动）
  var tips = ['正在加载资源...', '初始化游戏引擎...', '同步云端数据...', '准备就绪...']
  var tipIdx = Math.min(tips.length - 1, Math.floor(elapsed * 1.2))
  setFont(SW * 0.025, '600'); ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText(tips[tipIdx], cx, barY + SH * 0.04)

  // 版本号 + 健康提示
  setFont(SW * 0.02, '600'); ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillText('v3.0', cx, SH * 0.88)
  setFont(SW * 0.018, '600'); ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillText('适龄提示：本游戏适合8岁以上用户', cx, SH * 0.92)
  ctx.fillText('抵制不良游戏 · 合理安排时间 · 享受健康生活', cx, SH * 0.95)

  // 自动跳转
  if (_loadingProgress > 0.98 && _loadingDone) {
    var userInfo = wx.getStorageSync('userInfo')
    currentScreen = userInfo ? 'home' : 'profile'
    if (GameGlobal.applyTheme) GameGlobal.applyTheme()
  }
}

// ── 8. 初始化（异步，加载界面期间完成）
GameGlobal.Sound.init()
if (GameGlobal.AchieveShop) GameGlobal.AchieveShop.init()

// 标记加载完成（延迟确保所有模块就绪）
setTimeout(function() { _loadingDone = true }, 1800)

// ── 云端恢复本地最佳记录（清缓存不丢）
;(function() {
  wx.cloud.callFunction({
    name: 'leaderboard',
    data: { action: 'getBests' },
    success: function(res) {
      if (!res.result || !res.result.success || !res.result.data) return
      var d = res.result.data

      // 2048 最高分
      if (d.best_score) {
        var local = wx.getStorageSync('2048best') || 0
        if (d.best_score > local) wx.setStorageSync('2048best', d.best_score)
      }

      // 华容道 最佳步数（3x3～10x10）
      for (var sz = 3; sz <= 10; sz++) {
        var sfx = '_' + sz + 'x' + sz
        var cloudMoves = d['best_huarong_moves' + sfx]
        if (cloudMoves) {
          var key = 'huarongBest' + sfx
          var lv  = wx.getStorageSync(key) || 0
          if (lv === 0 || cloudMoves < lv) wx.setStorageSync(key, cloudMoves)
        }
      }

      // 数独 最佳时间
      var diffs = ['easy', 'medium', 'hard', 'expert', 'hell']
      for (var i = 0; i < diffs.length; i++) {
        var ct = d['best_sudoku_' + diffs[i]]
        if (ct) {
          var key = 'sudokuBest_' + diffs[i]
          var lv  = wx.getStorageSync(key) || 0
          if (lv === 0 || ct < lv) wx.setStorageSync(key, ct)
        }
      }

      // 闯关进度
      var chgScore = d.best_sudoku_challenge
      if (chgScore && GameGlobal.SudokuChallenge) {
        var cloudLv = chgScore + 1
        if (cloudLv > GameGlobal.SudokuChallenge.level) {
          GameGlobal.SudokuChallenge.level = cloudLv
          wx.setStorageSync('sdkChg_level', cloudLv)
        }
      }

      // 生存最大数字
      if (d.best_survival) {
        var localSV = wx.getStorageSync('survivalBest') || 0
        if (d.best_survival > localSV) wx.setStorageSync('survivalBest', d.best_survival)
      }

      console.log('[sync] 云端最佳记录已恢复')
    },
    fail: function() {}
  })
})()

// 检查是否需要设置昵称
var userInfo = wx.getStorageSync('userInfo')
if (!userInfo || !userInfo.nickName) {
  currentScreen = 'profile'
} else {
  currentScreen = 'home'
  GameGlobal.Sound.playBgm()


}

// ── 8. 主循环
// 静态界面降帧（主页/设置等无动画界面只需20fps）
var _lastFrameTime = 0
var _needsRedraw = true
GameGlobal.markDirty = function() { _needsRedraw = true }

function loop(ts) {
  var isAnimated = (currentScreen === 'loading' || currentScreen === 'game' || currentScreen === 'pk' || currentScreen === 'huarong' || currentScreen === 'sudoku' || currentScreen === 'sudokuChallengeGame' || currentScreen === 'survival')
  var fps = isAnimated ? 60 : 20
  var interval = 1000 / fps

  if (ts - _lastFrameTime >= interval || _needsRedraw) {
    _lastFrameTime = ts
    _needsRedraw = false
    try {
    if      (currentScreen === 'loading')      { if (GameGlobal.drawLoadingScreen)      GameGlobal.drawLoadingScreen() }
    else if (currentScreen === 'profile')      { if (GameGlobal.drawProfileScreen)      GameGlobal.drawProfileScreen() }
    else if (currentScreen === 'home')         { if (GameGlobal.drawHomeScreen)         GameGlobal.drawHomeScreen() }
    else if (currentScreen === 'game')         { if (GameGlobal.drawGameScreen)         GameGlobal.drawGameScreen() }
    else if (currentScreen === 'settings')     { if (GameGlobal.drawSettingsScreen)     GameGlobal.drawSettingsScreen() }
    else if (currentScreen === 'rank')         { if (GameGlobal.drawRankScreen)         GameGlobal.drawRankScreen() }
    else if (currentScreen === 'userProfile')  { if (GameGlobal.drawUserProfileScreen)  GameGlobal.drawUserProfileScreen() }
    else if (currentScreen === 'admin')        { if (GameGlobal.drawAdminScreen)        GameGlobal.drawAdminScreen() }
    else if (currentScreen === 'adminLogin')   { if (GameGlobal.drawAdminLoginScreen)   GameGlobal.drawAdminLoginScreen() }
    else if (currentScreen === 'tutorial')     { if (GameGlobal.drawTutorialScreen)     GameGlobal.drawTutorialScreen() }
    else if (currentScreen === 'pk')           { if (GameGlobal.drawPKScreen)           GameGlobal.drawPKScreen() }
    else if (currentScreen === 'lobby2048')    { if (GameGlobal.drawLobby2048Screen)    GameGlobal.drawLobby2048Screen() }
    else if (currentScreen === 'lobbyHuarong') { if (GameGlobal.drawLobbyHuarongScreen) GameGlobal.drawLobbyHuarongScreen() }
    else if (currentScreen === 'huarong')      { if (GameGlobal.drawHuarongScreen)      GameGlobal.drawHuarongScreen() }
    else if (currentScreen === 'huarongRank')  { if (GameGlobal.drawHuarongRankScreen)  GameGlobal.drawHuarongRankScreen() }
    else if (currentScreen === 'lobbySudoku')  { if (GameGlobal.drawLobbySudokuScreen)  GameGlobal.drawLobbySudokuScreen() }
    else if (currentScreen === 'sudoku')       { if (GameGlobal.drawSudokuScreen)       GameGlobal.drawSudokuScreen() }
    else if (currentScreen === 'sudokuRank')   { if (GameGlobal.drawSudokuRankScreen)   GameGlobal.drawSudokuRankScreen() }
    else if (currentScreen === 'sudokuChallenge')     { if (GameGlobal.drawChallengeScreen)      GameGlobal.drawChallengeScreen() }
    else if (currentScreen === 'sudokuChallengeGame')  { if (GameGlobal.drawChallengeGameScreen)   GameGlobal.drawChallengeGameScreen() }
    else if (currentScreen === 'sudokuChallengeRank')  { if (GameGlobal.drawChallengeRankScreen)   GameGlobal.drawChallengeRankScreen() }
    else if (currentScreen === 'lobbySurvival')        { if (GameGlobal.drawLobbySurvivalScreen)   GameGlobal.drawLobbySurvivalScreen() }
    else if (currentScreen === 'survival')             { if (GameGlobal.drawSurvivalScreen)        GameGlobal.drawSurvivalScreen() }
    else if (currentScreen === 'survivalRank')         { if (GameGlobal.drawSurvivalRankScreen)    GameGlobal.drawSurvivalRankScreen() }
    else if (currentScreen === 'survivalShop')         { if (GameGlobal.drawSurvivalShopScreen)    GameGlobal.drawSurvivalShopScreen() }
    else if (currentScreen === 'lobbyTile')            { if (GameGlobal.drawLobbyTileScreen)       GameGlobal.drawLobbyTileScreen() }
    else if (currentScreen === 'tileMatch')            { if (GameGlobal.drawTileMatchScreen)       GameGlobal.drawTileMatchScreen() }
    else if (currentScreen === 'tileMatchRank')        { if (GameGlobal.drawTileMatchRankScreen)   GameGlobal.drawTileMatchRankScreen() }
    else if (currentScreen === 'achievement')          { if (GameGlobal.drawAchievementScreen)     GameGlobal.drawAchievementScreen() }
    else if (currentScreen === 'shop')                 { if (GameGlobal.drawShopScreen)            GameGlobal.drawShopScreen() }
    } catch(e) { console.error('渲染出错:', currentScreen, e) }
    // 成就提示浮出（所有界面通用）
    if (GameGlobal.drawAchievementToast) GameGlobal.drawAchievementToast()
  }
  requestAnimationFrame(loop)
}
loop(0)