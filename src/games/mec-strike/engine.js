import * as THREE from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import {
  COLORS, CAMERA, CORRIDOR, ENEMY, ENEMY_TYPES, PLAYER, WAVE,
} from "./constants"

// ── Radial glow texture (shared by enemies, particles, streaks) ──
function createGlowTexture() {
  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  g.addColorStop(0, "rgba(255,255,255,1)")
  g.addColorStop(0.4, "rgba(255,255,255,0.6)")
  g.addColorStop(0.8, "rgba(255,255,255,0.1)")
  g.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function createMecStrikeEngine(canvas, callbacks = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
  renderer.shadowMap.enabled = false
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(COLORS.fog)
  scene.fog = new THREE.Fog(COLORS.fog, 40, CAMERA.far)

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
  camera.position.set(CAMERA.x, CAMERA.y, CAMERA.z)
  camera.lookAt(CAMERA.x, CAMERA.y, CAMERA.z + 10)

  // ── Lighting ──────────────────────────────────
  scene.add(new THREE.AmbientLight(0x1A2A4A, 1.0))
  const dir = new THREE.DirectionalLight(0x60A5FA, 0.5)
  dir.position.set(2, 8, 3)
  scene.add(dir)

  const cyanLight = new THREE.PointLight(0x38BDF8, 2.5, 50, 2)
  cyanLight.position.set(0, 3, 15)
  scene.add(cyanLight)

  // ── Post-processing: bloom ────────────────────
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(256, 256),
    0.75,   // strength
    0.55,   // radius
    0.18,   // threshold
  )
  composer.addPass(bloom)
  const glowTex = createGlowTexture()

  // ── Corridor geometry pools ──────────────────
  const corridorGroup = new THREE.Group()
  scene.add(corridorGroup)

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x142A5C,
    emissive: 0x1E40AF,
    emissiveIntensity: 0.35,
    roughness: 0.55,
    metalness: 0.5,
  })
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0B1220,
    roughness: 0.35,
    metalness: 0.85,
  })
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0A1428,
    emissive: 0x1E3A8A,
    emissiveIntensity: 0.15,
    roughness: 0.8,
  })
  const neonStripeMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 })
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1E293B,
    emissive: 0x0EA5E9,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.7,
  })
  const ceilLightMat = new THREE.MeshBasicMaterial({ color: 0x7DD3FC })
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x0F1F45,
    emissive: 0x1E40AF,
    emissiveIntensity: 0.5,
    roughness: 0.4,
    metalness: 0.6,
  })

  const wallGeo = new THREE.BoxGeometry(0.4, CORRIDOR.height, CORRIDOR.segmentLength)
  const floorGeo = new THREE.BoxGeometry(CORRIDOR.halfWidth * 2, 0.4, CORRIDOR.segmentLength)
  const ceilGeo = new THREE.BoxGeometry(CORRIDOR.halfWidth * 2, 0.4, CORRIDOR.segmentLength)
  const stripeGeo = new THREE.BoxGeometry(0.08, 0.08, CORRIDOR.segmentLength - 0.5)
  const panelGeo = new THREE.BoxGeometry(0.2, 1.2, 1.4)
  const ceilLightGeo = new THREE.BoxGeometry(0.4, 0.05, 1.2)
  const pillarGeo = new THREE.BoxGeometry(0.6, CORRIDOR.height, 0.6)

  const segments = []
  for (let i = 0; i < CORRIDOR.visibleSegments; i++) {
    const z = i * CORRIDOR.segmentLength
    const g = new THREE.Group()

    // Walls
    const leftWall = new THREE.Mesh(wallGeo, wallMat)
    leftWall.position.set(-CORRIDOR.halfWidth, CORRIDOR.height / 2, 0)
    g.add(leftWall)
    const rightWall = new THREE.Mesh(wallGeo, wallMat)
    rightWall.position.set(CORRIDOR.halfWidth, CORRIDOR.height / 2, 0)
    g.add(rightWall)

    // Floor
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.set(0, -0.2, 0)
    g.add(floor)

    // Ceiling
    const ceil = new THREE.Mesh(ceilGeo, ceilMat)
    ceil.position.set(0, CORRIDOR.height + 0.2, 0)
    g.add(ceil)

    // Floor neon strips
    const stripL = new THREE.Mesh(stripeGeo, neonStripeMat)
    stripL.position.set(-CORRIDOR.halfWidth + 0.25, 0.5, 0)
    g.add(stripL)
    const stripR = new THREE.Mesh(stripeGeo, neonStripeMat)
    stripR.position.set(CORRIDOR.halfWidth - 0.25, 0.5, 0)
    g.add(stripR)

    // Mid-height accent line
    const accentL = new THREE.Mesh(stripeGeo, neonStripeMat)
    accentL.position.set(-CORRIDOR.halfWidth + 0.25, 3.6, 0)
    g.add(accentL)
    const accentR = new THREE.Mesh(stripeGeo, neonStripeMat)
    accentR.position.set(CORRIDOR.halfWidth - 0.25, 3.6, 0)
    g.add(accentR)

    // Wall panels (small glowing rectangles)
    for (let k = -1; k <= 1; k++) {
      const panelL = new THREE.Mesh(panelGeo, panelMat)
      panelL.position.set(-CORRIDOR.halfWidth + 0.25, 2.2, k * 2)
      panelL.rotation.y = Math.PI / 2
      g.add(panelL)

      const panelR = new THREE.Mesh(panelGeo, panelMat)
      panelR.position.set(CORRIDOR.halfWidth - 0.25, 2.2, k * 2)
      panelR.rotation.y = Math.PI / 2
      g.add(panelR)
    }

    // Ceiling lights (glowing strips)
    for (let k = -1; k <= 1; k++) {
      const light = new THREE.Mesh(ceilLightGeo, ceilLightMat)
      light.position.set(0, CORRIDOR.height - 0.05, k * 2)
      g.add(light)
    }

    // Vertical pillar rings (every 2nd segment)
    if (i % 2 === 0) {
      const pillarL = new THREE.Mesh(pillarGeo, pillarMat)
      pillarL.position.set(-CORRIDOR.halfWidth + 0.3, CORRIDOR.height / 2, 0)
      g.add(pillarL)

      const pillarR = new THREE.Mesh(pillarGeo, pillarMat)
      pillarR.position.set(CORRIDOR.halfWidth - 0.3, CORRIDOR.height / 2, 0)
      g.add(pillarR)
    }

    g.position.set(0, 0, z)
    corridorGroup.add(g)
    segments.push(g)
  }

  // ── Enemies ──────────────────────────────────
  const enemyGroup = new THREE.Group()
  scene.add(enemyGroup)
  const enemies = []

  // ── Particles ─────────────────────────────────
  const particleGroup = new THREE.Group()
  scene.add(particleGroup)
  const particles = []
  const particleGeo = new THREE.SphereGeometry(0.08, 6, 6)

  // ── Warp streaks ──────────────────────────────
  const streakGroup = new THREE.Group()
  scene.add(streakGroup)
  const streaks = []
  const streakGeo = new THREE.BoxGeometry(0.03, 0.03, 1.2)
  const streakMat = new THREE.MeshBasicMaterial({
    color: 0x38BDF8,
    transparent: true,
    opacity: 0.55,
  })

  function spawnStreak() {
    const x = (Math.random() - 0.5) * CORRIDOR.halfWidth * 1.9
    const y = Math.random() * CORRIDOR.height * 0.9 + 0.3
    const z = camera.position.z + 20 + Math.random() * 40
    const mesh = new THREE.Mesh(streakGeo, streakMat.clone())
    mesh.position.set(x, y, z)
    streakGroup.add(mesh)
    streaks.push({ mesh, life: 1.2, maxLife: 1.2 })
  }

  // ── State ─────────────────────────────────────
  const state = {
    phase: "playing",
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    score: 0,
    wave: 1,
    enemiesToSpawn: 0,
    spawnTimer: 0,
    spawnInterval: ENEMY.spawnIntervalBase,
    interWaveTimer: 0,
    kills: 0,
    distance: 0,
  }

  function startWave(wave) {
    state.wave = wave
    state.enemiesToSpawn = WAVE.baseEnemies + (wave - 1) * WAVE.enemiesPerWave
    state.spawnInterval = Math.max(
      ENEMY.spawnIntervalMin,
      ENEMY.spawnIntervalBase - (wave - 1) * ENEMY.spawnIntervalRamp,
    )
    state.spawnTimer = 0
  }

  function pickEnemyType() {
    const pool = []
    for (const [key, t] of Object.entries(ENEMY_TYPES)) {
      if (state.wave >= (t.wave || 1)) pool.push(key)
    }
    return pool[Math.floor(Math.random() * pool.length)] || "grunt"
  }

  function spawnEnemy() {
    const type = pickEnemyType()
    const t = ENEMY_TYPES[type]
    const lanes = [-1.6, 0, 1.6]
    const lane = lanes[Math.floor(Math.random() * 3)]
    const baseY = t.flies ? 2.6 + Math.random() * 1.4 : t.radius + 0.05

    const group = new THREE.Group()

    // Core — icosahedron for a faceted, threatening shape
    const coreGeo = new THREE.IcosahedronGeometry(t.radius, 0)
    const coreMat = new THREE.MeshStandardMaterial({
      color: t.color,
      emissive: t.color,
      emissiveIntensity: 1.4,
      roughness: 0.3,
      metalness: 0.3,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    group.add(core)

    // Inner glow sprite — additive halo
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: t.color,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    })
    const glow = new THREE.Sprite(spriteMat)
    glow.scale.setScalar(t.radius * 6)
    group.add(glow)

    // Orbital rings at random angles
    const rings = []
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.TorusGeometry(t.radius * (1.5 + r * 0.35), 0.03, 6, 22)
      const ringMat = new THREE.MeshBasicMaterial({
        color: t.color,
        transparent: true,
        opacity: 0.85,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      )
      group.add(ring)
      rings.push({
        mesh: ring,
        speed: 0.5 + Math.random() * 1.5,
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize(),
      })
    }

    group.position.set(lane, baseY, camera.position.z + ENEMY.spawnDistance)
    enemyGroup.add(group)

    enemies.push({
      type,
      mesh: group,
      core,
      glow,
      rings,
      hp: t.hp,
      baseY,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmp: t.flies ? 0.5 : 0.15,
      spinSpeed: 0.6 + Math.random() * 0.8,
      spawnT: 0,
      dying: false,
      dieT: 0,
    })
  }

  function killEnemy(e) {
    if (e.dying) return
    e.dying = true
    e.dieT = 0.35
    state.kills++
    state.score += ENEMY_TYPES[e.type].score

    const color = ENEMY_TYPES[e.type].color
    for (let i = 0; i < 22; i++) {
      const p = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color }))
      p.position.copy(e.mesh.position)
      const d = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize()
      particles.push({
        mesh: p,
        vel: d.multiplyScalar(3 + Math.random() * 4),
        life: 0.6 + Math.random() * 0.35,
        maxLife: 0.95,
      })
      particleGroup.add(p)
    }

    shakeT = 0.15
    shakeAmp = 0.3
  }

  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()

  function shootAt(clientX, clientY) {
    if (state.phase !== "playing") return
    const rect = canvas.getBoundingClientRect()
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)
    raycaster.far = CAMERA.far

    // Include all children of live enemy groups
    const targets = []
    for (const e of enemies) {
      if (!e.dying) targets.push(e.core, e.glow, ...e.rings.map((r) => r.mesh))
    }

    const hits = raycaster.intersectObjects(targets, false)
    if (hits.length > 0) {
      const hitMesh = hits[0].object
      const e = enemies.find((x) =>
        x.core === hitMesh ||
        x.glow === hitMesh ||
        x.rings.some((r) => r.mesh === hitMesh)
      )
      if (e && !e.dying) {
        e.hp -= 1
        if (e.hp <= 0) killEnemy(e)
        else {
          e.core.material.emissiveIntensity = 3.5
          setTimeout(() => {
            if (e.core && e.core.material) e.core.material.emissiveIntensity = 1.4
          }, 90)
        }
      }
    }
  }

  let shakeT = 0
  let shakeAmp = 0

  function onPointerDown(e) {
    const t = e.touches ? e.touches[0] : e
    shootAt(t.clientX, t.clientY)
    e.preventDefault()
  }
  canvas.addEventListener("pointerdown", onPointerDown)
  canvas.addEventListener("touchstart", onPointerDown, { passive: false })

  function onKey(e) {
    if (e.code === "Space") {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      shootAt(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }
  }
  window.addEventListener("keydown", onKey)

  let running = false
  let raf = 0
  let lastT = 0
  let streakTimer = 0

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const w = rect.width || 1
    const h = rect.height || 1
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    bloom.setSize(Math.floor(w / 3), Math.floor(h / 3))
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  function update(dt) {
    if (state.phase === "dead") return

    camera.position.z += CAMERA.speed * dt
    state.distance += CAMERA.speed * dt

    // Recycle corridor segments
    for (const s of segments) {
      if (s.position.z < camera.position.z - CORRIDOR.segmentLength) {
        s.position.z += CORRIDOR.segmentLength * CORRIDOR.visibleSegments
      }
    }

    cyanLight.position.z = camera.position.z + 15

    // Camera shake
    if (shakeT > 0) {
      shakeT -= dt
      const k = shakeT / 0.15
      camera.position.x = CAMERA.x + (Math.random() - 0.5) * shakeAmp * k
      camera.position.y = CAMERA.y + (Math.random() - 0.5) * shakeAmp * k
    } else {
      camera.position.x = CAMERA.x
      camera.position.y = CAMERA.y
    }

    // Spawn warp streaks constantly
    streakTimer -= dt
    if (streakTimer <= 0) {
      spawnStreak()
      streakTimer = 0.02
    }

    // Update streaks
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i]
      s.mesh.position.z -= 55 * dt
      s.life -= dt
      s.mesh.material.opacity = 0.55 * (s.life / s.maxLife)
      if (s.life <= 0 || s.mesh.position.z < camera.position.z - 5) {
        streakGroup.remove(s.mesh)
        s.mesh.material.dispose()
        streaks.splice(i, 1)
      }
    }

    // Spawn enemies
    if (state.enemiesToSpawn > 0) {
      state.spawnTimer -= dt * 1000
      if (state.spawnTimer <= 0) {
        spawnEnemy()
        state.enemiesToSpawn--
        state.spawnTimer = state.spawnInterval
      }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      e.spawnT = Math.min(1, e.spawnT + dt * 5)
      e.mesh.scale.setScalar(e.spawnT)

      if (e.dying) {
        e.dieT -= dt
        e.mesh.scale.setScalar(Math.max(0, e.dieT / 0.35))
        if (e.dieT <= 0) {
          enemyGroup.remove(e.mesh)
          e.core.geometry.dispose()
          e.core.material.dispose()
          e.glow.material.dispose()
          for (const r of e.rings) {
            r.mesh.geometry.dispose()
            r.mesh.material.dispose()
          }
          enemies.splice(i, 1)
        }
        continue
      }

      const t = ENEMY_TYPES[e.type]
      e.mesh.position.z -= t.speed * ENEMY.walkSpeed * dt
      e.bobPhase += dt * 4
      e.mesh.position.y = e.baseY + Math.sin(e.bobPhase) * e.bobAmp

      // Spin core
      e.core.rotation.x += dt * e.spinSpeed
      e.core.rotation.y += dt * e.spinSpeed * 0.7

      // Spin rings on their axes
      for (const r of e.rings) {
        r.mesh.rotateOnAxis(r.axis, dt * r.speed)
      }

      // Pulse glow
      const pulse = 0.75 + Math.sin(e.bobPhase * 2) * 0.25
      e.glow.material.opacity = pulse * 0.85
      e.glow.scale.setScalar(t.radius * (5.5 + pulse * 1.5))

      // Reached player
      if (e.mesh.position.z < camera.position.z + 0.5) {
        state.hp -= ENEMY.damageOnContact
        shakeT = 0.3
        shakeAmp = 0.7
        killEnemy(e)
        if (state.hp <= 0) {
          state.hp = 0
          state.phase = "dead"
          callbacks.onDeath?.({ score: state.score, wave: state.wave, kills: state.kills })
          break
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.mesh.position.addScaledVector(p.vel, dt)
      p.vel.multiplyScalar(0.93)
      p.life -= dt
      const a = Math.max(0, p.life / p.maxLife)
      p.mesh.material.transparent = true
      p.mesh.material.opacity = a
      if (p.life <= 0) {
        particleGroup.remove(p.mesh)
        p.mesh.material.dispose()
        particles.splice(i, 1)
      }
    }

    // Wave complete?
    if (state.enemiesToSpawn === 0 && enemies.length === 0 && state.phase === "playing") {
      if (state.interWaveTimer <= 0) {
        state.interWaveTimer = WAVE.interWaveDelay
      } else {
        state.interWaveTimer -= dt * 1000
        if (state.interWaveTimer <= 0) {
          startWave(state.wave + 1)
          state.interWaveTimer = 0
          callbacks.onWaveStart?.(state.wave)
        }
      }
    }
  }

  function render() {
    composer.render()
  }

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
    startWave(1)
    lastT = performance.now()
    raf = requestAnimationFrame(loop)
  }

  function stop() {
    running = false
    cancelAnimationFrame(raf)
  }

  function destroy() {
    stop()
    ro.disconnect()
    canvas.removeEventListener("pointerdown", onPointerDown)
    canvas.removeEventListener("touchstart", onPointerDown)
    window.removeEventListener("keydown", onKey)
    composer.dispose?.()
    renderer.dispose()
  }

  function getHud() {
    return {
      hp: state.hp,
      maxHp: state.maxHp,
      score: state.score,
      wave: state.wave,
      kills: state.kills,
      distance: Math.floor(state.distance),
      enemiesLeft: enemies.length + state.enemiesToSpawn,
      phase: state.phase,
    }
  }

  function reset() {
    state.phase = "playing"
    state.hp = state.maxHp
    state.score = 0
    state.wave = 1
    state.kills = 0
    state.distance = 0
    state.enemiesToSpawn = 0
    state.interWaveTimer = 0
    camera.position.z = 0
    for (const e of enemies) {
      enemyGroup.remove(e.mesh)
      e.core.geometry.dispose()
      e.core.material.dispose()
      e.glow.material.dispose()
      for (const r of e.rings) {
        r.mesh.geometry.dispose()
        r.mesh.material.dispose()
      }
    }
    enemies.length = 0
    for (const p of particles) {
      particleGroup.remove(p.mesh)
      p.mesh.material.dispose()
    }
    particles.length = 0
    for (const s of streaks) {
      streakGroup.remove(s.mesh)
      s.mesh.material.dispose()
    }
    streaks.length = 0
    startWave(1)
  }

  return { start, stop, destroy, getHud, reset }
}
