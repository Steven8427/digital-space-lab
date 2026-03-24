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

  // Batch request temp URLs (max 50 per call, we have ~21)
  wx.cloud.getTempFileURL({
    fileList: fileIDs,
    success: function(res) {
      if (!res || !res.fileList) {
        console.warn('[sprites] getTempFileURL failed: no fileList')
        return
      }
      var loadCount = 0
      var totalCount = res.fileList.length

      for (var i = 0; i < res.fileList.length; i++) {
        var item = res.fileList[i]
        var key = fileKeys[i]
        if (item.status !== 0 || !item.tempFileURL) {
          console.warn('[sprites] failed to get URL for', key, item.status)
          loadCount++
          continue
        }
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
  { sx: 16,  sy: 16, sw: 16, sh: 16 },   // 亮草地（主色调）
  { sx: 208, sy: 32, sw: 16, sh: 16 },   // 深草地变体1
  { sx: 224, sy: 32, sw: 16, sh: 16 },   // 深草地变体2
  { sx: 368, sy: 32, sw: 16, sh: 16 },   // 深草地变体3
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
  ctx.drawImage(img, t.sx, t.sy, t.sw, t.sh, x, y, 80, 80)
  ctx.restore()
  return true
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
  pickMonsterSprite: pickMonsterSprite,
  setPlayerSkin: setPlayerSkin,
  getPlayerSkin: getPlayerSkin,
  isLoaded: isLoaded,
  isSpriteReady: isSpriteReady,
  PLAYER_SKINS: PLAYER_SKINS,
  PLAYER_ANIMS: PLAYER_ANIMS,
  ENEMY_SPRITE_MAP: ENEMY_SPRITE_MAP,
  GROUND_TILE_IDX: 43  // grass tile index in tileset (row 1, col 16 in 27-col grid)
}

// Start loading immediately
_loadSprites()
