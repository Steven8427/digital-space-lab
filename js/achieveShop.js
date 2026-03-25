// ================================================
//  achieveShop.js — 成就 + 商城 数据 & 逻辑
//  金币系统 / 成就定义 / 商品定义 / 解锁/购买
// ================================================

// ── 成就定义 ──────────────────────────────
var ACHIEVEMENTS = [
  // ── 2048
  { id:'a_2048_1024',  game:'2048', name:'初出茅庐',   desc:'达到1024',          icon:'🎮', reward:50  },
  { id:'a_2048_2048',  game:'2048', name:'名副其实',   desc:'达到2048',          icon:'🏆', reward:100 },
  { id:'a_2048_4096',  game:'2048', name:'更上一层',   desc:'达到4096',          icon:'⭐', reward:200 },
  { id:'a_2048_8192',  game:'2048', name:'登峰造极',   desc:'达到8192',          icon:'👑', reward:500 },
  { id:'a_2048_score10k', game:'2048', name:'万分之上', desc:'单局得分超过10000', icon:'💰', reward:80  },
  { id:'a_2048_score50k', game:'2048', name:'五万大关', desc:'单局得分超过50000', icon:'💎', reward:300 },
  { id:'a_2048_win3',  game:'2048', name:'三连胜',     desc:'累计赢3局',         icon:'🔥', reward:60  },
  { id:'a_2048_win10', game:'2048', name:'2048大师',   desc:'累计赢10局',        icon:'🎖', reward:200 },

  // ── 华容道
  { id:'a_hr_3x3',    game:'huarong', name:'入门成功',  desc:'完成3×3',           icon:'🧩', reward:30  },
  { id:'a_hr_4x4',    game:'huarong', name:'标准通关',  desc:'完成4×4',           icon:'🧩', reward:50  },
  { id:'a_hr_5x5',    game:'huarong', name:'进阶高手',  desc:'完成5×5',           icon:'⭐', reward:80  },
  { id:'a_hr_6x6',    game:'huarong', name:'挑战极限',  desc:'完成6×6或以上',     icon:'💪', reward:120 },
  { id:'a_hr_30step', game:'huarong', name:'步步精心',  desc:'30步内完成3×3',     icon:'👟', reward:100 },
  { id:'a_hr_50step', game:'huarong', name:'效率大师',  desc:'50步内完成4×4',     icon:'⚡', reward:150 },
  { id:'a_hr_win10',  game:'huarong', name:'华容道达人', desc:'累计完成10局',      icon:'🎖', reward:100 },
  { id:'a_hr_win50',  game:'huarong', name:'华容道宗师', desc:'累计完成50局',      icon:'👑', reward:300 },

  // ── 数独
  { id:'a_sdk_easy',    game:'sudoku', name:'初学数独',  desc:'完成简单难度',      icon:'🔢', reward:30  },
  { id:'a_sdk_medium',  game:'sudoku', name:'渐入佳境',  desc:'完成普通难度',      icon:'🔢', reward:50  },
  { id:'a_sdk_hard',    game:'sudoku', name:'数独高手',  desc:'完成困难难度',      icon:'⭐', reward:80  },
  { id:'a_sdk_expert',  game:'sudoku', name:'专家认证',  desc:'完成专家难度',      icon:'💪', reward:120 },
  { id:'a_sdk_hell',    game:'sudoku', name:'地狱归来',  desc:'完成地狱难度',      icon:'🔥', reward:300 },
  { id:'a_sdk_noerr',   game:'sudoku', name:'零失误',    desc:'0错误完成一局',     icon:'✨', reward:100 },
  { id:'a_sdk_fast5',   game:'sudoku', name:'闪电手',    desc:'5分钟内完成普通',   icon:'⚡', reward:150 },
  { id:'a_sdk_chg50',   game:'sudoku', name:'闯关先锋',  desc:'闯关达到第50关',    icon:'🏅', reward:150 },
  { id:'a_sdk_chg200',  game:'sudoku', name:'闯关达人',  desc:'闯关达到第200关',   icon:'🎖', reward:400 },
  { id:'a_sdk_chg500',  game:'sudoku', name:'闯关大师',  desc:'闯关达到第500关',   icon:'👑', reward:800 },

  // ── 生存模式
  { id:'a_sv_kill100',  game:'survival', name:'初级猎手',  desc:'单局击杀100个怪物',   icon:'⚔', reward:50  },
  { id:'a_sv_kill500',  game:'survival', name:'高级猎手',  desc:'单局击杀500个怪物',   icon:'🗡', reward:150 },
  { id:'a_sv_kill1000', game:'survival', name:'屠魔者',    desc:'单局击杀1000个怪物',  icon:'💀', reward:300 },
  { id:'a_sv_boss',     game:'survival', name:'弑神者',    desc:'击败Boss',            icon:'👹', reward:200 },
  { id:'a_sv_maxlv',    game:'survival', name:'满级战士',  desc:'达到最高等级',        icon:'🔱', reward:100 },
  { id:'a_sv_play10',   game:'survival', name:'生存老手',  desc:'累计游玩10局生存',    icon:'🎮', reward:80  },
  { id:'a_sv_win5',     game:'survival', name:'常胜将军',  desc:'击败Boss5次',         icon:'🏅', reward:500 },

  // ── 全局
  { id:'a_g_allplay',  game:'global', name:'全能玩家',  desc:'玩过所有3个游戏',    icon:'🌟', reward:100 },
  { id:'a_g_play50',   game:'global', name:'忠实玩家',  desc:'累计游戏50局',       icon:'💝', reward:200 },
  { id:'a_g_play200',  game:'global', name:'资深玩家',  desc:'累计游戏200局',      icon:'💎', reward:500 },
  { id:'a_g_coin1000', game:'global', name:'小富翁',    desc:'累计获得1000金币',   icon:'💰', reward:50  },
  { id:'a_g_coin5000', game:'global', name:'大富翁',    desc:'累计获得5000金币',   icon:'🏦', reward:200 },
  { id:'a_g_allachieve', game:'global', name:'全成就',  desc:'解锁所有其他成就',   icon:'🏆', reward:1000}
]

// ── 商城物品定义 ──────────────────────────
var SHOP_ITEMS = [
  // 主题皮肤（改变背景、星空、特效）
  { id:'skin_default', name:'经典主题',   desc:'默认深蓝风格',           icon:'🎨', price:0,     type:'skin', game:'all' },
  { id:'skin_dark',    name:'暗夜深渊',   desc:'纯黑星空 · 红色流星',    icon:'🌑', price:800,   type:'skin', game:'all' },
  { id:'skin_ocean',   name:'深海幻境',   desc:'海底气泡 · 水波纹光效',  icon:'🌊', price:800,   type:'skin', game:'all' },
  { id:'skin_forest',  name:'翡翠森林',   desc:'萤火飞舞 · 绿光粒子',    icon:'🌿', price:800,   type:'skin', game:'all' },
  { id:'skin_sunset',  name:'落日熔金',   desc:'晚霞渐变 · 金色光晕',    icon:'🌅', price:1200,  type:'skin', game:'all' },
  { id:'skin_neon',    name:'霓虹都市',   desc:'赛博光带 · 紫蓝脉冲',    icon:'💜', price:2000,  type:'skin', game:'all' },
  { id:'skin_gold',    name:'至尊黄金',   desc:'金色粒子 · 闪耀光芒',    icon:'👑', price:5000,  type:'skin', game:'all' },

  // 2048道具
  { id:'prop_undo3',   name:'撤销×3',     desc:'获得3次撤销机会',        icon:'↩️', price:100,   type:'prop', game:'2048' },
  { id:'prop_undo10',  name:'撤销×10',    desc:'获得10次撤销机会',       icon:'↩️', price:280,   type:'prop', game:'2048' },

  // 数独道具
  { id:'prop_hint3',   name:'提示×3',     desc:'获得3次提示（本局限4次）',icon:'💡', price:120,   type:'prop', game:'sudoku' },
  { id:'prop_hint10',  name:'提示×10',    desc:'获得10次提示',           icon:'💡', price:350,   type:'prop', game:'sudoku' },
  { id:'prop_check3',  name:'检查×3',     desc:'获得3次检查（本局限4次）',icon:'✅', price:100,   type:'prop', game:'sudoku' }
]

// ── 金币获取规则 ──────────────────────────
var COIN_RULES = {
  '2048_win':       20,    // 赢一局2048
  '2048_play':       5,    // 完成一局2048
  'huarong_win':    15,    // 完成华容道
  'sudoku_win':     15,    // 完成数独
  'sudoku_chg':     10,    // 闯关过一关
  'daily_login':    30,    // 每日登录
  'ad_bonus':        2,    // 看广告倍率
  'survival_play':   5,    // 完成一局生存
  'survival_win':   30,    // 击败Boss
  'survival_kill_bonus': 0.1  // 每击杀1个怪得0.1金币
}

// ================================================
//  逻辑模块
// ================================================
GameGlobal.AchieveShop = {
  // ── 读取状态
  coins: 0,
  totalCoinsEarned: 0,
  unlocked: {},       // { achId: true }
  owned: {},          // { itemId: true }
  equipped: {},       // { theme: 'skin_xxx' }
  propCounts: {},     // { prop_undo3: 5 }  道具余量
  stats: {},          // 统计数据

  ACHIEVEMENTS: ACHIEVEMENTS,
  SHOP_ITEMS: SHOP_ITEMS,
  COIN_RULES: COIN_RULES,

  // ── 初始化（启动时调用）
  init: function() {
    // 先读本地缓存（立即可用）
    this.coins = wx.getStorageSync('coins') || 0
    this.totalCoinsEarned = wx.getStorageSync('totalCoinsEarned') || 0
    this.unlocked = wx.getStorageSync('achievements_unlocked') || {}
    this.owned = wx.getStorageSync('shop_owned') || {}
    this.owned['skin_default'] = true  // 默认主题永远拥有
    this.equipped = wx.getStorageSync('shop_equipped') || {}
    this.propCounts = wx.getStorageSync('prop_counts') || {}
    this.stats = wx.getStorageSync('game_stats') || {
      plays_2048: 0, wins_2048: 0,
      plays_hr: 0, wins_hr: 0,
      plays_sdk: 0, wins_sdk: 0,
      plays_total: 0,
      played_2048: false, played_hr: false, played_sdk: false,
      lastLogin: ''
    }
    this._checkDailyLogin()
    // 后台从云端恢复（云端 > 本地时覆盖）
    this._syncFromCloud()
  },

  // ── 本地保存 + 云端备份
  _save: function() {
    // 立即写本地
    wx.setStorageSync('coins', this.coins)
    wx.setStorageSync('totalCoinsEarned', this.totalCoinsEarned)
    wx.setStorageSync('achievements_unlocked', this.unlocked)
    wx.setStorageSync('shop_owned', this.owned)
    wx.setStorageSync('shop_equipped', this.equipped)
    wx.setStorageSync('prop_counts', this.propCounts)
    wx.setStorageSync('game_stats', this.stats)
    // 防抖写云端（2秒内多次保存只上传一次）
    var self = this
    if (self._saveTimer) clearTimeout(self._saveTimer)
    self._saveTimer = setTimeout(function() { self._syncToCloud() }, 2000)
  },

  // ── 上传到云端 users 集合（带重试）
  _syncToCloud: function(retryCount) {
    var self = this
    retryCount = retryCount || 0
    var data = {
      shopData: {
        coins: this.coins,
        totalCoinsEarned: this.totalCoinsEarned,
        unlocked: this.unlocked,
        owned: this.owned,
        equipped: this.equipped,
        propCounts: this.propCounts,
        stats: this.stats
      }
    }
    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'saveShopData', shopData: data.shopData },
      success: function(res) {
        if (res.result && res.result.success) {
          self._cloudSynced = true
          console.log('[sync] 数据已同步到云端')
        } else if (retryCount < 2) {
          console.warn('[sync] 云端保存返回失败，重试中...', retryCount + 1)
          setTimeout(function() { self._syncToCloud(retryCount + 1) }, 3000)
        }
      },
      fail: function(err) {
        console.warn('[sync] 云端保存失败:', err)
        if (retryCount < 2) {
          // 最多重试2次，间隔递增
          setTimeout(function() { self._syncToCloud(retryCount + 1) }, 3000 * (retryCount + 1))
        } else {
          console.error('[sync] 云端保存最终失败，数据仅存于本地')
        }
      }
    })
  },

  // ── 从云端恢复（云端数据更新时覆盖本地）
  _syncFromCloud: function(retryCount) {
    var self = this
    retryCount = retryCount || 0
    self._cloudSynced = false
    wx.cloud.callFunction({
      name: 'leaderboard',
      data: { action: 'getShopData' },
      success: function(res) {
        if (!res.result || !res.result.success || !res.result.data) {
          self._cloudSynced = true  // 云端没有数据，也算同步完成
          console.log('[sync] 云端无数据，使用本地数据')
          // 首次使用或清缓存后云端无数据，立即上传本地数据作为备份
          if (self.coins > 0 || self.totalCoinsEarned > 0 || Object.keys(self.unlocked).length > 0) {
            self._syncToCloud()
          }
          return
        }
        var d = res.result.data
        var changed = false

        // 金币取大值（防止回滚）
        if ((d.coins || 0) > self.coins) {
          self.coins = d.coins
          changed = true
        }
        if ((d.totalCoinsEarned || 0) > self.totalCoinsEarned) {
          self.totalCoinsEarned = d.totalCoinsEarned
          changed = true
        }

        // 成就：合并（云端有的本地也要有）
        if (d.unlocked) {
          for (var k in d.unlocked) {
            if (d.unlocked[k] && !self.unlocked[k]) { self.unlocked[k] = true; changed = true }
          }
        }

        // 已购皮肤：合并
        if (d.owned) {
          for (var k in d.owned) {
            if (d.owned[k] && !self.owned[k]) { self.owned[k] = true; changed = true }
          }
        }

        // 装备/道具：取大值
        if (d.equipped) { self.equipped = d.equipped; changed = true }
        if (d.propCounts) {
          for (var k in d.propCounts) {
            if ((d.propCounts[k] || 0) > (self.propCounts[k] || 0)) {
              self.propCounts[k] = d.propCounts[k]; changed = true
            }
          }
        }

        // 统计：取大值
        if (d.stats) {
          var fields = ['plays_2048','wins_2048','plays_hr','wins_hr','plays_sdk','wins_sdk','plays_total']
          for (var i = 0; i < fields.length; i++) {
            if ((d.stats[fields[i]] || 0) > (self.stats[fields[i]] || 0)) {
              self.stats[fields[i]] = d.stats[fields[i]]; changed = true
            }
          }
          if (d.stats.played_2048 && !self.stats.played_2048) { self.stats.played_2048 = true; changed = true }
          if (d.stats.played_hr && !self.stats.played_hr) { self.stats.played_hr = true; changed = true }
          if (d.stats.played_sdk && !self.stats.played_sdk) { self.stats.played_sdk = true; changed = true }
        }

        // 有变化才写本地
        if (changed) {
          wx.setStorageSync('coins', self.coins)
          wx.setStorageSync('totalCoinsEarned', self.totalCoinsEarned)
          wx.setStorageSync('achievements_unlocked', self.unlocked)
          wx.setStorageSync('shop_owned', self.owned)
          wx.setStorageSync('shop_equipped', self.equipped)
          wx.setStorageSync('prop_counts', self.propCounts)
          wx.setStorageSync('game_stats', self.stats)
          console.log('[sync] 云端数据已恢复到本地')
        } else {
          console.log('[sync] 本地数据与云端一致，无需更新')
        }
        self._cloudSynced = true
      },
      fail: function(err) {
        console.warn('[sync] 云端拉取失败:', err)
        if (retryCount < 2) {
          setTimeout(function() { self._syncFromCloud(retryCount + 1) }, 3000 * (retryCount + 1))
        } else {
          self._cloudSynced = true  // 放弃重试，使用本地数据
          console.error('[sync] 云端拉取最终失败，使用本地数据')
        }
      }
    })
  },

  // ── 调试：设置金币（管理后台用）
  debugSetCoins: function(amount) {
    this.coins = amount
    this._save()
    console.log('[debug] 金币设置为', amount)
  },

  // ── 金币操作
  addCoins: function(amount, showAd) {
    var gain = showAd ? amount * COIN_RULES.ad_bonus : amount
    this.coins += gain
    this.totalCoinsEarned += gain
    this._save()
    // 检查金币成就
    this._checkGlobalAchievements()
    return gain
  },

  spendCoins: function(amount) {
    if (this.coins < amount) return false
    this.coins -= amount
    this._save()
    return true
  },

  // ── 每日登录
  _checkDailyLogin: function() {
    var today = new Date().toDateString()
    if (this.stats.lastLogin !== today) {
      this.stats.lastLogin = today
      this.addCoins(COIN_RULES.daily_login)
      this._save()
      return true
    }
    return false
  },

  // ── 成就解锁
  unlock: function(achId) {
    if (this.unlocked[achId]) return false
    var ach = null
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === achId) { ach = ACHIEVEMENTS[i]; break }
    }
    if (!ach) return false
    this.unlocked[achId] = true
    this.addCoins(ach.reward)
    this._save()
    // 显示提示
    GameGlobal._achToast = { name: ach.name, icon: ach.icon, reward: ach.reward, timer: 3.0 }
    return true
  },

  // ── 记录游戏事件并检查成就
  onGameEvent: function(event, data) {
    var s = this.stats

    if (event === '2048_play') {
      s.plays_2048++; s.plays_total++; s.played_2048 = true
      this.addCoins(COIN_RULES['2048_play'])
      if (data.won) { s.wins_2048++; this.addCoins(COIN_RULES['2048_win']) }
      // 成就检查
      if (data.maxTile >= 1024) this.unlock('a_2048_1024')
      if (data.maxTile >= 2048) this.unlock('a_2048_2048')
      if (data.maxTile >= 4096) this.unlock('a_2048_4096')
      if (data.maxTile >= 8192) this.unlock('a_2048_8192')
      if (data.score >= 10000) this.unlock('a_2048_score10k')
      if (data.score >= 50000) this.unlock('a_2048_score50k')
      if (s.wins_2048 >= 3)  this.unlock('a_2048_win3')
      if (s.wins_2048 >= 10) this.unlock('a_2048_win10')
    }

    if (event === 'huarong_play') {
      s.plays_hr++; s.plays_total++; s.played_hr = true
      this.addCoins(COIN_RULES['huarong_win'])
      if (data.size === 3) this.unlock('a_hr_3x3')
      if (data.size === 4) this.unlock('a_hr_4x4')
      if (data.size === 5) this.unlock('a_hr_5x5')
      if (data.size >= 6)  this.unlock('a_hr_6x6')
      if (data.size === 3 && data.moves <= 30) this.unlock('a_hr_30step')
      if (data.size === 4 && data.moves <= 50) this.unlock('a_hr_50step')
      if (s.plays_hr >= 10) this.unlock('a_hr_win10')
      if (s.plays_hr >= 50) this.unlock('a_hr_win50')
    }

    if (event === 'sudoku_play') {
      s.plays_sdk++; s.plays_total++; s.played_sdk = true
      this.addCoins(COIN_RULES['sudoku_win'])
      if (data.diff === 'easy')   this.unlock('a_sdk_easy')
      if (data.diff === 'medium') this.unlock('a_sdk_medium')
      if (data.diff === 'hard')   this.unlock('a_sdk_hard')
      if (data.diff === 'expert') this.unlock('a_sdk_expert')
      if (data.diff === 'hell')   this.unlock('a_sdk_hell')
      if (data.errors === 0) this.unlock('a_sdk_noerr')
      if (data.diff === 'medium' && data.time <= 300) this.unlock('a_sdk_fast5')
    }

    if (event === 'sudoku_challenge') {
      this.addCoins(COIN_RULES['sudoku_chg'])
      if (data.level >= 50)  this.unlock('a_sdk_chg50')
      if (data.level >= 200) this.unlock('a_sdk_chg200')
      if (data.level >= 500) this.unlock('a_sdk_chg500')
    }

    if (event === 'survival_play') {
      s.plays_survival = (s.plays_survival||0) + 1
      s.plays_total++; s.played_survival = true
      // 基础奖励
      this.addCoins(COIN_RULES['survival_play'])
      // 击杀奖励（每10击杀=1金币）
      var killCoins = Math.floor((data.kills||0) * COIN_RULES['survival_kill_bonus'])
      if(killCoins>0) this.addCoins(killCoins)
      // 存活时间奖励（每分钟2金币）
      var timeCoins = Math.floor((data.time||0) / 60) * 2
      if(timeCoins>0) this.addCoins(timeCoins)
      // 等级奖励（每级1金币）
      var lvCoins = (data.level||1) - 1
      if(lvCoins>0) this.addCoins(lvCoins)
      // 击败Boss
      if(data.won) {
        this.addCoins(COIN_RULES['survival_win'])
        s.wins_survival = (s.wins_survival||0) + 1
      }
      // 记录最高击杀
      s.best_kills = Math.max(s.best_kills||0, data.kills||0)
      // 里程碑成就
      if((data.kills||0) >= 100)  this.unlock('a_sv_kill100')
      if((data.kills||0) >= 500)  this.unlock('a_sv_kill500')
      if((data.kills||0) >= 1000) this.unlock('a_sv_kill1000')
      if(data.won) this.unlock('a_sv_boss')
      if((data.level||0) >= 20) this.unlock('a_sv_maxlv')
      if((s.plays_survival||0) >= 10) this.unlock('a_sv_play10')
      if((s.wins_survival||0) >= 5)  this.unlock('a_sv_win5')
    }

    this._checkGlobalAchievements()
    this._save()
  },

  _checkGlobalAchievements: function() {
    var s = this.stats
    if (s.played_2048 && s.played_hr && s.played_sdk) this.unlock('a_g_allplay')
    if (s.plays_total >= 50)  this.unlock('a_g_play50')
    if (s.plays_total >= 200) this.unlock('a_g_play200')
    if (this.totalCoinsEarned >= 1000) this.unlock('a_g_coin1000')
    if (this.totalCoinsEarned >= 5000) this.unlock('a_g_coin5000')
    // 全成就
    var allCount = 0, unlockCount = 0
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === 'a_g_allachieve') continue
      allCount++
      if (this.unlocked[ACHIEVEMENTS[i].id]) unlockCount++
    }
    if (unlockCount >= allCount) this.unlock('a_g_allachieve')
  },

  // ── 商城购买
  buyItem: function(itemId) {
    var item = null
    for (var i = 0; i < SHOP_ITEMS.length; i++) {
      if (SHOP_ITEMS[i].id === itemId) { item = SHOP_ITEMS[i]; break }
    }
    if (!item) return { ok: false, msg: '物品不存在' }

    if (item.type === 'skin') {
      if (this.owned[itemId]) return { ok: false, msg: '已拥有' }
      if (!this.spendCoins(item.price)) return { ok: false, msg: '金币不足' }
      this.owned[itemId] = true
      this._save()
      return { ok: true, msg: '购买成功' }
    }

    if (item.type === 'prop') {
      if (!this.spendCoins(item.price)) return { ok: false, msg: '金币不足' }
      // 解析道具数量
      var match = item.id.match(/(\d+)$/)
      var count = match ? parseInt(match[1]) : 1
      var baseId = item.id.replace(/\d+$/, '')
      this.propCounts[baseId] = (this.propCounts[baseId] || 0) + count
      this._save()
      return { ok: true, msg: '获得' + count + '个' }
    }

    return { ok: false, msg: '未知类型' }
  },

  // ── 装备皮肤
  equipSkin: function(itemId) {
    if (!this.owned[itemId]) return false
    this.equipped.theme = (itemId === 'skin_default') ? '' : itemId
    this._save()
    return true
  },

  // ── 使用道具
  useProp: function(propBase) {
    if (!this.propCounts[propBase] || this.propCounts[propBase] <= 0) return false
    this.propCounts[propBase]--
    this._save()
    return true
  },

  getPropCount: function(propBase) {
    return this.propCounts[propBase] || 0
  },

  // ── 获取成就进度
  getProgress: function(game) {
    var total = 0, done = 0
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (game && ACHIEVEMENTS[i].game !== game) continue
      total++
      if (this.unlocked[ACHIEVEMENTS[i].id]) done++
    }
    return { total: total, done: done }
  }
}