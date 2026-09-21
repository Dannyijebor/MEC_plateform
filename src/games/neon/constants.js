export const PLAYER = {
  radius: 12,
  baseSpeed: 320,
  baseHp: 100,
  fireCooldownBase: 340,
  range: 380,
}

export const BULLET = {
  radius: 3,
  baseSpeed: 620,
  baseDamage: 12,
  life: 1.2,
}

export const ENEMY_TYPES = {
  drifter: {
    radius: 14,
    hp: 30,
    speed: 60,
    damage: 12,
    color: "#F472B6",
    xp: 1,
  },
  dasher: {
    radius: 10,
    hp: 18,
    speed: 140,
    damage: 8,
    color: "#22D3EE",
    xp: 1,
  },
  brute: {
    radius: 22,
    hp: 90,
    speed: 40,
    damage: 20,
    color: "#A78BFA",
    xp: 3,
  },
}

export const COLORS = {
  player: "#38BDF8",
  playerGlow: "rgba(56, 189, 248, 0.85)",
  bullet: "#FDE047",
  bulletGlow: "rgba(253, 224, 71, 0.9)",
  background: "#080812",
  grid: "rgba(56, 189, 248, 0.06)",
  particle: "#F472B6",
  xp: "#34D399",
}

export const WAVE = {
  baseEnemies: 6,
  enemiesPerWave: 3,
  spawnIntervalBase: 900,
  spawnIntervalMin: 220,
  spawnRampPerWave: 60,
  interWaveDelay: 1400,
}
