import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import NeonWaves from "../../components/games/NeonWaves"

export default function NeonWavesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          to="/games"
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/5"
        >
          <ArrowLeft size={14} /> Games
        </Link>
        <div className="rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-1.5 text-[11px] font-bold text-[#0284C7]">
          Neon Waves
        </div>
      </div>

      <NeonWaves />
    </div>
  )
}
