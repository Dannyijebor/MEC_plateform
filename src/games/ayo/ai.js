// ============================================================
// AYO AI
//
// Three difficulty levels:
//   easy   — plays a random legal move
//   medium — one-ply lookahead, picks the move with max capture
//   hard   — minimax with alpha-beta pruning, 4 plies deep
//
// The AI never touches Supabase or React. Pure logic.
// ============================================================

import {
  legalMoves,
  applyMove,
  opponentOf,
  ownsPit,
  OWN_ROW,
  WIN_THRESHOLD,
} from "./engine.js"

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─────────────────────────────────────────────────────────────
// Easy — random legal move
// ─────────────────────────────────────────────────────────────

export function chooseRandom(state, player) {
  if (state.turn !== player) return null
  const moves = legalMoves(state)
  if (moves.length === 0) return null
  return pickRandom(moves)
}

// ─────────────────────────────────────────────────────────────
// Medium — one-ply greedy: maximize immediate capture
// ─────────────────────────────────────────────────────────────

export function chooseGreedy(state, player) {
  if (state.turn !== player) return null
  const moves = legalMoves(state)
  if (moves.length === 0) return null

  let best = moves[0]
  let bestCapture = -1
  for (const pit of moves) {
    const next = applyMove(state, pit)
    const captured = next.captures[player] - state.captures[player]
    if (captured > bestCapture) {
      bestCapture = captured
      best = pit
    }
  }
  return best
}

// ─────────────────────────────────────────────────────────────
// Hard — minimax with alpha-beta pruning
// ─────────────────────────────────────────────────────────────

export function chooseMinimax(state, player, depth = 4) {
  if (state.turn !== player) return null
  const moves = legalMoves(state)
  if (moves.length === 0) return null

  // Shuffle moves for variety when scores tie
  const shuffled = [...moves].sort(() => Math.random() - 0.5)

  let bestMove = shuffled[0]
  let bestScore = -Infinity

  for (const pit of shuffled) {
    const next = applyMove(state, pit)
    const score = minimax(next, depth - 1, -Infinity, Infinity, player)
    if (score > bestScore) {
      bestScore = score
      bestMove = pit
    }
  }
  return bestMove
}

function minimax(state, depth, alpha, beta, rootPlayer) {
  if (state.finished || depth === 0) {
    return evaluate(state, rootPlayer)
  }

  const currentPlayer = state.turn
  const moves = legalMoves(state)
  if (moves.length === 0) {
    return evaluate(state, rootPlayer)
  }

  const maximizing = currentPlayer === rootPlayer

  if (maximizing) {
    let best = -Infinity
    for (const pit of moves) {
      const next = applyMove(state, pit)
      const score = minimax(next, depth - 1, alpha, beta, rootPlayer)
      if (score > best) best = score
      if (best > alpha) alpha = best
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const pit of moves) {
      const next = applyMove(state, pit)
      const score = minimax(next, depth - 1, alpha, beta, rootPlayer)
      if (score < best) best = score
      if (best < beta) beta = best
      if (beta <= alpha) break
    }
    return best
  }
}

// ─────────────────────────────────────────────────────────────
// Evaluation
//
// Captures are everything in Oware — a difference of one seed is huge.
// Secondary: seeds on the opponent's row in a "capturable" position
// (2 or 3 seeds) represent latent points for us.
// ─────────────────────────────────────────────────────────────

function evaluate(state, player) {
  const opp = opponentOf(player)

  if (state.finished) {
    if (state.winner === player) return 100000
    if (state.winner === opp) return -100000
    return 0
  }

  const captureDiff = state.captures[player] - state.captures[opp]
  if (captureDiff >= WIN_THRESHOLD - state.captures[opp]) return 50000
  if (captureDiff <= -(WIN_THRESHOLD - state.captures[player])) return -50000

  // Small positional bonus: 2 or 3 seeds on the opponent's row are
  // "primed" — one wrong sowing move and we capture them
  let primed = 0
  for (const pit of OWN_ROW[opp]) {
    const n = state.board[pit]
    if (n === 2 || n === 3) primed += 1
  }

  // Slight preference for having seeds alive on our own row
  const myRow = rowCount(state.board, player)
  const oppRow = rowCount(state.board, opp)

  return captureDiff * 100 + primed * 2 + (myRow - oppRow) * 0.5
}

function rowCount(boardArr, player) {
  return OWN_ROW[player].reduce((sum, i) => sum + boardArr[i], 0)
}

// ─────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────

export function chooseMove(state, player, difficulty = "medium") {
  if (state.turn !== player) return null
  switch (difficulty) {
    case "easy":
      return chooseRandom(state, player)
    case "medium":
      return chooseGreedy(state, player)
    case "hard":
      return chooseMinimax(state, player, 4)
    default:
      return chooseGreedy(state, player)
  }
}

// Simulated "thinking time" — makes the AI feel natural
export function thinkingDelay(difficulty) {
  if (difficulty === "easy") return 400 + Math.random() * 300
  if (difficulty === "medium") return 600 + Math.random() * 400
  return 800 + Math.random() * 600
}
