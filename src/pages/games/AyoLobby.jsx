import { Link } from "react-router-dom"
import { ArrowLeft, Construction } from "lucide-react"

export default function AyoLobby() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-24 pt-4">
      <Link
        to="/games"
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/70 transition hover:bg-black/5"
      >
        <ArrowLeft size={16} /> Back to games
      </Link>
      <div className="rounded-3xl border border-black/10 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
          <Construction size={28} />
        </div>
        <h1 className="text-2xl font-black text-[#202635]">Ayo is being built</h1>
        <p className="mt-2 text-sm text-black/55">
          The board, the rules engine, and the leaderboard integration are landing next.
          Come back in a bit.
        </p>
      </div>
    </div>
  )
}
