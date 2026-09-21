import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Cpu, RotateCcw, Loader2, Brain } from "lucide-react"
import AyoBoard from "../../components/games/AyoBoard"
import { createInitialState, applyMove, legalMoves } from "../../games/ayo/engine"
import { chooseMove, thinkingDelay } from "../../games/ayo/ai"

const DIFF_LABEL = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
}

export default function AyoPractice() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const difficulty = ["easy", "medium", "hard"].includes(params.get("d"))
    ? params.get("d")
    : "medium"

  const [state, setState] = useState(() => createInitialState())
  const [aiThinking, setAiThinking] = useState(false)
  const [error, setError] = useState("")

  const myRole = "A"
  const aiRole = "B"
  const myTurn = state.turn === myRole && !state.finished

  // ── AI move scheduler ──────────────────────────────
  useEffect(() => {
    if (state.finished) return
    if (state.turn !== aiRole) return

    setAiThinking(true)
    const delay = thinkingDelay(difficulty)
    const t = setTimeout(() => {
      try {
        const pit = chooseMove(state, aiRole, difficulty)
        if (pit != null) {
          setState((current) => {
            // Guard: state might have changed
            if (current.turn !== aiRole || current.finished) return current
            return applyMove(current, pit)
          })
        }
      } catch (e) {
        console.error("AI move failed:", e)
      } finally {
        setAiThinking(false)
      }
    }, delay)

    return () => {
      clearTimeout(t)
      setAiThinking(false)
    }
  }, [state, difficulty])

  // ── Handle user move ───────────────────────────────
  const handleMove = (pit) => {
    if (!myTurn || aiThinking) return
    const legal = legalMoves(state)
    if (!legal.includes(pit)) {
      setError("Illegal move")
      setTimeout(() => setError(""), 1200)
      return
    }
    setState(applyMove(state, pit))
  }

  const handleRematch = () => {
    setState(createInitialState())
    setAiThinking(false)
  }

  const handleChangeDifficulty = () => {
    navigate("/games/ayo")
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          to="/games/ayo"
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/5"
        >
          <ArrowLeft size={14} /> Ayo
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-[#D97706]/30 bg-[#FEF3C7] px-3 py-1.5 text-[11px] font-bold text-[#78350F]">
          <Brain size={12} />
          Practice · {DIFF_LABEL[difficulty]}
        </div>
      </div>

      <AyoBoard
        state={state}
        playerRole={myRole}
        onMove={handleMove}
        onRematch={state.finished ? handleRematch : null}
        myName="You"
        opponentName={aiThinking ? "Computer is thinking…" : "Computer"}
        autoRotate={false}
      />

      {error && (
        <p className="mt-3 text-center text-xs font-semibold text-red-500">{error}</p>
      )}

      {aiThinking && !state.finished && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-black/50">
          <Loader2 size={12} className="animate-spin" /> Computer is thinking…
        </p>
      )}

      <div className="mt-5 flex justify-center gap-2">
        <button
          type="button"
          onClick={handleChangeDifficulty}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/70 transition hover:bg-black/5"
        >
          Change difficulty
        </button>
        <button
          type="button"
          onClick={handleRematch}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/70 transition hover:bg-black/5"
        >
          <RotateCcw size={12} /> New game
        </button>
      </div>

      <p className="mt-5 text-center text-[11px] text-black/40">
        Practice games don't affect your family leaderboard.
      </p>
    </div>
  )
}
