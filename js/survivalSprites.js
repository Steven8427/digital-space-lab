// ================================================
//  survivalSprites.js — Pixel art sprite system
//  Downloads sprite sheets from cloud storage,
//  provides animated drawing functions
// ================================================

var CLOUD_PREFIX = 'cloud://cloud1-6gfj19793c24b47c.636c-cloud1-6gfj19793c24b47c-1406406015/'

// ── Sprite sheet definitions
var PLAYER_SKINS = ['doux', 'mort', 'vita', 'tard']
var PLAYER_FILES = {}
for (var _pi = 0; _pi < PLAYER_SKINS.length; _pi++) {
  var _sn = PLAYER_SKINS[_pi]
  PLAYER_FILES[_sn] = CLOUD_PREFIX + 'survival/player/DinoSprites - ' + _sn + '.png'
}

// Player animation frame ranges (0-indexed in a 24-frame sheet)
var PLAYER_ANIMS = {
  idle: { start: 0, count: 4, fps: 6 },
  run:  { start: 4, count: 6, fps: 10 },
  hurt: { start: 14, count: 4, fps: 8 }
}

// Monster sprite files
var MONSTER_NAMES = [
  'BlindedGrimlock', 'BloodshotEye', 'BrawnyOgre', 'CrimsonSlaad', 'CrushingCyclops',
  'DeathSlime', 'FungalMyconid', 'HumongousEttin', 'MurkySlaad', 'OchreJelly',
  'OcularWatcher', 'RedCap', 'ShriekerMushroom', 'StoneTroll', 'SwampTroll'
]
var MONSTER_FILES = {}
for (var _mi = 0; _mi < MONSTER_NAMES.length; _mi++) {
  MONSTER_FILES[MONSTER_NAMES[_mi]] = CLOUD_PREFIX + 'survival/monster/' + MONSTER_NAMES[_mi] + '.png'
}

// Map enemy types to monster sprites
var ENEMY_SPRITE_MAP = {
  walker: ['BlindedGrimlock', 'RedCap', 'StoneTroll'],
  swarm:  ['DeathSlime', 'OchreJelly', 'ShriekerMushroom'],
  tank:   ['BrawnyOgre', 'CrushingCyclops', 'HumongousEttin'],
  dash:   ['CrimsonSlaad', 'MurkySlaad', 'SwampTroll'],
  split:  ['BloodshotEye', 'FungalMyconid', 'OcularWatcher']
}

// Tileset
var TILESET_FILE = CLOUD_PREFIX + 'survival/map/Tileset.png'
var HOUSES_FILE = CLOUD_PREFIX + 'survival/map/Houses.png'

// Icon sprite sheets
var ICONS_WEAPONS_FILE = CLOUD_PREFIX + 'survival/icons/Weapons.png'
var ICONS_FOOD_FILE = CLOUD_PREFIX + 'survival/icons/Food.png'
var ICONS_POTIONS_FILE = CLOUD_PREFIX + 'survival/icons/PotionBottles.png'

// VFX sprite sheets
var VFX_LIGHTNING_FILE = CLOUD_PREFIX + 'survival/vfx/lightning_sheet.png'
var VFX_SPELL_FILE = CLOUD_PREFIX + 'survival/vfx/01.png'
var VFX_BULLET_FILE = CLOUD_PREFIX + 'survival/vfx/bullet_purple.png'

// ── State
var _spriteImages = {}   // key -> Image object
var _spriteLoaded = {}   // key -> boolean
var _allLoaded = false
var _loadStarted = false
var _currentSkin = 'doux'

// ── Load all sprite sheets
function _loadSprites() {
  if (_loadStarted) return
  _loadStarted = true

  // Collect all cloud fileIDs
  var fileIDs = []
  var fileKeys = []

  // Player skins
  for (var skin in PLAYER_FILES) {
    fileIDs.push(PLAYER_FILES[skin])
    fileKeys.push('player_' + skin)
  }

  // Monsters
  for (var mname in MONSTER_FILES) {
    fileIDs.push(MONSTER_FILES[mname])
    fileKeys.push('monster_' + mname)
  }

  // Tileset
  fileIDs.push(TILESET_FILE)
  fileKeys.push('tileset')
  fileIDs.push(HOUSES_FILE)
  fileKeys.push('houses')

  // Icon sprite sheets
  fileIDs.push(ICONS_WEAPONS_FILE)
  fileKeys.push('icons_weapons')
  fileIDs.push(ICONS_FOOD_FILE)
  fileKeys.push('icons_food')
  fileIDs.push(ICONS_POTIONS_FILE)
  fileKeys.push('icons_potions')

  // VFX sprite sheets
  fileIDs.push(VFX_LIGHTNING_FILE)
  fileKeys.push('vfx_lightning')
  fileIDs.push(VFX_SPELL_FILE)
  fileKeys.push('vfx_spell')
  fileIDs.push(VFX_BULLET_FILE)
  fileKeys.push('vfx_bullet')

  // Batch request temp URLs (max 50 per call, we have ~21)
  wx.cloud.getTempFileURL({
    fileList: fileIDs,
    success: function(res) {
      if (!res || !res.fileList) {
        console.warn('[sprites] getTempFileURL failed: no fileList')
        return
      }
      // 建立 fileID → key 的映射（防止返回顺序不一致）
      var idToKey = {}
      for (var fi = 0; fi < fileIDs.length; fi++) {
        idToKey[fileIDs[fi]] = fileKeys[fi]
      }

      var loadCount = 0
      var totalCount = res.fileList.length

      for (var i = 0; i < res.fileList.length; i++) {
        var item = res.fileList[i]
        var key = idToKey[item.fileID] || fileKeys[i]
        if (item.status !== 0 || !item.tempFileURL) {
          console.warn('[sprites] failed to get URL for', key, item.fileID, item.status)
          loadCount++
          continue
        }
        console.log('[sprites] Loading:', key)
        ;(function(k, url) {
          var img = wx.createImage()
          img.onload = function() {
            _spriteImages[k] = img
            _spriteLoaded[k] = true
            loadCount++
            if (loadCount >= totalCount) {
              _allLoaded = true
              console.log('[sprites] All sprite sheets loaded')
            }
          }
          img.onerror = function() {
            console.warn('[sprites] Failed to load image:', k)
            loadCount++
            if (loadCount >= totalCount) {
              _allLoaded = true
              console.log('[sprites] Sprite loading complete (some failed)')
            }
          }
          img.src = url
        })(key, item.tempFileURL)
      }
    },
    fail: function(err) {
      console.error('[sprites] getTempFileURL error:', err)
    }
  })
}

// ── Draw a sprite frame from a horizontal sprite sheet
// img: Image, frameIdx: which frame, totalFrames: total frames in sheet
// x,y: center position on canvas, w,h: draw size, flipX: mirror horizontally
function _drawSpriteFrame(ctx, img, frameIdx, totalFrames, x, y, w, h, flipX) {
  if (!img || !img.width) return
  var fw = img.width / totalFrames
  var fh = img.height
  var sx = frameIdx * fw

  ctx.save()
  ctx.translate(x, y)
  if (flipX) {
    ctx.scale(-1, 1)
  }
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, 0, fw, fh, -w / 2, -h / 2, w, h)
  ctx.restore()
}

// ── Public API

// Draw player dino sprite
// state: 'idle', 'run', 'hurt'
// elapsed: total game elapsed time in seconds
// facingLeft: boolean
function drawPlayer(ctx, x, y, size, state, elapsed, facingLeft) {
  var key = 'player_' + _currentSkin
  var img = _spriteImages[key]
  if (!img || !_spriteLoaded[key]) return false

  var anim = PLAYER_ANIMS[state] || PLAYER_ANIMS.idle
  var frameDuration = 1.0 / anim.fps
  var frameIdx = anim.start + Math.floor(elapsed / frameDuration) % anim.count

  _drawSpriteFrame(ctx, img, frameIdx, 24, x, y, size, size, facingLeft)
  return true
}

// Draw monster sprite with 4-frame walk animation
// monsterType: string from MONSTER_NAMES
// elapsed: total game elapsed time in seconds
// flash: boolean (damage flash)
function drawMonster(ctx, x, y, size, monsterType, elapsed, flash) {
  var key = 'monster_' + monsterType
  var img = _spriteImages[key]
  if (!img || !_spriteLoaded[key]) return false

  var frameDuration = 1.0 / 6  // 6 fps for monsters
  var frameIdx = Math.floor(elapsed / frameDuration) % 4

  if (flash) {
    // 受伤闪白：先提高亮度
    ctx.save()
    ctx.globalAlpha = 0.5
    _drawSpriteFrame(ctx, img, frameIdx, 4, x, y, size, size, false)
    ctx.globalAlpha = 1
    ctx.restore()
  } else {
    _drawSpriteFrame(ctx, img, frameIdx, 4, x, y, size, size, false)
  }

  return true
}

// Grass tile source rectangles from Tileset.png (432x304)
// These are hand-picked 16x16 grass regions
var GRASS_TILES = [
  { sx: 16,  sy: 16, sw: 16, sh: 16 },   // 亮草地（唯一主色）
]

// Draw a ground tile
// tileVariant: 0-3 for different grass variations
// x, y: top-left position on canvas
function drawTile(ctx, x, y, tileVariant) {
  var img = _spriteImages['tileset']
  if (!img || !_spriteLoaded['tileset']) return false

  var t = GRASS_TILES[tileVariant % GRASS_TILES.length]
  ctx.save()
  ctx.imageSmoothingEnabled = false
  // +2像素消除高DPR设备的拼接间隙
  ctx.drawImage(img, t.sx, t.sy, t.sw, t.sh, Math.round(x) - 1, Math.round(y) - 1, 82, 82)
  ctx.restore()
  return true
}

// ── 装饰物定义（从 Tileset.png 手动选取）
var DECO_ITEMS = [
  // 小花（已验证有内容）
  { sx: 96,  sy: 48, sw: 16, sh: 16, drawW: 22, drawH: 22 },   // 白花
  { sx: 96,  sy: 48, sw: 16, sh: 16, drawW: 18, drawH: 18 },   // 白花小
  { sx: 80,  sy: 48, sw: 16, sh: 16, drawW: 22, drawH: 22 },   // 紫花
  { sx: 112, sy: 48, sw: 16, sh: 16, drawW: 22, drawH: 22 },   // 黄花
  { sx: 80,  sy: 48, sw: 16, sh: 16, drawW: 18, drawH: 18 },   // 紫花小
  { sx: 112, sy: 48, sw: 16, sh: 16, drawW: 18, drawH: 18 },   // 黄花小
  // 石头
  { sx: 64,  sy: 32, sw: 16, sh: 16, drawW: 26, drawH: 26 },   // 灰石头
  { sx: 80,  sy: 32, sw: 16, sh: 16, drawW: 28, drawH: 28 },   // 大石头
  { sx: 96,  sy: 32, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 深色石头
  // 罐子/瓶子（已验证有内容）
  { sx: 48,  sy: 16, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 棕罐子
  { sx: 64,  sy: 16, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 深棕罐子
  { sx: 96,  sy: 16, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 灰蓝罐子
  { sx: 112, sy: 16, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 棕色罐子2
  { sx: 128, sy: 32, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 蓝色罐子
  { sx: 32,  sy: 48, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 蓝色瓶子
  // 石堆/木箱/灌木
  { sx: 32,  sy: 64, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 灰色石堆
  { sx: 96,  sy: 64, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 木箱1
  { sx: 112, sy: 64, sw: 16, sh: 16, drawW: 24, drawH: 24 },   // 木箱2
  { sx: 16,  sy: 64, sw: 16, sh: 16, drawW: 26, drawH: 26 },   // 绿色灌木
]

// 大树（精确定位完整树木）
var TREE_DEFS = [
  { sx: 22,  sy: 161, sw: 36, sh: 46, drawW: 72, drawH: 92 },    // 小树1
  { sx: 70,  sy: 161, sw: 52, sh: 62, drawW: 90, drawH: 108 },   // 中树1
  { sx: 134, sy: 161, sw: 52, sh: 62, drawW: 90, drawH: 108 },   // 中树2
  { sx: 198, sy: 161, sw: 68, sh: 78, drawW: 110, drawH: 126 },  // 大树
  { sx: 22,  sy: 209, sw: 36, sh: 78, drawW: 60, drawH: 130 },   // 高树
]

// 伪随机函数（基于坐标种子，保证同一位置装饰不变）
function _hashPos(x, y) {
  var h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >> 13)) * 1274126177 | 0
  return (h ^ (h >> 16)) & 0x7FFFFFFF
}

// 绘制装饰物层
// cam: {x, y}, screenW, screenH
function drawDecorations(ctx, cam, screenW, screenH) {
  var img = _spriteImages['tileset']
  if (!img || !_spriteLoaded['tileset']) return

  ctx.save()
  ctx.imageSmoothingEnabled = false

  var cellSize = 90  // 每 90px 区域最多放一个装饰（更密集）
  var startCX = Math.floor((cam.x - 60) / cellSize)
  var startCY = Math.floor((cam.y - 60) / cellSize)
  var endCX = Math.ceil((cam.x + screenW + 60) / cellSize)
  var endCY = Math.ceil((cam.y + screenH + 60) / cellSize)

  for (var cy = startCY; cy <= endCY; cy++) {
    for (var cx = startCX; cx <= endCX; cx++) {
      var h = _hashPos(cx, cy)
      // 约60%的格子有装饰
      if (h % 100 > 60) continue

      var h2 = _hashPos(cx + 9999, cy + 7777)
      var offsetX = (h % 97) * cellSize / 97
      var offsetY = (h2 % 89) * cellSize / 89
      // 同一格子可能有第二个小装饰（30%概率）
      var h4 = _hashPos(cx + 1111, cy + 2222)
      if (h4 % 100 < 30) {
        var deco2 = DECO_ITEMS[h4 % DECO_ITEMS.length]
        var ox2 = (h4 % 71) * cellSize / 71
        var oy2 = (_hashPos(cx + 4444, cy + 8888) % 67) * cellSize / 67
        var dx2 = Math.round(cx * cellSize + ox2 - cam.x - deco2.drawW/2)
        var dy2 = Math.round(cy * cellSize + oy2 - cam.y - deco2.drawH/2)
        ctx.drawImage(img, deco2.sx, deco2.sy, deco2.sw, deco2.sh,
          dx2, dy2, deco2.drawW, deco2.drawH)
      }
      var wx = cx * cellSize + offsetX
      var wy = cy * cellSize + offsetY
      var sx = Math.round(wx - cam.x)
      var sy = Math.round(wy - cam.y)

      var h3 = _hashPos(cx + 3333, cy + 5555)
      if (h3 % 100 < 8) {
        var tree = TREE_DEFS[h3 % TREE_DEFS.length]
        ctx.drawImage(img, tree.sx, tree.sy, tree.sw, tree.sh,
          Math.round(sx - tree.drawW/2), Math.round(sy - tree.drawH/2), tree.drawW, tree.drawH)
      } else {
        var deco = DECO_ITEMS[h3 % DECO_ITEMS.length]
        ctx.drawImage(img, deco.sx, deco.sy, deco.sw, deco.sh,
          Math.round(sx - deco.drawW/2), Math.round(sy - deco.drawH/2), deco.drawW, deco.drawH)
      }
    }
  }
  ctx.restore()
}

// ── 树碰撞检测
// 获取玩家周围的所有树的位置（碰撞体积为树干底部圆形）
function getTreeColliders(px, py, radius) {
  var cellSize = 90
  var checkR = radius + 80  // 检查范围
  var startCX = Math.floor((px - checkR) / cellSize)
  var startCY = Math.floor((py - checkR) / cellSize)
  var endCX = Math.ceil((px + checkR) / cellSize)
  var endCY = Math.ceil((py + checkR) / cellSize)
  var colliders = []

  for (var cy = startCY; cy <= endCY; cy++) {
    for (var cx = startCX; cx <= endCX; cx++) {
      var h = _hashPos(cx, cy)
      if (h % 100 > 60) continue
      var h3 = _hashPos(cx + 3333, cy + 5555)
      if (h3 % 100 >= 8) continue  // 只有树有碰撞

      var h2 = _hashPos(cx + 9999, cy + 7777)
      var offsetX = (h % 97) * cellSize / 97
      var offsetY = (h2 % 89) * cellSize / 89
      var wx = cx * cellSize + offsetX
      var wy = cy * cellSize + offsetY
      // 碰撞体覆盖整棵树（树冠中心），半径40
      var tree = TREE_DEFS[h3 % TREE_DEFS.length]
      colliders.push({ x: wx, y: wy - tree.drawH * 0.15, r: tree.drawW * 0.38 })
    }
  }
  return colliders
}

// 推开玩家，防止穿过树
// 返回修正后的位置 {x, y}
function resolveTreeCollision(px, py, playerR) {
  var trees = getTreeColliders(px, py, 60)
  for (var i = 0; i < trees.length; i++) {
    var t = trees[i]
    var dx = px - t.x
    var dy = py - t.y
    var dist = Math.sqrt(dx * dx + dy * dy)
    var minDist = playerR + t.r
    if (dist < minDist && dist > 0.1) {
      // 推出去
      var push = minDist - dist
      px += (dx / dist) * push
      py += (dy / dist) * push
    }
  }
  return { x: px, y: py }
}

// Pick a random monster sprite name for a given enemy type
function pickMonsterSprite(enemyType) {
  var options = ENEMY_SPRITE_MAP[enemyType] || ENEMY_SPRITE_MAP.walker
  return options[Math.floor(Math.random() * options.length)]
}

// Set current player skin
function setPlayerSkin(skin) {
  if (PLAYER_SKINS.indexOf(skin) >= 0) {
    _currentSkin = skin
  }
}

function getPlayerSkin() {
  return _currentSkin
}

// Draw a weapon icon from Weapons.png sprite sheet
// iconIdx: 0=dagger, 1=sword, 2=bow, 3=axe, 4=staff
function drawWeaponIcon(ctx, x, y, size, iconIdx) {
  var img = _spriteImages['icons_weapons']
  if (!img || !_spriteLoaded['icons_weapons']) return false
  var frameW = img.width / 5
  var frameH = img.height
  var sx = iconIdx * frameW
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, 0, frameW, frameH, x - size / 2, y - size / 2, size, size)
  ctx.restore()
  return true
}

// Draw a food item from Food.png sprite sheet
// foodType: 0=apple, 1=bread, 3=chicken leg (indices into Food.png)
function drawFoodItem(ctx, x, y, size, foodType) {
  var img = _spriteImages['icons_food']
  if (!img || !_spriteLoaded['icons_food']) return false
  var frameW = img.width / 5
  var frameH = img.height
  var sx = foodType * frameW
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, 0, frameW, frameH, x - size / 2, y - size / 2, size, size)
  ctx.restore()
  return true
}

// Draw a potion icon from PotionBottles.png sprite sheet
// potionIdx: 0=blue, 1=green, 2=yellow, 3=purple, 4=red
function drawPotionIcon(ctx, x, y, size, potionIdx) {
  var img = _spriteImages['icons_potions']
  if (!img || !_spriteLoaded['icons_potions']) return false
  var frameW = img.width / 5
  var frameH = img.height
  var sx = potionIdx * frameW
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, 0, frameW, frameH, x - size / 2, y - size / 2, size, size)
  ctx.restore()
  return true
}

// ── VFX draw functions

// Draw lightning bolt animation between two points
// Uses lightning_sheet.png: 1024x128, 4 frames (256x128 each), 12fps
function drawLightningVFX(ctx, x1, y1, x2, y2, elapsed) {
  var img = _spriteImages['vfx_lightning']
  if (!img || !_spriteLoaded['vfx_lightning']) return false

  var frameW = 256, frameH = 128
  var totalFrames = 4, fps = 12
  var frameIdx = Math.floor(elapsed * fps) % totalFrames
  var sx = frameIdx * frameW

  var dx = x2 - x1, dy = y2 - y1
  var dist = Math.sqrt(dx * dx + dy * dy)
  var angle = Math.atan2(dy, dx)

  ctx.save()
  ctx.translate(x1, y1)
  ctx.rotate(angle)
  ctx.imageSmoothingEnabled = false
  // Stretch sprite to fit distance, make it thick enough to see
  var drawH = Math.max(40, dist * 0.35)
  ctx.drawImage(img, sx, 0, frameW, frameH, 0, -drawH / 2, dist, drawH)
  ctx.restore()
  return true
}

// Draw fire ring animation at position
// Uses row 5 of 01.png (64x64 grid, sy=320, ~8 frames at 10fps)
function drawFireRing(ctx, x, y, radius, elapsed) {
  var img = _spriteImages['vfx_spell']
  if (!img || !_spriteLoaded['vfx_spell']) return false

  var frameW = 64, frameH = 64
  var sy = 320
  var totalFrames = 8, fps = 10
  var frameIdx = Math.floor(elapsed * fps) % totalFrames
  var sx = frameIdx * frameW

  var drawSize = radius * 2
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, sy, frameW, frameH, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize)
  ctx.restore()
  return true
}

// Draw ice aura animation at position
// Uses row 6 of 01.png (64x64 grid, sy=384, ~8 frames at 10fps)
function drawIceAura(ctx, x, y, radius, elapsed) {
  var img = _spriteImages['vfx_spell']
  if (!img || !_spriteLoaded['vfx_spell']) return false

  var frameW = 64, frameH = 64
  var sy = 384
  // 只用第一帧，静止显示
  var sx = 0

  var drawSize = radius * 2
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, sy, frameW, frameH, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize)
  ctx.restore()
  return true
}

// Draw energy bolt projectile
// Uses row 0 of bullet_purple.png (24x24 frames, first 8 frames at 12fps)
function drawEnergyBolt(ctx, x, y, size, elapsed) {
  var img = _spriteImages['vfx_bullet']
  if (!img || !_spriteLoaded['vfx_bullet']) return false

  var frameW = 24, frameH = 24
  var totalFrames = 8, fps = 12
  var frameIdx = Math.floor(elapsed * fps) % totalFrames
  var sx = frameIdx * frameW

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, 0, frameW, frameH, x - size / 2, y - size / 2, size, size)
  ctx.restore()
  return true
}

function isLoaded() {
  return _allLoaded
}

function isSpriteReady(key) {
  return !!_spriteLoaded[key]
}

// ── Export
GameGlobal.SurvivalSprites = {
  load: _loadSprites,
  drawPlayer: drawPlayer,
  drawMonster: drawMonster,
  drawTile: drawTile,
  drawDecorations: drawDecorations,
  resolveTreeCollision: resolveTreeCollision,
  pickMonsterSprite: pickMonsterSprite,
  setPlayerSkin: setPlayerSkin,
  getPlayerSkin: getPlayerSkin,
  isLoaded: isLoaded,
  drawWeaponIcon: drawWeaponIcon,
  drawFoodItem: drawFoodItem,
  drawPotionIcon: drawPotionIcon,
  isSpriteReady: isSpriteReady,
  drawLightningVFX: drawLightningVFX,
  drawFireRing: drawFireRing,
  drawIceAura: drawIceAura,
  drawEnergyBolt: drawEnergyBolt,
  PLAYER_SKINS: PLAYER_SKINS,
  PLAYER_ANIMS: PLAYER_ANIMS,
  ENEMY_SPRITE_MAP: ENEMY_SPRITE_MAP,
  GROUND_TILE_IDX: 43  // grass tile index in tileset (row 1, col 16 in 27-col grid)
}

// Start loading immediately
_loadSprites()
