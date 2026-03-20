const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  try {
    const lb = await db.collection('leaderboard').limit(100).get()
    console.log('leaderboard 总数:', lb.data.length)

    let created = 0, failed = 0

    for (const record of lb.data) {
      const openid = record.openid
      if (!openid) { failed++; continue }

      try {
        // 直接 set，不管存不存在都强制写入
        await db.collection('users').add({
          data: {
            _id:       openid,
            openid:    openid,
            nickName:  record.nickname || '神秘玩家',
            avatarUrl: record.avatarUrl || '',
            firstSeen: record.createdAt || db.serverDate(),
            lastSeen:  record.updatedAt || record.createdAt || db.serverDate(),
            banned:    false,
            best_score: record.type === 'score' ? (record.score || 0) : 0,
            best_time:  record.type === 'time'  ? (record.time  || 0) : 0
          }
        })
        created++
        console.log('创建用户:', openid, record.nickname)
      } catch(e) {
        // _id 重复说明已存在，忽略
        console.log('已存在跳过:', openid, e.errCode)
      }
    }

    return { success: true, total: lb.data.length, created, failed }
  } catch(e) {
    console.error(e)
    return { success: false, msg: e.message }
  }
}