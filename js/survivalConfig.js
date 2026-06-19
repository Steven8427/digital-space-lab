// ================================================
//  survivalConfig.js - 生存模式所有可调数值
//  改这里的数字就能调玩法：武器 / 敌人 / 血量 / 升级加成…
//  （survivalLogic.js 从这里读，必须在它之前加载）
// ================================================
GameGlobal.SVConfig = {

  // ── 全局 ────────────────────────────────────
  MAP_W: 3000, MAP_H: 3000, GRID_SIZE: 80,
  BASE_SPEED: 160,        // 玩家移动速度
  SPAWN_DIST: 480,
  GAME_DURATION: 600,     // 一局时长（秒），到点出 Boss
  MAX_LEVEL: 50,
  PLAYER_HP: 100,         // 玩家初始 / 最大血量

  // ── 敌人类型：speed=移动速度，radius=碰撞半径 ──
  ENEMY_TYPES: {
    walker: { speed: 40, chase: true, radius: 18 },
    swarm:  { speed: 55, chase: true, radius: 13 },
    tank:   { speed: 22, chase: true, radius: 24 },
    dash:   { speed: 30, chase: true, radius: 18, dashSpeed: 180, dashRange: 150 },
    split:  { speed: 35, chase: true, radius: 18 }
  },

  // ── 敌人血量随时间增长：base + floor(存活秒/everySec) * inc ──
  ENEMY_HP: { base: 3, everySec: 20, inc: 3 },

  // ── 刷怪权重（按存活秒数分档，until=该档上限秒；数字=相对概率） ──
  SPAWN_WEIGHTS: [
    { until: 60,       w: { walker: 55, swarm: 35, tank: 0,  dash: 5,  split: 5  } },
    { until: 120,      w: { walker: 45, swarm: 25, tank: 10, dash: 10, split: 10 } },
    { until: 300,      w: { walker: 35, swarm: 20, tank: 15, dash: 15, split: 15 } },
    { until: Infinity, w: { walker: 25, swarm: 15, tank: 20, dash: 20, split: 20 } }
  ],

  // ── 武器：基础数值 + 每级升级加成 up ──────────
  //   baseDmg 基础攻击 / baseCD 冷却秒(0=持续) / count 发射数 / range 范围
  //   up.dmg        每级 +攻击
  //   up.cd         每级 ×冷却（<1=变快，1=不变）
  //   up.range      每级 +范围
  //   up.countEvery 每隔几级 +1 发射数（0=不增加）
  WEAPON_DEFS: {
    orbit:     { name: '旋转飞刀', desc: '数字环绕你旋转',     icon: '🔪', baseDmg: 5,  baseCD: 0,   count: 2, range: 65,  up: { dmg: 3,  cd: 1,    range: 8,  countEvery: 1 } },
    bolt:      { name: '能量弹',   desc: '自动射击最近敌人',   icon: '🔮', baseDmg: 8,  baseCD: 0.7, count: 1, range: 300, up: { dmg: 5,  cd: 0.82, range: 0,  countEvery: 2 } },
    lightning: { name: '闪电链',   desc: '连锁闪电弹跳伤害',   icon: '⚡', baseDmg: 6,  baseCD: 2.0, count: 3, range: 250, up: { dmg: 4,  cd: 0.9,  range: 0,  countEvery: 1 } },
    aura:      { name: '冰冻光环', desc: '减速并持续伤害',     icon: '❄', baseDmg: 4,  baseCD: 0.4, count: 1, range: 60,  up: { dmg: 3,  cd: 0.9,  range: 15, countEvery: 0 } },
    ring:      { name: '火焰圈',   desc: '周期性火焰扩散',     icon: '🔥', baseDmg: 12, baseCD: 2.5, count: 1, range: 180, up: { dmg: 6,  cd: 0.85, range: 15, countEvery: 0 } },
    boomerang: { name: '回旋镖',   desc: '飞出再飞回，穿透敌人', icon: '🪃', baseDmg: 8,  baseCD: 1.5, count: 1, range: 220, up: { dmg: 5,  cd: 0.88, range: 0,  countEvery: 1 } },
    meteor:    { name: '陨石',     desc: '随机砸落范围爆炸',   icon: '☄', baseDmg: 20, baseCD: 3.0, count: 1, range: 250, up: { dmg: 10, cd: 0.88, range: 0,  countEvery: 1 } },
    shield:    { name: '护盾球',   desc: '旋转护盾挡住敌人',   icon: '🛡', baseDmg: 6,  baseCD: 0,   count: 3, range: 85,  up: { dmg: 4,  cd: 1,    range: 12, countEvery: 1 } },
    vampire:   { name: '吸血斧',   desc: '近战攻击回血',       icon: '🪓', baseDmg: 10, baseCD: 0.8, count: 1, range: 120, up: { dmg: 6,  cd: 0.82, range: 15, countEvery: 0 } },
    tornado:   { name: '龙卷风',   desc: '向前方推开敌人',     icon: '🌪', baseDmg: 7,  baseCD: 2.0, count: 1, range: 200, up: { dmg: 5,  cd: 0.85, range: 25, countEvery: 0 } },
    poison:    { name: '毒雾',     desc: '留下毒区域持续伤害', icon: '☢', baseDmg: 5,  baseCD: 3.0, count: 1, range: 90,  up: { dmg: 4,  cd: 0.92, range: 20, countEvery: 1 } },
    chain:     { name: '锁链',     desc: '定住敌人无法移动',   icon: '⛓', baseDmg: 6,  baseCD: 1.8, count: 1, range: 250, up: { dmg: 4,  cd: 0.88, range: 20, countEvery: 1 } }
  },

  // ── 进化武器升级时的统一加成 ──────────────────
  EVOLVED_UP: { dmgMult: 1.15, rangeMult: 1.1, cdMult: 0.95, countEvery: 2, countMax: 10 },

  // ── 武器进化（两把合成一把） ──────────────────
  EVOLUTION_DEFS: {
    bloodstorm:   { a: 'orbit',     b: 'vampire',   name: '血刃风暴', desc: '双层飞刀群+大范围回血', icon: '💀', baseDmg: 30, baseCD: 0,   count: 6, range: 120 },
    thunderball:  { a: 'bolt',      b: 'lightning', name: '雷球连锁', desc: '能量弹命中触发闪电',   icon: '🌩', baseDmg: 20, baseCD: 0.5, count: 3, range: 350 },
    elemental:    { a: 'aura',      b: 'ring',      name: '元素爆裂', desc: '冰火交替脉冲冻爆',     icon: '💥', baseDmg: 30, baseCD: 1.8, count: 1, range: 200 },
    bounceshield: { a: 'boomerang', b: 'shield',    name: '弹射护盾', desc: '发射护盾弹弹射多敌',   icon: '🔰', baseDmg: 22, baseCD: 1.2, count: 3, range: 300 },
    plaguemeteor: { a: 'meteor',    b: 'poison',    name: '瘟疫陨石', desc: '大范围陨石+毒区+减速', icon: '☠', baseDmg: 40, baseCD: 2.0, count: 3, range: 300 },
    voidvortex:   { a: 'tornado',   b: 'chain',     name: '虚空漩涡', desc: '巨型龙卷风吸拽绞杀',   icon: '🌀', baseDmg: 22, baseCD: 1.5, count: 1, range: 300 }
  },

  // ── 精英怪：hp0/spd0=基础值，hpPer/spdPer=每出现一次的增量 ──
  ELITES: [
    { type: 'tank',  hp0: 400, hpPer: 60, spd0: 28, spdPer: 1.5, size: 1.6, color: '#e74c3c', name: '重甲' },
    { type: 'dash',  hp0: 250, hpPer: 40, spd0: 60, spdPer: 3,   size: 1.3, color: '#9b59b6', name: '疾风' },
    { type: 'split', hp0: 300, hpPer: 50, spd0: 35, spdPer: 2,   size: 1.5, color: '#f39c12', name: '裂变' }
  ],

  // ── Boss ────────────────────────────────────
  BOSS: { hp: 2000, speed: 22 }
}
