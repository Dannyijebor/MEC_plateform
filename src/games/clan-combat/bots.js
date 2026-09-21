// Bot AI for Clan Combat.
// Each bot is a mini version of the player:
//   - moves toward the nearest target
//   - jumps / jetpacks to reach platforms
//   - shoots when in range and line-of-sight
//   - strafes to dodge

import { ARENA, PHYSICS, PLAYER, PLATFORMS, PISTOL, COLORS } from "./constants"

export const BOT_NAMES = [
  "Rex",
  "Rita",
  "Blaze",
  "Stella",
  "Joseph",
  "Imelda",
  "Anthony",
  "Rufina",
]

export function createBot(id, name, spawnX) {
  return {
    id,
    name,
    x: spawnX,
    y: ARENA.groundY - PLAYER.h,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    hp: 100,
    maxHp: 100,
    fuel: PHYSICS.jetpackMaxFuel,
    fireCooldown: 0,
    muzzle: 0,
    hitFlash: 0,
    iframes: 0,
    aimX: 1,
    aimY: 0,
    // AI memory
    thinkTimer: 0,
    target: null,          // { x, y } — where bot wants to move
    shootCooldown: 400 + Math.random() * 600,
    jumpCooldown: 0,
    strafeDir: Math.random() < 0.5 ? -1 : 1,
    strafeTimer: 0,
    // Personality
    aggression: 0.5 + Math.random() * 0.5,    // 0.5..1
    accuracy: 0.85 + Math.random() * 0.15,    // 0.85..1
  }
}

// ─────────────────────────────────────────────────────────────
// decideAction
// Runs every ~200ms per bot. Sets bot.target + intent flags.
// ─────────────────────────────────────────────────────────────

export function decideAction(bot, player, otherBots, dt) {
  bot.thinkTimer -= dt
  bot.strafeTimer -= dt
  bot.jumpCooldown -= dt

  if (bot.thinkTimer > 0) return
  bot.thinkTimer = 0.18 + Math.random() * 0.12

  // Find nearest visible opponent (player or other bot)
  const opponents = [
    { entity: player, isPlayer: true },
    ...otherBots.filter((b) => b.id !== bot.id).map((b) => ({ entity: b, isPlayer: false })),
  ]

  let best = null
  let bestDist = Infinity
  for (const o of opponents) {
    if (o.entity.hp <= 0) continue
    const d = Math.hypot(o.entity.x - bot.x, o.entity.y - bot.y)
    if (d < bestDist) { bestDist = d; best = o }
  }

  if (!best) return

  const tx = best.entity.x
  const ty = best.entity.y

  // Pick a position: stand ~200px away on similar height
  const dx = tx - bot.x
  const dir = dx > 0 ? 1 : -1

  // Strafe timer switches direction periodically
  if (bot.strafeTimer <= 0) {
    bot.strafeDir = -bot.strafeDir
    bot.strafeTimer = 0.6 + Math.random() * 0.8
  }

  const idealX = tx - dir * (160 + Math.random() * 80)
  const moveDir = Math.abs(bot.x - idealX) > 20 ? Math.sign(idealX - bot.x) : bot.strafeDir * 0.6

  bot.target = { x: idealX, y: ty }
  bot.intent = {
    moveX: Math.max(-1, Math.min(1, moveDir)),
    wantJetpack: ty < bot.y - 40 && bot.fuel > 0.3,
    aimX: dir,
    aimY: (ty - bot.y) / Math.max(60, Math.abs(tx - bot.x)),
    fire: bestDist < 420 && Math.random() < bot.aggression,
  }

  // Add small inaccuracy
  bot.intent.aimY += (Math.random() - 0.5) * (1 - bot.accuracy) * 0.5
}

// ─────────────────────────────────────────────────────────────
// updateBot
// Physics + shooting based on the intent set by decideAction.
// ─────────────────────────────────────────────────────────────

export function updateBot(bot, dt, onFire) {
  const intent = bot.intent
  if (!intent) return

  // Horizontal movement
  const targetVx = intent.moveX * PHYSICS.moveSpeed * 0.9
  bot.vx += (targetVx - bot.vx) * Math.min(1, dt * 16)
  if (Math.abs(bot.vx) > 30) bot.facing = bot.vx > 0 ? 1 : -1

  // Jetpack / jump
  if (intent.wantJetpack && bot.fuel > 0 && !bot.onGround) {
    bot.vy -= PHYSICS.jetpackThrust * dt
    bot.fuel = Math.max(0, bot.fuel - dt)
  } else if (intent.wantJetpack && bot.onGround && bot.fuel > 0.2 && bot.jumpCooldown <= 0) {
    bot.vy = PHYSICS.jumpVel
    bot.jumpCooldown = 0.6
    bot.fuel -= 0.12
  } else {
    if (bot.onGround) bot.fuel = Math.min(PHYSICS.jetpackMaxFuel, bot.fuel + PHYSICS.jetpackRefill * dt)
  }

  // Gravity
  bot.vy += PHYSICS.gravity * dt
  if (bot.vy > PHYSICS.maxFall) bot.vy = PHYSICS.maxFall

  // Integrate
  const prevY = bot.y
  bot.x += bot.vx * dt
  bot.y += bot.vy * dt

  // Platform resolve (same logic as the player)
  bot.onGround = false
  if (bot.y + PLAYER.h >= ARENA.groundY) {
    bot.y = ARENA.groundY - PLAYER.h
    bot.vy = 0
    bot.onGround = true
  }
  for (const p of PLATFORMS) {
    if (
      bot.x < p.x + p.w && bot.x + PLAYER.w > p.x &&
      bot.y < p.y + p.h && bot.y + PLAYER.h > p.y
    ) {
      if (prevY + PLAYER.h <= p.y + 3 && bot.vy >= 0) {
        bot.y = p.y - PLAYER.h
        bot.vy = 0
        bot.onGround = true
      }
    }
  }
  if (bot.x < 0) { bot.x = 0; bot.vx = 0 }
  if (bot.x + PLAYER.w > ARENA.W) { bot.x = ARENA.W - PLAYER.w; bot.vx = 0 }
  if (bot.y < 0) { bot.y = 0; bot.vy = Math.max(0, bot.vy) }

  // Aim
  bot.aimX = intent.aimX
  bot.aimY = intent.aimY

  // Cooldowns
  if (bot.hitFlash > 0) bot.hitFlash -= dt
  if (bot.muzzle > 0) bot.muzzle -= dt
  if (bot.iframes > 0) bot.iframes -= dt
  bot.fireCooldown -= dt * 1000

  // Fire
  if (intent.fire && bot.fireCooldown <= 0) {
    const aimLen = Math.hypot(bot.aimX, bot.aimY) || 1
    const ax = bot.aimX / aimLen
    const ay = bot.aimY / aimLen
    const ox = bot.x + PLAYER.w / 2 + ax * (PLAYER.w / 2 + 6)
    const oy = bot.y + PLAYER.h / 2 + ay * (PLAYER.h / 2 + 4)
    onFire({
      x: ox, y: oy,
      vx: ax * PISTOL.bulletSpeed,
      vy: ay * PISTOL.bulletSpeed,
      life: PISTOL.bulletLife,
      ownerId: bot.id,
    })
    bot.fireCooldown = PISTOL.cooldownMs * (1.6 - bot.aggression * 0.6) + Math.random() * 150
    bot.muzzle = 0.07
  }
}
