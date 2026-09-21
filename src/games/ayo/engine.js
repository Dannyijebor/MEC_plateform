// ============================================================
// AYO (Oware) ENGINE
// Pure logic — no React, no Supabase. Just rules.
//
// Board layout (12 pits, counter-clockwise):
//
//   Player B owns pits 6-11 (top row, left→right visually)
//   Player A owns pits 0-5  (bottom row, left→right visually)
//
//   Sowing goes 0 → 1 → ... → 11 → 0 (skipping the source pit)
//
// Rules implemented (standard Oware):
//   1. 4 seeds per pit at start.
//   2. On your turn, pick a non-empty pit in your row.
//   3. Pick up all seeds, sow one into each subsequent pit.
//   4. Skip the source pit if you loop past it.
//   5. If the last seed lands in opponent's pit with 2-3 seeds,
//      capture it. Chain backward through the sowing path while
//      the previous pit is also opponent's with 2-3 seeds.
//   6. Cannot capture in a way that leaves opponent with 0 seeds.
//      If no other move is available, capture is voided.
//   7. First player to capture 25 seeds wins immediately.
//   8. If a player cannot move, game ends and the other player
//      captures all seeds remaining in their own row.
// ============================================================

export const PITS = 12
export const SEEDS_PER_PIT = 4
export const TOTAL_SEEDS = PITS * SEEDS_PER_PIT
export const WIN_THRESHOLD = 25

export const OWN_ROW = {
  A: [0, 1, 2, 3, 4, 5],
  B: [6, 7, 8, 9, 10, 11],
}

export function opponentOf(player) {
  return player === "A" ? "B" : "A"
}

export function ownsPit(player, pitIndex) {
  return OWN_ROW[player].includes(pitIndex)
}

export function createInitialState() {
  return {
    board: Array(PITS).fill(SEEDS_PER_PIT),
    captures: { A: 0, B: 0 },
    turn: "A",
    finished: false,
    winner: null,
    lastMove: null,
    moveCount: 0,
  }
}

export function totalSeeds(board) {
  return board.reduce((a, b) => a + b, 0)
}

export function rowCount(board, player) {
  return OWN_ROW[player].reduce((sum, i) => sum + board[i], 0)
}

// ------------------------------------------------------------
// Sowing
// ------------------------------------------------------------
export function sowingPath(source, seeds) {
  const path = []
  let pos = source
  for (let s = 0; s < seeds; s++) {
    pos = (pos + 1) % PITS
    if (pos === source) {
      pos = (pos + 1) % PITS
    }
    path.push(pos)
  }
  return path
}

export function simulateSow(board, source) {
  const seeds = board[source]
  if (seeds === 0) return null
  const newBoard = board.slice()
  newBoard[source] = 0
  const path = sowingPath(source, seeds)
  for (const pit of path) {
    newBoard[pit] += 1
  }
  return { newBoard, path, lastPit: path[path.length - 1] }
}

// ------------------------------------------------------------
// Capture
// ------------------------------------------------------------
export function detectCapture(board, path, currentPlayer) {
  const opponent = opponentOf(currentPlayer)
  const captured = []

  for (let k = path.length - 1; k >= 0; k--) {
    const pit = path[k]
    if (!ownsPit(opponent, pit)) break
    const seeds = board[pit]
    if (seeds < 2 || seeds > 3) break
    captured.push(pit)
  }

  return captured.reverse()
}

// ------------------------------------------------------------
// Move analysis
// ------------------------------------------------------------
export function moveInfo(state, pitIndex) {
  const { board, turn } = state
  if (!ownsPit(turn, pitIndex)) return null
  if (board[pitIndex] === 0) return null

  const opponent = opponentOf(turn)
  const sowResult = simulateSow(board, pitIndex)
  if (!sowResult) return null

  const rawCaptured = detectCapture(sowResult.newBoard, sowResult.path, turn)
  const rawCapturedCount = rawCaptured.reduce((sum, i) => sum + sowResult.newBoard[i], 0)

  const opponentSeedsAfterSow = rowCount(sowResult.newBoard, opponent)
  const opponentSeedsAfterCapture = opponentSeedsAfterSow - rawCapturedCount
  const suppressCapture =
    rawCaptured.length > 0 &&
    opponentSeedsAfterSow > 0 &&
    opponentSeedsAfterCapture === 0

  return {
    pitIndex,
    newBoard: sowResult.newBoard,
    path: sowResult.path,
    lastPit: sowResult.lastPit,
    capturedIndices: suppressCapture ? [] : rawCaptured,
    capturedCount: suppressCapture ? 0 : rawCapturedCount,
    suppressCapture,
  }
}

export function legalMoves(state) {
  if (state.finished) return []
  const { board, turn } = state
  const safe = []
  const fallback = []

  for (const pit of OWN_ROW[turn]) {
    if (board[pit] === 0) continue
    const info = moveInfo(state, pit)
    if (!info) continue
    if (info.suppressCapture) {
      fallback.push(pit)
    } else {
      safe.push(pit)
    }
  }

  return safe.length > 0 ? safe : fallback
}

// ------------------------------------------------------------
// Apply a move
// ------------------------------------------------------------
export function applyMove(state, pitIndex) {
  if (state.finished) return state

  const info = moveInfo(state, pitIndex)
  if (!info) return state

  const { turn } = state
  const opponent = opponentOf(turn)

  const newBoard = info.newBoard.slice()
  let capturedCount = 0
  for (const pit of info.capturedIndices) {
    capturedCount += newBoard[pit]
    newBoard[pit] = 0
  }

  const newCaptures = { ...state.captures }
  newCaptures[turn] += capturedCount

  const nextState = {
    board: newBoard,
    captures: newCaptures,
    turn: opponent,
    finished: false,
    winner: null,
    lastMove: {
      pitIndex,
      path: info.path,
      capturedIndices: info.capturedIndices,
      capturedCount,
      suppressCapture: info.suppressCapture,
    },
    moveCount: state.moveCount + 1,
  }

  // Premature win: someone crossed 25 seeds
  if (newCaptures[turn] >= WIN_THRESHOLD) {
    return { ...nextState, finished: true, winner: turn }
  }

  // Opponent cannot move → they forfeit remaining seeds
  if (rowCount(newBoard, opponent) === 0) {
    const remaining = rowCount(newBoard, turn)
    const finalBoard = newBoard.slice()
    for (const pit of OWN_ROW[turn]) finalBoard[pit] = 0
    const finalCaptures = { ...newCaptures }
    finalCaptures[turn] += remaining

    const winner =
      finalCaptures.A > finalCaptures.B ? "A" :
      finalCaptures.B > finalCaptures.A ? "B" : null

    return {
      board: finalBoard,
      captures: finalCaptures,
      turn: opponent,
      finished: true,
      winner,
      lastMove: nextState.lastMove,
      moveCount: nextState.moveCount,
    }
  }

  return nextState
}

// ------------------------------------------------------------
// Summary for UI
// ------------------------------------------------------------
export function gameSummary(state) {
  return {
    finished: state.finished,
    winner: state.winner,
    turn: state.turn,
    captures: state.captures,
    total: state.captures.A + state.captures.B,
    moveCount: state.moveCount,
  }
}

export function pitOwner(pitIndex) {
  return pitIndex < 6 ? "A" : "B"
}
