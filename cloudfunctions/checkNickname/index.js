const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const LOCAL_BANNED = [
  // ── 领导人
  '习近平','习大大','近平','毛泽东','毛主席','邓小平','江泽民','胡锦涛','李克强','温家宝','李强','王岐山',
  'xijinping','jinping','xjp','maozedong','zedong','dengxiaoping','xiaoping',
  // ── 敏感事件/地区
  '六四','天安门','法轮功','法轮大法','藏独','台独','港独','文化大革命','文革','大跃进',
  'tiananmen','liusi','falungong','falun','1989','8964',
  // ── 生殖器
  '屌','吊','叼','diao','鸡巴','jb','j8','屄','逼','骚逼','骚货','骚穴','骚b',
  '阴茎','阴道','阴部','龟头','睾丸','奶子','肉棒','肉穴','淫',
  'diao','jiba','bi','biaozi',
  // ── 性行为
  '操','艹','干你','日你','肏','做爱','性交','口交','肛交','手淫','自慰','射精',
  '强奸','轮奸','乱伦','约炮','打炮','干炮',
  // ── 粗口
  '傻逼','煞笔','沙雕','傻叉',
  '操你','操你妈','你妈的','妈的','他妈','草你妈','草泥马',
  '去死','狗日','贱人','婊子','妓女','援交','卖淫',
  '王八蛋','混蛋','批','臭逼',
  // ── 英文粗口
  'fuck','fuk','fucker','fucking','shit','bitch','asshole',
  'bastard','cunt','cock','dick','pussy','whore','slut','nigger','nigga',
  'cnm','nmsl','wdnmd','shabi','caoni',
  // ── 暴力
  '杀死','杀你','打死你','弄死'
]

function localCheck(name) {
  const lower = name.toLowerCase().replace(/\s/g, '')
  const raw   = name.replace(/\s/g, '')
  for (const w of LOCAL_BANNED) {
    if (lower.includes(w) || raw.includes(w)) return w
  }
  return null
}

exports.main = async (event) => {
  const nickname = (event.nickname || '').trim()
  if (!nickname) return { blocked: false }

  const hit = localCheck(nickname)
  if (hit) {
    console.log('[BLOCKED]', nickname, '->', hit)
    return { blocked: true, reason: 'local' }
  }

  // ② 微信 msgSecCheck（体验版/正式版可用）
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: nickname,
      version: 2,
      scene: 1
    })
    const suggest = res.result && res.result.suggest
    console.log('[SEC-CHECK]', nickname, '->', suggest)
    if (suggest === 'block' || suggest === 'review') {
      return { blocked: true, reason: suggest }
    }
  } catch(e) {
    console.error('[SEC-CHECK ERROR]', e.errCode, e.errMsg)
    // 出错不阻断正常用户
  }

  return { blocked: false }
}