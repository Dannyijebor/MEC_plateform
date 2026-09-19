import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  MessageCircle,
  Play,
  Radio,
  Sparkles,
  Users,
  X,
  Send, Loader2,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../../lib/supabase"
import StatusViewersModal from "../../components/community/StatusViewersModal"
import { useAuth } from "../../hooks/useAuth"

const IMAGE_DURATION = 5000

function DashboardHome() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [storyIndex, setStoryIndex] = useState(null)
  const [storyProgress, setStoryProgress] = useState(0)
  const [storyMuted, setStoryMuted] = useState(true)
  const [storyPaused, setStoryPaused] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [storyReply, setStoryReply] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

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
        if (!post.media_url) return post

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
    () => posts.slice(0, 7),
    [posts]
  )

  const currentStory =
    storyIndex !== null ? storyPosts[storyIndex] : null

  // Track that I viewed this story
  useEffect(() => {
    if (!currentStory || !user?.id) return
    if (currentStory.author_id === user.id) return // don't track own view

    supabase
      .from("post_views")
      .upsert(
        { post_id: currentStory.id, user_id: user.id },
        { onConflict: "post_id,user_id" }
      )
      .then(() => {})
      .catch(() => {})
  }, [currentStory, user?.id])

  // Hide app chrome while a story is open
  useEffect(() => {
    if (storyIndex !== null) {
      document.body.classList.add("story-open")
    } else {
      document.body.classList.remove("story-open")
    }
    return () => document.body.classList.remove("story-open")
  }, [storyIndex])

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

  const sendStoryReply = useCallback(async () => {
    if (!currentStory || !user?.id || !storyReply.trim()) return
    setSendingReply(true)
    try {
      const { data: myConvs } = await supabase
        .from("conversation_members")
        .select("conversation_id, conversations!inner(type)")
        .eq("user_id", user.id)
        .eq("conversations.type", "direct")

      let conversationId = null
      if (myConvs && myConvs.length > 0) {
        const convIds = myConvs.map((c) => c.conversation_id)
        const { data: match } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", currentStory.author_id)
          .in("conversation_id", convIds)
          .maybeSingle()
        if (match) conversationId = match.conversation_id
      }

      if (!conversationId) {
        const newId = crypto.randomUUID()
        await supabase.from("conversations").insert({
          id: newId,
          type: "direct",
          created_by: user.id,
        })
        await supabase.from("conversation_members").insert([
          { conversation_id: newId, user_id: user.id },
          { conversation_id: newId, user_id: currentStory.author_id },
        ])
        conversationId = newId
      }

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: storyReply.trim(),
        status_post_id: currentStory.id,
      })

      setStoryReply("")
      closeStory()
      navigate(`/messages?conversation=${conversationId}`)
    } catch (err) {
      console.error("Reply failed:", err)
    } finally {
      setSendingReply(false)
    }
  }, [currentStory, user?.id, storyReply])

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

    if (isVideo) return undefined

    const startedAt = Date.now()

    progressTimerRef.current = setInterval(() => {
      if (storyPaused) return
      const elapsed = Date.now() - startedAt

      setStoryProgress(
        Math.min((elapsed / IMAGE_DURATION) * 100, 100)
      )
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

      if (!Number.isFinite(duration) || duration <= 0) return

      const startedAt = Date.now()

      progressTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000

        setStoryProgress(
          Math.min((elapsed / duration) * 100, 100)
        )
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

      if (event.key === "Escape") closeStory()
      if (event.key === "ArrowRight") nextStory()
      if (event.key === "ArrowLeft") previousStory()
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
    return () => clearStoryTimers()
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

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    "there"

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">

        {/* HERO */}
        <section className="relative overflow-hidden rounded-[32px] border border-[var(--mec-border)] bg-[var(--mec-surface)] shadow-[var(--mec-shadow-lg)]">

          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[var(--mec-gold)]/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[var(--mec-sage)]/10 blur-3xl" />

          <div className="relative grid min-h-[380px] items-center lg:grid-cols-[1.35fr_.65fr]">

            <div className="p-7 sm:p-10 lg:p-14">

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--mec-gold)]/20 bg-[var(--mec-gold)]/8 px-3 py-1.5">
                <Sparkles
                  size={13}
                  className="text-[var(--mec-gold)]"
                />

                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--mec-gold)]">
                  Mark Eselebor Clan
                </span>
              </div>

              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--mec-text)] sm:text-5xl lg:text-6xl">
                Welcome home,
                <span className="block text-[var(--mec-gold)]">
                  {firstName}.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--mec-text-muted)] sm:text-base">
                One place for our people, our memories, our
                conversations and the moments that keep the family
                connected — wherever life takes us.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  to="/community"
                  className="mec-primary-button inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-bold"
                >
                  Open Community
                  <ArrowRight size={15} />
                </Link>

                <Link
                  to="/family-tree"
                  className="mec-secondary-button inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-bold"
                >
                  <Users size={15} />
                  Explore Family
                </Link>

              </div>

            </div>

            <div className="hidden h-full min-h-[380px] items-center justify-center lg:flex">
              <div className="relative h-64 w-64">

                <div className="absolute inset-8 rounded-full border border-[var(--mec-gold)]/20" />

                <div className="absolute inset-14 rounded-full border border-[var(--mec-gold)]/15" />

                <div className="absolute inset-20 rounded-full bg-[var(--mec-gold)]/10 blur-xl" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[var(--mec-gold)]/25 bg-[var(--mec-gold)]/10 shadow-[var(--mec-shadow)]">
                    <Users
                      size={38}
                      strokeWidth={1.5}
                      className="text-[var(--mec-gold)]"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* STORIES */}
        <section className="mt-10">

          <div className="mb-4 flex items-end justify-between">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--mec-gold)]">
                Moments
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--mec-text)]">
                Family Stories
              </h2>

              <p className="mt-1 text-xs text-[var(--mec-text-soft)]">
                Recent moments shared by the family
              </p>
            </div>

            {storyPosts.length > 0 && (
              <span className="rounded-full bg-[var(--mec-gold)]/8 px-3 py-1.5 text-[10px] font-semibold text-[var(--mec-gold)]">
                {storyPosts.length} recent
              </span>
            )}

          </div>

          {loading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-52 w-32 shrink-0 animate-pulse rounded-3xl bg-black/[0.04]"
                />
              ))}
            </div>
          ) : storyPosts.length === 0 ? (

            <div className="mec-surface rounded-3xl border border-dashed p-10 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--mec-gold)]/10 text-[var(--mec-gold)]">
                <ImageIcon size={21} />
              </div>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--mec-text-muted)]">
                Family stories will appear here when someone shares
                photos or videos.
              </p>

              <Link
                to="/community"
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--mec-gold)]"
              >
                Share a moment
                <ArrowRight size={14} />
              </Link>

            </div>

          ) : (

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">

              {storyPosts.map((post, index) => {

                const profile = post.profiles
                const name =
                  profile?.full_name || "MEC Member"

                const isVideo =
                  post.media_type?.startsWith("video")

                return (
                  <motion.button
                    key={post.id}
                    type="button"
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openStory(index)}
                    className="group relative h-52 w-32 shrink-0 overflow-hidden rounded-3xl border border-[var(--mec-border)] bg-[var(--mec-surface-strong)] text-left shadow-[var(--mec-shadow)] sm:h-60 sm:w-36"
                  >

                    {isVideo ? (
                      <video
                        src={post.media_display_url}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={post.media_display_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/75" />

                    <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-[var(--mec-gold)] text-[10px] font-bold text-white shadow-lg">
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
                      <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md">
                        <Play
                          size={11}
                          fill="currentColor"
                        />
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="truncate text-xs font-bold text-white">
                        {name}
                      </p>

                      <p className="mt-0.5 text-[10px] text-white/60">
                        {formatTime(post.created_at)}
                      </p>
                    </div>

                  </motion.button>
                )
              })}

            </div>
          )}

        </section>

        {/* CONTENT GRID */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">

          {/* FEED */}
          <section className="min-w-0">

            <div className="mb-5 flex items-end justify-between">

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--mec-gold)]">
                  The family
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--mec-text)]">
                  Recent posts
                </h2>
              </div>

              <Link
                to="/community"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[var(--mec-gold)] transition hover:bg-[var(--mec-gold)]/8"
              >
                See all
                <ArrowRight size={14} />
              </Link>

            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {loading ? (

              <div className="space-y-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-72 animate-pulse rounded-3xl bg-black/[0.035]"
                  />
                ))}
              </div>

            ) : recentPosts.length === 0 ? (

              <div className="mec-surface rounded-3xl border p-12 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mec-gold)]/10 text-[var(--mec-gold)]">
                  <MessageCircle size={24} />
                </div>

                <h3 className="mt-5 text-sm font-bold text-[var(--mec-text)]">
                  Your family feed is waiting
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-[var(--mec-text-muted)]">
                  Start the conversation with a memory,
                  announcement, photo or video.
                </p>

                <Link
                  to="/community"
                  className="mec-primary-button mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold"
                >
                  Create a post
                  <ArrowRight size={14} />
                </Link>

              </div>

            ) : (

              <div className="space-y-5">

                {recentPosts.map((post) => {

                  const profile = post.profiles
                  const name =
                    profile?.full_name || "MEC Member"

                  const isVideo =
                    post.media_type?.startsWith("video")

                  return (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mec-surface overflow-hidden rounded-3xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]"
                    >

                      <div className="flex items-center gap-3 p-5">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--mec-gold)]/10 text-xs font-bold text-[var(--mec-gold)]">

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

                          <p className="truncate text-sm font-bold text-[var(--mec-text)]">
                            {name}
                          </p>

                          <p className="text-xs text-[var(--mec-text-soft)]">
                            {formatTime(post.created_at)}
                          </p>

                        </div>

                      </div>

                      {post.content && (
                        <div className="px-5 pb-5">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--mec-text-muted)]">
                            {post.content}
                          </p>
                        </div>
                      )}

                      {post.media_display_url && (
                        <div className="border-y border-[var(--mec-border)] bg-black/[0.02]">

                          {isVideo ? (
                            <video
                              src={post.media_display_url}
                              controls
                              preload="metadata"
                              className="max-h-[600px] w-full object-cover"
                            />
                          ) : (
                            <img
                              src={post.media_display_url}
                              alt=""
                              loading="lazy"
                              className="max-h-[600px] w-full object-cover"
                            />
                          )}

                        </div>
                      )}

                      <div className="flex items-center justify-between px-5 py-3.5">

                        <div className="flex items-center gap-2 text-xs text-[var(--mec-text-soft)]">

                          {post.media_display_url &&
                            (isVideo ? (
                              <Play size={13} />
                            ) : (
                              <ImageIcon size={13} />
                            ))}

                          {post.media_display_url && (
                            <span>
                              {isVideo ? "Video" : "Photo"}
                            </span>
                          )}

                        </div>

                        <Link
                          to="/community"
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--mec-text-soft)] transition hover:bg-[var(--mec-gold)]/8 hover:text-[var(--mec-gold)]"
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
          <aside className="space-y-5">

            <div className="mec-surface rounded-3xl border p-5 shadow-[var(--mec-shadow)]">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mec-sage)]/10 text-[var(--mec-sage)]">
                  <Radio size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[var(--mec-text)]">
                    Live Spaces
                  </h3>

                  <p className="text-xs text-[var(--mec-text-soft)]">
                    Family conversations
                  </p>
                </div>

              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-[var(--mec-border)] bg-black/[0.015] p-6">

                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--mec-sage)]/10 text-[var(--mec-sage)]">
                  <Radio size={17} />
                </div>

                <p className="mt-4 text-center text-xs font-bold text-[var(--mec-text)]">
                  No live Spaces right now
                </p>

                <p className="mt-1 text-center text-[11px] leading-5 text-[var(--mec-text-soft)]">
                  When someone starts a family Space,
                  it will appear here.
                </p>

              </div>

            </div>

            <div className="mec-surface rounded-3xl border p-5 shadow-[var(--mec-shadow)]">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mec-gold)]/10 text-[var(--mec-gold)]">
                  <CalendarDays size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[var(--mec-text)]">
                    Family Events
                  </h3>

                  <p className="text-xs text-[var(--mec-text-soft)]">
                    What's coming up
                  </p>
                </div>

              </div>

              <div className="mt-5 rounded-2xl bg-[var(--mec-gold)]/[0.045] p-5">

                <Clock3
                  size={18}
                  className="text-[var(--mec-gold)]"
                />

                <p className="mt-4 text-xs font-bold text-[var(--mec-text)]">
                  Your family calendar
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[var(--mec-text-soft)]">
                  Birthdays, gatherings, meetings and
                  family events will appear here.
                </p>

                <Link
                  to="/events"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--mec-gold)]"
                >
                  Explore events
                  <ArrowRight size={13} />
                </Link>

              </div>

            </div>

            <div className="relative overflow-hidden rounded-3xl border border-[var(--mec-gold)]/15 bg-[var(--mec-gold)]/[0.055] p-6">

              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--mec-gold)]/10 blur-2xl" />

              <Sparkles
                size={19}
                className="relative text-[var(--mec-gold)]"
              />

              <h3 className="relative mt-4 text-sm font-bold text-[var(--mec-text)]">
                Keep the family story alive
              </h3>

              <p className="relative mt-2 text-xs leading-6 text-[var(--mec-text-muted)]">
                Share moments, celebrate one another and
                preserve the memories that connect generations.
              </p>

            </div>

          </aside>

        </div>
      </main>

      {/* STORY VIEWER */}
      <AnimatePresence>

        {currentStory && storyIndex !== null && (

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-0 backdrop-blur-2xl sm:bg-black/90 sm:p-6"
          >

            <button
              type="button"
              onClick={() => setStoryMuted((v) => !v)}
              className="absolute right-16 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/20"
              aria-label={storyMuted ? "Unmute" : "Mute"}
            >
              {storyMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <button
              type="button"
              onClick={closeStory}
              className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/20"
              aria-label="Close story"
            >
              <X size={20} />
            </button>

            <button
              type="button"
              onClick={previousStory}
              disabled={storyIndex === 0}
              className="absolute left-4 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/20 disabled:opacity-20 sm:flex"
              aria-label="Previous story"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={nextStory}
              className="absolute right-4 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/20 sm:flex"
              aria-label="Next story"
            >
              <ChevronRight size={22} />
            </button>

            <div className="relative h-full w-full max-w-lg overflow-hidden bg-black sm:h-[90vh] sm:rounded-[30px] sm:border sm:border-white/10">

              <div className="absolute left-4 right-4 top-4 z-20 flex gap-1">

                {storyPosts.map((_, index) => (
                  <div
                    key={index}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
                  >
                    <div
                      className="h-full rounded-full bg-white"
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

                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-[var(--mec-gold)] text-[10px] font-bold text-white">

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

                  <p className="truncate text-xs font-bold text-white">
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
                onPointerDown={() => setStoryPaused(true)}
                onPointerUp={() => setStoryPaused(false)}
                onPointerCancel={() => setStoryPaused(false)}
                onPointerLeave={() => setStoryPaused(false)}
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

                {currentStory.media_type?.startsWith("video") ? (
                  <video
                    ref={videoRef}
                    key={currentStory.id}
                    src={currentStory.media_display_url}
                    autoPlay
                    muted={storyMuted}
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
                  <ArrowRight size={12} />
                  Tap sides to navigate
                </div>
              </div>

              {currentStory.author_id !== user?.id && (
              <div className="absolute inset-x-4 bottom-6 z-30 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-2 py-2 backdrop-blur-xl">
                <input
                  type="text"
                  value={storyReply}
                  onChange={(e) => setStoryReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      sendStoryReply()
                    }
                  }}
                  placeholder="Reply to story..."
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/50"
                />
                <button
                  type="button"
                  onClick={sendStoryReply}
                  disabled={!storyReply.trim() || sendingReply}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E40AF] text-white transition disabled:opacity-40"
                >
                  {sendingReply ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
            )}

            {currentStory.author_id === user?.id && (
              <button
                type="button"
                onClick={() => setShowViewers(true)}
                className="absolute bottom-6 right-4 z-30 flex h-11 items-center gap-2 rounded-full bg-black/60 px-4 text-white backdrop-blur-xl transition hover:bg-black/80"
                aria-label="View activity"
              >
                <Eye size={16} />
                <span className="text-xs font-semibold">Views</span>
              </button>
            )}
            

            </div>

          </motion.div>

        )}

      </AnimatePresence>
    

      <StatusViewersModal
        postId={currentStory?.id}
        open={showViewers}
        onClose={() => setShowViewers(false)}
      />
</>  )
}

export default DashboardHome