import { useEffect, useState, useCallback, useRef } from "react"
import { Link, useParams, useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, Loader2, Share2, Check, Clock, AlertCircle, Copy, MessageCircle } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import AyoBoard from "../../components/games/AyoBoard"
import {
  getMatch,
  joinAyoMatch,
  submitMove,
  finishMatch,
  subscribeToMatch,
} from "../../services/games/matchService"
import {
  applyMove,
  legalMoves,
} from "../../games/ayo/engine"

export default function MatchRoom() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const location = useLocation()
  const justCreatedState = location.state || {}

  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const finishHandledRef = useRef(false)

  // If we arrived here right after creating the match, flash "copied"
  useEffect(() => {
    if (justCreatedState.copied) {
      setCopied(true)
      const t = setTimeout(() => setCopied(false), 3500)
      return () => clearTimeout(t)
    }
  }, [justCreatedState.copied])

  // ── Load + subscribe ────────────────────────────────────
  useEffect(() => {
    if (!matchId || !user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const m = await getMatch(matchId)
        if (cancelled) return
        setMatch(m)
      } catch (e) {
        console.error("Match load failed:", e)
        setError("Match not found")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    const unsub = subscribeToMatch(matchId, (updated) => {
      setMatch((current) => {
        // Only accept updates newer than what we have
        if (current && current.updated_at && updated.updated_at && current.updated_at >= updated.updated_at) {
          return current
        }
        return updated
      })
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [matchId, user])

  // ── Auto-join if we're not yet a participant ────────────
  useEffect(() => {
    if (!match || !user) return
    if (match.status !== "waiting") return
    if (match.players.includes(user.id)) return
    if (match.players.length >= 2) return

    joinAyoMatch(match.id, user.id)
      .then(setMatch)
      .catch((e) => {
        console.error("Join failed:", e)
        setError(e.message || "Could not join match")
      })
  }, [match, user])

  // ── Handle game end ─────────────────────────────────────
  useEffect(() => {
    if (!match || !user) return
    if (match.status === "finished") return
    if (!match.state) return

    const { board, captures } = match.state
    const totalCaptured = (captures?.A || 0) + (captures?.B || 0)
    const totalSeeds = board?.reduce((a, b) => a + b, 0) || 0
    const TOTAL = 48

    // Win conditions:
    // 1. Someone has captured 25+ seeds
    // 2. All 48 seeds have left the board (captured)
    const aWon = (captures?.A || 0) >= 25
    const bWon = (captures?.B || 0) >= 25
    const boardEmpty = totalSeeds === 0 && totalCaptured === TOTAL
    const drawn = boardEmpty && !aWon && !bWon

    if (!aWon && !bWon && !drawn) return
    if (finishHandledRef.current) return
    finishHandledRef.current = true

    const roles = match.state.roles || {}
    let winnerId = null
    if (aWon) winnerId = roles.A
    else if (bWon) winnerId = roles.B
    // On draw, no winner (winnerId stays null)

    finishMatch(match.id, winnerId)
      .then(setMatch)
      .catch((e) => console.error("finishMatch failed:", e))
  }, [match, user])

  // ── Submit move ─────────────────────────────────────────
  const handleMove = useCallback(
    async (pitIndex) => {
      if (!match || !user || submitting) return
      if (match.status !== "active") return

      const state = match.state
      const roles = state.roles || {}
      const myRole = roles.A === user.id ? "A" : roles.B === user.id ? "B" : null
      if (!myRole) return
      if (state.turn !== myRole) return

      const legal = legalMoves({ board: state.board, captures: state.captures, turn: myRole, finished: false, moveCount: state.moveCount })
      if (!legal.includes(pitIndex)) return

      // Compute next state locally
      const nextState = applyMove(
        { board: state.board, captures: state.captures, turn: myRole, finished: false, winner: null, lastMove: state.lastMove, moveCount: state.moveCount },
        pitIndex,
      )

      const persisted = {
        board: nextState.board,
        captures: nextState.captures,
        roles: state.roles,
        turn: nextState.turn,
        lastMove: nextState.lastMove,
        moveCount: nextState.moveCount,
      }

      const nextTurnUserId = roles[nextState.turn]

      setSubmitting(true)
      try {
        const updated = await submitMove(match.id, user.id, persisted, nextTurnUserId)
        setMatch(updated)
      } catch (e) {
        console.error("Move failed:", e)
        setError(e.message || "Could not submit move")
        // Refresh to get latest
        try {
          setMatch(await getMatch(match.id))
        } catch {}
      } finally {
        setSubmitting(false)
      }
    },
    [match, user, submitting],
  )

  // ── Share ───────────────────────────────────────────────
  const [manualCopyUrl, setManualCopyUrl] = useState(justCreatedState.inviteUrl || "")

  const copyToClipboard = async (text) => {
    // Try modern API
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {}
    // Fallback: temporary textarea + execCommand
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      ta.style.top = "0"
      ta.style.left = "0"
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    // 1. Try native share sheet (WhatsApp, Telegram, SMS, etc.)
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ayo on MEC", url })
        return
      } catch (e) {
        // User cancelled or share failed — fall through to clipboard
        console.warn("Share cancelled or failed:", e)
      }
    }
    // 2. Try clipboard
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } else {
      // 3. Last resort — show the URL so user can long-press to copy
      setManualCopyUrl(url)
    }
  }

  // ── Render ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="mx-auto w-full max-w-lg pb-24 pt-6">
        <Link
          to="/games"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/70 transition hover:bg-black/5"
        >
          <ArrowLeft size={16} /> Back to games
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center">
          <AlertCircle size={22} className="mx-auto mb-2 text-red-500" />
          <p className="text-sm font-semibold text-red-700">{error || "Match not found"}</p>
        </div>
      </div>
    )
  }

  const roles = match.state.roles || {}
  const myRole = roles.A === user.id ? "A" : roles.B === user.id ? "B" : null
  const oppRole = myRole === "A" ? "B" : "A"

  // Waiting state
  if (match.status === "waiting") {
    return (
      <div className="mx-auto w-full max-w-lg pb-24 pt-4">
        <Link
          to="/games"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/70 transition hover:bg-black/5"
        >
          <ArrowLeft size={16} /> Back to games
        </Link>
        <div className="rounded-3xl border border-[#FDE68A] bg-[#FFFBEB] p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FCD34D] text-[#78350F]">
            <Clock size={28} />
          </div>
          <h1 className="text-xl font-black text-[#78350F]">Waiting for opponent</h1>
          <p className="mt-2 text-sm text-[#92400E]">
            Share the link with a family member so they can join and play.
          </p>
          <button
            type="button"
            onClick={handleShare}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#202635] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? "Link copied" : "Share invite"}
          </button>

          <div className="mt-5 w-full">
            <label className="mb-1.5 block text-left text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
              Invite link
            </label>
            <div className="rounded-xl border border-[#D97706]/30 bg-white p-3">
              <p className="break-all text-left text-xs leading-5 text-[#78350F] select-all">
                {typeof window !== "undefined" ? window.location.href : ""}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  const url = window.location.href
                  try {
                    if (navigator.clipboard && window.isSecureContext) {
                      await navigator.clipboard.writeText(url)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                      return
                    }
                  } catch (e) {
                    console.warn("clipboard failed", e)
                  }
                  try {
                    const ta = document.createElement("textarea")
                    ta.value = url
                    document.body.appendChild(ta)
                    ta.select()
                    document.execCommand("copy")
                    document.body.removeChild(ta)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  } catch (e) {
                    console.warn("execCommand copy failed", e)
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#D97706]/30 bg-white px-3 py-2.5 text-xs font-semibold text-[#78350F] transition hover:bg-[#FEF3C7]"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>

              <a
                href={"https://wa.me/?text=" + encodeURIComponent("Join my Ayo game on MEC: " + (typeof window !== "undefined" ? window.location.href : ""))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-2.5 text-xs font-semibold text-[#128C7E] transition hover:bg-[#25D366]/20"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            </div>

            {copied && (
              <p className="mt-2 text-left text-[10px] font-semibold text-green-700">
                Link copied to clipboard
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Playing / finished
  const turn = match.state.turn
  const isMyTurn = turn === myRole && match.status === "active"
  const oppName = "Opponent"
  const myName = "You"

  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          to="/games"
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/5"
        >
          <ArrowLeft size={14} /> Games
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/5"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          {copied ? "Copied" : "Share"}
        </button>
      </div>

      <AyoBoard
        state={{
          board: match.state.board,
          captures: match.state.captures,
          turn,
          finished: match.status === "finished",
          winner: match.winner === roles.A ? "A" : match.winner === roles.B ? "B" : null,
          lastMove: match.state.lastMove,
          moveCount: match.state.moveCount,
        }}
        playerRole={myRole}
        onMove={handleMove}
        myName={myName}
        opponentName={oppName}
        autoRotate={true}
      />

      {submitting && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-black/50">
          <Loader2 size={12} className="animate-spin" /> Sending move…
        </p>
      )}

      {isMyTurn && !submitting && (
        <p className="mt-3 text-center text-xs font-semibold text-[#3B82F6]">
          Your turn — tap a pit to sow
        </p>
      )}
    </div>
  )
}
