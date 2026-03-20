// ================================================
//  云函数：leaderboard v2.2
//  新增：getBests - 获取用户所有最佳记录（本地恢复用）
//  支持：2048 / 华容道 / 数独 / 闯关 排行榜
// ================================================
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 升序类型（越小越好）：最速通关 / 华容道步数 / 华容道用时 / 数独用时
function isAscendingType(type) {
  if (type === 'time') return true
  if (/^huarong_(moves|time)/.test(type || '')) return true
  if (/^sudoku_(easy|medium|hard|expert|hell)$/.test(type || '')) return true
  return false
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, type, nickname, avatarUrl, score, time } = event

  try {
    // ── 上传分数（同时更新用户表 + 记录日志）
    if (action === 'upload') {
      const now = db.serverDate()
      const ascType = isAscendingType(type)

      // 1. 更新/创建用户记录
      const userCol = db.collection('users')
      try {
        await userCol.doc(OPENID).update({
          data: {
            nickName:  nickname || '神秘玩家',
            avatarUrl: avatarUrl || '',
            lastSeen:  now,
            [`best_${type}`]: ascType ? _.min(time) : _.max(score)
          }
        })
      } catch(e) {
        await userCol.doc(OPENID).set({
          data: {
            _id:       OPENID,
            openid:    OPENID,
            nickName:  nickname || '神秘玩家',
            avatarUrl: avatarUrl || '',
            firstSeen: now,
            lastSeen:  now,
            banned:    false,
            [`best_${type}`]: ascType ? time : score
          }
        })
      }

      // 2. 记录活动日志
      await db.collection('activityLogs').add({
        data: {
          openid:    OPENID,
          nickName:  nickname || '神秘玩家',
          action:    'score_upload',
          type:      type,
          score:     score,
          time:      time,
          createdAt: now
        }
      })

      // 3. 更新排行榜
      const col = db.collection('leaderboard')
      const exist = await col.where({ openid: OPENID, type }).limit(1).get()

      if (exist.data.length > 0) {
        const old = exist.data[0]
        const newVal = ascType ? time  : score
        const oldVal = ascType ? old.time : old.score
        const shouldUpdate = ascType ? (newVal < oldVal) : (newVal > oldVal)
        if (shouldUpdate) {
          await col.doc(old._id).update({
            data: { score, time, nickname, avatarUrl, updatedAt: now }
          })
        }
      } else {
        await col.add({
          data: { openid: OPENID, type, score, time, nickname, avatarUrl, createdAt: now }
        })
      }

      return { success: true }
    }

    // ── 获取排行榜
    if (action === 'fetch' || action === 'query') {
      const limit = Math.min(event.limit || 100, 100)
      const ascType = isAscendingType(type)

      const sortField = ascType ? 'time' : 'score'
      const sortDir   = ascType ? 'asc'  : 'desc'

      const res = await db.collection('leaderboard')
        .where({ type: type || 'score' })
        .orderBy(sortField, sortDir)
        .limit(limit).get()

      let myRank = null
      if (OPENID) {
        const myRes = await db.collection('leaderboard')
          .where({ openid: OPENID, type: type || 'score' })
          .get()
        if (myRes.data.length > 0) {
          const myRecord = myRes.data[0]
          const myVal = ascType ? myRecord.time : myRecord.score
          const betterCondition = ascType ? _.lt(myVal) : _.gt(myVal)
          const betterRes = await db.collection('leaderboard')
            .where({ type: type || 'score', [sortField]: betterCondition })
            .count()
          myRank = {
            rank:      betterRes.total + 1,
            score:     myRecord.score,
            time:      myRecord.time,
            nickname:  myRecord.nickname,
            avatarUrl: myRecord.avatarUrl,
            openid:    OPENID
          }
        }
      }

      return { success: true, data: res.data, myRank }
    }

    // ── 获取当前用户所有最佳记录（清缓存后恢复用）
    // 从 leaderboard 查（最准确），而非 users 的 best_ 字段
    if (action === 'getBests') {
      try {
        const myRecords = await db.collection('leaderboard')
          .where({ openid: OPENID }).limit(50).get()
        const bests = {}
        for (const r of myRecords.data) {
          if (r.type) {
            // 升序类型存 time，降序类型存 score
            bests['best_' + r.type] = isAscendingType(r.type) ? r.time : r.score
          }
        }
        return { success: true, data: bests }
      } catch(e) {
        return { success: true, data: null }
      }
    }

    // ── 记录游戏开始（用于统计日活）
    if (action === 'game_start') {
      await db.collection('activityLogs').add({
        data: { openid: OPENID, action: 'game_start', createdAt: db.serverDate() }
      })
      return { success: true }
    }

    // ── 保存商城/成就数据到云端
    if (action === 'saveShopData') {
      const shopData = event.shopData
      if (!shopData) return { success: false, msg: '无数据' }
      const now = db.serverDate()
      try {
        await db.collection('users').doc(OPENID).update({
          data: { shopData: shopData, lastSeen: now }
        })
      } catch(e) {
        // 用户不存在则创建
        try {
          await db.collection('users').doc(OPENID).set({
            data: { _id: OPENID, openid: OPENID, shopData: shopData, firstSeen: now, lastSeen: now }
          })
        } catch(e2) {
          console.error('saveShopData 创建用户失败:', e2)
          return { success: false, msg: '保存失败' }
        }
      }
      return { success: true }
    }

    // ── 获取云端商城/成就数据
    if (action === 'getShopData') {
      try {
        const doc = await db.collection('users').doc(OPENID).get()
        return { success: true, data: doc.data.shopData || null }
      } catch(e) {
        return { success: true, data: null }
      }
    }

    // ── 更新用户昵称和头像（改名后同步）
    if (action === 'updateProfile') {
      const openid = OPENID
      if (!openid) return { success: false }
      const nickname    = event.nickname    || '神秘玩家'
      const avatarUrl   = event.avatarUrl   || ''
      const oldNickname = event.oldNickname || ''

      await db.collection('leaderboard').where({ openid }).update({
        data: { nickname, avatarUrl, updatedAt: db.serverDate() }
      })
      if (oldNickname && oldNickname !== nickname) {
        try {
          await db.collection('leaderboard').where({ nickname: oldNickname }).update({
            data: { nickname, avatarUrl, openid, updatedAt: db.serverDate() }
          })
        } catch(e) {}
      }
      try {
        await db.collection('users').doc(openid).update({
          data: { nickName: nickname, avatarUrl, lastSeen: db.serverDate() }
        })
      } catch(e) {}
      return { success: true }
    }

    return { success: false, msg: '未知操作' }

  } catch(e) {
    console.error('leaderboard error:', e)
    return { success: false, msg: e.message }
  }
}