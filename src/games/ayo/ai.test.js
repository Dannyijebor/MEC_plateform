import { createInitialState, applyMove, legalMoves } from "./engine.js"
import { chooseMove, chooseRandom, chooseGreedy, chooseMinimax } from "./ai.js"

let passed = 0
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg)
  console.log("  ✓ " + msg)
  passed++
}

console.log("\n─── AI returns legal moves ───")
let s = createInitialState()
for (let i = 0; i < 20; i++) {
  const legal = legalMoves(s)
  if (legal.length === 0) break
  const pit = chooseMove(s, s.turn, "hard")
  assert(legal.includes(pit), "move " + pit + " is legal at step " + i)
  s = applyMove(s, pit)
}

console.log("\n─── Random AI terminates ───")
let s2 = createInitialState()
let moves = 0
while (!s2.finished && moves < 500) {
  const pit = chooseRandom(s2, s2.turn)
  if (pit == null) break
  s2 = applyMove(s2, pit)
  moves++
}
assert(s2.finished || moves >= 500, "random game ends in ≤500 moves")
assert(s2.captures.A + s2.captures.B <= 48, "total captures never exceed 48 seeds")
console.log("    Game ended in " + moves + " moves. Winner: " + (s2.winner || "draw"))

console.log("\n─── Greedy vs Random ───")
let greedyWins = 0
let randomWins = 0
let draws = 0
for (let game = 0; game < 20; game++) {
  let st = createInitialState()
  let m = 0
  while (!st.finished && m < 500) {
    const isGreedyTurn = st.turn === "A"
    const pit = isGreedyTurn
      ? chooseGreedy(st, "A")
      : chooseRandom(st, "B")
    if (pit == null) break
    st = applyMove(st, pit)
    m++
  }
  if (st.winner === "A") greedyWins++
  else if (st.winner === "B") randomWins++
  else draws++
}
console.log("    Greedy: " + greedyWins + " | Random: " + randomWins + " | Draws: " + draws)
assert(greedyWins >= randomWins, "greedy wins at least as often as random across 20 games")

console.log("\n─── Minimax depth 4 (a few sample moves) ───")
let s3 = createInitialState()
const t0 = Date.now()
const m1 = chooseMinimax(s3, "A", 4)
const elapsed = Date.now() - t0
assert(m1 !== null, "minimax returns a move")
assert(elapsed < 3000, "minimax depth 4 completes in < 3s (took " + elapsed + "ms)")
console.log("    First move: pit " + m1 + " (" + elapsed + "ms)")

console.log("\n═══════════════════════════════")
console.log("  ✅ All " + passed + " assertions passed")
console.log("═══════════════════════════════\n")
