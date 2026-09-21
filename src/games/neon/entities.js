import { PLAYER, BULLET, ENEMY_TYPES } from "./constants"

let _id = 0
const nextId = () => ++_id

export function createShip(x, y) {
  return {
    id: nextId(),
    x, y,
    vx: 0, vy: 0,
    hp: PLAYER.baseHp,
    maxHp: PLAYER.baseHp,
    radius: PLAYER.radius,
    speed: PLAYER.baseSpeed,
    fireCooldown: 0,
    fireCooldownMax: PLAYER.fireCooldownBase,
    damage: BULLET.baseDamage,
    range: PLAYER.range,
    pierce: 0,
    tripleShot: false,
    explosive: false,
    iframes: 0,
  }
}

export function createBullet(x, y, vx, vy, damage, opts = {}) {
  return {
    id: nextId(),
    x, y, vx, vy,
    radius: BULLET.radius,
    damage,
    life: BULLET.life,
    pierce: opts.pierce || 0,
    explosive: opts.explosive || false,
    hit: new Set(),
  }
}

export function createEnemy(type, x, y) {
  const t = ENEMY_TYPES[type]
  return {
    id: nextId(),
    type,
    x, y,
    vx: 0, vy: 0,
    hp: t.hp,
    maxHp: t.hp,
    radius: t.radius,
    speed: t.speed,
    damage: t.damage,
    color: t.color,
    xp: t.xp,
    hitFlash: 0,
    wobble: Math.random() * Math.PI * 2,
  }
}

export function createParticle(x, y, color, opts = {}) {
  const angle = opts.angle != null ? opts.angle : Math.random() * Math.PI * 2
  const speed = opts.speed != null ? opts.speed : 80 + Math.random() * 180
  return {
    id: nextId(),
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: opts.life != null ? opts.life : 0.5 + Math.random() * 0.4,
    maxLife: opts.life != null ? opts.life : 0.5 + Math.random() * 0.4,
    radius: opts.radius != null ? opts.radius : 1.5 + Math.random() * 2.5,
    color,
  }
}

export function createXpOrb(x, y, value) {
  return {
    id: nextId(),
    x, y,
    vx: (Math.random() - 0.5) * 80,
    vy: (Math.random() - 0.5) * 80,
    value,
    radius: 4,
    life: 8,
  }
}
