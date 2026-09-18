import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
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
    accent: "from-blue-400 to-cyan-500",
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
      <div className="flex min-h-screen items-center justify-center bg-[#050914] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="text-sm text-white/60">
            Connecting to MEC Space...
          </p>
        </div>
      </div>
    )
  }

  if (!space) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050914] text-white">
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
    <div className="relative min-h-screen overflow-hidden bg-[#050914] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-br ${theme.accent} opacity-10 blur-[120px]`}
        />
        <div className="absolute bottom-[-180px] right-[-100px] h-[420px] w-[420px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur-xl sm:px-6">
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={17} />
          Leave
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 animate-pulse rounded-full bg-gradient-to-r ${theme.accent}`}
          />
          <span className="text-xs font-bold tracking-[0.22em] text-white/80">
            MEC LIVE
          </span>
        </div>

        <button
          onClick={() => setShowParticipants(true)}
          className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/75 hover:bg-white/10"
        >
          <Users size={17} />
          {participantCount}
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full bg-gradient-to-r ${theme.accent} px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950`}
            >
              {space.mode === "audio"
                ? "Audio Space"
                : space.mode === "video"
                  ? "Video Space"
                  : "Audio + Video"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                connectionState === "connected"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-amber-400/10 text-amber-300"
              }`}
            >
              {connectionState === "connected"
                ? "Connected"
                : connectionState}
            </span>
          </div>

          <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
            {space.title}
          </h1>

          {space.description && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55 sm:text-base">
              {space.description}
            </p>
          )}
        </div>

        {mediaError && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            <p>{mediaError}</p>
            <button onClick={() => setMediaError("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {isVideoSpace && remoteVideoTracks.length > 0 ? (
          <div className="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {remoteVideoTracks.map((item) => (
              <div
                key={item.trackSid}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
              >
                <RemoteVideo track={item.track} />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                  <p className="text-sm font-semibold">
                    {item.participant.name ||
                      item.participant.identity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {liveParticipants
                .filter((participant) =>
                  ["host", "cohost", "speaker"].includes(
                    participant.role,
                  ),
                )
                .slice(0, 20)
                .map((participant) => (
                  <ParticipantCard
                    key={participant.id}
                    participant={participant}
                    active={activeSpeakers.includes(
                      participant.user_id,
                    )}
                    onTap={(e) => openParticipantMenu(participant, e)}
                  />
                ))}
            </div>

            {liveParticipants.filter((participant) =>
              ["host", "cohost", "speaker"].includes(
                participant.role,
              ),
            ).length === 0 && (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                  <Users className="text-white/30" size={30} />
                </div>
                <p className="font-semibold">
                  Waiting for speakers
                </p>
                <p className="mt-1 text-sm text-white/40">
                  Raise your hand if you want to join the stage.
                </p>
              </div>
            )}
          </div>
        )}

        {isVideoSpace && (
          <div className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {liveParticipants
                .filter((participant) =>
                  ["host", "cohost", "speaker"].includes(
                    participant.role,
                  ),
                )
                .map((participant) => (
                  <ParticipantCard
                    key={`profile-${participant.id}`}
                    participant={participant}
                    active={activeSpeakers.includes(
                      participant.user_id,
                    )}
                    onTap={(e) => openParticipantMenu(participant, e)}
                  />
                ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleToggleMic}
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-200 ${
              micOn
                ? "border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "border-red-400 bg-red-500 text-white shadow-lg shadow-red-500/30"
            }`}
            title={micOn ? "Mute microphone" : "Unmute microphone"}
          >
            {micOn ? <Mic size={21} /> : <MicOff size={21} />}
          </button>

          {isVideoSpace && (
            <button
              onClick={handleToggleCamera}
              className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
                cameraOn
                  ? "border-white/10 bg-white/10"
                  : "border-white/10 bg-white/5 text-white/50"
              }`}
              title={cameraOn ? "Turn camera off" : "Turn camera on"}
            >
              {cameraOn ? (
                <Camera size={21} />
              ) : (
                <CameraOff size={21} />
              )}
            </button>
          )}

          <button
            onClick={handleRaiseHand}
            disabled={handRaised}
            className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
              handRaised
                ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                : "border-white/10 bg-white/5"
            }`}
            title={handRaised ? "Hand raised" : "Raise hand"}
          >
            <Hand size={21} />
          </button>

          <div className="relative">
            <button
              onClick={() =>
                setShowReactionPicker((current) => !current)
              }
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5"
              title="React"
            >
              <span className="text-xl">❤️</span>
            </button>

            {showReactionPicker && (
              <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition hover:bg-white/10 hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5"
            title="More controls"
          >
            <MoreHorizontal size={21} />
          </button>

          {isHost ? (
            <button
              onClick={handleEndSpace}
              disabled={ending}
              className="flex h-14 items-center gap-2 rounded-full bg-rose-500 px-6 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400 disabled:opacity-50"
            >
              <PhoneOff size={19} />
              {ending ? "Ending..." : "End Space"}
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="flex h-14 items-center gap-2 rounded-full bg-rose-500 px-6 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400"
            >
              <PhoneOff size={19} />
              Leave
            </button>
          )}
        </div>

        <div className="relative mt-7 min-h-12">
          <div className="flex justify-center gap-2">
            {liveParticipants
              .filter(
                (participant) =>
                  !["host", "cohost", "speaker"].includes(
                    participant.role,
                  ),
              )
              .slice(0, 12)
              .map((participant) => (
                <div
                  key={participant.id}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-bold"
                  title={
                    participant.profile?.full_name ||
                    participant.profile?.username ||
                    "MEC Member"
                  }
                >
                  {initials(
                    participant.profile?.full_name ||
                      participant.profile?.username ||
                      "MEC",
                  )}
                </div>
              ))}
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center overflow-hidden">
            <div className="relative h-48 w-24">
              {reactions.map((reaction, index) => (
                <span
                  key={reaction.id}
                  className="absolute bottom-0 animate-[floatReaction_3.2s_ease-out_forwards] text-3xl"
                  style={{
                    left: `${20 + ((index * 29) % 50)}px`,
                  }}
                >
                  {reaction.emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {showParticipants && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowParticipants(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-[#080d1b] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">
                  People in Space
                </p>
                <p className="text-sm text-white/40">
                  {participantCount} participant
                  {participantCount === 1 ? "" : "s"}
                </p>
              </div>

              <button
                onClick={() => setShowParticipants(false)}
                className="rounded-full bg-white/5 p-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto">
              {liveParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] p-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                    {initials(
                      participant.profile?.full_name ||
                        participant.profile?.username ||
                        "MEC",
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {participant.profile?.full_name ||
                        participant.profile?.username ||
                        "MEC Member"}
                    </p>
                    <p className="text-xs capitalize text-white/40">
                      {participant.role}
                    </p>
                  </div>

                  {participant.audio_enabled ? (
                    <Mic size={16} className="text-emerald-300" />
                  ) : (
                    <MicOff
                      size={16}
                      className="text-white/25"
                    />
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <style>{`
        @keyframes floatReaction {
          0% {
            transform: translateY(0) scale(0.7);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translateY(-180px) scale(1.15);
            opacity: 0;
          }
        }
      `}</style>
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