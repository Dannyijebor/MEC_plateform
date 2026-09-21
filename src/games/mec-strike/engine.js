import * as THREE from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import {
  COLORS, CAMERA, CORRIDOR, ENEMY, ENEMY_TYPES, PLAYER, WAVE,
} from "./constants"
import { loadZombieModels, spawnZombie } from "./zombies"

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
  return new THREE.CanvasTexture(canvas)
}

export function createMecStrikeEngine(canvas, callbacks = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, powerPreference: "high-performance",
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(COLORS.fog)
  scene.fog = new THREE.Fog(COLORS.fog, 40, CAMERA.far)

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
  camera.position.set(CAMERA.x, CAMERA.y, CAMERA.z)
  camera.lookAt(CAMERA.x, CAMERA.y, CAMERA.z + 10)

  scene.add(new THREE.AmbientLight(0x3A4A6A, 1.5))
  const dir = new THREE.DirectionalLight(0x88AAFF, 0.9)
  dir.position.set(2, 8, 3)
  scene.add(dir)
  const cyanLight = new THREE.PointLight(0x38BDF8, 2.5, 50, 2)
  cyanLight.position.set(0, 3, 15)
  scene.add(cyanLight)

  // Headlight — bright spotlight from the camera so enemies are always lit
  const headlight = new THREE.PointLight(0xDDEEFF, 3.5, 60, 1.2)
  headlight.position.set(0, 0, 0)
  scene.add(headlight)

  // Bloom
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.55, 0.18)
  composer.addPass(bloom)
  const glowTex = createGlowTexture()

  // Zombie models (async load)
  let zombieModels = null
  let zombiesReady = false
  loadZombieModels().then((m) => {
    zombieModels = m
    zombiesReady = true
  })

  // Corridor
  const corridorGroup = new THREE.Group()
  scene.add(corridorGroup)

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x142A5C, emissive: 0x1E40AF, emissiveIntensity: 0.35,
    roughness: 0.55, metalness: 0.5,
  })
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0B1220, roughness: 0.35, metalness: 0.85,
  })
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0A1428, emissive: 0x1E3A8A, emissiveIntensity: 0.15, roughness: 0.8,
  })
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 })
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1E293B, emissive: 0x0EA5E9, emissiveIntensity: 0.4,
    roughness: 0.3, metalness: 0.7,
  })
  const ceilLightMat = new THREE.MeshBasicMaterial({ color: 0x7DD3FC })
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x0F1F45, emissive: 0x1E40AF, emissiveIntensity: 0.5,
    roughness: 0.4, metalness: 0.6,
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

    const lw = new THREE.Mesh(wallGeo, wallMat)
    lw.position.set(-CORRIDOR.halfWidth, CORRIDOR.height / 2, 0)
    g.add(lw)
    const rw = new THREE.Mesh(wallGeo, wallMat)
    rw.position.set(CORRIDOR.halfWidth, CORRIDOR.height / 2, 0)
    g.add(rw)

    const fl = new THREE.Mesh(floorGeo, floorMat)
    fl.position.set(0, -0.2, 0)
    g.add(fl)
    const ce = new THREE.Mesh(ceilGeo, ceilMat)
    ce.position.set(0, CORRIDOR.height + 0.2, 0)
    g.add(ce)

    const sl = new THREE.Mesh(stripeGeo, neonMat)
    sl.position.set(-CORRIDOR.halfWidth + 0.25, 0.5, 0)
    g.add(sl)
    const sr = new THREE.Mesh(stripeGeo, neonMat)
    sr.position.set(CORRIDOR.halfWidth - 0.25, 0.5, 0)
    g.add(sr)
    const al = new THREE.Mesh(stripeGeo, neonMat)
    al.position.set(-CORRIDOR.halfWidth + 0.25, 3.6, 0)
    g.add(al)
    const ar = new THREE.Mesh(stripeGeo, neonMat)
    ar.position.set(CORRIDOR.halfWidth - 0.25, 3.6, 0)
    g.add(ar)

    for (let k = -1; k <= 1; k++) {
      const pl = new THREE.Mesh(panelGeo, panelMat)
      pl.position.set(-CORRIDOR.halfWidth + 0.25, 2.2, k * 2)
      pl.rotation.y = Math.PI / 2
      g.add(pl)
      const pr = new THREE.Mesh(panelGeo, panelMat)
      pr.position.set(CORRIDOR.halfWidth - 0.25, 2.2, k * 2)
      pr.rotation.y = Math.PI / 2
      g.add(pr)
      const cl = new THREE.Mesh(ceilLightGeo, ceilLightMat)
      cl.position.set(0, CORRIDOR.height - 0.05, k * 2)
      g.add(cl)
    }

    if (i % 2 === 0) {
      const pl2 = new THREE.Mesh(pillarGeo, pillarMat)
      pl2.position.set(-CORRIDOR.halfWidth + 0.3, CORRIDOR.height / 2, 0)
      g.add(pl2)
      const pr2 = new THREE.Mesh(pillarGeo, pillarMat)
      pr2.position.set(CORRIDOR.halfWidth - 0.3, CORRIDOR.height / 2, 0)
      g.add(pr2)
    }

    g.position.set(0, 0, z)
    corridorGroup.add(g)
    segments.push(g)
  }

  // Enemy + particle groups
  const enemyGroup = new THREE.Group()
  scene.add(enemyGroup)
  const enemies = []

  const particleGroup = new THREE.Group()
  scene.add(particleGroup)
  const particles = []
  const particleGeo = new THREE.SphereGeometry(0.08, 6, 6)

  // Warp streaks
  const streakGroup = new THREE.Group()
  scene.add(streakGroup)
  const streaks = []
  const streakGeo = new THREE.BoxGeometry(0.03, 0.03, 1.2)

  function spawnStreak() {
    const x = (Math.random() - 0.5) * CORRIDOR.halfWidth * 1.9
    const y = Math.random() * CORRIDOR.height * 0.9 + 0.3
    const z = camera.position.z + 20 + Math.random() * 40
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8, transparent: true, opacity: 0.55,
    })
    const mesh = new THREE.Mesh(streakGeo, mat)
    mesh.position.set(x, y, z)
    streakGroup.add(mesh)
    streaks.push({ mesh, life: 1.2, maxLife: 1.2 })
  }

  const state = {
    phase: "playing",
    hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
    score: 0, wave: 1,
    enemiesToSpawn: 0, spawnTimer: 0, spawnInterval: ENEMY.spawnIntervalBase,
    interWaveTimer: 0, kills: 0, distance: 0,
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
    const baseY = t.flies ? 2.6 + Math.random() * 1.4 : 0
    const group = new THREE.Group()

    let mixer = null
    let clips = null
    let kind = "fallback"
    const golemMaterials = []

    if (zombiesReady && zombieModels && zombieModels[type]) {
      const z = spawnZombie(zombieModels, type)
      if (z) {
        group.add(z.group)
        mixer = z.mixer
        clips = z.clips
        kind = z.kind || "humanoid"
        if (mixer && clips && clips.walk) {
          const action = mixer.clipAction(clips.walk)
          action.play()
          action.time = Math.random() * clips.walk.duration
        }
        if (kind === "golem") {
          group.traverse((child) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material]
              for (const m of mats) golemMaterials.push(m)
            }
          })
        }
      }
    } else {
      // Fallback geometric sphere
      const coreGeo = new THREE.IcosahedronGeometry(t.radius, 0)
      const coreMat = new THREE.MeshStandardMaterial({
        color: t.color, emissive: t.color, emissiveIntensity: 1.4,
        roughness: 0.3, metalness: 0.3,
      })
      const core = new THREE.Mesh(coreGeo, coreMat)
      group.add(core)
    }

    group.position.set(lane, baseY, camera.position.z + ENEMY.spawnDistance)
    enemyGroup.add(group)

    enemies.push({
      type, kind, mesh: group,
      mixer, walkAction: null, clips, golemMaterials,
      hp: t.hp, baseY,
      bobPhase: Math.random() * Math.PI * 2,
      spinSpeed: 0.6 + Math.random() * 0.8,
      spawnT: 0, dying: false, dieT: 0,
    })
  }

  function killEnemy(e) {
    if (e.dying) return
    e.dying = true
    e.dieT = 0.35
    state.kills++
    state.score += ENEMY_TYPES[e.type].score

    const color = ENEMY_TYPES[e.type].color
    const origin = e.mesh.position.clone()
    origin.y += 0.9

    for (let i = 0; i < 22; i++) {
      const p = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color }))
      p.position.copy(origin)
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

    const targets = enemies.filter((e) => !e.dying).map((e) => e.mesh)
    const hits = raycaster.intersectObjects(targets, true)

    if (hits.length > 0) {
      let obj = hits[0].object
      let matched = null
      while (obj && !matched) {
        matched = enemies.find((x) => x.mesh === obj)
        if (!matched) obj = obj.parent
      }
      if (matched && !matched.dying) {
        matched.hp -= 1
        if (matched.hp <= 0) killEnemy(matched)
        else {
          // Flash white
          const originals = []
          matched.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material]
              for (const m of mats) {
                originals.push({ m, color: m.color.clone() })
                m.color.setRGB(1, 1, 1)
              }
            }
          })
          setTimeout(() => {
            for (const o of originals) {
              if (o.m) o.m.color.copy(o.color)
            }
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

    for (const s of segments) {
      if (s.position.z < camera.position.z - CORRIDOR.segmentLength) {
        s.position.z += CORRIDOR.segmentLength * CORRIDOR.visibleSegments
      }
    }
    cyanLight.position.z = camera.position.z + 15
    // Headlight stays 2m in front of the camera
    headlight.position.set(camera.position.x, camera.position.y + 0.3, camera.position.z + 2)

    if (shakeT > 0) {
      shakeT -= dt
      const k = shakeT / 0.15
      camera.position.x = CAMERA.x + (Math.random() - 0.5) * shakeAmp * k
      camera.position.y = CAMERA.y + (Math.random() - 0.5) * shakeAmp * k
    } else {
      camera.position.x = CAMERA.x
      camera.position.y = CAMERA.y
    }

    streakTimer -= dt
    if (streakTimer <= 0) { spawnStreak(); streakTimer = 0.02 }

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
        e.mesh.scale.setScalar(Math.max(0.001, e.dieT / 0.35))
        if (e.mixer) e.mixer.update(dt)
        if (e.dieT <= 0) {
          enemyGroup.remove(e.mesh)
          if (e.mixer) e.mixer.stopAllAction()
          enemies.splice(i, 1)
        }
        continue
      }

      const t = ENEMY_TYPES[e.type]
      e.mesh.position.z -= t.speed * ENEMY.walkSpeed * dt
      e.bobPhase += dt * 4

      if (e.kind === "humanoid") {
        if (e.mixer) e.mixer.update(dt)
        e.mesh.position.y = e.baseY + Math.sin(e.bobPhase * 0.8) * 0.04
        e.mesh.rotation.y = Math.PI
      } else if (e.kind === "golem") {
        e.mesh.position.y = e.baseY + 0.4 + Math.sin(e.bobPhase * 1.2) * 0.18
        e.mesh.rotation.y += dt * 0.55
        const pulse = 0.7 + Math.sin(e.bobPhase * 2.5) * 0.4
        for (const m of e.golemMaterials) {
          if (m && m.emissiveIntensity !== undefined) {
            m.emissiveIntensity = pulse * 1.2
          }
        }
        if (Math.random() < 0.35) {
          const p = new THREE.Mesh(
            particleGeo,
            new THREE.MeshBasicMaterial({ color: 0x7DD3FC, transparent: true, opacity: 0.9 }),
          )
          p.position.copy(e.mesh.position)
          p.position.z += 0.3 + Math.random() * 0.4
          p.position.y += (Math.random() - 0.5) * 0.6
          p.position.x += (Math.random() - 0.5) * 0.6
          particles.push({
            mesh: p,
            vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.3) * 0.8, -0.4),
            life: 0.7 + Math.random() * 0.4,
            maxLife: 1.1,
          })
          particleGroup.add(p)
        }
      } else {
        e.mesh.position.y = e.baseY + Math.sin(e.bobPhase) * (t.flies ? 0.5 : 0.15)
      }

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

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.mesh.position.addScaledVector(p.vel, dt)
      p.vel.multiplyScalar(0.93)
      p.life -= dt
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife)
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

  function render() { composer.render() }

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

  function stop() { running = false; cancelAnimationFrame(raf) }

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
      hp: state.hp, maxHp: state.maxHp,
      score: state.score, wave: state.wave, kills: state.kills,
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
      if (e.mixer) e.mixer.stopAllAction()
    }
    enemies.length = 0
    for (const p of particles) particleGroup.remove(p.mesh)
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
