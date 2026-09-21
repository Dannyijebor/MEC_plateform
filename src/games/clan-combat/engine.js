import {
  ARENA, PHYSICS, PLAYER, DUMMY, PISTOL, COLORS, PLATFORMS, DUMMY_SPOTS,
} from "./constants"

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
    ctx.translate(offsetX, offsetY)
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

    // Player
    drawPlayer()

    // ── Overlays inside arena ──
    // Kill counter
    ctx.fillStyle = "rgba(0,0,0,0.5)"
    roundRect(ctx, 12, 12, 130, 34, 10)
    ctx.fill()
    ctx.fillStyle = "#94A3B8"
    ctx.font = "bold 11px system-ui, sans-serif"
    ctx.fillText("KILLS", 24, 34)
    ctx.fillStyle = COLORS.bullet
    ctx.font = "bold 20px system-ui, sans-serif"
    ctx.fillText(String(player.kills), 96, 34)

    // Fuel bar
    ctx.fillStyle = "rgba(0,0,0,0.5)"
    roundRect(ctx, 12, 54, 130, 16, 8)
    ctx.fill()
    const fuelPct = player.fuel / PHYSICS.jetpackMaxFuel
    ctx.fillStyle = "#FB923C"
    roundRect(ctx, 14, 56, 126 * fuelPct, 12, 6)
    ctx.fill()

    ctx.restore()

    // Controls hint (in screen space, outside arena)
    // (handled by React overlay in the component)
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
