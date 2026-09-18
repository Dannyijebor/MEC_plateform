import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  // unused
  ChevronDown,
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

  const currentUserRole = (() => {
    const me = participants.find((p) => p.user_id === user?.id)
    return me?.role || (isHost ? "host" : "listener")
  })()

  const handleParticipantAction = async (actionKey) => {
    if (!menuParticipant || !space?.id) return
    const targetUserId = menuParticipant.user_id || menuParticipant.id
    if (!targetUserId) return

    try {
      if (actionKey === "make-speaker") {
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
    let realtimeChannel = null

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
        realtimeChannel = supabase
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

    realtimeChannel = subscribeToSpace(spaceId, {
      onParticipantChange: refreshParticipants,
      onReaction: (reaction) => {
        if (!mounted) return

        const item = {
          id: `${reaction.id}-${Date.now()}`,
          emoji: reaction.emoji,
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

      if (realtimeChannel) {
        unsubscribeFromSpace(realtimeChannel)
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

    const confirmed = window.confirm(
      "End this MEC Space for everyone?",
    )

    if (!confirmed) return

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

  async function handleReaction(emoji) {
    if (!user?.id) return

    try {
      await sendReaction({
        spaceId,
        userId: user.id,
        emoji,
      })

      setShowReactionPicker(false)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleRaiseHand() {
    if (!user?.id) return

    try {
      await raiseHand(spaceId, user.id)
      setHandRaised(true)
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
    <div data-space-room-page className="relative flex min-h-screen flex-col bg-white text-gray-900">

      {/* ═══════════ HEADER ═══════════ */}
      <header className="relative z-30 flex items-center justify-between px-4 py-3 sm:px-6">
        <button
          onClick={handleLeave}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
          aria-label="Minimize"
        >
          <ChevronDown size={20} strokeWidth={2.5} />
        </button>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-bold tracking-[0.22em] text-gray-900">MEC LIVE</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
            aria-label="Share"
          >
            <Share2 size={18} />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
            aria-label="More"
          >
            <MoreHorizontal size={18} />
          </button>
          <button
            onClick={handleLeave}
            className="flex h-10 items-center rounded-full bg-red-50 px-4 text-sm font-semibold text-red-500 transition hover:bg-red-100"
          >
            Leave
          </button>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-40 sm:px-6">

        {/* Space title + status pills */}
        <div className="mb-6 text-center">
          <h1 className="line-clamp-1 text-lg font-semibold text-gray-900">
            {space?.title || "MEC Space"}
          </h1>
          {space?.description && (
            <p className="mx-auto mt-1 line-clamp-1 max-w-md text-xs text-gray-500">
              {space.description}
            </p>
          )}

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="rounded-full bg-[#F1E7CC] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A8873F]">
              {space?.mode === "video" ? "Video Space" : "Audio Space"}
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
              connectionState === "connected"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600"
            }`}>
              {connectionState === "connected" ? "Connected" : connectionState}
            </span>
          </div>
        </div>

        {mediaError && (
          <div className="mx-auto mb-5 flex max-w-md items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <p>{mediaError}</p>
            <button onClick={() => setMediaError("")}><X size={16} /></button>
          </div>
        )}

        {/* ═══ SPEAKERS GRID (circular, X Spaces style) ═══ */}
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-5">
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
                const roleLabel = participant.role === "host" ? "Host" : participant.role === "cohost" ? "Co-host" : "Speaker"
                const micLive = participant.isMicrophoneEnabled

                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={(e) => openParticipantMenu(participant, e)}
                    className="group flex flex-col items-center gap-2 transition"
                  >
                    <div className="relative">
                      <div className={`flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-full text-xl font-bold ring-2 ring-offset-2 ring-offset-white transition ${
                        isActive ? "ring-emerald-400" : "ring-gray-200"
                      } bg-[#F1E7CC] text-[#A8873F]`}>
                        {avatar ? (
                          <img src={avatar} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          initials(name)
                        )}
                      </div>
                    </div>
                    <div className="w-full text-center">
                      <p className="truncate text-[13px] font-semibold text-gray-900">{name}</p>
                      <div className="mt-0.5 flex items-center justify-center gap-1">
                        {micLive ? (
                          <Mic size={10} className="text-emerald-500" />
                        ) : (
                          <MicOff size={10} className="text-red-500" />
                        )}
                        <span className={`text-[11px] font-medium ${
                          participant.role === "host" ? "text-amber-600" :
                          participant.role === "cohost" ? "text-gray-600" :
                          "text-gray-500"
                        }`}>
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
          </div>

          {liveParticipants.filter((p) => ["host", "cohost", "speaker"].includes(p.role)).length === 0 && (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Users className="text-gray-300" size={26} />
              </div>
              <p className="text-sm font-semibold text-gray-700">Waiting for speakers</p>
              <p className="mt-1 text-xs text-gray-400">Tap Request to join the stage</p>
            </div>
          )}
        </div>

        {/* ═══ FOLLOW HOST CTA ═══ */}
        <div className="mt-6 flex items-center justify-center gap-2 rounded-full bg-gray-50 px-3 py-2">
          <p className="text-[13px] font-medium text-gray-700">Like what you're hearing?</p>
          <button className="rounded-full bg-gray-900 px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-gray-800">
            Follow host
          </button>
          <button className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
            <X size={14} />
          </button>
        </div>

        {/* ═══ LISTENERS ROW ═══ */}
        {liveParticipants.filter((p) => p.role === "listener").length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Listeners · {liveParticipants.filter((p) => p.role === "listener").length}
            </p>
            <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
              {liveParticipants
                .filter((p) => p.role === "listener")
                .slice(0, 24)
                .map((participant) => {
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
                      className="flex flex-col items-center gap-1.5 transition hover:opacity-80"
                    >
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#F1E7CC] text-sm font-bold text-[#A8873F]">
                        {avatar ? (
                          <img src={avatar} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          initials(name)
                        )}
                      </div>
                      <p className="w-full truncate text-[10px] text-gray-500">{name.split(" ")[0]}</p>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* Floating emojis */}
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center overflow-hidden">
          <div className="relative h-48 w-24">
            {reactions.map((reaction, index) => (
              <span
                key={reaction.id}
                className="absolute bottom-0 animate-[floatReaction_3.2s_ease-out_forwards] text-3xl"
                style={{ left: `${20 + ((index * 29) % 50)}px` }}
              >
                {reaction.emoji}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* ═══════════ BOTTOM BAR (X Spaces style) ═══════════ */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-6">
        <div className="mx-auto flex max-w-lg items-end justify-between gap-2">

          {/* Left: Request mic */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleToggleMic}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition ${
                micOn
                  ? "border-emerald-400 bg-emerald-500 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              aria-label={micOn ? "Mute" : "Request to speak"}
            >
              {micOn ? <Mic size={20} /> : <Mic size={20} />}
            </button>
            <span className="text-[10px] font-medium text-gray-500">
              {micOn ? "Mute" : "Request"}
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRaiseHand}
              disabled={handRaised}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                handRaised ? "bg-amber-100 text-amber-600" : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-label="Raise hand"
            >
              <Hand size={20} />
            </button>

            <button
              onClick={() => setShowParticipants(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
              aria-label="People"
            >
              <Users size={20} />
            </button>

            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
              aria-label="Like"
            >
              <Heart size={20} />
            </button>

            {/* Blue message pill — transparent when tapped */}
            <button
              onClick={() => {
                const el = document.activeElement
                el?.blur?.()
              }}
              className="group flex h-10 items-center gap-1.5 rounded-full border-2 border-[#1E40AF] bg-[#1E40AF] px-3.5 text-white transition active:border-[#1E40AF] active:bg-transparent active:text-[#1E40AF]"
            >
              <MessageCircle size={16} />
              <span className="text-xs font-bold">{participantCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ PARTICIPANTS PANEL ═══════════ */}
      {showParticipants && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowParticipants(false)}
            aria-label="Close"
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