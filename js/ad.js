// ================================================
//  ad.js - 激励视频广告管理
//  用完免费撤销次数后，看广告可再获得1次
// ================================================

GameGlobal.AdManager = {
  _ad:      null,
  _adReady: false,
  _onReward: null,   // 看完广告的回调

  // 填入你在微信公众平台申请的广告位 ID
  // 路径：微信公众平台 → 流量主 → 激励视频广告 → 创建广告位
  AD_UNIT_ID: '填入你的广告位ID',

  init: function() {
    if (!wx.createRewardedVideoAd) {
      // 不支持激励广告（开发环境或低版本）
      this._ad = null
      return
    }
    var self = this
    this._ad = wx.createRewardedVideoAd({ adUnitId: this.AD_UNIT_ID })

    // 广告加载完成
    this._ad.onLoad(function() {
      self._adReady = true
    })

    // 广告加载失败，静默处理
    this._ad.onError(function(err) {
      self._adReady = false
    })

    // 广告播放完成（用户获得奖励）
    this._ad.onClose(function(res) {
      if (res && res.isEnded) {
        // 用户完整看完了广告
        if (self._onReward) {
          self._onReward()
          self._onReward = null
        }
      } else {
        // 用户中途关闭，不给奖励
        wx.showToast({ title: '需要看完广告才能获得撤销', icon: 'none', duration: 1500 })
      }
      // 重新加载广告备用
      self._adReady = false
      self._ad.load()
    })

    // 预加载广告
    this._ad.load()
  },

  // 展示激励广告
  // onRewarded: 看完广告后的回调函数
  showRewardedAd: function(onRewarded) {
    var self = this

    // 没有广告位 ID 或不支持（开发阶段），直接模拟奖励
    if (!this._ad || this.AD_UNIT_ID === '填入你的广告位ID') {
      wx.showModal({
        title: '观看广告',
        content: '观看一个短视频广告，即可获得1次撤销机会',
        confirmText: '模拟观看',
        cancelText: '取消',
        success: function(res) {
          if (res.confirm && onRewarded) onRewarded()
        }
      })
      return
    }

    this._onReward = onRewarded

    if (this._adReady) {
      this._ad.show().catch(function() {
        wx.showToast({ title: '广告加载中，请稍后', icon: 'none', duration: 1500 })
        self._ad.load()
      })
    } else {
      wx.showToast({ title: '广告加载中，请稍后再试', icon: 'none', duration: 1500 })
      this._ad.load()
    }
  }
}