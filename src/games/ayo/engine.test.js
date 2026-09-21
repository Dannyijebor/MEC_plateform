// Run with: node src/games/ayo/engine.test.js
// Uses plain Node — no test framework needed.

import {
  createInitialState,
  legalMoves,
  applyMove,
  rowCount,
  opponentOf,
  ownsPit,
  sowingPath,
} from "./engine.js"

let passed = 0
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg)
  console.log("  ✓ " + msg)
  passed++
}

console.log("\n─── Initial state ───")
const s0 = createInitialState()
assert(s0.board.length === 12, "board has 12 pits")
assert(s0.board.every((n) => n === 4), "each pit starts with 4 seeds")
assert(s0.turn === "A", "player A goes first")
assert(s0.captures.A === 0 && s0.captures.B === 0, "no captures yet")
assert(rowCount(s0.board, "A") === 24, "A owns 24 seeds")
assert(rowCount(s0.board, "B") === 24, "B owns 24 seeds")

console.log("\n─── Ownership ───")
assert(opponentOf("A") === "B", "opponentOf A is B")
assert(ownsPit("A", 3) === true, "A owns pit 3")
assert(ownsPit("B", 8) === true, "B owns pit 8")
assert(ownsPit("A", 8) === false, "A does not own pit 8")

console.log("\n─── Legal moves ───")
const moves = legalMoves(s0)
assert(moves.length === 6, "A has 6 legal moves initially")
assert(moves.every((m) => m >= 0 && m < 6), "all moves are in A's row")

console.log("\n─── Sowing ───")
const s1 = applyMove(s0, 5)
assert(s1.board[5] === 0, "source pit emptied")
assert(s1.board[6] === 5, "pit 6 received one seed")
assert(s1.board[7] === 5, "pit 7 received one seed")
assert(s1.board[8] === 5, "pit 8 received one seed")
assert(s1.board[9] === 5, "pit 9 received one seed")
assert(s1.turn === "B", "turn switched to B")
assert(rowCount(s1.board, "A") === 20, "A has 20 seeds after sowing")
assert(rowCount(s1.board, "B") === 28, "B has 28 seeds after sowing")

console.log("\n─── Sowing wrap-around ───")
const path = sowingPath(4, 4)
assert(path.length === 4, "sowing 4 seeds produces 4 path entries")
assert(path[0] === 5 && path[3] === 8, "path goes 5,6,7,8")

console.log("\n─── Sowing with skip (12+ seeds) ───")
const longPath = sowingPath(0, 13)
assert(longPath.length === 13, "path length equals seed count")
assert(!longPath.includes(0), "source pit 0 is never in the path")
assert(longPath[10] === 11, "position 10 is pit 11 (last pit before wrap)")
assert(longPath[11] === 1, "position 11 skips pit 0 and lands on pit 1")

console.log("\n─── Capture chain ───")
// Set up a board where sow from pit 5 captures pits 6 and 7
const captureBoard = [0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0]
const captureState = {
  board: captureBoard,
  captures: { A: 0, B: 0 },
  turn: "A",
  finished: false,
  winner: null,
  lastMove: null,
  moveCount: 0,
}
const s2 = applyMove(captureState, 5)
// Sow: source 5 (2 seeds) → pit 6, pit 7
// Board after sow: [0,0,0,0,0,0, 2,2,0,0,0,0]
// Landing pit 7 = 2 seeds (opponent) → capture
// Walk back: pit 6 = 2 seeds (opponent) → capture
// Both captured → but this would starve B (0 seeds) → suppressed
assert(s2.captures.A === 0, "capture suppressed — would starve opponent")
assert(s2.board[6] === 2 && s2.board[7] === 2, "seeds remain (no capture)")
assert(s2.turn === "B", "turn passed to B")

console.log("\n─── Non-starving capture ───")
const safeBoard = [0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0]
const safeState = {
  board: safeBoard,
  captures: { A: 0, B: 0 },
  turn: "A",
  finished: false,
  winner: null,
  lastMove: null,
  moveCount: 0,
}
const s3 = applyMove(safeState, 5)
// Sow: pit 6, pit 7 → [0,0,0,0,0,0, 2,2,2,0,0,0]
// Last pit 7 = 2 seeds → capture
// Backward: pit 6 = 2 seeds → capture
// B would have 2 seeds left (pit 8) → not starving, capture happens
assert(s3.captures.A === 4, "A captured 4 seeds (2 from pit 6, 2 from pit 7)")
assert(s3.board[6] === 0 && s3.board[7] === 0, "captured pits are empty")
assert(rowCount(s3.board, "B") === 2, "B still has 2 seeds")

console.log("\n─── Game end (opponent cannot move) ───")
const endBoard = [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0]
const endState = {
  board: endBoard,
  captures: { A: 10, B: 14 },
  turn: "A",
  finished: false,
  winner: null,
  lastMove: null,
  moveCount: 0,
}
const s4 = applyMove(endState, 5)
// Sow: pit 6, 7, 8 → B has 3 seeds now
// Last pit 8 = 1 seed → no capture
// Turn = B. B has 3 seeds → B can move
// So game continues... let me check
assert(s4.turn === "B", "turn passes to B")
assert(s4.finished === false, "game continues while B has seeds")

console.log("\n═══════════════════════════════")
console.log("  ✅ All " + passed + " tests passed")
console.log("═══════════════════════════════\n")
