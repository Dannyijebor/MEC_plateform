import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js"

const BASE = "/models/zombies/"

export const ZOMBIE_CONFIG = {
  grunt: {
    file: "grunt.glb",
    tint: new THREE.Color(0x5FA85F),
    emissive: new THREE.Color(0x1F4A1F),
    scale: 0.85,
    kind: "humanoid",
  },
  drone: {
    file: "drone.glb",
    tint: new THREE.Color(0x8FBF7F),
    emissive: new THREE.Color(0x3A5A2A),
    scale: 0.7,
    kind: "humanoid",
  },
  elite: {
    file: "elite.glb",
    tint: new THREE.Color(0x7DD3FC),
    emissive: new THREE.Color(0x0EA5E9),
    scale: 1.4,
    kind: "golem",
  },
}

// Safe material modification — works for any material type, guards against
// missing properties, and forces a shader refresh so Three doesn't reuse
// a cached program with stale uniform bindings.
function tintMaterial(m, cfg) {
  if (!m) return
  try {
    if (cfg.kind === "golem") {
      if (m.emissive) m.emissive.copy(cfg.emissive)
      if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 1.0
      if (m.roughness !== undefined) m.roughness = 0.35
      if (m.metalness !== undefined) m.metalness = 0.6
    } else {
      if (m.color) {
        m.color.multiply(cfg.tint)
      }
      if (m.emissive) m.emissive.copy(cfg.emissive)
      if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 0.35
      if (m.roughness !== undefined) m.roughness = 0.85
      if (m.metalness !== undefined) m.metalness = 0.05
    }
    // Force shader program refresh so uniforms rebind cleanly
    m.needsUpdate = true
  } catch (e) {
    console.warn("tintMaterial failed:", e)
  }
}

export async function loadZombieModels() {
  const loader = new GLTFLoader()
  const out = {}

  const tasks = Object.entries(ZOMBIE_CONFIG).map(async ([key, cfg]) => {
    try {
      const gltf = await loader.loadAsync(BASE + cfg.file)
      const root = gltf.scene

      // Tint the template once — it will be cloned per spawn
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          for (const m of materials) tintMaterial(m, cfg)
        }
      })

      const animations = gltf.animations || []
      const clips = {}
      for (const clip of animations) {
        const name = clip.name.toLowerCase()
        if (name.includes("walk") || name.includes("run")) clips.walk = clip
        else if (name.includes("idle") || name.includes("stand")) clips.idle = clip
      }
      if (!clips.walk && animations[0]) clips.walk = animations[0]

      out[key] = {
        root,
        clips,
        scale: cfg.scale,
        kind: cfg.kind,
      }
      console.log("zombie model loaded:", key, "clips:", Object.keys(clips))
    } catch (e) {
      console.warn("zombie model load failed:", key, e)
    }
  })

  await Promise.all(tasks)
  return out
}

export function spawnZombie(loaded, type) {
  const cfg = loaded[type]
  if (!cfg) return null

  const group = new THREE.Group()
  const model = cloneSkeleton(cfg.root)

  // Deep-clone all materials so each instance owns its own — prevents
  // cross-instance uniform corruption (the refreshMaterialUniforms crash)
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m) => m.clone())
      } else {
        child.material = child.material.clone()
      }
      // Force fresh shader compile for the cloned material
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      for (const m of mats) m.needsUpdate = true
    }
  })

  model.scale.setScalar(cfg.scale)
  group.add(model)

  let mixer = null
  if (cfg.clips && Object.keys(cfg.clips).length > 0) {
    mixer = new THREE.AnimationMixer(model)
  }

  return { group, mixer, clips: cfg.clips, kind: cfg.kind }
}
