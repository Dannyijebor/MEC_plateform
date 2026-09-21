export const COLORS = {
  fog: 0x050912,
  wallTop: 0x1E40AF,
  wallBottom: 0x0A1024,
  floor: 0x0B1220,
  ceiling: 0x080F1E,
  neon: 0x38BDF8,
  neonPink: 0xEC4899,
  neonYellow: 0xFDE047,
  enemyBase: 0xDC2626,
  enemyDrone: 0xF97316,
  enemyElite: 0xA855F7,
}

export const CAMERA = {
  x: 0,
  y: 2.2,
  z: 0,
  fov: 75,
  near: 0.1,
  far: 160,
  speed: 8.5,
}

export const CORRIDOR = {
  halfWidth: 3,
  height: 6,
  segmentLength: 8,
  visibleSegments: 30,
}

export const ENEMY = {
  spawnIntervalBase: 1400,
  spawnIntervalMin: 500,
  spawnIntervalRamp: 90,
  spawnDistance: 55,
  despawnDistance: -8,
  walkSpeed: 1.6,
  damageOnContact: 22,
  hitboxRadius: 0.7,
}

export const ENEMY_TYPES = {
  grunt: { hp: 1, score: 10, color: COLORS.enemyBase, radius: 0.55, speed: 1.0, wave: 1 },
  drone: { hp: 1, score: 15, color: COLORS.enemyDrone, radius: 0.4, speed: 1.6, wave: 3, flies: true },
  elite: { hp: 2, score: 30, color: COLORS.enemyElite, radius: 0.7, speed: 0.8, wave: 5 },
}

export const PLAYER = {
  maxHp: 100,
  reloadDelayMs: 0,
}

export const WAVE = {
  baseEnemies: 8,
  enemiesPerWave: 3,
  interWaveDelay: 1800,
}
