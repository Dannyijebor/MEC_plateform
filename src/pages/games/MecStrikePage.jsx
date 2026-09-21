import { useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import MecStrike from "../../components/games/MecStrike"

export default function MecStrikePage() {
  useEffect(() => {
    document.body.classList.add("game-fullscreen")
    return () => document.body.classList.remove("game-fullscreen")
  }, [])

  return (
    <div className="mx-auto w-full max-w-2xl px-2 pb-4 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <Link
          to="/games"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#050912] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/5"
        >
          <ArrowLeft size={14} /> Games
        </Link>
        <div className="rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-1.5 text-[11px] font-bold text-[#38BDF8]">
          MEC Strike · 3D
        </div>
      </div>

      <MecStrike />
    </div>
  )
}
