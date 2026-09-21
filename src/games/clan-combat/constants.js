// Clan Combat — tunables

export const ARENA = {
  W: 540,
  H: 900,
  groundY: 840,     // top of the ground
  groundH: 60,
}

export const PHYSICS = {
  gravity: 1600,
  maxFall: 950,
  moveSpeed: 300,
  jumpVel: -560,
  jetpackThrust: 2400,   // upward accel while jetpack held
  jetpackMaxFuel: 1.6,
  jetpackRefill: 1.1,    // per second when grounded
}

export const PLAYER = {
  w: 26,
  h: 42,
  headR: 11,
  maxHp: 100,
}

export const DUMMY = {
  w: 26,
  h: 42,
  headR: 11,
  maxHp: 100,
  respawnMs: 2400,
}

export const PISTOL = {
  damage: 18,
  cooldownMs: 280,
  bulletSpeed: 900,
  bulletR: 3,
  bulletLife: 0.65,
}

export const COLORS = {
  bg0: "#0B0F1E",
  bg1: "#050710",
  grid: "rgba(96, 165, 250, 0.05)",
  platform: "#1E293B",
  platformEdge: "#38BDF8",
  player: "#38BDF8",
  playerHead: "#F1F5F9",
  playerGun: "#E2E8F0",
  dummy: "#94A3B8",
  dummyHead: "#E2E8F0",
  bullet: "#FDE047",
  bulletGlow: "rgba(253, 224, 71, 0.8)",
  hitSpark: "#FB923C",
  killSpark: "#F472B6",
}

// Platforms (in virtual arena coordinates)
export const PLATFORMS = [
  { x: 60,  y: 640, w: 180, h: 16 },
  { x: 300, y: 640, w: 180, h: 16 },
  { x: 180, y: 460, w: 180, h: 16 },
  { x: 40,  y: 300, w: 150, h: 16 },
  { x: 350, y: 300, w: 150, h: 16 },
  { x: 180, y: 140, w: 180, h: 16 },
]

// Where the practice dummies stand
export const DUMMY_SPOTS = [
  { x: 120, y: 598 },
  { x: 420, y: 598 },
  { x: 270, y: 418 },
  { x: 100, y: 258 },
  { x: 440, y: 258 },
]
