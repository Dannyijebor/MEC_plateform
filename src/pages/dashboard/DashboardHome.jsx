import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Play,
  Radio,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"

const IMAGE_DURATION = 5000

function DashboardHome() {
  const { user } = useAuth()

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [storyIndex, setStoryIndex] = useState(null)
  const [storyProgress, setStoryProgress] = useState(0)

  const videoRef = useRef(null)
  const storyTimerRef = useRef(null)
  const progressTimerRef = useRef(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError("")

    const { data, error: postsError } = await supabase
      .from("posts")
      .select(`
        id,
        author_id,
        content,
        media_url,
        media_type,
        created_at,
        expires_at,
        profiles:author_id (
          full_name,
          username,
          avatar_url
        )
      `)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(30)

    if (postsError) {
      console.error("Unable to load home posts:", postsError)
      setError("Unable to load the family feed.")
      setPosts([])
      setLoading(false)
      return
    }

    const postsWithMedia = await Promise.all(
      (data ?? []).map(async (post) => {
        if (!post.media_url) {
          return post
        }

        const { data: signedData, error: signedError } =
          await supabase.storage
            .from("community-media")
            .createSignedUrl(post.media_url, 60 * 60)

        if (signedError) {
          console.error("Unable to create media URL:", signedError)
          return post
        }

        return {
          ...post,
          media_display_url: signedData?.signedUrl ?? null,
        }
      })
    )

    setPosts(postsWithMedia)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const mediaPosts = useMemo(
    () => posts.filter((post) => post.media_display_url),
    [posts]
  )

  const storyPosts = useMemo(
    () => mediaPosts.slice(0, 12),
    [mediaPosts]
  )

  const recentPosts = useMemo(
    () => posts.slice(0, 8),
    [posts]
  )

  const currentStory =
    storyIndex !== null ? storyPosts[storyIndex] : null

  const clearStoryTimers = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current)
      storyTimerRef.current = null
    }

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  const closeStory = useCallback(() => {
    clearStoryTimers()
    setStoryIndex(null)
    setStoryProgress(0)
  }, [clearStoryTimers])

  const nextStory = useCallback(() => {
    if (storyIndex === null) return

    if (storyIndex >= storyPosts.length - 1) {
      closeStory()
      return
    }

    clearStoryTimers()
    setStoryProgress(0)
    setStoryIndex((current) => current + 1)
  }, [
    storyIndex,
    storyPosts.length,
    clearStoryTimers,
    closeStory,
  ])

  const previousStory = useCallback(() => {
    if (storyIndex === null) return

    clearStoryTimers()
    setStoryProgress(0)

    setStoryIndex((current) =>
      current > 0 ? current - 1 : current
    )
  }, [storyIndex, clearStoryTimers])

  const openStory = (index) => {
    clearStoryTimers()
    setStoryProgress(0)
    setStoryIndex(index)
  }

  useEffect(() => {
    if (!currentStory) return

    clearStoryTimers()
    setStoryProgress(0)

    const isVideo = currentStory.media_type?.startsWith("video")

    if (isVideo) {
      return undefined
    }

    const startedAt = Date.now()

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const progress = Math.min(
        (elapsed / IMAGE_DURATION) * 100,
        100
      )

      setStoryProgress(progress)
    }, 50)

    storyTimerRef.current = setTimeout(() => {
      nextStory()
    }, IMAGE_DURATION)

    return clearStoryTimers
  }, [
    currentStory,
    clearStoryTimers,
    nextStory,
  ])

  useEffect(() => {
    if (!currentStory || !videoRef.current) return

    const video = videoRef.current

    const handleLoadedMetadata = () => {
      setStoryProgress(0)

      const duration = video.duration

      if (!Number.isFinite(duration) || duration <= 0) {
        return
      }

      const startedAt = Date.now()

      progressTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000
        const progress = Math.min(
          (elapsed / duration) * 100,
          100
        )

        setStoryProgress(progress)
      }, 50)
    }

    const handleEnded = () => {
      clearStoryTimers()
      setStoryProgress(100)
      nextStory()
    }

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    )

    video.addEventListener("ended", handleEnded)

    return () => {
      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      )
      video.removeEventListener("ended", handleEnded)
    }
  }, [
    currentStory,
    clearStoryTimers,
    nextStory,
  ])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (storyIndex === null) return

      if (event.key === "Escape") {
        closeStory()
      }

      if (event.key === "ArrowRight") {
        nextStory()
      }

      if (event.key === "ArrowLeft") {
        previousStory()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    storyIndex,
    closeStory,
    nextStory,
    previousStory,
  ])

  useEffect(() => {
    return () => {
      clearStoryTimers()
    }
  }, [clearStoryTimers])

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const difference = Math.floor(
      (now.getTime() - date.getTime()) / 1000
    )

    if (difference < 60) return "Just now"

    if (difference < 3600) {
      return `${Math.floor(difference / 60)}m`
    }

    if (difference < 86400) {
      return `${Math.floor(difference / 3600)}h`
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }

  const getInitials = (name) =>
    (name || "MEC")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

  return (
    <>
      <div className="mx-auto w-full max-w-6xl pb-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#172442] via-[#111a30] to-[#0d1425] p-5 shadow-2xl sm:p-7 lg:p-9">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#d9b86c]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d9b86c]/10 text-[#d9b86c]">
                <Sparkles size={17} />
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d9b86c]/80">
                Mack Eselebor Clan
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-[#f7f3ea] sm:text-4xl lg:text-5xl">
              Welcome back.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f7f3ea]/55 sm:text-base">
              Stay connected with the people, memories, conversations
              and moments that make our family what it is.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/community"
                className="inline-flex items-center gap-2 rounded-xl bg-[#d9b86c] px-4 py-3 text-xs font-semibold text-[#17130a] transition hover:bg-[#e5c87f]"
              >
                Open Community
                <ArrowRight size={15} />
              </Link>

              <Link
                to="/family-tree"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs font-semibold text-[#f7f3ea]/75 transition hover:bg-white/[0.08] hover:text-[#f7f3ea]"
              >
                <Users size={15} />
                Family Tree
              </Link>
            </div>
          </div>
        </section>

        {/* STORIES */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#f7f3ea]">
                Family Stories
              </h2>

              <p className="mt-0.5 text-xs text-[#f7f3ea]/35">
                Recent moments from the family
              </p>
            </div>

            {storyPosts.length > 0 && (
              <span className="text-xs text-[#d9b86c]/70">
                {storyPosts.length} recent
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-48 w-28 shrink-0 animate-pulse rounded-2xl bg-white/[0.05] sm:h-56 sm:w-32"
                />
              ))}
            </div>
          ) : storyPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-8 text-center">
              <ImageIcon
                size={24}
                className="mx-auto text-[#f7f3ea]/20"
              />

              <p className="mt-3 text-sm text-[#f7f3ea]/45">
                Family stories will appear here when someone shares
                photos or videos.
              </p>

              <Link
                to="/community"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d9b86c]"
              >
                Share something
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {storyPosts.map((post, index) => {
                const profile = post.profiles
                const name =
                  profile?.full_name || "MEC Member"

                const isVideo =
                  post.media_type?.startsWith("video")

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => openStory(index)}
                    className="group relative h-48 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11182b] text-left shadow-lg transition duration-300 hover:-translate-y-1 hover:border-[#d9b86c]/30 sm:h-56 sm:w-32"
                  >
                    {isVideo ? (
                      <video
                        src={post.media_display_url}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={post.media_display_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />

                    <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-[#d9b86c]/70 bg-[#172442] text-[10px] font-bold text-[#d9b86c] shadow-lg">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(name)
                      )}
                    </div>

                    {isVideo && (
                      <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
                        <Play
                          size={12}
                          fill="currentColor"
                        />
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="truncate text-xs font-semibold text-white">
                        {name}
                      </p>

                      <p className="mt-0.5 text-[10px] text-white/55">
                        {formatTime(post.created_at)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* MAIN GRID */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* FEED */}
          <section className="min-w-0">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d9b86c]/60">
                  Community
                </p>

                <h2 className="mt-1 text-xl font-semibold text-[#f7f3ea]">
                  Recent family posts
                </h2>
              </div>

              <Link
                to="/community"
                className="flex items-center gap-1 text-xs font-medium text-[#d9b86c] transition hover:text-[#e5c87f]"
              >
                See all
                <ArrowRight size={14} />
              </Link>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-400/10 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-72 animate-pulse rounded-2xl bg-white/[0.04]"
                  />
                ))}
              </div>
            ) : recentPosts.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-[#11182b]/60 px-6 py-14 text-center">
                <MessageCircle
                  size={28}
                  className="mx-auto text-[#f7f3ea]/20"
                />

                <h3 className="mt-4 text-sm font-semibold text-[#f7f3ea]/70">
                  Your family feed is waiting
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#f7f3ea]/35">
                  Start the conversation by sharing a memory,
                  announcement, photo or video with everyone.
                </p>

                <Link
                  to="/community"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#d9b86c] px-4 py-2.5 text-xs font-semibold text-[#17130a]"
                >
                  Create a post
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPosts.map((post) => {
                  const profile = post.profiles
                  const name =
                    profile?.full_name || "MEC Member"

                  const isVideo =
                    post.media_type?.startsWith("video")

                  return (
                    <motion.article
                      key={post.id}
                      initial={{
                        opacity: 0,
                        y: 12,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11182b]/70 shadow-xl backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d9b86c]/20 bg-[#d9b86c]/10 text-xs font-semibold text-[#d9b86c]">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(name)
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#f7f3ea]">
                            {name}
                          </p>

                          <p className="text-xs text-[#f7f3ea]/35">
                            {formatTime(post.created_at)}
                          </p>
                        </div>
                      </div>

                      {post.content && (
                        <div className="px-4 pb-4">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-[#f7f3ea]/75">
                            {post.content}
                          </p>
                        </div>
                      )}

                      {post.media_display_url && (
                        <div className="border-y border-white/[0.06] bg-black/10">
                          {isVideo ? (
                            <video
                              src={post.media_display_url}
                              controls
                              preload="metadata"
                              className="max-h-[560px] w-full object-cover"
                            />
                          ) : (
                            <img
                              src={post.media_display_url}
                              alt=""
                              loading="lazy"
                              className="max-h-[560px] w-full object-cover"
                            />
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-[#f7f3ea]/35">
                          {post.media_display_url && (
                            <>
                              {isVideo ? (
                                <Play size={13} />
                              ) : (
                                <ImageIcon size={13} />
                              )}

                              <span>
                                {isVideo ? "Video" : "Photo"}
                              </span>
                            </>
                          )}
                        </div>

                        <Link
                          to="/community"
                          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-[#f7f3ea]/45 transition hover:bg-white/[0.05] hover:text-[#d9b86c]"
                        >
                          <MessageCircle size={14} />
                          Join conversation
                        </Link>
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            )}
          </section>

          {/* SIDEBAR */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/[0.07] bg-[#11182b]/70 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9b86c]/10 text-[#d9b86c]">
                  <Radio size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#f7f3ea]">
                    Live Spaces
                  </h3>

                  <p className="text-xs text-[#f7f3ea]/35">
                    Family conversations
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.02] p-4">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#f7f3ea]/30">
                  <Radio size={17} />
                </div>

                <p className="mt-3 text-center text-xs font-medium text-[#f7f3ea]/55">
                  No live Spaces right now
                </p>

                <p className="mt-1 text-center text-[11px] leading-5 text-[#f7f3ea]/30">
                  When someone starts a family Space, it will
                  appear here.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#11182b]/70 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9b86c]/10 text-[#d9b86c]">
                  <CalendarDays size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#f7f3ea]">
                    Family Events
                  </h3>

                  <p className="text-xs text-[#f7f3ea]/35">
                    What's coming up
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-white/[0.025] p-4">
                <Clock3
                  size={18}
                  className="text-[#d9b86c]/60"
                />

                <p className="mt-3 text-xs font-medium text-[#f7f3ea]/55">
                  Your family calendar
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[#f7f3ea]/30">
                  Upcoming birthdays, gatherings, meetings and
                  family events will appear here.
                </p>

                <Link
                  to="/events"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#d9b86c]"
                >
                  Explore events
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d9b86c]/10 bg-gradient-to-br from-[#d9b86c]/[0.08] to-transparent p-5">
              <Sparkles
                size={18}
                className="text-[#d9b86c]"
              />

              <h3 className="mt-3 text-sm font-semibold text-[#f7f3ea]">
                Keep the family connected
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#f7f3ea]/40">
                Share moments, celebrate each other and keep our
                family story alive.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* STORY VIEWER */}
      <AnimatePresence>
        {currentStory && storyIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-0 backdrop-blur-xl sm:p-6"
          >
            <button
              type="button"
              onClick={closeStory}
              className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close story"
            >
              <X size={20} />
            </button>

            <button
              type="button"
              onClick={previousStory}
              disabled={storyIndex === 0}
              className="absolute left-3 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-20 sm:flex"
              aria-label="Previous story"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={nextStory}
              className="absolute right-3 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:flex"
              aria-label="Next story"
            >
              <ChevronRight size={22} />
            </button>

            <div className="relative h-full w-full max-w-lg overflow-hidden bg-[#0b1120] sm:h-[90vh] sm:rounded-3xl sm:border sm:border-white/[0.08]">
              <div className="absolute left-4 right-4 top-4 z-20 flex gap-1">
                {storyPosts.map((_, index) => (
                  <div
                    key={index}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
                  >
                    <div
                      className="h-full rounded-full bg-white transition-[width] duration-75"
                      style={{
                        width:
                          index < storyIndex
                            ? "100%"
                            : index === storyIndex
                              ? `${storyProgress}%`
                              : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute left-4 right-14 top-9 z-20 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-[#172442] text-[10px] font-bold text-[#d9b86c]">
                  {currentStory.profiles?.avatar_url ? (
                    <img
                      src={currentStory.profiles.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(
                      currentStory.profiles?.full_name
                    )
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">
                    {currentStory.profiles?.full_name ||
                      "MEC Member"}
                  </p>

                  <p className="text-[10px] text-white/50">
                    {formatTime(currentStory.created_at)}
                  </p>
                </div>
              </div>

              <div
                className="absolute inset-0"
                onClick={(event) => {
                  const bounds =
                    event.currentTarget.getBoundingClientRect()

                  const x =
                    event.clientX - bounds.left

                  if (x < bounds.width / 2) {
                    previousStory()
                  } else {
                    nextStory()
                  }
                }}
              >
                {currentStory.media_type?.startsWith(
                  "video"
                ) ? (
                  <video
                    ref={videoRef}
                    key={currentStory.id}
                    src={currentStory.media_display_url}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img
                    key={currentStory.id}
                    src={currentStory.media_display_url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent px-5 pb-8 pt-20">
                  {currentStory.content && (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-white">
                      {currentStory.content}
                    </p>
                  )}
                </div>
              </div>

              <div className="absolute bottom-4 left-4 z-20 sm:hidden">
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  <ArrowLeft size={12} />
                  Tap sides to navigate
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default DashboardHome
