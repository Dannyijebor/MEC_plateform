import { useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, User, Cpu } from "lucide-react"
import AyoBoard from "../../components/games/AyoBoard"
import {
  createInitialState,
  applyMove,
  legalMoves,
} from "../../games/ayo/engine"

export default function AyoLobby() {
  const [state, setState] = useState(() => createInitialState())
  const [lastError, setLastError] = useState("")

  const handleMove = useCallback((pit) => {
    setState((current) => {
      const legal = legalMoves(current)
      if (!legal.includes(pit)) {
        setLastError("Illegal move")
        setTimeout(() => setLastError(""), 1200)
        return current
      }
      return applyMove(current, pit)
    })
  }, [])

  const handleRematch = () => {
    setState(createInitialState())
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
      <Link
        to="/games"
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/70 transition hover:bg-black/5"
      >
        <ArrowLeft size={16} /> Back to games
      </Link>

      <div className="mb-5 flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
          <User size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight text-[#202635]">Ayo</h1>
          <p className="text-xs text-black/50">Practice against a friend — pass and play</p>
        </div>
      </div>

      <AyoBoard
        state={state}
        playerRole={state.turn === "B" ? "B" : "A"}
        onMove={handleMove}
        onRematch={state.finished ? handleRematch : null}
        myName={state.turn === "B" ? "Player B" : "Player A"}
        opponentName={state.turn === "B" ? "Player A" : "Player B"}
        autoRotate={true}
      />

      {lastError && (
        <p className="mt-3 text-center text-xs font-semibold text-red-500">{lastError}</p>
      )}

      <p className="mt-6 text-center text-[11px] text-black/40">
        Two-player pass-and-play preview. Multiplayer matches coming next.
      </p>
    </div>
  )
}
