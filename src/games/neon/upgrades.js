// Each upgrade: id, name, description, icon (emoji), apply(ship, meta) → mutates
// "meta" carries per-run stats like enemySpeedMul, spawnRateMul, etc.

export const UPGRADES = [
  {
    id: "firerate",
    name: "Overclock",
    desc: "Fire rate +22%",
    icon: "⚡",
    color: "#FDE047",
    apply: (ship) => {
      ship.fireCooldownMax = Math.max(90, ship.fireCooldownMax * 0.78)
    },
  },
  {
    id: "damage",
    name: "Hardpoint",
    desc: "Bullet damage +30%",
    icon: "💥",
    color: "#F87171",
    apply: (ship) => {
      ship.damage = Math.round(ship.damage * 1.3)
    },
  },
  {
    id: "triple",
    name: "Tri-Barrel",
    desc: "Fire 3 bullets in a spread",
    icon: "🔱",
    color: "#22D3EE",
    apply: (ship) => {
      ship.tripleShot = true
    },
    once: true,
  },
  {
    id: "pierce",
    name: "Penetrator",
    desc: "Bullets pierce +1 enemy",
    icon: "🎯",
    color: "#A78BFA",
    apply: (ship) => {
      ship.pierce += 1
    },
  },
  {
    id: "speed",
    name: "Thrusters",
    desc: "Ship speed +15%",
    icon: "🚀",
    color: "#34D399",
    apply: (ship) => {
      ship.speed *= 1.15
    },
  },
  {
    id: "maxhp",
    name: "Reinforce",
    desc: "Max HP +30, heal 30",
    icon: "❤️",
    color: "#F472B6",
    apply: (ship) => {
      ship.maxHp += 30
      ship.hp = Math.min(ship.maxHp, ship.hp + 30)
    },
  },
  {
    id: "explosive",
    name: "Detonator",
    desc: "Bullets explode on impact",
    icon: "☄️",
    color: "#FB923C",
    apply: (ship) => {
      ship.explosive = true
    },
    once: true,
  },
  {
    id: "range",
    name: "Targeting",
    desc: "Auto-fire range +25%",
    icon: "📡",
    color: "#60A5FA",
    apply: (ship) => {
      ship.range *= 1.25
    },
  },
]

export function pickUpgradeChoices(ship, taken, count = 3) {
  const pool = UPGRADES.filter((u) => {
    if (u.once && taken.has(u.id)) return false
    return true
  })
  // Shuffle
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
