import * as THREE from "three"
import {
  COLORS, CAMERA, CORRIDOR, ENEMY, ENEMY_TYPES, PLAYER, WAVE,
} from "./constants"

export function createMecStrikeEngine(canvas, callbacks = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = false

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(COLORS.fog)
  scene.fog = new THREE.Fog(COLORS.fog, 20, CAMERA.far)

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
  camera.position.set(CAMERA.x, CAMERA.y, CAMERA.z)
  camera.lookAt(CAMERA.x, CAMERA.y, CAMERA.z + 10)

  scene.add(new THREE.AmbientLight(0x2A3A5A, 0.9))
  const dir = new THREE.DirectionalLight(0x60A5FA, 0.7)
  dir.position.set(3, 6, 4)
  scene.add(dir)

  const cyanLight = new THREE.PointLight(COLORS.neon, 1.2, 40)
  cyanLight.position.set(0, 3, 12)
  scene.add(cyanLight)

  const corridorGroup = new THREE.Group()
  scene.add(corridorGroup)

  const wallMat = new THREE.MeshStandardMaterial({
    color: COLORS.wallTop,
    emissive: 0x1E3A8A,
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.3,
  })
  const floorMat = new THREE.MeshStandardMaterial({
    color: COLORS.floor,
    roughness: 0.7,
    metalness: 0.2,
  })
  const ceilMat = new THREE.MeshStandardMaterial({ color: COLORS.ceiling, roughness: 0.8 })
  const neonMat = new THREE.MeshBasicMaterial({ color: COLORS.neon })

  const wallGeo = new THREE.BoxGeometry(0.4, CORRIDOR.height, CORRIDOR.segmentLength)
  const floorGeo = new THREE.BoxGeometry(CORRIDOR.halfWidth * 2, 0.4, CORRIDOR.segmentLength)
  const ceilGeo = new THREE.BoxGeometry(CORRIDOR.halfWidth * 2, 0.4, CORRIDOR.segmentLength)
  const stripGeo = new THREE.BoxGeometry(0.06, 0.06, CORRIDOR.segmentLength)

  const segments = []
  for (let i = 0; i < CORRIDOR.visibleSegments; i++) {
    const z = i * CORRIDOR.segmentLength
    const g = new THREE.Group()

    const leftWall = new THREE.Mesh(wallGeo, wallMat)
    leftWall.position.set(-CORRIDOR.halfWidth, CORRIDOR.height / 2, 0)
    g.add(leftWall)

    const rightWall = new THREE.Mesh(wallGeo, wallMat)
    rightWall.position.set(CORRIDOR.halfWidth, CORRIDOR.height / 2, 0)
    g.add(rightWall)

    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.set(0, -0.2, 0)
    g.add(floor)

    const ceil = new THREE.Mesh(ceilGeo, ceilMat)
    ceil.position.set(0, CORRIDOR.height + 0.2, 0)
    g.add(ceil)

    const stripL = new THREE.Mesh(stripGeo, neonMat)
    stripL.position.set(-CORRIDOR.halfWidth + 0.25, 1.4, 0)
    g.add(stripL)

    const stripR = new THREE.Mesh(stripGeo, neonMat)
    stripR.position.set(CORRIDOR.halfWidth - 0.25, 1.4, 0)
    g.add(stripR)

    g.position.set(0, 0, z)
    corridorGroup.add(g)
    segments.push(g)
  }

  const enemyGroup = new THREE.Group()
  scene.add(enemyGroup)
  const enemies = []

  const particleGroup = new THREE.Group()
  scene.add(particleGroup)
  const particles = []
  const particleGeo = new THREE.SphereGeometry(0.08, 6, 6)

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
    const baseY = t.flies ? 2.5 + Math.random() * 1.5 : t.radius + 0.1

    const geo = new THREE.SphereGeometry(t.radius, 14, 14)
    const mat = new THREE.MeshStandardMaterial({
      color: t.color,
      emissive: t.color,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(lane, baseY, camera.position.z + ENEMY.spawnDistance)
    enemyGroup.add(mesh)

    const ringGeo = new THREE.TorusGeometry(t.radius * 1.6, 0.04, 8, 24)
    const ringMat = new THREE.MeshBasicMaterial({ color: t.color })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    mesh.add(ring)

    enemies.push({
      type,
      mesh,
      ring,
      hp: t.hp,
      baseY,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmp: t.flies ? 0.4 : 0.1,
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
    for (let i = 0; i < 14; i++) {
      const p = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color }))
      p.position.copy(e.mesh.position)
      const d = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize()
      particles.push({
        mesh: p,
        vel: d.multiplyScalar(3 + Math.random() * 3),
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
      })
      particleGroup.add(p)
    }

    shakeT = 0.15
    shakeAmp = 0.25
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

    const targets = enemies.filter((e) => !e.dying).map((e) => e.mesh)
    const hits = raycaster.intersectObjects(targets, false)

    if (hits.length > 0) {
      const hitMesh = hits[0].object
      const e = enemies.find((x) => x.mesh === hitMesh)
      if (e) {
        e.hp -= 1
        if (e.hp <= 0) killEnemy(e)
        else {
          e.mesh.material.emissiveIntensity = 2.5
          setTimeout(() => {
            if (e.mesh && e.mesh.material) e.mesh.material.emissiveIntensity = 0.7
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

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const w = rect.width || 1
    const h = rect.height || 1
    renderer.setSize(w, h, false)
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

    const baseZ = Math.floor(camera.position.z / CORRIDOR.segmentLength) * CORRIDOR.segmentLength
    for (const s of segments) {
      if (s.position.z < camera.position.z - CORRIDOR.segmentLength) {
        s.position.z += CORRIDOR.segmentLength * CORRIDOR.visibleSegments
      }
    }

    cyanLight.position.z = camera.position.z + 12

    if (shakeT > 0) {
      shakeT -= dt
      const k = shakeT / 0.15
      camera.position.x = CAMERA.x + (Math.random() - 0.5) * shakeAmp * k
      camera.position.y = CAMERA.y + (Math.random() - 0.5) * shakeAmp * k
    } else {
      camera.position.x = CAMERA.x
      camera.position.y = CAMERA.y
    }

    if (state.enemiesToSpawn > 0) {
      state.spawnTimer -= dt * 1000
      if (state.spawnTimer <= 0) {
        spawnEnemy()
        state.enemiesToSpawn--
        state.spawnTimer = state.spawnInterval
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      e.spawnT = Math.min(1, e.spawnT + dt * 5)
      e.mesh.scale.setScalar(e.spawnT)

      if (e.dying) {
        e.dieT -= dt
        e.mesh.scale.setScalar(Math.max(0, e.dieT / 0.35))
        if (e.dieT <= 0) {
          enemyGroup.remove(e.mesh)
          e.mesh.geometry.dispose()
          e.mesh.material.dispose()
          enemies.splice(i, 1)
        }
        continue
      }

      const t = ENEMY_TYPES[e.type]
      e.mesh.position.z -= t.speed * ENEMY.walkSpeed * dt
      e.bobPhase += dt * 4
      e.mesh.position.y = e.baseY + Math.sin(e.bobPhase) * e.bobAmp
      if (e.ring) e.ring.rotation.z += dt * 3

      if (e.mesh.position.z < camera.position.z + 0.5) {
        state.hp -= ENEMY.damageOnContact
        shakeT = 0.25
        shakeAmp = 0.5
        killEnemy(e)
        if (state.hp <= 0) {
          state.hp = 0
          state.phase = "dead"
          callbacks.onDeath?.({ score: state.score, wave: state.wave, kills: state.kills })
          break
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.mesh.position.addScaledVector(p.vel, dt)
      p.vel.multiplyScalar(0.94)
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
    renderer.render(scene, camera)
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
      e.mesh.geometry.dispose()
      e.mesh.material.dispose()
    }
    enemies.length = 0
    for (const p of particles) {
      particleGroup.remove(p.mesh)
      p.mesh.material.dispose()
    }
    particles.length = 0
    startWave(1)
  }

  return { start, stop, destroy, getHud, reset }
}
