// Sprite loading + frame selection for Clan Combat.

const SPRITE_FILES = {
  player: {
    stand: "player/alienBlue_stand.png",
    walk1: "player/alienBlue_walk1.png",
    walk2: "player/alienBlue_walk2.png",
    jump: "player/alienBlue_jump.png",
    climb1: "player/alienBlue_climb1.png",
    climb2: "player/alienBlue_climb2.png",
    hit: "player/alienBlue_hit.png",
  },
  enemy: {
    stand: "enemy/alienPink_stand.png",
    walk1: "enemy/alienPink_walk1.png",
    walk2: "enemy/alienPink_walk2.png",
    jump: "enemy/alienPink_jump.png",
    climb1: "enemy/alienPink_climb1.png",
    climb2: "enemy/alienPink_climb2.png",
    hit: "enemy/alienPink_hit.png",
  },
}

const BASE = "/sprites/"

export async function loadClanCombatSprites() {
  const out = { player: {}, enemy: {} }
  const jobs = []
  for (const role of Object.keys(SPRITE_FILES)) {
    for (const key of Object.keys(SPRITE_FILES[role])) {
      jobs.push(
        loadImage(BASE + SPRITE_FILES[role][key])
          .then((img) => { out[role][key] = img })
          .catch((e) => console.warn("sprite load failed:", role, key, e)),
      )
    }
  }
  await Promise.all(jobs)
  return out
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function pickFrame(entity, time, opts = {}) {
  if (entity.hitFlash > 0) return "hit"
  if (!entity.onGround) {
    if (opts.jetpacking) {
      const phase = Math.floor(time * 10) % 2
      return "climb" + (phase + 1)
    }
    return "jump"
  }
  const speed = Math.abs(entity.vx || 0)
  if (speed > 30) {
    const phase = Math.floor(time * 8) % 2
    return "walk" + (phase + 1)
  }
  return "stand"
}
