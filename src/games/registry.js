// Single source of truth for every game on MEC.
// Add a new entry here to make a game appear in the hub.

export const GAMES = [
  {
    id: "ayo",
    name: "Ayo",
    tagline: "The classic Yoruba seed game",
    description: "Sow seeds, capture your opponent's row. Simple to learn, endless depth. Play whenever — your opponent sees your move the next time they open MEC.",
    minPlayers: 2,
    maxPlayers: 2,
    mode: "async",
    icon: "🌰",
    accent: "#D97706",
    isActive: true,
    route: "/games/ayo",
  },
  {
    id: "neon",
    name: "Neon Waves",
    tagline: "Survive the swarm. Get stronger.",
    description: "A neon arena shooter. Endless waves of enemies, upgrades every wave, one life. How deep can you go?",
    minPlayers: 1,
    maxPlayers: 1,
    mode: "solo",
    icon: "✨",
    accent: "#38BDF8",
    isActive: true,
    route: "/games/neon",
  },
  {
    id: "whot",
    name: "Whot!",
    tagline: "Nigeria's favourite card game",
    description: "Match shapes, call Whot, and empty your hand first. Coming soon.",
    minPlayers: 2,
    maxPlayers: 6,
    mode: "async",
    icon: "🃏",
    accent: "#3B82F6",
    isActive: false,
    route: "/games/whot",
  },
  {
    id: "ludo",
    name: "Ludo",
    tagline: "Race your pieces home",
    description: "Roll the dice, chase your rivals, bring all four pieces home. Coming soon.",
    minPlayers: 2,
    maxPlayers: 4,
    mode: "async",
    icon: "🎲",
    accent: "#7C3AED",
    isActive: false,
    route: "/games/ludo",
  },
  {
    id: "wordle",
    name: "Daily Word",
    tagline: "One word. One shot per day.",
    description: "Everyone gets the same word at midnight. Six tries. Rivalries guaranteed.",
    minPlayers: 1,
    maxPlayers: 1,
    mode: "daily",
    icon: "📝",
    accent: "#10B981",
    isActive: false,
    route: "/games/wordle",
  },
]

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || null
}
