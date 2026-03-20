const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const col = db.collection('pk_rooms')

function saveRoom(id, room) {
  const data = Object.assign({}, room)
  delete data._id
  return col.doc(id).set({ data: data })
}

async function cleanOldRooms() {
  try {
    const tenMinAgo  = new Date(Date.now() - 10 * 60 * 1000)
    const twoHourAgo = new Date(Date.now() - 2  * 60 * 60 * 1000)
    const old = await col.where(
      db.command.or([
        { status: 'finished', createdAt: db.command.lt(tenMinAgo) },
        { createdAt: db.command.lt(twoHourAgo) }
      ])
    ).get()
    for (const room of old.data) await col.doc(room._id).remove()
    if (old.data.length > 0) console.log('PK cleanup removed', old.data.length, 'rooms')
  } catch(e) {}
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event
  console.log('PK v10', action, OPENID)

  // ══════════════════════════════════════════
  //  创建房间
  // ══════════════════════════════════════════
  if (action === 'create') {
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const gt   = event.gameType || '2048'
    const res  = await col.add({ data: {
      roomCode:     code,
      status:       'waiting',
      createdAt:    db.serverDate(),
      gameType:     gt,
      pkMode:       event.pkMode || 'standard',
      sudokuDiff:   event.sudokuDiff || 'medium',
      huarongSize:  gt === 'huarong' ? (event.huarongSize || 4) : null,
      host: {
        openid: OPENID, nickName: event.nickName || '房主',
        score: 0, moves: 0, time: 0, maxTile: 0,
        gameWon: false, gameOver: false, solved: false
      },
      guest:  null,
      winner: null
    }})
    cleanOldRooms()
    return { success: true, roomId: res._id, roomCode: code }
  }

  // ══════════════════════════════════════════
  //  加入房间
  // ══════════════════════════════════════════
  if (action === 'join') {
    const res = await col.where({ roomCode: event.roomCode, status: 'waiting' }).get()
    if (!res.data.length) return { success: false, msg: '房间不存在或已满' }
    const room = res.data[0]
    if (room.host.openid === OPENID) return { success: false, msg: '不能加入自己的房间' }
    room.status = 'countdown'
    room.guest = {
      openid: OPENID, nickName: event.nickName || '对手',
      score: 0, moves: 0, time: 0, maxTile: 0,
      gameWon: false, gameOver: false, solved: false
    }
    await saveRoom(room._id, room)
    return { success: true, roomId: room._id, room: room }
  }

  // ══════════════════════════════════════════
  //  开始游戏（房主触发）
  // ══════════════════════════════════════════
  if (action === 'startGame') {
    const room = (await col.doc(event.roomId).get()).data
    room.status = 'playing'
    await saveRoom(event.roomId, room)
    return { success: true }
  }

  // ══════════════════════════════════════════
  //  同步游戏状态
  // ══════════════════════════════════════════
  if (action === 'update') {
    let room
    try { room = (await col.doc(event.roomId).get()).data }
    catch(e) { return { success: false, msg: '房间不存在' } }

    const isHost  = OPENID === room.host.openid
    const isGuest = !!(room.guest && OPENID === room.guest.openid)
    if (!isHost && !isGuest) return { success: true }

    // 更新该玩家的数据
    const side = isHost ? room.host : room.guest
    side.score    = event.score    || 0
    side.moves    = event.moves    != null ? event.moves : (event.score || 0)
    side.time     = event.time     || 0
    side.gameWon  = !!event.gameWon
    side.gameOver = !!event.gameOver
    side.solved   = !!event.solved || !!event.gameWon
    side.maxTile  = event.maxTile  || 0

    // ── 判定是否结束 ──
    if (room.guest && room.status !== 'finished') {
      const h  = room.host, g = room.guest
      const gt = room.gameType || '2048'
      let finished = false

      if (gt === 'huarong' || gt === 'sudoku') {
        // ★ 华容道/数独：任意一方 solved → 立即结算（先完成者胜）
        if (h.solved || g.solved || (h.gameOver && g.gameOver)) {
          finished = true
          if      (h.solved && !g.solved)  room.winner = 'host'
          else if (!h.solved && g.solved)  room.winner = 'guest'
          else if (!h.solved && !g.solved) room.winner = 'draw'   // 双方都认输
          else if (h.time < g.time)        room.winner = 'host'   // 都完成比用时
          else if (h.time > g.time)        room.winner = 'guest'
          else if (h.moves <= g.moves)     room.winner = 'host'   // 用时相同比步数
          else                             room.winner = 'guest'
        }
      } else if (gt === '2048') {
        // ★ 2048 PK
        const pkMode = room.pkMode || 'standard'

        if (pkMode === 'standard') {
          // 标准模式：
          // 1) 任一方到2048 → 立即结束
          // 2) 任一方格满(gameOver且没gameWon) → 立即结束（该方判负）
          // 3) 双方都结束 → 比较
          if (h.gameWon || g.gameWon) {
            finished = true
            if (h.gameWon && !g.gameWon)       room.winner = 'host'
            else if (!h.gameWon && g.gameWon)  room.winner = 'guest'
            else {
              room.winner = h.time < g.time ? 'host' : (h.time > g.time ? 'guest' : 'draw')
            }
          } else if (h.gameOver || g.gameOver) {
            // 一方格满（没到2048）→ 直接判负
            finished = true
            if (h.gameOver && !g.gameOver)      room.winner = 'guest'
            else if (!h.gameOver && g.gameOver) room.winner = 'host'
            else {
              // 双方都格满 → 比分数
              room.winner = h.score > g.score ? 'host' : (h.score < g.score ? 'guest' : 'draw')
            }
          }
        } else {
          // 无尽模式：双方都gameOver才结束
          if (h.gameOver && g.gameOver) {
            finished = true
            room.winner = h.score > g.score ? 'host' : (h.score < g.score ? 'guest' : 'draw')
          }
        }
      }

      if (finished) room.status = 'finished'
    }

    await saveRoom(event.roomId, room)
    return { success: true }
  }

  // ══════════════════════════════════════════
  //  查询房间
  // ══════════════════════════════════════════
  if (action === 'getRoom') {
    try { return { success: true, room: (await col.doc(event.roomId).get()).data } }
    catch(e) { return { success: false, msg: '房间不存在' } }
  }

  // ══════════════════════════════════════════
  //  认输
  // ══════════════════════════════════════════
  if (action === 'surrender') {
    try {
      const room = (await col.doc(event.roomId).get()).data
      room.status = 'finished'
      room.winner = OPENID === room.host.openid ? 'guest' : 'host'
      if (OPENID === room.host.openid) {
        room.host.gameOver = true; room.host.solved = false
      } else if (room.guest) {
        room.guest.gameOver = true; room.guest.solved = false
      }
      await saveRoom(room._id, room)
      return { success: true }
    } catch(e) { return { success: false, msg: e.message } }
  }

  return { success: false, msg: 'unknown action' }
}