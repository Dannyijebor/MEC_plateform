import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  UserRound,
} from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"
import {
  closeCallChannel,
  createCallChannel,
  endCall,
  sendCallState,
  sendSignal,
} from "../../services/calls/callService"
import {
  addIceCandidate,
  addLocalTracks,
  closePeerConnection,
  createAnswer,
  createOffer,
  createPeerConnection,
  getLocalMedia,
  setRemoteDescription,
  stopMediaStream,
} from "../../services/calls/webrtcService"

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]

export default function Call() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const conversationId = searchParams.get("conversation")
  const mode = searchParams.get("mode") === "video" ? "video" : "audio"

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const peerRef = useRef(null)
  const channelRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const remoteDescSetRef = useRef(false)

  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(mode !== "video")
  const [status, setStatus] = useState("Connecting...")
  const [error, setError] = useState("")
  const [connected, setConnected] = useState(false)
  const [otherUser, setOtherUser] = useState(null)

  // ---------- Fetch other user's profile ----------
  useEffect(() => {
    if (!conversationId || !user) return
    let cancelled = false

    async function loadOtherUser() {
      // Find the other participant's user_id
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id)
        .limit(1)

      if (!members?.[0]) return

      const otherId = members[0].user_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", otherId)
        .single()

      if (!cancelled) setOtherUser(profile)
    }

    loadOtherUser()
    return () => {
      cancelled = true
    }
  }, [conversationId, user])

  // ---------- Main call flow ----------
  useEffect(() => {
    if (!conversationId || !user) {
      setError("Invalid call session.")
      return
    }

    let mounted = true
    const callId = conversationId

    async function startCall() {
      try {
        // 1. Get local media
        const stream = await getLocalMedia({
          audio: true,
          video: mode === "video",
        })

        if (!mounted) {
          stopMediaStream(stream)
          return
        }

        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // 2. Create peer connection
        const peer = createPeerConnection({
          iceServers: ICE_SERVERS,
          onIceCandidate: (candidate) => {
            sendSignal(channelRef.current, { type: "ice", candidate })
          },
          onTrack: (remoteStream) => {
            remoteStreamRef.current = remoteStream
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream
            }
            setConnected(true)
            setStatus("Connected")
          },
          onConnectionStateChange: (state) => {
            if (state === "connected") {
              setConnected(true)
              setStatus("Connected")
            } else if (state === "failed" || state === "disconnected") {
              setStatus("Disconnected")
            }
          },
        })

        peerRef.current = peer
        addLocalTracks(peer, stream)

        // 3. Subscribe to signaling channel
        const channel = createCallChannel(callId, {
          onSignal: async (payload) => {
            if (!peerRef.current || !mounted) return

            if (payload.type === "offer") {
              await setRemoteDescription(peerRef.current, payload.sdp)
              remoteDescSetRef.current = true

              // Flush pending ICE
              for (const c of pendingCandidatesRef.current) {
                try { await addIceCandidate(peerRef.current, c) } catch {}
              }
              pendingCandidatesRef.current = []

              const answer = await createAnswer(peerRef.current)
              await sendSignal(channelRef.current, { type: "answer", sdp: answer })
              setStatus("Connecting...")
            } else if (payload.type === "answer") {
              await setRemoteDescription(peerRef.current, payload.sdp)
              remoteDescSetRef.current = true

              // Flush pending ICE
              for (const c of pendingCandidatesRef.current) {
                try { await addIceCandidate(peerRef.current, c) } catch {}
              }
              pendingCandidatesRef.current = []
            } else if (payload.type === "ice" && payload.candidate) {
              if (remoteDescSetRef.current) {
                try {
                  await addIceCandidate(peerRef.current, payload.candidate)
                } catch (err) {
                  console.warn("ICE failed:", err)
                }
              } else {
                pendingCandidatesRef.current.push(payload.candidate)
              }
            }
          },
          onCallState: (state) => {
            if (state?.peerJoined && !peerRef.current?.localDescription) {
              // Another peer joined — if we're alone, create the offer
              // (handled below via the timeout check)
            }
          },
          onEnded: () => {
            setStatus("Call ended")
            cleanup()
            setTimeout(() => navigate("/messages"), 800)
          },
        })

        channelRef.current = channel

        // 4. Announce we joined
        setTimeout(async () => {
          await sendCallState(channel, { peerJoined: true, userId: user.id })
        }, 500)

        // 5. Create offer after a short delay so the other peer can subscribe
        // If both peers create offers, the first one wins.
        setTimeout(async () => {
          if (!mounted || !peerRef.current) return
          if (peerRef.current.localDescription) return
          try {
            const offer = await createOffer(peerRef.current)
            await sendSignal(channelRef.current, { type: "offer", sdp: offer })
            setStatus("Ringing...")
          } catch (err) {
            console.warn("Offer failed:", err)
          }
        }, 1200)
      } catch (err) {
        console.error("Call error:", err)
        setError(err.message || "Could not start the call.")
      }
    }

    startCall()

    return () => {
      mounted = false
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user, mode])

  // ---------- Cleanup ----------
  function cleanup() {
    stopMediaStream(localStreamRef.current)
    closePeerConnection(peerRef.current)
    closeCallChannel(channelRef.current)
    localStreamRef.current = null
    peerRef.current = null
    channelRef.current = null
    remoteStreamRef.current = null
  }

  // ---------- Actions ----------
  function toggleMute() {
    if (!localStreamRef.current) return
    const audio = localStreamRef.current.getAudioTracks()[0]
    if (!audio) return
    audio.enabled = !audio.enabled
    setMuted(!audio.enabled)
  }

  function toggleCamera() {
    if (!localStreamRef.current) return
    const video = localStreamRef.current.getVideoTracks()[0]
    if (!video) return
    video.enabled = !video.enabled
    setCameraOff(!video.enabled)
  }

  async function hangUp() {
    try {
      await endCall(channelRef.current, "hangup")
    } catch {}
    cleanup()
    navigate("/messages")
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0b1020] px-6 text-center text-white">
        <p className="text-lg font-semibold">Call error</p>
        <p className="text-sm text-white/60">{error}</p>
        <button
          onClick={() => navigate("/messages")}
          className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
        >
          Back to messages
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0b1020] text-white">
      {/* Remote video (full screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Placeholder if no remote video yet */}
      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0b1020] via-[#1a1a3e] to-[#0b1020]">
          <div className="mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[#d9b86c]/30 bg-[#d9b86c]/10 text-4xl font-bold text-[#d9b86c]">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              otherUser?.full_name?.charAt(0) || <UserRound size={40} />
            )}
          </div>
          <p className="text-xl font-semibold">
            {otherUser?.full_name || "Waiting for other user..."}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/60">
            <Loader2 size={14} className="animate-spin" />
            {status}
          </p>
        </div>
      )}

      {/* Local video (picture-in-picture) */}
      {mode === "video" && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-4 top-4 z-20 h-40 w-28 cursor-grab overflow-hidden rounded-2xl border border-white/20 bg-black/50 shadow-2xl sm:h-48 sm:w-36"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {cameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#12182a]">
              <CameraOff size={22} className="text-white/60" />
            </div>
          )}
        </motion.div>
      )}

      {/* Top status */}
      <div className="absolute left-4 top-4 z-10 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md">
        {status}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl">
        <button
          onClick={toggleMute}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
            muted ? "bg-red-500/90 text-white" : "bg-white/15 text-white hover:bg-white/25"
          }`}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={hangUp}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
          aria-label="End call"
        >
          <PhoneOff size={22} />
        </button>

        {mode === "video" && (
          <button
            onClick={toggleCamera}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              cameraOff ? "bg-red-500/90 text-white" : "bg-white/15 text-white hover:bg-white/25"
            }`}
            aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {cameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
          </button>
        )}
      </div>
    </div>
  )
}
