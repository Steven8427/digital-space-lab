// ================================================
//  云函数：adminAPI v2.0
//  多游戏统计、用户管理、活动日志
// ================================================
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ADMIN_KEY = 'longlong1234'

exports.main = async (event, context) => {
  let params = event
  if (typeof event.body === 'string') {
    try { params = JSON.parse(event.body) } catch(e) { params = event }
  }

  const { action, adminKey, openid, page = 1, pageSize = 20, keyword } = params

  if (adminKey !== ADMIN_KEY) {
    return { success: false, msg: '无权限' }
  }

  try {
    // ── 综合统计概览
    if (action === 'getStats') {
      const userCount = await db.collection('users').count()
      const logCount  = await db.collection('activityLogs').count()

      // 今日活跃
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const todayActive = await db.collection('activityLogs')
        .where({ createdAt: _.gte(today), action: 'game_start' }).count()

      // 2048 最高分
      const top2048 = await db.collection('leaderboard')
        .where({ type: 'score' }).orderBy('score', 'desc').limit(1).get()

      // 各游戏参与人数（排行榜去重 type）
      const lbAll = await db.collection('leaderboard').limit(1000).get()
      var gameCounts = {}
      var typeSet = {}
      for (var i = 0; i < lbAll.data.length; i++) {
        var t = lbAll.data[i].type || ''
        if (!typeSet[t]) typeSet[t] = {}
        typeSet[t][lbAll.data[i].openid] = 1
      }
      // 归类统计
      var cnt2048 = 0, cntHR = 0, cntSDK = 0, cntChg = 0
      for (var t in typeSet) {
        var n = Object.keys(typeSet[t]).length
        if (t === 'score' || t === 'time') cnt2048 = Math.max(cnt2048, n)
        else if (t.indexOf('huarong') === 0) cntHR = Math.max(cntHR, n)
        else if (t === 'sudoku_challenge') cntChg = n
        else if (t.indexOf('sudoku') === 0) cntSDK = Math.max(cntSDK, n)
      }

      // 闯关最高关
      const topChg = await db.collection('leaderboard')
        .where({ type: 'sudoku_challenge' }).orderBy('score', 'desc').limit(1).get()

      // PK 房间数
      let pkCount = 0
      try {
        const pkRes = await db.collection('pk_rooms').count()
        pkCount = pkRes.total
      } catch(e) {}

      return {
        success: true,
        totalUsers:    userCount.total,
        todayActive:   todayActive.total,
        totalLogs:     logCount.total,
        top2048:       top2048.data[0] || null,
        topChallenge:  topChg.data[0] || null,
        players2048:   cnt2048,
        playersHR:     cntHR,
        playersSDK:    cntSDK,
        playersChg:    cntChg,
        pkRooms:       pkCount
      }
    }

    // ── 获取用户列表（支持翻页和搜索）
    if (action === 'getUsers') {
      const skip = (page - 1) * pageSize
      let query = db.collection('users')
      if (keyword) {
        query = query.where({ nickName: db.RegExp({ regexp: keyword, options: 'i' }) })
      }
      const total = keyword
        ? await db.collection('users').where({ nickName: db.RegExp({ regexp: keyword, options: 'i' }) }).count()
        : await db.collection('users').count()
      const res = await query.orderBy('lastSeen', 'desc').skip(skip).limit(pageSize).get()
      return { success: true, data: res.data, total: total.total, page, pageSize }
    }

    // ── 删除用户
    if (action === 'deleteUser') {
      await db.collection('users').doc(openid).remove()
      await db.collection('leaderboard').where({ openid }).remove()
      return { success: true, msg: '用户已删除' }
    }

    // ── 封禁用户
    if (action === 'banUser') {
      await db.collection('users').doc(openid).update({
        data: { banned: true, bannedAt: db.serverDate() }
      })
      return { success: true, msg: '已封禁' }
    }

    // ── 解封用户
    if (action === 'unbanUser') {
      await db.collection('users').doc(openid).update({
        data: { banned: false }
      })
      return { success: true, msg: '已解封' }
    }

    // ── 获取活动日志（支持翻页和过滤）
    if (action === 'getLogs') {
      const skip = (page - 1) * pageSize
      const filter = params.filter  // 'all' | 'score_upload' | 'game_start'
      let query = db.collection('activityLogs')
      if (filter && filter !== 'all') {
        query = query.where({ action: filter })
      }
      const res = await query.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()
      const total = filter && filter !== 'all'
        ? await db.collection('activityLogs').where({ action: filter }).count()
        : await db.collection('activityLogs').count()
      return { success: true, data: res.data, total: total.total, page, pageSize }
    }

    return { success: false, msg: '未知操作' }

  } catch (e) {
    console.error('adminAPI error:', e)
    return { success: false, msg: e.message }
  }
}