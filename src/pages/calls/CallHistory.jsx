import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  UserRound,
  Loader2,
} from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

export default function CallHistory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all") // all | missed | incoming | outgoing

  useEffect(() => {
    if (!user) return
    let mounted = true

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          conversation_id,
          sender_id
        `)
        .eq("type", "call_event")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        console.error("Failed to load call history:", error)
        setLoading(false)
        return
      }

      // Parse and enrich
      const parsed = (data || []).map((row) => {
        let info = {}
        try {
          info = JSON.parse(row.content.slice(10))
        } catch {}
        return {
          id: row.id,
          createdAt: row.created_at,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          ...info,
        }
      })

      if (mounted) {
        setCalls(parsed)
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [user])

  const filtered = calls.filter((c) => {
    if (filter === "all") return true
    if (filter === "missed") return c.status === "missed"
    if (filter === "incoming") return c.calleeId === user?.id
    if (filter === "outgoing") return c.callerId === user?.id
    return true
  })

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (s) => {
    if (!s) return ""
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F5EF] via-[#FCFBF7] to-[#F1EFE8] pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
              <Phone size={15} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">
              Call History
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">
            Recent calls
          </h1>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "missed", label: "Missed" },
            { key: "incoming", label: "Incoming" },
            { key: "outgoing", label: "Outgoing" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                filter === f.key
                  ? "bg-[#111827] text-white"
                  : "bg-white text-[#5F6673] border border-[#DCD9D0] hover:bg-[#F1EFE8]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#8A8F98]">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-[#DCD9D0] bg-white/70 px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DBEAFE]">
              <Phone size={24} className="text-[#2563EB]" />
            </div>
            <p className="text-sm font-semibold text-[#111827]">
              No calls yet
            </p>
            <p className="mt-1 text-xs text-[#8A8F98]">
              Calls with family members will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((call) => {
              const outgoing = call.callerId === user?.id
              const isMissed = call.status === "missed"

              const name =
                outgoing ? call.calleeName : call.callerName
              const initial = (name || "?").charAt(0).toUpperCase()

              return (
                <motion.button
                  key={call.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate("/messages")}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[#DCD9D0] bg-white/80 px-4 py-3 text-left transition hover:border-[#60A5FA]/40 hover:bg-white"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isMissed
                        ? "bg-red-50 text-red-500"
                        : "bg-[#DBEAFE] text-[#2563EB]"
                    }`}
                  >
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-semibold ${
                        isMissed ? "text-red-500" : "text-[#111827]"
                      }`}
                    >
                      {name || "MEC Member"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8A8F98]">
                      {isMissed ? (
                        <PhoneMissed size={12} className="text-red-500" />
                      ) : outgoing ? (
                        <PhoneOutgoing size={12} />
                      ) : (
                        <PhoneIncoming size={12} />
                      )}
                      <span>
                        {isMissed
                          ? "Missed"
                          : outgoing
                            ? "Outgoing"
                            : "Incoming"}
                      </span>
                      {call.mode === "video" && (
                        <>
                          <span>·</span>
                          <Video size={12} />
                          <span>Video</span>
                        </>
                      )}
                      {call.duration > 0 && (
                        <>
                          <span>·</span>
                          <span>{formatDuration(call.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-[#8A8F98]">
                    {formatTime(call.createdAt)}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
