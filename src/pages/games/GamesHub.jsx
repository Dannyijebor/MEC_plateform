import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Trophy, Users, Zap, Loader2, Swords, Crown } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"
import { GAMES } from "../../games/registry"

function initials(name = "M") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()
}

function GamesHub() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState([])
  const [activeMatches, setActiveMatches] = useState([])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)

      const { data: stats } = await supabase
        .from("family_stats")
        .select("user_id, games_played, games_won, win_streak, best_streak, total_points, profiles:user_id ( full_name, username, avatar_url )")
        .order("total_points", { ascending: false })
        .limit(10)

      const { data: matches } = await supabase
        .from("game_matches")
        .select("*")
        .contains("players", [user.id])
        .in("status", ["waiting", "active"])
        .order("updated_at", { ascending: false })
        .limit(5)

      if (cancelled) return
      setLeaderboard(stats || [])
      setActiveMatches(matches || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [user])

  const sortedLeaderboard = useMemo(
    () => [...leaderboard].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)),
    [leaderboard],
  )

  if (!user) return null

  return (
    <div className="mx-auto w-full max-w-6xl pb-24 pt-4">
      <div className="mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
            <Swords size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#202635]">Family Games</h1>
            <p className="text-sm text-black/50">Play with the clan. Climb the leaderboard.</p>
          </div>
        </div>
      </div>

      {activeMatches.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-black/45">
            Your active games
          </h2>
          <div className="space-y-2">
            {activeMatches.map((m) => (
              <Link
                key={m.id}
                to={"/games/" + m.game_id + "/" + m.id}
                className="flex items-center gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 transition hover:bg-[#FEF3C7]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCD34D] text-lg">
                  {(GAMES.find((g) => g.id === m.game_id) || {}).icon || "🎮"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#78350F]">
                    {(GAMES.find((g) => g.id === m.game_id) || {}).name || m.game_id}
                  </p>
                  <p className="truncate text-xs text-[#92400E]">
                    {m.status === "waiting" ? "Waiting for opponent" : "In progress"}
                  </p>
                </div>
                <div className="flex h-8 items-center rounded-full bg-[#FBBF24] px-3 text-xs font-bold text-[#78350F]">
                  Play
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-black/45">
          All games
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {GAMES.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <GameCard game={g} />
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-black/45">
          <Trophy size={14} /> Family leaderboard
        </h2>
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin text-gray-400" />
            </div>
          ) : sortedLeaderboard.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-black/45">No matches yet. Be the first to play.</p>
            </div>
          ) : (
            <ul>
              {sortedLeaderboard.map((row, idx) => {
                const name = (row.profiles || {}).full_name || (row.profiles || {}).username || "MEC Member"
                const isMe = row.user_id === user.id
                return (
                  <li
                    key={row.user_id}
                    className={"flex items-center gap-3 border-b border-black/5 px-4 py-3 last:border-b-0 " + (isMe ? "bg-[#EFF6FF]" : "")}
                  >
                    <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold " + (idx === 0 ? "bg-[#FCD34D] text-[#78350F]" : idx === 1 ? "bg-[#E5E7EB] text-[#374151]" : idx === 2 ? "bg-[#FED7AA] text-[#9A3412]" : "bg-black/5 text-black/50")}>
                      {idx === 0 ? <Crown size={14} /> : idx + 1}
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-[#F1E7CC] text-xs font-bold text-[#A8873F]">
                      {(row.profiles || {}).avatar_url ? (
                        <img src={row.profiles.avatar_url} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        initials(name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#202635]">
                        {name}
                        {isMe && <span className="ml-2 text-xs text-[#3B82F6]">you</span>}
                      </p>
                      <p className="truncate text-xs text-black/45">
                        {row.games_won} wins · {row.games_played} games
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#202635]">{row.total_points}</p>
                      <p className="text-[10px] uppercase tracking-wide text-black/40">points</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function GameCard({ game }) {
  const disabled = !game.isActive
  return (
    <div className={"relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition " + (disabled ? "border-black/5 opacity-60" : "border-black/10 hover:shadow-md")}>
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ backgroundColor: game.accent + "22" }}
        >
          {game.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#202635]">{game.name}</h3>
            {disabled && (
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black/50">
                Soon
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-black/50">{game.tagline}</p>
          <p className="mt-2 line-clamp-2 text-sm text-black/60">{game.description}</p>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-black/45">
            <span className="flex items-center gap-1">
              <Users size={12} /> {game.minPlayers}–{game.maxPlayers} players
            </span>
            <span className="flex items-center gap-1">
              <Zap size={12} /> {game.mode}
            </span>
          </div>
        </div>
      </div>

      {disabled ? (
        <div className="mt-4 w-full rounded-xl bg-black/5 py-2.5 text-center text-sm font-semibold text-black/40">
          Coming soon
        </div>
      ) : (
        <Link
          to={game.route}
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#202635] py-2.5 text-sm font-semibold text-white transition hover:bg-black"
        >
          Play {game.name}
        </Link>
      )}
    </div>
  )
}

export default GamesHub
