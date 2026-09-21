import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, Plus, Swords, Users, ChevronRight, Clock } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import {
  createAyoMatch,
  listMyMatches,
  listOpenChallenges,
} from "../../services/games/matchService"

function initials(name = "M") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()
}

export default function AyoLobby() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [myMatches, setMyMatches] = useState([])
  const [challenges, setChallenges] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [mine, open] = await Promise.all([
          listMyMatches(user.id),
          listOpenChallenges(user.id),
        ])
        if (cancelled) return
        setMyMatches(mine)
        setChallenges(open)
      } catch (e) {
        console.error("Ayo lobby load failed:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  const handleNewGame = async () => {
    if (!user || creating) return
    setCreating(true)
    try {
      const match = await createAyoMatch(user.id)
      const url = window.location.origin + "/games/ayo/" + match.id

      // Best-effort: copy the invite link immediately
      let copied = false
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url)
          copied = true
        }
      } catch {}
      if (!copied) {
        try {
          const ta = document.createElement("textarea")
          ta.value = url
          ta.style.position = "fixed"
          ta.style.opacity = "0"
          document.body.appendChild(ta)
          ta.focus()
          ta.select()
          document.execCommand("copy")
          document.body.removeChild(ta)
          copied = true
        } catch {}
      }

      navigate("/games/ayo/" + match.id, {
        state: { justCreated: true, inviteUrl: url, copied },
      })
    } catch (e) {
      console.error("Create match failed:", e)
      setError(e.message || "Could not create match")
      setCreating(false)
    }
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
          <Swords size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight text-[#202635]">Ayo</h1>
          <p className="text-xs text-black/50">The Yoruba seed game</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleNewGame}
        disabled={creating}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#202635] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-black disabled:opacity-60"
      >
        {creating ? (
          <><Loader2 size={16} className="animate-spin" /> Creating match…</>
        ) : (
          <><Plus size={16} /> Start a new game</>
        )}
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* My active matches */}
          {myMatches.length > 0 && (
            <section className="mb-5">
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-black/45">
                Your games
              </h2>
              <div className="space-y-2">
                {myMatches.map((m) => {
                  const isWaiting = m.status === "waiting"
                  const isMyTurn = m.current_turn === user.id && m.status === "active"
                  return (
                    <Link
                      key={m.id}
                      to={`/games/ayo/${m.id}`}
                      className={
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition " +
                        (isMyTurn
                          ? "border-[#3B82F6]/40 bg-[#EFF6FF] hover:bg-[#DBEAFE]"
                          : "border-black/10 bg-white hover:bg-black/5")
                      }
                    >
                      <div
                        className={
                          "flex h-10 w-10 items-center justify-center rounded-xl text-lg " +
                          (isMyTurn ? "bg-[#3B82F6] text-white" : "bg-[#FEF3C7] text-[#D97706]")
                        }
                      >
                        {isWaiting ? <Clock size={18} /> : "🌰"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#202635]">
                          {isWaiting ? "Waiting for opponent" : isMyTurn ? "Your turn" : "Opponent's turn"}
                        </p>
                        <p className="truncate text-xs text-black/45">
                          {m.state?.moveCount || 0} moves played
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-black/30" />
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Open challenges */}
          {challenges.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-black/45">
                Open challenges
              </h2>
              <div className="space-y-2">
                {challenges.map((m) => {
                  const creator = m.creator || (m.players && m.players[0])
                  const creatorName = typeof creator === "string" ? "Family member" : (creator?.full_name || creator?.username || "Family member")
                  return (
                    <Link
                      key={m.id}
                      to={`/games/ayo/${m.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 transition hover:bg-black/5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F1E7CC] text-xs font-bold text-[#A8873F]">
                        {typeof creator === "object" && creator?.avatar_url ? (
                          <img src={creator.avatar_url} alt={creatorName} className="h-full w-full object-cover" />
                        ) : (
                          initials(creatorName)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#202635]">{creatorName}</p>
                        <p className="truncate text-xs text-black/45">invites you to play Ayo</p>
                      </div>
                      <span className="rounded-full bg-[#FBBF24] px-3 py-1 text-[11px] font-bold text-[#78350F]">
                        Join
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {myMatches.length === 0 && challenges.length === 0 && (
            <div className="rounded-2xl border border-black/10 bg-white px-5 py-10 text-center">
              <Users size={28} className="mx-auto mb-2 text-black/20" />
              <p className="text-sm font-semibold text-black/60">No games yet</p>
              <p className="mt-1 text-xs text-black/45">
                Start a new game — you'll get a link to share with your opponent.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
