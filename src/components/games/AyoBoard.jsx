import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Crown, Trophy, RotateCcw } from "lucide-react"

// ─────────────────────────────────────────────────────────────
// AyoBoard
//
// Props:
//   state        — { board, captures, turn, finished, winner, lastMove, moveCount }
//   playerRole   — "A" or "B" — which player is the local user
//   onMove(pit)  — called when user taps a legal pit
//   onRematch    — optional; shows "Rematch" on game end if provided
//   myName       — display name for player A (or local player)
//   opponentName — display name for the other player
//
// Visual layout:
//   Top row (pits 6-11, right to left) — opponent's row
//   Bottom row (pits 0-5, left to right) — local player's row
// ─────────────────────────────────────────────────────────────

function seedPositions(count, radius, maxRadius) {
  // Return an array of small offsets inside the pit for each seed
  if (count === 0) return []
  if (count === 1) return [[0, 0]]
  const positions = []
  const rings = [
    { n: Math.min(count, 6), r: radius * 0.5 },
    { n: Math.max(0, Math.min(count - 6, 10)), r: radius * 0.82 },
  ]
  let placed = 0
  for (const ring of rings) {
    const n = ring.n
    const offset = Math.PI / n
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + offset
      positions.push([Math.cos(angle) * ring.r, Math.sin(angle) * ring.r])
      placed++
    }
  }
  // If more than 16 seeds, stack extras in the center with slight jitter
  while (placed < count) {
    positions.push([(Math.random() - 0.5) * radius * 0.3, (Math.random() - 0.5) * radius * 0.3])
    placed++
  }
  return positions
}

// ─────────────────────────────────────────────────────────────
// useSowAnimation
//
// Watches state.moveCount. When it changes, animates the sowing
// process one seed at a time before showing the final (captured)
// board.
// ─────────────────────────────────────────────────────────────
function useSowAnimation(state) {
  const [displayBoard, setDisplayBoard] = useState(() => state.board)
  const [isAnimating, setIsAnimating] = useState(false)
  const [activePit, setActivePit] = useState(null)
  const lastMoveCountRef = useRef(null)
  const timersRef = useRef([])

  useEffect(() => {
    const moveCount = state.moveCount ?? 0

    // First render — sync without animation
    if (lastMoveCountRef.current === null) {
      lastMoveCountRef.current = moveCount
      setDisplayBoard(state.board)
      return
    }

    // No new move
    if (moveCount === lastMoveCountRef.current) return
    lastMoveCountRef.current = moveCount

    // Clear pending timers from any earlier animation
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []

    const move = state.lastMove
    if (!move || !move.path || move.path.length === 0) {
      setDisplayBoard(state.board)
      setIsAnimating(false)
      setActivePit(null)
      return
    }

    setIsAnimating(true)

    const pathLen = move.path.length
    // Adaptive speed: short moves feel natural, long moves stay snappy
    const frameDelay = Math.max(160, Math.min(320, 2400 / (pathLen + 1)))

    // Frame 0 — pick up seeds (source pit empties)
    const t0 = setTimeout(() => {
      setDisplayBoard((prev) => {
        const next = prev.slice()
        next[move.pitIndex] = 0
        return next
      })
      setActivePit(move.pitIndex)
    }, 0)
    timersRef.current.push(t0)

    // Frames 1..N — sow one seed at a time
    move.path.forEach((pit, i) => {
      const t = setTimeout(() => {
        setDisplayBoard((prev) => {
          const next = prev.slice()
          next[pit] = (next[pit] || 0) + 1
          return next
        })
        setActivePit(pit)
      }, (i + 1) * frameDelay)
      timersRef.current.push(t)
    })

    // Final frame — apply captures and show final board
    const finalDelay = (pathLen + 1) * frameDelay + 500
    const tFinal = setTimeout(() => {
      setDisplayBoard(state.board)
      setActivePit(null)
      setIsAnimating(false)
    }, finalDelay)
    timersRef.current.push(tFinal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveCount])

  // Cleanup
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t))
    }
  }, [])

  return { displayBoard, isAnimating, activePit }
}

function Pit({
  index,
  count,
  isOwn,
  isLegal,
  isLastSource,
  isCaptured,
  isSelected,
  isReceiving,
  onTap,
  rotation,
}) {
  const size = 92
  const radius = size / 2 - 6

  const seeds = useMemo(
    () => seedPositions(count, radius, 6),
    [count, radius],
  )

  const baseColor = isOwn ? "#FFFBEB" : "#F3F4F6"
  const borderColor = isOwn ? "#FCD34D" : "#D1D5DB"
  const bgColor = isLastSource ? "#FEF3C7" : baseColor

  return (
    <button
      type="button"
      disabled={!isLegal}
      onClick={onTap}
      className={
        "relative flex items-center justify-center rounded-full transition-all " +
        (isLegal ? "cursor-pointer " : "cursor-not-allowed ") +
        (isSelected ? "ring-4 ring-[#3B82F6] " : "")
      }
      style={{
        width: size,
        height: size,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        boxShadow: isLegal
          ? "0 4px 14px rgba(217, 119, 6, 0.25), inset 0 2px 4px rgba(0,0,0,0.06)"
          : "inset 0 2px 4px rgba(0,0,0,0.08)",
      }}
      aria-label={`Pit ${index}, ${count} seeds`}
    >
      {/* Seeds */}
      <svg
        width={size}
        height={size}
        viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
        className="absolute inset-0"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {seeds.map(([x, y], i) => (
          <motion.circle
            key={`${index}-${i}-${count}`}
            cx={x}
            cy={y}
            r={4.5}
            fill="#92400E"
            stroke="#78350F"
            strokeWidth={0.6}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              delay: isCaptured ? i * 0.03 : i * 0.02,
              duration: 0.25,
              ease: "easeOut",
            }}
          />
        ))}
      </svg>

      {/* Seed count badge — shown when count is high */}
      {count > 0 && (
        <span
          className="pointer-events-none absolute bottom-1 right-2 text-[10px] font-bold"
          style={{ color: isOwn ? "#92400E" : "#6B7280" }}
        >
          {count}
        </span>
      )}

      {/* Legal-move pulse ring */}
      {isLegal && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(59, 130, 246, 0)",
              "0 0 0 6px rgba(59, 130, 246, 0.15)",
              "0 0 0 0 rgba(59, 130, 246, 0)",
            ],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Sowing highlight — the pit currently receiving a seed */}
      {isReceiving && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full bg-[#F59E0B]/25"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0.4], scale: [0.6, 1.05, 1] }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      )}
    </button>
  )
}

export default function AyoBoard({
  state,
  playerRole = "A",
  onMove,
  onRematch,
  myName = "You",
  opponentName = "Opponent",
  autoRotate = true,
}) {
  const { board, captures, turn, finished, winner, lastMove } = state
  const { displayBoard, isAnimating, activePit } = useSowAnimation(state)
  const opponentRole = playerRole === "A" ? "B" : "A"
  const myTurn = turn === playerRole && !finished

  // Local player's perspective: bottom row is always "mine"
  // If the local player is B, rotate the board so B's pits are on the bottom.
  const rotate = autoRotate && playerRole === "B"

  // Legal moves for the local player
  const legalMoves = useMemo(() => {
    if (!myTurn || isAnimating) return new Set()
    const ownPits = playerRole === "A" ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11]
    const set = new Set()
    for (const pit of ownPits) {
      if (board[pit] > 0) set.add(pit)
    }
    return set
  }, [board, myTurn, playerRole, isAnimating])

  // Show a brief "your turn" flash when it becomes yours
  const [showTurnFlash, setShowTurnFlash] = useState(false)
  const prevTurn = useRef(turn)
  useEffect(() => {
    if (prevTurn.current !== turn && turn === playerRole && !finished) {
      setShowTurnFlash(true)
      const t = setTimeout(() => setShowTurnFlash(false), 1400)
      return () => clearTimeout(t)
    }
    prevTurn.current = turn
  }, [turn, playerRole, finished])

  // Bottom row (indices for display)
  const bottomRow = rotate ? [11, 10, 9, 8, 7, 6] : [0, 1, 2, 3, 4, 5]
  const topRow = rotate ? [5, 4, 3, 2, 1, 0] : [6, 7, 8, 9, 10, 11]

  const myCaptures = captures[playerRole]
  const oppCaptures = captures[opponentRole]

  return (
    <div className="mx-auto w-full max-w-2xl select-none">
      {/* Score header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <ScoreCard
          name={opponentName}
          score={oppCaptures}
          active={turn === opponentRole && !finished}
          isWinner={finished && winner === opponentRole}
          side="left"
        />
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
            Captured
          </span>
          <div className="h-px w-8 bg-black/15" />
        </div>
        <ScoreCard
          name={myName}
          score={myCaptures}
          active={turn === playerRole && !finished}
          isWinner={finished && winner === playerRole}
          side="right"
        />
      </div>

      {/* Board */}
      <div
        className="relative rounded-3xl border border-[#D97706]/30 p-4 shadow-sm sm:p-6"
        style={{
          background:
            "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)",
        }}
      >
        {/* Top row — opponent */}
        <div className="mb-3 flex justify-between gap-2 sm:gap-3">
          {topRow.map((pit) => (
            <Pit
              key={pit}
              index={pit}
              count={displayBoard[pit]}
              isOwn={false}
              isLegal={legalMoves.has(pit)}
              isReceiving={activePit === pit}
              isLastSource={lastMove && lastMove.pitIndex === pit}
              isCaptured={lastMove && lastMove.capturedIndices?.includes(pit)}
              onTap={() => onMove?.(pit)}
              rotation={rotate ? 180 : 0}
            />
          ))}
        </div>

        {/* Middle divider */}
        <div className="my-2 flex items-center justify-center">
          <div className="h-1 w-24 rounded-full bg-[#D97706]/30" />
        </div>

        {/* Bottom row — local player */}
        <div className="mt-3 flex justify-between gap-2 sm:gap-3">
          {bottomRow.map((pit) => (
            <Pit
              key={pit}
              index={pit}
              count={displayBoard[pit]}
              isOwn={true}
              isLegal={legalMoves.has(pit)}
              isReceiving={activePit === pit}
              isLastSource={lastMove && lastMove.pitIndex === pit}
              isCaptured={lastMove && lastMove.capturedIndices?.includes(pit)}
              onTap={() => onMove?.(pit)}
              rotation={0}
            />
          ))}
        </div>
      </div>

      {/* Status row */}
      <div className="mt-4 flex items-center justify-between px-1 text-sm">
        <span className="text-black/50">
          {state.moveCount} moves
        </span>
        <span
          className={
            "font-semibold " +
            (finished ? "text-black/60" : myTurn ? "text-[#3B82F6]" : "text-black/50")
          }
        >
          {isAnimating
            ? "Sowing seeds…"
            : finished
              ? winner === playerRole
                ? "You won"
                : winner === opponentRole
                  ? "You lost"
                  : "Draw"
              : myTurn
                ? "Your turn"
                : opponentName + "'s turn"}
        </span>
      </div>

      {/* "Your turn" flash */}
      <AnimatePresence>
        {showTurnFlash && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-[#3B82F6] px-5 py-2 text-sm font-semibold text-white shadow-lg"
          >
            Your turn
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory overlay */}
      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-2xl border border-black/10 bg-white p-5 text-center shadow-sm"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706]">
              {winner === playerRole ? (
                <Crown size={26} />
              ) : winner === opponentRole ? (
                <Trophy size={26} />
              ) : (
                <Trophy size={26} />
              )}
            </div>
            <h2 className="text-lg font-bold text-[#202635]">
              {winner === playerRole
                ? "You win!"
                : winner === opponentRole
                  ? opponentName + " wins"
                  : "It's a draw"}
            </h2>
            <p className="mt-1 text-sm text-black/55">
              {myCaptures} – {oppCaptures}
            </p>
            {onRematch && (
              <button
                type="button"
                onClick={onRematch}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#202635] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
              >
                <RotateCcw size={15} /> Rematch
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ScoreCard({ name, score, active, isWinner, side }) {
  return (
    <div
      className={
        "flex-1 rounded-2xl border px-3 py-2.5 transition " +
        (active
          ? "border-[#3B82F6]/40 bg-[#EFF6FF]"
          : isWinner
            ? "border-[#D97706]/40 bg-[#FEF3C7]"
            : "border-black/10 bg-white")
      }
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-xs font-semibold text-black/60">{name}</span>
        {isWinner && <Crown size={12} className="text-[#D97706]" />}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-xl font-black text-[#202635]">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-black/40">seeds</span>
      </div>
    </div>
  )
}
