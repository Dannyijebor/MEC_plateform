import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  // unused
  ChevronDown,
  ChevronUp,
  Volume2,
  Share2,
  Heart,
  MessageCircle,
  Camera,
  CameraOff,
  Hand,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  Send,
  Users,
  Video,
  X,
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"
import {
  endSpace,
  getParticipants,
  getSpace,
  joinSpace,
  leaveSpace,
  raiseHand,
  removeParticipant,
  sendReaction,
  updateParticipantRole,
} from "../../services/spaces/spaceService"
import {
  connectToSpace,
  disconnectFromSpace,
  toggleCamera,
  toggleMicrophone,
} from "../../services/spaces/livekitService"
import {
  subscribeToSpace,
  unsubscribeFromSpace,
} from "../../services/spaces/spaceRealtime"
import ParticipantActionMenu from "../../components/spaces/ParticipantActionMenu"
import { VideoTile } from "../../components/spaces/VideoTile"
import ListenerCard from "../../components/spaces/ListenerCard"

const REACTIONS = ["❤️", "👏", "😂", "🔥", "🎉", "😍", "👍", "🙌"]

const THEME_MAP = {
  gold: {
    accent: "from-amber-400 to-yellow-500",
    glow: "shadow-amber-500/20",
  },
  blue: {
    accent: "from-[#C9A85C] to-[#A8873F]",
    glow: "shadow-blue-500/20",
  },
  purple: {
    accent: "from-violet-400 to-fuchsia-500",
    glow: "shadow-violet-500/20",
  },
  green: {
    accent: "from-emerald-400 to-green-500",
    glow: "shadow-emerald-500/20",
  },
  rose: {
    accent: "from-rose-400 to-pink-500",
    glow: "shadow-rose-500/20",
  },
}

function initials(name = "MEC") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function ParticipantCard({ participant, active, isLocal = false, onTap }) {
  const name =
    participant?.profile?.full_name ||
    participant?.profile?.username ||
    participant?.name ||
    participant?.identity ||
    "MEC Member"

  const avatar = participant?.profile?.avatar_url
  const role = participant?.role || "listener"
  const micOn = participant?.isMicrophoneEnabled

  return (
    <button
      type="button"
      onClick={(e) => onTap?.(e)}
      className={`group flex w-full flex-col items-center gap-2 rounded-2xl p-3 text-center transition ${
        active ? "bg-emerald-50" : "hover:bg-gray-50"
      }`}
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-xl font-bold ${
            active
              ? "ring-4 ring-emerald-400 ring-offset-2 ring-offset-white"
              : "ring-2 ring-gray-200"
          } bg-[#F1E7CC] text-[#A8873F]`}
        >
          {avatar ? (
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </div>
        {/* Mic badge */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white ${
            micOn ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {micOn ? (
            <Mic size={12} className="text-white" strokeWidth={3} />
          ) : (
            <MicOff size={12} className="text-white" strokeWidth={3} />
          )}
        </div>
      </div>

      {/* Name */}
      <div className="min-w-0 w-full">
        <p className="truncate text-sm font-semibold text-gray-900">
          {name}
          {isLocal ? " · You" : ""}
        </p>

        {/* Role with mic icon */}
        <div className="mt-0.5 flex items-center justify-center gap-1 text-xs">
          {micOn ? (
            <Mic size={11} className="text-emerald-600" />
          ) : (
            <MicOff size={11} className="text-red-500" />
          )}
          <span className={`font-medium capitalize ${
            role === "host" ? "text-amber-600" :
            role === "cohost" ? "text-gray-700" :
            role === "speaker" ? "text-emerald-600" :
            "text-gray-500"
          }`}>
            {role}
          </span>
        </div>
      </div>
    </button>
  )
}

function RemoteVideo({ track }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!track || !ref.current) return

    track.attach(ref.current)

    return () => {
      track.detach(ref.current)
    }
  }, [track])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="h-full min-h-[180px] w-full object-cover"
    />
  )
}

function SpaceRoom() {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const roomRef = useRef(null)
  const audioElementsRef = useRef(new Map())

  const [space, setSpace] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [spaceMuted, setSpaceMuted] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [reactions, setReactions] = useState([])
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [connectionState, setConnectionState] = useState("connecting")
  const [mediaError, setMediaError] = useState("")
  const [remoteTracks, setRemoteTracks] = useState([])
  const [activeSpeakers, setActiveSpeakers] = useState([])
  const [profilesByUserId, setProfilesByUserId] = useState({})
  const [menuParticipant, setMenuParticipant] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, rect: null })
  
  const theme = THEME_MAP[space?.theme] || THEME_MAP.gold

  const isHost = space?.host_id === user?.id

  // Hide app chrome while in a space
  useEffect(() => {
    document.body.classList.add("space-open")
    return () => document.body.classList.remove("space-open")
  }, [])

  const currentUserRole = (() => {
    const me = participants.find((p) => p.user_id === user?.id)
    return me?.role || (isHost ? "host" : "listener")
  })()

  const handleParticipantAction = async (actionKey) => {
    if (!menuParticipant || !space?.id) return
    const targetUserId = menuParticipant.user_id || menuParticipant.id
    if (!targetUserId) return

    try {
      if (actionKey === "view-profile") {
        navigate(`/user/${targetUserId}`)
      } else if (actionKey === "make-speaker") {
        await updateParticipantRole({ spaceId: space.id, userId: targetUserId, newRole: "speaker" })
      } else if (actionKey === "make-cohost") {
        await updateParticipantRole({ spaceId: space.id, userId: targetUserId, newRole: "cohost" })
      } else if (actionKey === "make-listener") {
        await updateParticipantRole({ spaceId: space.id, userId: targetUserId, newRole: "listener" })
      } else if (actionKey === "remove") {
        await removeParticipant({ spaceId: space.id, userId: targetUserId })
      }
      await refreshParticipants?.()
    } catch (err) {
      console.error("Action failed:", err)
      setMediaError("Could not update role. Try again.")
    } finally {
      setMenuParticipant(null)
    }
  }

  const openParticipantMenu = (participant, event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.()
    const touch = event?.touches?.[0] || event
    setMenuAnchor({
      x: touch?.clientX || 0,
      y: touch?.clientY || 0,
      rect: rect || null,
    })
    setMenuParticipant(participant)
  }

  const isVideoSpace =
    space?.mode === "video" || space?.mode === "audio_video"

  const participantCount = participants.length

  // Fetch profiles for participants (fallback for failed joins)
  useEffect(() => {
    if (!participants || participants.length === 0) return
    const idsToFetch = participants
      .filter((p) => !p.profile && p.user_id)
      .map((p) => p.user_id)
    if (idsToFetch.length === 0) return

    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", idsToFetch)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        for (const p of data) map[p.id] = p
        setProfilesByUserId((current) => ({ ...current, ...map }))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants])

  const liveParticipants = useMemo(
    () =>
      participants
        .filter((participant) => !participant.left_at)
        .map((participant) => ({
          ...participant,
          profile:
            participant.profile ||
            profilesByUserId[participant.user_id] ||
            null,
        })),
    [participants, profilesByUserId],
  )

  useEffect(() => {
    let mounted = true
    let participantsChannel = null
    let spaceChannel = null

    async function initialize() {
      try {
        setLoading(true)
        setMediaError("")

        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError
        if (!currentUser) {
          navigate("/login")
          return
        }

        const currentSpace = await getSpace(spaceId)

        if (!mounted) return

        setSpace(currentSpace)

        const host = currentSpace.host_id === currentUser.id

        await joinSpace({
          spaceId,
          userId: currentUser.id,
          role: host ? "host" : "listener",
          audioEnabled: false,
          videoEnabled: false,
        })

        const currentParticipants = await getParticipants(spaceId)

        if (mounted) {
          setParticipants(currentParticipants)
        }

        // Realtime: subscribe to participant role updates
        participantsChannel = supabase
          .channel(`space_participants-live:${spaceId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "space_participants",
              filter: `space_id=eq.${spaceId}`,
            },
            () => refreshParticipants(),
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "space_participants",
              filter: `space_id=eq.${spaceId}`,
            },
            () => refreshParticipants(),
          )
          .subscribe()

        const livekit = await connectToSpace({
          spaceId,

          onParticipantConnected: () => {
            refreshParticipants()
          },

          onParticipantDisconnected: () => {
            refreshParticipants()
          },

          onTrackSubscribed: (track, publication, participant) => {
            if (!mounted) return

            if (track.kind === "audio") {
              const audio = track.attach()
              audio.autoplay = true
              audio.style.display = "none"

              document.body.appendChild(audio)

              audioElementsRef.current.set(
                publication.trackSid,
                audio,
              )
            }

            if (track.kind === "video") {
              setRemoteTracks((current) => [
                ...current.filter(
                  (item) => item.trackSid !== publication.trackSid,
                ),
                {
                  trackSid: publication.trackSid,
                  track,
                  participant,
                },
              ])
            }
          },

          onTrackUnsubscribed: (track, publication) => {
            track.detach()

            const audio =
              audioElementsRef.current.get(publication.trackSid)

            if (audio) {
              audio.remove()
              audioElementsRef.current.delete(publication.trackSid)
            }

            setRemoteTracks((current) =>
              current.filter(
                (item) => item.trackSid !== publication.trackSid,
              ),
            )
          },

          onActiveSpeakersChanged: (speakers) => {
            setActiveSpeakers(
              speakers.map((speaker) => speaker.identity),
            )
          },

          onConnectionStateChanged: (state) => {
            setConnectionState(state)
          },
        })

        if (!mounted) {
          await disconnectFromSpace(livekit.room)
          return
        }

        roomRef.current = livekit.room

        const localMicrophone =
          livekit.room.localParticipant.isMicrophoneEnabled

        const localCamera =
          livekit.room.localParticipant.isCameraEnabled

        setMicOn(localMicrophone)
        setCameraOn(localCamera)
      } catch (error) {
        console.error("Unable to enter Space:", error)

        if (mounted) {
          setMediaError(
            error?.message ||
              "Unable to connect to this Space.",
          )
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    async function refreshParticipants() {
      try {
        const nextParticipants = await getParticipants(spaceId)

        if (mounted) {
          setParticipants(nextParticipants)
        }
      } catch (error) {
        console.error(error)
      }
    }

    initialize()

    spaceChannel = subscribeToSpace(spaceId, {
      onParticipantChange: refreshParticipants,
      onReaction: (reaction) => {
        if (!mounted) return

        const item = {
          id: `${reaction.id}-${Date.now()}`,
          emoji: reaction.emoji,
          userName: reaction.user_name || reaction.userName || "MEC Member",
        }

        setReactions((current) => [...current, item])

        window.setTimeout(() => {
          setReactions((current) =>
            current.filter((reactionItem) => reactionItem.id !== item.id),
          )
        }, 3200)
      },
      onHandRaise: refreshParticipants,
      onSpaceChange: (payload) => {
        if (mounted && payload?.new) {
          setSpace((current) => ({
            ...current,
            ...payload.new,
          }))
        }
      },
    })

    return () => {
      mounted = false

      if (participantsChannel) {
        try { supabase.removeChannel(participantsChannel) } catch {}
        participantsChannel = null
      }

      if (spaceChannel) {
        unsubscribeFromSpace(spaceChannel)
        spaceChannel = null
      }

      for (const audio of audioElementsRef.current.values()) {
        audio.remove()
      }

      audioElementsRef.current.clear()

      if (roomRef.current) {
        disconnectFromSpace(roomRef.current)
        roomRef.current = null
      }

      leaveSpace(spaceId, user?.id).catch(() => {})
    }
  }, [spaceId, navigate, user?.id])

  async function refreshParticipants() {
    try {
      const nextParticipants = await getParticipants(spaceId)
      setParticipants(nextParticipants)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleToggleMic() {
    const room = roomRef.current
    if (!room) {
      setMediaError("Not connected to the space.")
      return
    }
    try {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        s.getTracks().forEach((t) => t.stop())
      } catch (permErr) {
        setMediaError("Microphone permission denied.")
        return
      }

      const local = room.localParticipant
      const next = !local.isMicrophoneEnabled
      await local.setMicrophoneEnabled(next)
      setMicOn(next)
      setMediaError("")

      try {
        await supabase
          .from("space_participants")
          .update({ audio_enabled: next })
          .eq("space_id", space.id)
          .eq("user_id", user.id)
      } catch {}
    } catch (err) {
      console.error("Mic toggle failed:", err)
      setMediaError("Could not toggle microphone.")
    }
  }

  async function handleToggleCamera() {
    try {
      setMediaError("")

      const next = await toggleCamera(roomRef.current)

      setCameraOn(next)
    } catch (error) {
      console.error(error)
      setMediaError(
        error?.message ||
          "Unable to access your camera.",
      )
    }
  }

  async function handleLeave() {
    // Host: show white confirmation dialog first
    if (isHost) {
      setShowEndConfirm(true)
      return
    }

    // Non-host: leave immediately
    try {
      if (roomRef.current) {
        await disconnectFromSpace(roomRef.current)
        roomRef.current = null
      }
      if (user?.id) {
        await leaveSpace(spaceId, user.id)
      }
    } catch (error) {
      console.error(error)
    } finally {
      navigate("/spaces")
    }
  }

  async function handleEndSpace() {
    if (!isHost) return
    setShowEndConfirm(false)

    try {
      setEnding(true)

      await endSpace(spaceId)

      if (roomRef.current) {
        await disconnectFromSpace(roomRef.current)
        roomRef.current = null
      }

      navigate("/spaces")
    } catch (error) {
      console.error(error)
      setMediaError(
        error?.message || "Unable to end the Space.",
      )
    } finally {
      setEnding(false)
    }
  }

  const toggleSpaceMute = () => {
    const next = !spaceMuted
    setSpaceMuted(next)
    try {
      for (const audio of audioElementsRef.current.values()) {
        audio.muted = next
      }
    } catch {}
  }

  async function handleReaction(emoji) {
    if (!user?.id) return

    const myName =
      user.user_metadata?.full_name ||
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      "You"

    // Optimistic: show my own emoji instantly
    const localItem = {
      id: `local-${Date.now()}-${Math.random()}`,
      emoji,
      userName: myName,
    }
    setReactions((current) => [...current, localItem])
    window.setTimeout(() => {
      setReactions((current) => current.filter((r) => r.id !== localItem.id))
    }, 3200)

    try {
      await sendReaction({
        spaceId,
        userId: user.id,
        userName: myName,
        emoji,
      })
      setShowReactionPicker(false)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleRaiseHand() {
    if (!user?.id) return

    const myName =
      user.user_metadata?.full_name ||
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      "MEC Member"

    try {
      const nextRaised = !handRaised
      await raiseHand(spaceId, user.id, myName, nextRaised)
      setHandRaised(nextRaised)

      setParticipants((current) =>
        current.map((p) =>
          p.user_id === user.id
            ? { ...p, hand_raised: nextRaised }
            : p
        )
      )
    } catch (error) {
      console.error(error)
    }
  }

  const remoteVideoTracks = remoteTracks.filter(
    (item) => item.track.kind === "video",
  )

  if (loading) {
    return (
      <div data-space-room-page className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-amber-400" />
          <p className="text-sm text-gray-600">
            Connecting to MEC Space...
          </p>
        </div>
      </div>
    )
  }

  if (!space) {
    return (
      <div data-space-room-page className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <div className="text-center">
          <p className="mb-4 text-lg font-semibold">
            Space unavailable
          </p>
          <button
            onClick={() => navigate("/spaces")}
            className="rounded-full bg-white/10 px-5 py-3 text-sm"
          >
            Back to Spaces
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40">
      {/* ═══════ BLURRED BACKDROP ═══════ */}
      {!collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          className="absolute inset-0 bg-black/25 backdrop-blur-md"
        />
      )}

      {/* ═══════ BOTTOM SHEET ═══════ */}
      <div
        className="absolute inset-x-0 bottom-[68px] top-[10%] flex flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.35)] transition-transform duration-300"
        style={{ transform: collapsed ? "translateY(calc(100% - 76px))" : "translateY(0)" }}
      >
        {/* Drag handle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full justify-center pt-3 pb-1"
          aria-label="Toggle collapse"
        >
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </button>

        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <button
            onClick={() => setCollapsed(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
            aria-label="Minimize"
          >
            <ChevronDown size={18} strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold tracking-[0.22em] text-gray-900">MEC LIVE</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200">
              <Share2 size={16} />
            </button>
            <button
              onClick={handleLeave}
              className="flex h-9 items-center rounded-full bg-red-50 px-3 text-[11px] font-semibold text-red-500 transition hover:bg-red-100"
            >
              Leave
            </button>
            <button
              onClick={handleLeave}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
              aria-label="Close space"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
          {/* Title + pills */}
          <div className="mb-4 text-center">
            <h1 className="line-clamp-1 text-base font-semibold text-gray-900">
              {space?.title || "MEC Space"}
            </h1>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="rounded-full bg-[#F1E7CC] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A8873F]">
                {space?.mode === "video" ? "Video Space" : "Audio Space"}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                  connectionState === "connected"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {connectionState === "connected" ? "Connected" : connectionState}
              </span>
            </div>
          </div>

          {mediaError && (
            <div className="mx-auto mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <p>{mediaError}</p>
              <button onClick={() => setMediaError("")}><X size={16} /></button>
            </div>
          )}

          {/* Zoom-style video tiles (only for video spaces) */}
          {isVideoSpace && (
            <div className="mb-6 -mx-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 px-4 snap-x snap-mandatory">
                {/* My own tile */}
                <VideoTile
                  participant={{
                    profile: {
                      full_name: user?.user_metadata?.full_name || user?.email,
                      avatar_url: user?.user_metadata?.avatar_url,
                    },
                    user_id: user?.id,
                    name: user?.user_metadata?.full_name || "You",
                    isMicrophoneEnabled: micOn,
                    is_local: true,
                  }}
                  isLocal
                  isActive={activeSpeakers.includes(user?.id)}
                  videoElement={
                    roomRef.current?.localParticipant?.getTrackPublication?.("camera")
                      ? {
                          attached: false,
                          attach: (el) => {
                            const pub = roomRef.current?.localParticipant?.getTrackPublication?.("camera")
                            if (pub?.track?.attach) pub.track.attach(el)
                          },
                        }
                      : null
                  }
                  onClick={() => {}}
                />

                {/* Remote tiles */}
                {remoteVideoTracks.map((item) => {
                  const p = liveParticipants.find(
                    (x) => x.user_id === item.participant.identity
                  ) || item.participant
                  return (
                    <VideoTile
                      key={item.trackSid}
                      participant={{
                        profile: p.profile,
                        user_id: p.user_id || item.participant.identity,
                        name: item.participant.name || item.participant.identity,
                        isMicrophoneEnabled: p.isMicrophoneEnabled,
                        hand_raised: p.hand_raised,
                      }}
                      videoElement={{
                        attached: false,
                        attach: (el) => {
                          if (item.track && item.track.attach) item.track.attach(el)
                        },
                      }}
                      isActive={activeSpeakers.includes(
                        p.user_id || item.participant.identity
                      )}
                      onClick={(e) => openParticipantMenu(p, e)}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Speakers grid (circular) — only for audio spaces */}
          <div className={`grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 ${isVideoSpace ? "hidden" : ""}`}>
            {liveParticipants
              .filter((p) => ["host", "cohost", "speaker"].includes(p.role))
              .slice(0, 20)
              .map((participant) => {
                const name =
                  participant.profile?.full_name ||
                  participant.profile?.username ||
                  participant.name ||
                  participant.identity ||
                  "MEC Member"
                const avatar = participant.profile?.avatar_url
                const isActive = activeSpeakers.includes(participant.user_id)
                const roleLabel =
                  participant.role === "host"
                    ? "Host"
                    : participant.role === "cohost"
                      ? "Co-host"
                      : "Speaker"

                const hasHandRaised = participant.hand_raised ||
                  (participant.user_id === user?.id && handRaised) ||
                  (participant.profile?.id === user?.id && handRaised)

                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={(e) => openParticipantMenu(participant, e)}
                    className="flex flex-col items-center gap-2 transition"
                  >
                    <div className="relative">
                      <div
                        className={`flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full text-lg font-bold ring-2 ring-offset-2 ring-offset-white transition ${
                          isActive ? "ring-emerald-400" : "ring-gray-200"
                        } bg-[#F1E7CC] text-[#A8873F]`}
                      >
                        {avatar ? (
                          <img src={avatar} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          initials(name)
                        )}
                      </div>
                      {hasHandRaised && (
                        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-sm shadow-md">
                          ✋
                        </span>
                      )}
                    </div>
                    <div className="w-full text-center">
                      <p className="truncate text-[12px] font-semibold text-gray-900">
                        {name}
                      </p>
                      <div className="mt-0.5 flex items-center justify-center gap-1">
                        {participant.isMicrophoneEnabled ? (
                          <Mic size={10} className="text-emerald-500" />
                        ) : (
                          <MicOff size={10} className="text-red-500" />
                        )}
                        <span className="text-[10px] font-medium text-gray-500">
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
          </div>

          {liveParticipants.filter((p) =>
            ["host", "cohost", "speaker"].includes(p.role)
          ).length === 0 && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Users className="text-gray-300" size={22} />
              </div>
              <p className="text-sm font-semibold text-gray-700">Waiting for speakers</p>
              <p className="mt-1 text-xs text-gray-400">Tap Request to join the stage</p>
            </div>
          )}



          {/* Listeners row */}
          {liveParticipants.filter((p) => p.role === "listener").length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Listeners · {liveParticipants.filter((p) => p.role === "listener").length}
              </p>
              <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6">
                {liveParticipants
                  .filter((p) => p.role === "listener")
                  .slice(0, 24)
                  .map((participant) => {
                    const name =
                      participant.profile?.full_name ||
                      participant.profile?.username ||
                      participant.name ||
                      participant.identity ||
                      "MEC"
                    const avatar = participant.profile?.avatar_url
                    return (
                      <button
                        key={participant.id}
                        type="button"
                        onClick={(e) => openParticipantMenu(participant, e)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#F1E7CC] text-xs font-bold text-[#A8873F]">
                          {avatar ? (
                            <img src={avatar} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            initials(name)
                          )}
                        </div>
                        <p className="w-full truncate text-[9px] text-gray-500">
                          {name.split(" ")[0]}
                        </p>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </main>

        {/* ═══════ STICKY BOTTOM BAR (inside sheet, above nav) ═══════ */}
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-3">
          <div className="flex items-center justify-between gap-2">
            {/* Left: mic + emoji */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={handleToggleMic}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
                    micOn
                      ? "border-emerald-400 bg-emerald-500 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Mic size={18} />
                </button>
                <span className="text-[9px] font-medium text-gray-500">
                  {micOn ? "Mute" : "Request"}
                </span>
              </div>

              <div className="relative flex flex-col items-center gap-0.5">
                <button
                  onClick={() => setShowReactionPicker((v) => !v)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
                    showReactionPicker
                      ? "border-[#A8873F] bg-[#F1E7CC]"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">❤️</span>
                </button>
                <span className="text-[9px] font-medium text-gray-500">React</span>

                {showReactionPicker && (
                  <div className="absolute bottom-full left-1/2 z-50 mb-3 flex -translate-x-1/2 gap-1 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReaction(emoji)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition hover:scale-125 hover:bg-gray-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRaiseHand}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                  handRaised
                    ? "border-amber-400 bg-amber-400 text-white shadow-lg shadow-amber-400/30"
                    : "border-transparent text-gray-600 hover:bg-gray-100"
                }`}
                aria-label={handRaised ? "Lower hand" : "Raise hand"}
              >
                <Hand size={19} />
              </button>

              <button
                onClick={() => setShowParticipants(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
              >
                <Users size={19} />
              </button>



              <button className="flex h-10 items-center gap-1.5 rounded-full border-2 border-[#1E40AF] bg-[#1E40AF] px-3.5 text-white transition active:border-[#1E40AF] active:bg-transparent active:text-[#1E40AF]">
                <MessageCircle size={15} />
                <span className="text-xs font-bold">{participantCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ COLLAPSED BAR (when minimized) ═══════ */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed inset-x-0 bottom-[68px] z-50 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.15)]"
        >
          {/* All participant avatars, scrollable */}
          <div className="flex -space-x-2 overflow-x-auto max-w-[140px] shrink-0 scrollbar-hide">
            {liveParticipants.map((p) => {
              const av = p.profile?.avatar_url
              const nm = p.profile?.full_name || p.name || "M"
              return (
                <div
                  key={p.id}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#F1E7CC] text-[10px] font-bold text-[#A8873F]"
                >
                  {av ? (
                    <img src={av} alt={nm} className="h-full w-full object-cover" />
                  ) : (
                    nm.charAt(0).toUpperCase()
                  )}
                </div>
              )
            })}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-semibold text-gray-900">
              {activeSpeakers.length > 0
                ? liveParticipants
                    .filter((p) => activeSpeakers.includes(p.user_id))
                    .map((p) => (p.profile?.full_name || p.name || "Someone").split(" ")[0])
                    .slice(0, 2)
                    .join(", ") + (activeSpeakers.length > 2 ? ` +${activeSpeakers.length - 2}` : "")
                : space?.title || "MEC Space"}
            </p>
            <p className="text-[10px] text-gray-500">
              {participantCount} listening · tap to expand
            </p>
          </div>

          {/* Mute space */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleSpaceMute()
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              spaceMuted ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-700"
            }`}
            aria-label="Mute space"
          >
            <Volume2 size={16} />
          </button>

          {/* Close (leave space) */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleLeave()
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-red-50 hover:text-red-500"
            aria-label="Leave space"
          >
            <X size={16} />
          </button>

          <ChevronUp size={18} className="text-gray-400" />
        </button>
      )}

      {/* Participants panel */}
      {showParticipants && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowParticipants(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">People in Space</p>
                <p className="text-sm text-gray-500">
                  {participantCount} participant{participantCount === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={() => setShowParticipants(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {liveParticipants.map((participant) => {
                const name =
                  participant.profile?.full_name ||
                  participant.profile?.username ||
                  participant.name ||
                  participant.identity ||
                  "MEC Member"
                const avatar = participant.profile?.avatar_url
                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={(e) => openParticipantMenu(participant, e)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left transition hover:bg-gray-50"
                  >
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#F1E7CC] text-sm font-bold text-[#A8873F]">
                      {avatar ? (
                        <img src={avatar} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        initials(name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                      <p className="text-xs capitalize text-gray-500">{participant.role}</p>
                    </div>
                    {participant.isMicrophoneEnabled ? (
                      <Mic size={14} className="text-emerald-500" />
                    ) : (
                      <MicOff size={14} className="text-red-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </aside>
        </div>
      )}

      {/* Host-leave confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <button
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowEndConfirm(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <PhoneOff size={22} className="text-red-500" />
            </div>
            <h2 className="mt-4 text-center text-lg font-bold text-gray-900">
              End Space for everyone?
            </h2>
            <p className="mt-1 text-center text-sm text-gray-500">
              You're the host. Leaving will end this MEC Space and disconnect everyone.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleEndSpace}
                disabled={ending}
                className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 disabled:opacity-50"
              >
                <PhoneOff size={15} />
                {ending ? "Ending..." : "End for everyone"}
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                disabled={ending}
                className="rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Stay in Space
              </button>
            </div>
          </div>
        </div>
      )}

      <ParticipantActionMenu
        participant={menuParticipant}
        currentUserRole={currentUserRole}
        anchor={menuAnchor}
        onAction={handleParticipantAction}
        onClose={() => setMenuParticipant(null)}
      />
    </div>
  )
}

export default SpaceRoom