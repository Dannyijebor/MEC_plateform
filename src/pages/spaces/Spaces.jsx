import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Calendar,
  ChevronRight,
  Clock3,
  Headphones,
  Loader2,
  Mic2,
  Plus,
  Radio,
  Sparkles,
  Users,
  Video,
  Volume2,
} from "lucide-react"
import { motion } from "framer-motion"
import { getSpaces } from "../../services/spaces/spaceService"
import { supabase } from "../../lib/supabase"

const themeStyles = {
  gold: {
    accent: "from-amber-400 to-yellow-600",
    glow: "rgba(245, 158, 11, 0.18)",
  },
  blue: {
    accent: "from-blue-400 to-cyan-500",
    glow: "rgba(59, 130, 246, 0.18)",
  },
  purple: {
    accent: "from-violet-400 to-fuchsia-500",
    glow: "rgba(139, 92, 246, 0.18)",
  },
  green: {
    accent: "from-emerald-400 to-green-500",
    glow: "rgba(16, 185, 129, 0.18)",
  },
  rose: {
    accent: "from-rose-400 to-pink-500",
    glow: "rgba(244, 63, 94, 0.18)",
  },
  custom: {
    accent: "from-blue-400 to-violet-500",
    glow: "rgba(99, 102, 241, 0.18)",
  },
}

function getTheme(space) {
  if (space?.theme === "custom" && space?.custom_theme_color) {
    return {
      accent: "from-white to-white",
      glow: space.custom_theme_color,
    }
  }

  return themeStyles[space?.theme] || themeStyles.gold
}

function getDisplayName(host) {
  return (
    host?.full_name ||
    host?.username ||
    "MEC Member"
  )
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M"
}

function formatScheduledDate(value) {
  if (!value) return "Scheduled"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Scheduled"
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function modeLabel(mode) {
  if (mode === "video") return "Video"
  if (mode === "audio_video") return "Audio + Video"
  return "Audio"
}

function ModeIcon({ mode, size = 16 }) {
  if (mode === "video") return <Video size={size} />
  if (mode === "audio_video") return <Radio size={size} />
  return <Headphones size={size} />
}

function SpaceCard({ space, live = false, participantCount = 0 }) {
  const theme = getTheme(space)
  const hostName = getDisplayName(space.host)
  const initials = getInitials(hostName)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] backdrop-blur-xl"
      style={{
        boxShadow: `0 18px 60px ${theme.glow}`,
      }}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme.accent}`}
      />

      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {space.host?.avatar_url ? (
              <img
                src={space.host.avatar_url}
                alt={hostName}
                className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/10">
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {hostName}
              </p>

              <p className="text-xs text-white/45">
                {space.host?.username
                  ? `@${space.host.username}`
                  : "MEC host"}
              </p>
            </div>
          </div>

          {live ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[11px] font-semibold text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              LIVE
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/55">
              <Clock3 size={12} />
              UPCOMING
            </div>
          )}
        </div>

        <h3 className="line-clamp-2 text-xl font-semibold tracking-tight text-white">
          {space.title}
        </h3>

        {space.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/50">
            {space.description}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/7 px-3 py-1.5 text-xs text-white/65">
            <ModeIcon mode={space.mode} size={14} />
            {modeLabel(space.mode)}
          </span>

          <span className="flex items-center gap-1.5 rounded-full bg-white/7 px-3 py-1.5 text-xs text-white/65">
            <Users size={14} />
            {participantCount}
          </span>
        </div>

        {!live && (
          <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
            <Calendar size={14} />
            {formatScheduledDate(space.scheduled_for)}
          </div>
        )}

        <Link
          to={`/spaces/${space.id}`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          {live ? "Join Space" : "View Space"}
          <ChevronRight size={16} />
        </Link>
      </div>
    </motion.div>
  )
}

function EmptyState({ live }) {
  return (
    <div data-spaces-shell className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
        {live ? (
          <Volume2 className="text-white/35" size={24} />
        ) : (
          <Calendar className="text-white/35" size={24} />
        )}
      </div>

      <h3 className="mt-4 text-base font-semibold text-white">
        {live
          ? "No live Spaces right now"
          : "No upcoming Spaces"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
        {live
          ? "When a family member starts a Space, it will appear here automatically."
          : "Scheduled Spaces created by family members will appear here."}
      </p>
    </div>
  )
}

export default function Spaces() {
  const [spaces, setSpaces] = useState([])
  const [participantCounts, setParticipantCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadSpaces = useCallback(async () => {
    try {
      setError("")

      const data = await getSpaces()
      setSpaces(data)

      if (!data.length) {
        setParticipantCounts({})
        return
      }

      const counts = {}

      await Promise.all(
        data.map(async (space) => {
          const { count, error: countError } = await supabase
            .from("space_participants")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("space_id", space.id)
            .is("left_at", null)

          if (!countError) {
            counts[space.id] = count || 0
          }
        }),
      )

      setParticipantCounts(counts)
    } catch (err) {
      console.error("Failed to load Spaces:", err)
      setError(err?.message || "Unable to load Spaces.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSpaces()

    const channel = supabase
      .channel("mec-spaces-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "spaces",
        },
        () => {
          loadSpaces()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "space_participants",
        },
        () => {
          loadSpaces()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadSpaces])

  const liveSpaces = useMemo(
    () => spaces.filter((space) => space.status === "live"),
    [spaces],
  )

  const upcomingSpaces = useMemo(
    () => spaces.filter((space) => space.status === "scheduled"),
    [spaces],
  )

  return (
    <div
      data-spaces-shell
      className="min-h-screen bg-white text-gray-900 dark:bg-[#070b16] dark:text-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-500/10 via-transparent to-amber-400/5 p-6 sm:p-8">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-amber-400/5 blur-3xl" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-200">
                <Sparkles size={14} />
                MEC Spaces
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                Connect. Talk.{" "}
                <span className="bg-gradient-to-r from-blue-300 via-white to-amber-200 bg-clip-text text-transparent">
                  Together.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
                Real-time family conversations with live audio, video and
                interactive participation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/spaces/create?mode=audio"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
              >
                <Mic2 size={17} />
                Start Audio
              </Link>

              <Link
                to="/spaces/create?mode=video"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Video size={17} />
                Start Video
              </Link>

              <Link
                to="/spaces/create?scheduled=true"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Calendar size={17} />
                Schedule
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-white/45">
              <Loader2 className="animate-spin" size={20} />
              Loading real Spaces...
            </div>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/5 p-6">
            <p className="font-semibold text-red-200">
              Unable to load Spaces
            </p>
            <p className="mt-2 text-sm text-red-200/60">{error}</p>

            <button
              onClick={() => {
                setLoading(true)
                loadSpaces()
              }}
              className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <section className="mt-10">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                    <h2 className="text-xl font-semibold">
                      Live Now
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-white/40">
                    Family members currently broadcasting
                  </p>
                </div>

                {liveSpaces.length > 0 && (
                  <span className="text-xs text-white/35">
                    {liveSpaces.length} live
                  </span>
                )}
              </div>

              {liveSpaces.length === 0 ? (
                <EmptyState live />
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {liveSpaces.map((space) => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      live
                      participantCount={participantCounts[space.id] || 0}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-12 pb-10">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock3 size={18} className="text-amber-300" />
                    <h2 className="text-xl font-semibold">
                      Upcoming
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-white/40">
                    Spaces scheduled by the family
                  </p>
                </div>

                {upcomingSpaces.length > 0 && (
                  <span className="text-xs text-white/35">
                    {upcomingSpaces.length} upcoming
                  </span>
                )}
              </div>

              {upcomingSpaces.length === 0 ? (
                <EmptyState live={false} />
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingSpaces.map((space) => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      participantCount={participantCounts[space.id] || 0}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <div className="pb-8 text-center text-xs text-white/25">
          <Plus size={13} className="mr-1 inline-block" />
          Spaces appear here only when created by real MEC members.
        </div>
      </div>
    </div>
  )
}
