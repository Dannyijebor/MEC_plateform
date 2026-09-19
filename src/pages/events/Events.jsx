import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, Plus, Cake, Crown, MapPin, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"
import CreateEventModal from "../../components/events/CreateEventModal"

function initials(name = "MEC") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()
}

export default function Events() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (showCreate) document.body.classList.add("event-modal-open")
    else document.body.classList.remove("event-modal-open")
    return () => document.body.classList.remove("event-modal-open")
  }, [showCreate])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from("events")
        .select(`
          id, title, description, type, event_date, location, cover_url,
          is_birthday, birthday_user_id, host_id,
          birthday_user:birthday_user_id (id, full_name, username, avatar_url),
          host:host_id (id, full_name, username, avatar_url)
        `)
        .gte("event_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("event_date", { ascending: true })
      if (!cancelled) {
        setEvents(data || [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel("events-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => load()
      )
      .subscribe()

    return () => {
      cancelled = true
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [])

  const birthdayEvents = useMemo(
    () => events.filter((e) => e.is_birthday),
    [events]
  )
  const otherEvents = useMemo(
    () => events.filter((e) => !e.is_birthday),
    [events]
  )

  const fmt = (date) => new Date(date).toLocaleDateString([], {
    weekday: "short", month: "short", day: "numeric",
  })
  const fmtTime = (date) => new Date(date).toLocaleTimeString([], {
    hour: "numeric", minute: "2-digit",
  })

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#1E40AF]" size={26} />
      </div>
    )
  }

  return (
    <div data-events-page className="min-h-screen bg-white pb-24 text-gray-900">
      <div className="border-b border-gray-100 px-5 py-5">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1">
                <Calendar size={12} className="text-[#1E40AF]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E40AF]">
                  Family Events
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold">What's happening</h1>
              <p className="mt-1 text-sm text-gray-500">
                Weddings, parties, birthdays & more
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <button
          onClick={() => setShowCreate(true)}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E40AF] py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#1E40AF]/90"
        >
          <Plus size={16} />
          Create event
        </button>

        {birthdayEvents.length > 0 && (
          <div className="mb-8">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
              🎂 Birthdays coming up
            </p>
            <div className="space-y-3">
              {birthdayEvents.map((e) => {
                const bday = e.birthday_user
                const nm = bday?.full_name || bday?.username || "MEC Member"
                return (
                  <div
                    key={e.id}
                    onClick={() => bday?.id && navigate(`/user/${bday.id}`)}
                    className="flex cursor-pointer items-center gap-4 rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-4 transition hover:border-amber-200"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-100 text-base font-bold text-amber-700">
                      {bday?.avatar_url ? (
                        <img src={bday.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(nm)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Cake size={14} className="text-amber-500" />
                        <p className="truncate text-sm font-bold text-gray-900">
                          {nm}'s Birthday
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {fmt(e.event_date)} · {fmtTime(e.event_date)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {otherEvents.length > 0 && (
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
              Other events
            </p>
            <div className="space-y-3">
              {otherEvents.map((e) => (
                <div
                  key={e.id}
                  className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1E40AF]">
                      {e.type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-gray-900">{e.title}</p>
                  {e.description && (
                    <p className="mt-1 text-xs leading-6 text-gray-500">
                      {e.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {fmt(e.event_date)} · {fmtTime(e.event_date)}
                    </span>
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {e.location}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
            <Calendar size={26} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-700">
              No events yet
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Birthdays will appear here one month before
            </p>
          </div>
        )}
      </div>

      <CreateEventModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(created) => {
          setEvents((list) =>
            [...list, created].sort(
              (a, b) => new Date(a.event_date) - new Date(b.event_date)
            )
          )
        }}
      />
    </div>
  )
}
