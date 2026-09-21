import {
  PLAYER, BULLET, COLORS, WAVE,
} from "./constants"
import {
  createShip, createBullet, createEnemy,
  createParticle, createXpOrb,
} from "./entities"
import { pickUpgradeChoices } from "./upgrades"

export function createNeonEngine(canvas, callbacks = {}) {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No 2D context")

  // ── State ────────────────────────────────────────────
  let width = 0, height = 0, dpr = 1
  let running = false
  let raf = 0
  let lastT = 0
  let time = 0
  let shake = 0

  const state = {
    phase: "playing",       // "playing" | "choosing" | "dead"
    wave: 1,
    score: 0,
    xp: 0,
    enemiesToSpawn: 0,
    spawnTimer: 0,
    spawnInterval: WAVE.spawnIntervalBase,
    interWaveTimer: 0,
    takenUpgrades: new Set(),
    choices: [],
  }

  let ship = createShip(0, 0)
  let bullets = []
  let enemies = []
  let particles = []
  let orbs = []
  const pointer = { x: 0, y: 0, active: false }

  // ── Sizing ───────────────────────────────────────────
  function resize() {
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!pointer.active) {
      ship.x = width / 2
      ship.y = height / 2
      pointer.x = ship.x
      pointer.y = ship.y
    }
  }

  // ── Input ────────────────────────────────────────────
  function handlePointer(e) {
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    pointer.x = x
    pointer.y = y
    pointer.active = true
  }

  function handleMove(e) { e.preventDefault(); handlePointer(e) }

  canvas.addEventListener("mousemove", handleMove)
  canvas.addEventListener("touchstart", handleMove, { passive: false })
  canvas.addEventListener("touchmove", handleMove, { passive: false })

  const resizeObs = new ResizeObserver(resize)
  resizeObs.observe(canvas)

  // ── Spawning ─────────────────────────────────────────
  function startWave(wave) {
    state.wave = wave
    state.enemiesToSpawn = WAVE.baseEnemies + (wave - 1) * WAVE.enemiesPerWave
    state.spawnInterval = Math.max(
      WAVE.spawnIntervalMin,
      WAVE.spawnIntervalBase - (wave - 1) * WAVE.spawnRampPerWave,
    )
    state.spawnTimer = 0
  }

  function spawnEnemy() {
    const roll = Math.random()
    let type = "drifter"
    if (state.wave >= 2 && roll < 0.35) type = "dasher"
    if (state.wave >= 4 && roll > 0.75) type = "brute"

    // Spawn from outside the viewport edges
    const edge = Math.floor(Math.random() * 4)
    let x, y
    const pad = 40
    if (edge === 0) { x = Math.random() * width; y = -pad }
    else if (edge === 1) { x = width + pad; y = Math.random() * height }
    else if (edge === 2) { x = Math.random() * width; y = height + pad }
    else { x = -pad; y = Math.random() * height }

    enemies.push(createEnemy(type, x, y))
  }

  // ── Update ───────────────────────────────────────────
  function update(dt) {
    time += dt
    if (shake > 0) shake = Math.max(0, shake - dt * 30)

    if (state.phase === "playing") {
      updateShip(dt)
      updateSpawning(dt)
    }
    updateBullets(dt)
    updateEnemies(dt)
    updateParticles(dt)
    updateOrbs(dt)
    checkWaveComplete()
  }

  function updateShip(dt) {
    const dx = pointer.x - ship.x
    const dy = pointer.y - ship.y
    const dist = Math.hypot(dx, dy)
    const maxStep = ship.speed * dt

    if (dist > 2) {
      const step = Math.min(maxStep, dist)
      ship.x += (dx / dist) * step
      ship.y += (dy / dist) * step
    }
    ship.x = Math.max(ship.radius, Math.min(width - ship.radius, ship.x))
    ship.y = Math.max(ship.radius, Math.min(height - ship.radius, ship.y))

    if (ship.iframes > 0) ship.iframes -= dt

    // Auto-fire at nearest enemy in range
    ship.fireCooldown -= dt
    if (ship.fireCooldown <= 0 && enemies.length > 0) {
      const target = nearestEnemy(ship.x, ship.y, ship.range)
      if (target) {
        fireAt(target)
        ship.fireCooldown = ship.fireCooldownMax
      }
    }
  }

  function nearestEnemy(x, y, range) {
    let best = null
    let bestD = range
    for (const e of enemies) {
      const d = Math.hypot(e.x - x, e.y - y)
      if (d < bestD) { bestD = d; best = e }
    }
    return best
  }

  function fireAt(target) {
    const dx = target.x - ship.x
    const dy = target.y - ship.y
    const len = Math.hypot(dx, dy) || 1
    const nx = dx / len
    const ny = dy / len

    const spawn = (angleOffset) => {
      const a = Math.atan2(ny, nx) + angleOffset
      const vx = Math.cos(a) * BULLET.baseSpeed
      const vy = Math.sin(a) * BULLET.baseSpeed
      bullets.push(
        createBullet(ship.x, ship.y, vx, vy, ship.damage, {
          pierce: ship.pierce,
          explosive: ship.explosive,
        }),
      )
    }

    if (ship.tripleShot) {
      spawn(-0.16)
      spawn(0)
      spawn(0.16)
    } else {
      spawn(0)
    }
  }

  function updateSpawning(dt) {
    if (state.phase !== "playing") return
    if (state.enemiesToSpawn <= 0) return
    state.spawnTimer -= dt * 1000
    if (state.spawnTimer <= 0) {
      spawnEnemy()
      state.enemiesToSpawn--
      state.spawnTimer = state.spawnInterval
    }
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.life -= dt

      // Off-screen or expired
      if (b.life <= 0 || b.x < -20 || b.x > width + 20 || b.y < -20 || b.y > height + 20) {
        bullets.splice(i, 1)
        continue
      }

      // Hit enemies
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j]
        if (b.hit.has(e.id)) continue
        const d = Math.hypot(e.x - b.x, e.y - b.y)
        if (d < e.radius + b.radius) {
          damageEnemy(e, b.damage)
          if (b.explosive) {
            explodeAt(e.x, e.y, 60, b.damage * 0.6)
          }
          if (b.pierce > 0) {
            b.pierce--
            b.hit.add(e.id)
          } else {
            bullets.splice(i, 1)
            break
          }
        }
      }
    }
  }

  function damageEnemy(e, amount) {
    e.hp -= amount
    e.hitFlash = 0.08
    if (e.hp <= 0) {
      killEnemy(e)
    }
  }

  function killEnemy(e) {
    const idx = enemies.indexOf(e)
    if (idx >= 0) enemies.splice(idx, 1)
    state.score += 10 * (e.maxHp / 30)
    shake = Math.min(6, shake + 2)
    // Burst of particles
    const count = 8 + Math.floor(e.radius / 3)
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(e.x, e.y, e.color))
    }
    // XP orbs
    for (let i = 0; i < e.xp; i++) {
      orbs.push(createXpOrb(e.x, e.y, 1))
    }
  }

  function explodeAt(x, y, radius, damage) {
    for (const e of enemies) {
      if (Math.hypot(e.x - x, e.y - y) < radius + e.radius) {
        damageEnemy(e, damage)
      }
    }
    for (let i = 0; i < 12; i++) {
      particles.push(createParticle(x, y, "#FB923C", { speed: 220 }))
    }
    shake = Math.min(8, shake + 3)
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      // Chase player
      const dx = ship.x - e.x
      const dy = ship.y - e.y
      const len = Math.hypot(dx, dy) || 1
      e.vx = (dx / len) * e.speed
      e.vy = (dy / len) * e.speed
      // Slight wobble for drifters
      if (e.type === "drifter") {
        e.wobble += dt * 3
        e.vx += Math.cos(e.wobble) * 20
        e.vy += Math.sin(e.wobble) * 20
      }
      e.x += e.vx * dt
      e.y += e.vy * dt
      if (e.hitFlash > 0) e.hitFlash -= dt

      // Damage player
      if (ship.iframes <= 0) {
        const d = Math.hypot(e.x - ship.x, e.y - ship.y)
        if (d < e.radius + ship.radius) {
          ship.hp -= e.damage
          ship.iframes = 0.6
          shake = Math.min(10, shake + 5)
          for (let i = 0; i < 10; i++) {
            particles.push(createParticle(ship.x, ship.y, "#F87171", { speed: 180 }))
          }
          if (ship.hp <= 0) {
            onDeath()
            return
          }
        }
      }
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.94
      p.vy *= 0.94
      p.life -= dt
      if (p.life <= 0) particles.splice(i, 1)
    }
  }

  function updateOrbs(dt) {
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i]
      const dx = ship.x - o.x
      const dy = ship.y - o.y
      const d = Math.hypot(dx, dy) || 1
      // Magnet pull
      o.vx += (dx / d) * 900 * dt
      o.vy += (dy / d) * 900 * dt
      o.vx *= 0.9
      o.vy *= 0.9
      o.x += o.vx * dt
      o.y += o.vy * dt
      o.life -= dt
      if (d < ship.radius + o.radius + 4 || o.life <= 0) {
        if (d < ship.radius + o.radius + 4) {
          state.xp += o.value
          state.score += 5
        }
        orbs.splice(i, 1)
      }
    }
  }

  function checkWaveComplete() {
    if (state.phase !== "playing") return
    if (state.enemiesToSpawn > 0) return
    if (enemies.length > 0) return
    // Wave cleared
    state.phase = "choosing"
    state.choices = pickUpgradeChoices(ship, state.takenUpgrades, 3)
    callbacks.onWaveComplete?.(state.wave, state.choices)
  }

  function onDeath() {
    state.phase = "dead"
    running = false
    for (let i = 0; i < 40; i++) {
      particles.push(createParticle(ship.x, ship.y, "#38BDF8", { speed: 280, life: 1 }))
    }
    callbacks.onDeath?.({
      wave: state.wave,
      score: Math.floor(state.score),
    })
  }

  // ── Render ───────────────────────────────────────────
  function render() {
    ctx.save()
    if (shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake,
      )
    }

    // Background
    ctx.fillStyle = COLORS.background
    ctx.fillRect(-20, -20, width + 40, height + 40)

    // Grid
    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // XP orbs
    for (const o of orbs) {
      ctx.beginPath()
      ctx.fillStyle = COLORS.xp
      ctx.shadowBlur = 14
      ctx.shadowColor = COLORS.xp
      ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0

    // Particles
    for (const p of particles) {
      const a = Math.max(0, p.life / p.maxLife)
      ctx.globalAlpha = a
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * a + 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Enemies
    for (const e of enemies) {
      const flash = e.hitFlash > 0
      ctx.shadowBlur = 18
      ctx.shadowColor = e.color
      ctx.fillStyle = flash ? "#FFFFFF" : e.color
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
      ctx.fill()
      // HP ring
      ctx.shadowBlur = 0
      if (e.hp < e.maxHp) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.radius + 4, -Math.PI / 2, -Math.PI / 2 + (e.hp / e.maxHp) * Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.shadowBlur = 0

    // Bullets
    ctx.shadowBlur = 12
    ctx.shadowColor = COLORS.bulletGlow
    ctx.fillStyle = COLORS.bullet
    for (const b of bullets) {
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0

    // Ship
    const shipAlpha = ship.iframes > 0 && Math.floor(time * 20) % 2 === 0 ? 0.4 : 1
    ctx.globalAlpha = shipAlpha
    ctx.shadowBlur = 22
    ctx.shadowColor = COLORS.playerGlow
    ctx.fillStyle = COLORS.player
    ctx.beginPath()
    ctx.arc(ship.x, ship.y, ship.radius, 0, Math.PI * 2)
    ctx.fill()
    // Inner core
    ctx.shadowBlur = 0
    ctx.fillStyle = "#FFFFFF"
    ctx.beginPath()
    ctx.arc(ship.x, ship.y, ship.radius * 0.45, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.restore()

    // Vignette (outside shake)
    if (ship.hp / ship.maxHp < 0.4) {
      const g = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.7,
      )
      g.addColorStop(0, "rgba(239, 68, 68, 0)")
      g.addColorStop(1, "rgba(239, 68, 68, 0.28)")
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)
    }
  }

  // ── Loop ─────────────────────────────────────────────
  function loop(now) {
    if (!running) return
    const dt = Math.min(0.05, (now - lastT) / 1000)
    lastT = now
    update(dt)
    render()
    raf = requestAnimationFrame(loop)
  }

  function start() {
    if (running) return
    running = true
    resize()
    startWave(1)
    state.phase = "playing"
    lastT = performance.now()
    raf = requestAnimationFrame(loop)
  }

  function stop() {
    running = false
    cancelAnimationFrame(raf)
  }

  function applyUpgrade(upgradeId) {
    const up = state.choices.find((u) => u.id === upgradeId)
    if (!up) return
    up.apply(ship)
    state.takenUpgrades.add(up.id)
    state.choices = []
    state.phase = "playing"
    startWave(state.wave + 1)
  }

  function destroy() {
    stop()
    resizeObs.disconnect()
    canvas.removeEventListener("mousemove", handleMove)
    canvas.removeEventListener("touchstart", handleMove)
    canvas.removeEventListener("touchmove", handleMove)
  }

  function getHud() {
    return {
      hp: Math.max(0, Math.round(ship.hp)),
      maxHp: ship.maxHp,
      wave: state.wave,
      score: Math.floor(state.score),
      xp: state.xp,
      enemiesLeft: enemies.length + state.enemiesToSpawn,
    }
  }

  return {
    start, stop, destroy, applyUpgrade, getHud,
    state, // for debugging
  }
}
