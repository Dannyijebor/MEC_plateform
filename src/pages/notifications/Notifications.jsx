import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Cake,
  Sparkles,
  Radio,
  CheckCheck,
  Loader2,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"

const ICONS = {
  post: Sparkles,
  comment: MessageCircle,
  like: Heart,
  follow: UserPlus,
  birthday: Cake,
  space: Radio,
  system: Bell,
}

const COLORS = {
  post: "bg-blue-50 text-[#1E40AF]",
  comment: "bg-blue-50 text-[#1E40AF]",
  like: "bg-red-50 text-red-500",
  follow: "bg-blue-50 text-[#1E40AF]",
  birthday: "bg-amber-50 text-amber-600",
  space: "bg-blue-50 text-[#1E40AF]",
  system: "bg-gray-100 text-gray-600",
}

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" })
}

function groupLabel(date) {
  const d = new Date(date)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return "Today"
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return "Yesterday"
  if (now - d < 7 * 24 * 60 * 60 * 1000) return "This Week"
  return "Older"
}

export default function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
      if (!cancelled) {
        setItems(data || [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`notifs:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((current) => [payload.new, ...current])
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [user?.id])

  const markAllRead = async () => {
    if (!user?.id) return
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
    setItems((list) => list.map((n) => ({ ...n, is_read: true })))
  }

  const handleTap = async (notif) => {
    if (!notif.read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id)
      setItems((list) =>
        list.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
    }
    const url = notif.data?.url
    if (url) navigate(url)
  }

  // Group
  const grouped = {}
  for (const item of items) {
    const key = groupLabel(item.created_at)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }
  const order = ["Today", "Yesterday", "This Week", "Older"]
  const unreadCount = items.filter((n) => !n.is_read).length

  return (
    <div data-notifications-page className="min-h-screen bg-white pb-24 text-gray-900">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
          <p className="text-[11px] text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-[#1E40AF]"
          >
            <CheckCheck size={13} />
            Read all
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#1E40AF]" />
        </div>
      ) : items.length === 0 ? (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Bell size={24} className="text-[#1E40AF]" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No notifications yet</p>
          <p className="mt-1 text-xs text-gray-400">
            You'll see posts, birthdays and updates here
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-lg px-4 py-4">
          {order.map((key) => {
            const list = grouped[key]
            if (!list || list.length === 0) return null
            return (
              <div key={key} className="mb-6">
                <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  {key}
                </p>
                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
                  {list.map((n, i) => {
                    const Icon = ICONS[n.type] || Bell
                    const color = COLORS[n.type] || COLORS.system
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleTap(n)}
                        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50 ${
                          i < list.length - 1 ? "border-b border-gray-100" : ""
                        } ${!n.is_read ? "bg-blue-50/30" : ""}`}
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                              {n.body}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-gray-400">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1E40AF]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
