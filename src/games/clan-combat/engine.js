import {
  ARENA, PHYSICS, PLAYER, DUMMY, PISTOL, COLORS, PLATFORMS, DUMMY_SPOTS,
} from "./constants"
import { createBot, decideAction, updateBot, BOT_NAMES } from "./bots"

export function createClanCombatEngine(canvas, callbacks = {}) {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No 2D context")

  // ── Viewport ────────────────────────────────────────
  let width = 0, height = 0, scale = 1, offsetX = 0, offsetY = 0, dpr = 1

  function resize() {
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)

    // Fit arena into viewport with letterboxing
    const scaleX = width / ARENA.W
    const scaleY = height / ARENA.H
    scale = Math.min(scaleX, scaleY)
    offsetX = (width - ARENA.W * scale) / 2
    offsetY = (height - ARENA.H * scale) / 2
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // ── State ────────────────────────────────────────────
  let running = false, raf = 0, lastT = 0

  const input = {
    moveX: 0,
    jetpack: false,
    aimX: 1,
    aimY: 0,
    firing: false,
  }

  const player = {
    x: ARENA.W / 2,
    y: ARENA.groundY - PLAYER.h,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    fuel: PHYSICS.jetpackMaxFuel,
    fireCooldown: 0,
    hitFlash: 0,
    muzzle: 0,
    aimX: 1,
    aimY: 0,
    kills: 0,
    iframes: 0,
  }

  const dummies = []
  DUMMY_SPOTS.forEach((spot) => {
    dummies.push({
      id: Math.random().toString(36).slice(2),
      x: spot.x,
      y: spot.y,
      hp: DUMMY.maxHp,
      maxHp: DUMMY.maxHp,
      hitFlash: 0,
      dead: false,
      respawnAt: 0,
      wobble: Math.random() * Math.PI * 2,
    })
  })

  const bullets = []
  const particles = []
  const bots = []
  const killFeed = []
  let screenShake = 0
  let screenShakeT = 0

  // Spawn 3 bots at staggered X positions
  const botSpawns = [140, 270, 400]
  BOT_NAMES.slice(0, 3).forEach((name, i) => {
    bots.push(createBot("bot-" + i, name, botSpawns[i]))
  })

  // ── Physics helpers ─────────────────────────────────
  function overlapsPlatform(px, py, pw, ph, plat) {
    return (
      px < plat.x + plat.w &&
      px + pw > plat.x &&
      py < plat.y + plat.h &&
      py + ph > plat.y
    )
  }

  function resolvePlatforms(ent, prevY) {
    ent.onGround = false
    // Ground
    if (ent.y + ent.h >= ARENA.groundY) {
      ent.y = ARENA.groundY - ent.h
      ent.vy = 0
      ent.onGround = true
    }
    // Platforms
    for (const p of PLATFORMS) {
      if (overlapsPlatform(ent.x, ent.y, ent.w, ent.h, p)) {
        // Landing on top
        if (prevY + ent.h <= p.y + 2 && ent.vy >= 0) {
          ent.y = p.y - ent.h
          ent.vy = 0
          ent.onGround = true
        }
      }
    }
    // Walls
    if (ent.x < 0) { ent.x = 0; ent.vx = 0 }
    if (ent.x + ent.w > ARENA.W) { ent.x = ARENA.W - ent.w; ent.vx = 0 }
    if (ent.y < 0) { ent.y = 0; ent.vy = Math.max(0, ent.vy) }
  }

  // ── Update ──────────────────────────────────────────
  function update(dt) {
    time += dt
    if (screenShakeT > 0) {
      screenShakeT -= dt
      if (screenShakeT <= 0) screenShake = 0
    }
    for (let i = killFeed.length - 1; i >= 0; i--) {
      if (time - killFeed[i].at > 3.5) killFeed.splice(i, 1)
    }

    // ─── Player ───
    const moveAccel = input.moveX * PHYSICS.moveSpeed
    player.vx += (moveAccel - player.vx) * Math.min(1, dt * 18)
    if (Math.abs(input.moveX) > 0.05) {
      player.facing = input.moveX > 0 ? 1 : -1
    }

    // Jump (only when grounded and no jetpack)
    if (input.jetpack && player.onGround && player.fuel > 0.1) {
      player.vy = PHYSICS.jumpVel
      player.fuel -= 0.15
    }

    // Jetpack — hold while in air
    if (input.jetpack && !player.onGround && player.fuel > 0) {
      player.vy -= PHYSICS.jetpackThrust * dt
      player.fuel = Math.max(0, player.fuel - dt)
      // Jetpack particles
      if (Math.random() < 0.85) {
        particles.push(makeParticle(
          player.x + PLAYER.w / 2 + (Math.random() - 0.5) * 8,
          player.y + PLAYER.h,
          "#FB923C",
          { speed: 120, vyBias: 260, life: 0.3, r: 2.5 },
        ))
      }
    } else {
      // Refuel on ground
      if (player.onGround) {
        player.fuel = Math.min(PHYSICS.jetpackMaxFuel, player.fuel + PHYSICS.jetpackRefill * dt)
      }
    }

    // Gravity
    player.vy += PHYSICS.gravity * dt
    if (player.vy > PHYSICS.maxFall) player.vy = PHYSICS.maxFall

    const prevY = player.y
    player.x += player.vx * dt
    player.y += player.vy * dt
    resolvePlatforms({ ...player, w: PLAYER.w, h: PLAYER.h, get onGround() { return false }, set onGround(v) {} }, prevY)
    // ↑ That helper is awkward — inline it instead:
    doPlatformResolve(player, prevY, PLAYER.w, PLAYER.h)

    // Aim
    player.aimX = input.aimX
    player.aimY = input.aimY
    if (Math.hypot(input.aimX, input.aimY) > 0.1) {
      player.facing = input.aimX >= 0 ? 1 : -1
    }

    if (player.hitFlash > 0) player.hitFlash -= dt
    if (player.muzzle > 0) player.muzzle -= dt
    if (player.iframes > 0) player.iframes -= dt

    // Fire
    player.fireCooldown -= dt * 1000
    if (input.firing && player.fireCooldown <= 0) {
      fireBullet()
      player.fireCooldown = PISTOL.cooldownMs
      player.muzzle = 0.07
    }

    // ─── Bullets ───
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.life -= dt
      if (b.life <= 0 || b.x < -20 || b.x > ARENA.W + 20 || b.y < -20 || b.y > ARENA.H + 20) {
        bullets.splice(i, 1)
        continue
      }
      // Hit bots
      let botHit = false
      for (const bot of bots) {
        if (bot.hp <= 0) continue
        if (b.ownerId === bot.id) continue
        if (
          b.x > bot.x && b.x < bot.x + PLAYER.w &&
          b.y > bot.y && b.y < bot.y + PLAYER.h
        ) {
          bot.hp -= PISTOL.damage
          bot.hitFlash = 0.09
          spawnHitSpark(b.x, b.y, "#EF4444")
          // Blood particles
          for (let k = 0; k < 8; k++) {
            particles.push(makeParticle(b.x, b.y, "#DC2626", { speed: 220, gravity: 500, life: 0.6, r: 3 }))
          }
          bullets.splice(i, 1)
          botHit = true
          if (bot.hp <= 0) {
            killBot(bot)
          }
          break
        }
      }
      if (botHit) continue
      // Hit player (bots' bullets)
      if (b.ownerId && b.ownerId !== "player") {
        if (
          player.iframes <= 0 &&
          b.x > player.x && b.x < player.x + PLAYER.w &&
          b.y > player.y && b.y < player.y + PLAYER.h
        ) {
          player.hp -= PISTOL.damage * 0.7
          player.hitFlash = 0.12
          player.iframes = 0.35
          spawnHitSpark(b.x, b.y, "#EF4444")
          for (let k = 0; k < 6; k++) {
            particles.push(makeParticle(b.x, b.y, "#DC2626", { speed: 200, gravity: 500, life: 0.5, r: 2.5 }))
          }
          triggerShake(6)
          bullets.splice(i, 1)
          if (player.hp <= 0) {
            player.hp = 0
            onPlayerDown()
          }
          continue
        }
      }
      // Hit platforms
      let hit = false
      for (const p of PLATFORMS) {
        if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
          spawnHitSpark(b.x, b.y, COLORS.bullet)
          bullets.splice(i, 1)
          hit = true
          break
        }
      }
      if (hit) continue
      if (b.y > ARENA.groundY) {
        spawnHitSpark(b.x, ARENA.groundY, COLORS.bullet)
        bullets.splice(i, 1)
        continue
      }
      // Hit dummies
      for (const d of dummies) {
        if (d.dead) continue
        const cx = d.x + DUMMY.w / 2
        const cy = d.y + DUMMY.h / 2
        if (
          b.x > d.x && b.x < d.x + DUMMY.w &&
          b.y > d.y && b.y < d.y + DUMMY.h
        ) {
          d.hp -= PISTOL.damage
          d.hitFlash = 0.09
          spawnHitSpark(b.x, b.y, COLORS.hitSpark)
          bullets.splice(i, 1)
          if (d.hp <= 0) killDummy(d)
          break
        }
      }
    }

    // ─── Bots ───
    for (const bot of bots) {
      decideAction(bot, player, bots, dt)
      updateBot(bot, dt, (bullet) => {
        bullets.push({ ...bullet, ownerId: bot.id })
      })
      // Check bot touching player = damage
      if (player.iframes <= 0) {
        const d = Math.hypot(bot.x + PLAYER.w/2 - (player.x + PLAYER.w/2), bot.y + PLAYER.h/2 - (player.y + PLAYER.h/2))
        if (d < PLAYER.w) {
          player.hp -= 6
          player.hitFlash = 0.15
          player.iframes = 0.4
          triggerShake(4)
        }
      }
    }

    // ─── Dummies ───
    for (const d of dummies) {
      if (d.hitFlash > 0) d.hitFlash -= dt
      if (d.dead && time * 1000 >= d.respawnAt) {
        d.dead = false
        d.hp = d.maxHp
        // Respawn flash
        for (let i = 0; i < 12; i++) {
          particles.push(makeParticle(d.x + DUMMY.w / 2, d.y + DUMMY.h / 2, "#38BDF8", { speed: 140 }))
        }
      }
    }

    // ─── Particles ───
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += (p.gravity || 0) * dt
      p.vx *= 0.94
      p.life -= dt
      if (p.life <= 0) particles.splice(i, 1)
    }
  }

  let time = 0

  // ── Inline platform resolver (cleaner than the helper above) ───
  function doPlatformResolve(ent, prevY, w, h) {
    ent.onGround = false
    if (ent.y + h >= ARENA.groundY) {
      ent.y = ARENA.groundY - h
      ent.vy = 0
      ent.onGround = true
    }
    for (const p of PLATFORMS) {
      if (
        ent.x < p.x + p.w && ent.x + w > p.x &&
        ent.y < p.y + p.h && ent.y + h > p.y
      ) {
        if (prevY + h <= p.y + 3 && ent.vy >= 0) {
          ent.y = p.y - h
          ent.vy = 0
          ent.onGround = true
        }
      }
    }
    if (ent.x < 0) { ent.x = 0; ent.vx = 0 }
    if (ent.x + w > ARENA.W) { ent.x = ARENA.W - w; ent.vx = 0 }
    if (ent.y < 0) { ent.y = 0; ent.vy = Math.max(0, ent.vy) }
  }

  // ── Combat ──────────────────────────────────────────
  function fireBullet() {
    const aimLen = Math.hypot(player.aimX, player.aimY) || 1
    const ax = player.aimX / aimLen
    const ay = player.aimY / aimLen
    const originX = player.x + PLAYER.w / 2 + ax * (PLAYER.w / 2 + 6)
    const originY = player.y + PLAYER.h / 2 + ay * (PLAYER.h / 2 + 4)
    bullets.push({
      x: originX, y: originY,
      vx: ax * PISTOL.bulletSpeed,
      vy: ay * PISTOL.bulletSpeed,
      life: PISTOL.bulletLife,
    })
    // Muzzle particles
    for (let i = 0; i < 4; i++) {
      particles.push(makeParticle(originX, originY, COLORS.bullet, { speed: 200, life: 0.15, r: 2 }))
    }
  }

  function killDummy(d) {
    d.dead = true
    d.respawnAt = time * 1000 + DUMMY.respawnMs
    player.kills++
    for (let i = 0; i < 22; i++) {
      particles.push(makeParticle(d.x + DUMMY.w / 2, d.y + DUMMY.h / 2, COLORS.killSpark, { speed: 260, gravity: 400, life: 0.8 }))
    }
  }

  function triggerShake(amount) {
    screenShake = Math.max(screenShake, amount)
    screenShakeT = 0.15
  }

  function killBot(bot) {
    player.kills++
    pushFeed("You", bot.name)
    triggerShake(8)
    for (let i = 0; i < 30; i++) {
      particles.push(makeParticle(bot.x + PLAYER.w / 2, bot.y + PLAYER.h / 2, "#DC2626", { speed: 300, gravity: 600, life: 0.9, r: 3 }))
    }
    // Respawn after 3s
    bot.hp = bot.maxHp
    bot.x = 30 + Math.random() * (ARENA.W - 60)
    bot.y = ARENA.groundY - PLAYER.h
    bot.vx = 0
    bot.vy = 0
    bot.fuel = PHYSICS.jetpackMaxFuel
    bot.iframes = 1.5
    bot.thinkTimer = 1.5
  }

  function onPlayerDown() {
    player.kills = Math.max(0, player.kills - 0)
    pushFeed("K.O.", "You")
    triggerShake(14)
    for (let i = 0; i < 40; i++) {
      particles.push(makeParticle(player.x + PLAYER.w / 2, player.y + PLAYER.h / 2, "#DC2626", { speed: 340, gravity: 700, life: 1, r: 3.5 }))
    }
    player.hp = player.maxHp
    player.x = ARENA.W / 2
    player.y = ARENA.groundY - PLAYER.h
    player.vx = 0
    player.vy = 0
    player.iframes = 2
    player.fuel = PHYSICS.jetpackMaxFuel
  }

  function pushFeed(a, b) {
    killFeed.push({ a, b, at: time })
    if (killFeed.length > 4) killFeed.shift()
  }

  function spawnHitSpark(x, y, color) {
    for (let i = 0; i < 6; i++) {
      particles.push(makeParticle(x, y, color, { speed: 180, life: 0.25, r: 2 }))
    }
  }

  function makeParticle(x, y, color, opts = {}) {
    const angle = opts.angle != null ? opts.angle : Math.random() * Math.PI * 2
    const speed = opts.speed != null ? opts.speed : 120
    const life = opts.life != null ? opts.life : 0.5
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + (opts.vyBias || 0),
      gravity: opts.gravity || 0,
      life,
      maxLife: life,
      r: opts.r || 2.5,
      color,
    }
  }

  // ── Render ──────────────────────────────────────────
  function render() {
    // Clear full canvas
    ctx.fillStyle = COLORS.bg1
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    // Screen shake
    let shakeX = 0, shakeY = 0
    if (screenShake > 0) {
      shakeX = (Math.random() - 0.5) * screenShake
      shakeY = (Math.random() - 0.5) * screenShake
    }
    ctx.translate(offsetX + shakeX, offsetY + shakeY)
    ctx.scale(scale, scale)

    // Arena background
    const bg = ctx.createLinearGradient(0, 0, 0, ARENA.H)
    bg.addColorStop(0, COLORS.bg0)
    bg.addColorStop(1, COLORS.bg1)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, ARENA.W, ARENA.H)

    // Grid
    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 1
    for (let x = 0; x <= ARENA.W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.H); ctx.stroke()
    }
    for (let y = 0; y <= ARENA.H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA.W, y); ctx.stroke()
    }

    // Ground
    ctx.fillStyle = "#0A1020"
    ctx.fillRect(0, ARENA.groundY, ARENA.W, ARENA.groundH)
    ctx.fillStyle = COLORS.platformEdge
    ctx.fillRect(0, ARENA.groundY, ARENA.W, 2)
    ctx.shadowBlur = 12
    ctx.shadowColor = COLORS.platformEdge
    ctx.fillRect(0, ARENA.groundY, ARENA.W, 2)
    ctx.shadowBlur = 0

    // Platforms
    for (const p of PLATFORMS) {
      ctx.fillStyle = COLORS.platform
      ctx.beginPath()
      const r = 6
      roundRect(ctx, p.x, p.y, p.w, p.h, r)
      ctx.fill()
      ctx.shadowBlur = 14
      ctx.shadowColor = COLORS.platformEdge
      ctx.fillStyle = COLORS.platformEdge
      ctx.fillRect(p.x + 2, p.y, p.w - 4, 2)
      ctx.shadowBlur = 0
    }

    // Dummies
    for (const d of dummies) {
      if (d.dead) continue
      const cx = d.x + DUMMY.w / 2
      const cy = d.y + DUMMY.h / 2
      const flash = d.hitFlash > 0
      // Body
      ctx.fillStyle = flash ? "#FFFFFF" : COLORS.dummy
      ctx.shadowBlur = 10
      ctx.shadowColor = COLORS.dummy
      roundRect(ctx, d.x, d.y + DUMMY.headR * 0.8, DUMMY.w, DUMMY.h - DUMMY.headR * 0.8, 5)
      ctx.fill()
      // Head
      ctx.beginPath()
      ctx.arc(cx, d.y + DUMMY.headR, DUMMY.headR, 0, Math.PI * 2)
      ctx.fillStyle = flash ? "#FFFFFF" : COLORS.dummyHead
      ctx.fill()
      ctx.shadowBlur = 0
      // HP bar
      drawHpBar(cx, d.y - 8, 34, d.hp / d.maxHp, "#EF4444")
    }

    // Bullets
    for (const b of bullets) {
      ctx.shadowBlur = 14
      ctx.shadowColor = COLORS.bulletGlow
      ctx.fillStyle = COLORS.bullet
      ctx.beginPath()
      ctx.arc(b.x, b.y, PISTOL.bulletR, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Particles
    for (const p of particles) {
      const a = Math.max(0, p.life / p.maxLife)
      ctx.globalAlpha = a
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * a + 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Bots
    for (const bot of bots) {
      drawBot(bot)
    }

    // Player
    drawPlayer()

    // ── Kill feed (inside arena) ──
    ctx.font = "bold 12px system-ui, sans-serif"
    killFeed.forEach((k, i) => {
      const y = 20 + i * 20
      const age = time - k.at
      const alpha = age < 3 ? 1 : Math.max(0, 1 - (age - 3) / 0.5)
      ctx.globalAlpha = alpha
      ctx.fillStyle = "rgba(0,0,0,0.55)"
      const text = k.a + "  ☠  " + k.b
      const tw = ctx.measureText(text).width + 20
      roundRect(ctx, 12, y, tw, 22, 8)
      ctx.fill()
      ctx.fillStyle = k.a === "You" ? "#FDE047" : "#F87171"
      ctx.fillText(k.a, 22, y + 15)
      ctx.fillStyle = "#94A3B8"
      ctx.fillText("☠", 22 + ctx.measureText(k.a).width + 8, y + 15)
      ctx.fillStyle = "#E2E8F0"
      ctx.fillText(k.b, 22 + ctx.measureText(k.a).width + 26, y + 15)
      ctx.globalAlpha = 1
    })

    ctx.restore()

    // Controls hint (in screen space, outside arena)
    // (handled by React overlay in the component)
  }

  function drawBot(bot) {
    const cx = bot.x + PLAYER.w / 2
    const cy = bot.y + PLAYER.h / 2
    const flash = bot.hitFlash > 0
    const alpha = bot.iframes > 0 && Math.floor(time * 20) % 2 === 0 ? 0.4 : 1
    ctx.globalAlpha = alpha

    // Gun
    const aimLen = Math.hypot(bot.aimX, bot.aimY) || 1
    const ax = bot.aimX / aimLen
    const ay = bot.aimY / aimLen
    const aimAngle = Math.atan2(ay, ax)

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(aimAngle)
    ctx.fillStyle = "#B91C1C"
    ctx.shadowBlur = 10
    ctx.shadowColor = "#EF4444"
    roundRect(ctx, PLAYER.w / 2 - 2, -3, 20, 6, 2)
    ctx.fill()
    if (bot.muzzle > 0) {
      ctx.beginPath()
      ctx.arc(PLAYER.w / 2 + 20, 0, 8 * (bot.muzzle / 0.07), 0, Math.PI * 2)
      ctx.fillStyle = "rgba(253, 224, 71, 0.9)"
      ctx.fill()
    }
    ctx.restore()

    // Body
    ctx.fillStyle = flash ? "#FFFFFF" : "#EF4444"
    ctx.shadowBlur = 12
    ctx.shadowColor = "#EF4444"
    roundRect(ctx, bot.x, bot.y + PLAYER.headR * 0.8, PLAYER.w, PLAYER.h - PLAYER.headR * 0.8, 5)
    ctx.fill()

    // Head
    ctx.beginPath()
    ctx.arc(cx, bot.y + PLAYER.headR, PLAYER.headR, 0, Math.PI * 2)
    ctx.fillStyle = flash ? "#FFFFFF" : "#FCA5A5"
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1

    // HP bar
    drawHpBar(cx, bot.y - 8, 34, bot.hp / bot.maxHp, "#EF4444")

    // Name tag
    ctx.font = "bold 10px system-ui, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.75)"
    ctx.textAlign = "center"
    ctx.fillText(bot.name, cx, bot.y - 14)
    ctx.textAlign = "left"
  }

  function drawPlayer() {
    const cx = player.x + PLAYER.w / 2
    const cy = player.y + PLAYER.h / 2
    const flash = player.hitFlash > 0
    const alpha = player.iframes > 0 && Math.floor(time * 20) % 2 === 0 ? 0.5 : 1
    ctx.globalAlpha = alpha

    // Aim rotation
    const aimLen = Math.hypot(player.aimX, player.aimY) || 1
    const ax = player.aimX / aimLen
    const ay = player.aimY / aimLen
    const aimAngle = Math.atan2(ay, ax)

    // Gun
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(aimAngle)
    ctx.fillStyle = COLORS.playerGun
    ctx.shadowBlur = 10
    ctx.shadowColor = COLORS.player
    roundRect(ctx, PLAYER.w / 2 - 2, -3, 20, 6, 2)
    ctx.fill()
    // Muzzle flash
    if (player.muzzle > 0) {
      ctx.beginPath()
      ctx.arc(PLAYER.w / 2 + 20, 0, 8 * (player.muzzle / 0.07), 0, Math.PI * 2)
      ctx.fillStyle = "rgba(253, 224, 71, 0.9)"
      ctx.fill()
    }
    ctx.restore()

    // Body
    ctx.fillStyle = flash ? "#FFFFFF" : COLORS.player
    ctx.shadowBlur = 14
    ctx.shadowColor = COLORS.player
    roundRect(ctx, player.x, player.y + PLAYER.headR * 0.8, PLAYER.w, PLAYER.h - PLAYER.headR * 0.8, 5)
    ctx.fill()

    // Head
    ctx.beginPath()
    ctx.arc(cx, player.y + PLAYER.headR, PLAYER.headR, 0, Math.PI * 2)
    ctx.fillStyle = flash ? "#FFFFFF" : COLORS.playerHead
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1

    // HP bar
    drawHpBar(cx, player.y - 8, 34, player.hp / player.maxHp, "#38BDF8")
  }

  function drawHpBar(cx, y, w, pct, color) {
    const h = 4
    ctx.fillStyle = "rgba(0,0,0,0.6)"
    roundRect(ctx, cx - w / 2, y, w, h, 2)
    ctx.fill()
    ctx.fillStyle = color
    roundRect(ctx, cx - w / 2 + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, pct)), h - 2, 2)
    ctx.fill()
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (w < r * 2) r = w / 2
    if (h < r * 2) r = h / 2
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // ── Loop ────────────────────────────────────────────
  function loop(now) {
    if (!running) return
    const dt = Math.min(0.04, (now - lastT) / 1000)
    lastT = now
    update(dt)
    render()
    raf = requestAnimationFrame(loop)
  }

  function start() {
    if (running) return
    running = true
    resize()
    lastT = performance.now()
    raf = requestAnimationFrame(loop)
  }

  function stop() {
    running = false
    cancelAnimationFrame(raf)
  }

  function destroy() {
    stop()
    resizeObs.disconnect()
  }

  const resizeObs = new ResizeObserver(resize)
  resizeObs.observe(canvas)

  function setInput(partial) {
    Object.assign(input, partial)
  }

  function getHud() {
    return {
      kills: player.kills,
      hp: Math.max(0, Math.round(player.hp)),
      maxHp: player.maxHp,
      fuel: player.fuel,
      maxFuel: PHYSICS.jetpackMaxFuel,
      onGround: player.onGround,
      botsAlive: bots.filter((b) => b.hp > 0).length,
    }
  }

  function reset() {
    player.x = ARENA.W / 2
    player.y = ARENA.groundY - PLAYER.h
    player.vx = 0
    player.vy = 0
    player.hp = player.maxHp
    player.fuel = PHYSICS.jetpackMaxFuel
    player.kills = 0
    bullets.length = 0
    particles.length = 0
    for (const d of dummies) {
      d.dead = false
      d.hp = d.maxHp
    }
  }

  return { start, stop, destroy, setInput, getHud, reset, get player() { return player } }
}
