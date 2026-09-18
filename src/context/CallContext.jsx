import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react"
import { useAuth } from "../hooks/useAuth"
import {
  createCallChannel,
  closeCallChannel,
  endCall,
  sendSignal,
  sendCallState,
  broadcastCallCancelled,
} from "../services/calls/callService"
import {
  getLocalMedia,
  createPeerConnection,
  addLocalTracks,
  createOffer,
  createAnswer,
  setRemoteDescription,
  addIceCandidate,
  stopMediaStream,
  closePeerConnection,
} from "../services/calls/webrtcService"
import { logCallEvent } from "../services/chat/chatService"

const CallContext = createContext(null)

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // Free public TURN relay (helps with cellular/NAT)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
]

export function CallProvider({ children }) {
  const { user } = useAuth()

  const [call, setCall] = useState(null) // { conversationId, mode, otherUser, startedAt }
  const [status, setStatus] = useState("idle")
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [remoteHandRaised, setRemoteHandRaised] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState([])
  const [endedReason, setEndedReason] = useState(null)
  const [lastCallEndedAt, setLastCallEndedAt] = useState(0)
  const [endedConversationId, setEndedConversationId] = useState(null)

  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const peerRef = useRef(null)
  const channelRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const remoteDescSetRef = useRef(false)
  const startTimeRef = useRef(null)

  const broadcastEvent = useCallback(async (event, payload = {}) => {
    try {
      if (channelRef.current) {
        await channelRef.current.send({ type: "broadcast", event, payload })
      }
    } catch (err) {
      console.warn("Broadcast failed:", err)
    }
  }, [])

  const cleanup = useCallback(() => {
    stopMediaStream(localStreamRef.current)
    closePeerConnection(peerRef.current)
    closeCallChannel(channelRef.current)
    localStreamRef.current = null
    peerRef.current = null
    channelRef.current = null
    remoteStreamRef.current = null
    pendingCandidatesRef.current = []
    remoteDescSetRef.current = false
    setConnected(false)
    setMuted(false)
    setCameraOff(false)
    setHandRaised(false)
    setRemoteHandRaised(false)
    setFloatingEmojis([])
  }, [])

  const hangUp = useCallback(async (reason = "user-ended") => {
    const currentCall = call
    try { await endCall(channelRef.current, "hangup") } catch {}

    if (currentCall?.otherUser?.id && user?.id) {
      try {
        await broadcastCallCancelled(currentCall.otherUser.id, {
          callerId: user.id,
          callerName: user.user_metadata?.full_name || user.email || "MEC Member",
        })
      } catch {}
    }

    if (currentCall?.conversationId && user?.id) {
      try {
        const durationSeconds = connected && startTimeRef.current
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : 0
        await logCallEvent({
          conversationId: currentCall.conversationId,
          callerId: user.id,
          callerName: user.user_metadata?.full_name || user.email || "MEC Member",
          calleeId: currentCall.otherUser?.id,
          calleeName: currentCall.otherUser?.full_name || currentCall.otherUser?.username,
          status: connected ? "answered" : "missed",
          mode: currentCall.mode,
          durationSeconds,
        })
      } catch {}
    }

    cleanup()
    setCall(null)
    setStatus("idle")
    setEndedReason(reason)
    setLastCallEndedAt(Date.now())
    setEndedConversationId(currentCall?.conversationId || null)
  }, [call, connected, user, cleanup])

  const startCall = useCallback(async ({ conversationId, mode, otherUser }) => {
    if (!user?.id || !conversationId) return

    // Clear any previous "ended" state and reset cooldown
    setEndedReason(null)
    setLastCallEndedAt(0)
    setEndedConversationId(null)

    cleanup()
    setCall({ conversationId, mode, otherUser, startedAt: Date.now() })

    // Notify the callee via push — insert a ring row that fires the DB trigger
    if (otherUser?.id) {
      try {
        await supabase.from("call_rings").insert({
          conversation_id: conversationId,
          caller_id: user.id,
          callee_id: otherUser.id,
          mode,
          status: "ringing",
        })
      } catch (err) {
        console.warn("Failed to create call ring:", err)
      }
    }
    setStatus("Connecting...")
    setCameraOff(mode !== "video")
    startTimeRef.current = Date.now()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: mode === "video" ? { facingMode: "user" } : false,
      })
      localStreamRef.current = stream

      // Make sure our own audio element can play
      const el = remoteAudioRef.current
      if (el) {
        el.muted = false
        el.volume = 1
      }

      const peer = createPeerConnection({
        iceServers: ICE_SERVERS,
        onIceCandidate: (candidate) =>
          sendSignal(channelRef.current, { type: "ice", candidate }),
        onTrack: (remoteStream) => {
          remoteStreamRef.current = remoteStream
          // Attach to dedicated audio element for reliable playback
          const attach = () => {
            const el = remoteAudioRef.current
            if (!el) return
            if (el.srcObject !== remoteStream) {
              el.srcObject = remoteStream
            }
            el.muted = false
            el.volume = 1
            el.play().catch((err) => {
              console.warn("Remote audio autoplay blocked, will retry:", err)
              // Retry on next user interaction
              const retry = () => {
                el.play().catch(() => {})
                document.removeEventListener("click", retry)
                document.removeEventListener("touchstart", retry)
              }
              document.addEventListener("click", retry, { once: true })
              document.addEventListener("touchstart", retry, { once: true })
            })
          }
          attach()
          // Belt and braces: attach again in case the element isn't mounted yet
          setTimeout(attach, 100)
          setTimeout(attach, 500)
          setConnected(true)
          setStatus("Connected")
        },
        onConnectionStateChange: (state) => {
          if (state === "connected") {
            setConnected(true)
            setStatus("Connected")
          } else if (state === "disconnected") {
            setStatus("Reconnecting...")
          } else if (state === "failed") {
            setStatus("Disconnected")
          } else if (state === "connecting" || state === "new") {
            setStatus("Connecting...")
          }
        },
      })
      peerRef.current = peer
      addLocalTracks(peer, stream)

      const channel = createCallChannel(conversationId, {
        onSignal: async (payload) => {
          if (!peerRef.current) return
          if (payload.type === "offer") {
            await setRemoteDescription(peerRef.current, payload.sdp)
            remoteDescSetRef.current = true
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
            for (const c of pendingCandidatesRef.current) {
              try { await addIceCandidate(peerRef.current, c) } catch {}
            }
            pendingCandidatesRef.current = []
          } else if (payload.type === "ice" && payload.candidate) {
            if (remoteDescSetRef.current) {
              try { await addIceCandidate(peerRef.current, payload.candidate) } catch {}
            } else {
              pendingCandidatesRef.current.push(payload.candidate)
            }
          }
        },
        onRaiseHand: (payload) => setRemoteHandRaised(payload?.raised || false),
        onEmoji: (payload) => {
          const id = `${Date.now()}-${Math.random()}`
          setFloatingEmojis((c) => [...c, { id, emoji: payload.emoji, from: "them" }])
          setTimeout(() => setFloatingEmojis((c) => c.filter((e) => e.id !== id)), 3000)
        },
        onEnded: () => hangUp("remote-ended"),
      })
      channelRef.current = channel

      setTimeout(async () => {
        await sendCallState(channel, { peerJoined: true, userId: user.id })
      }, 500)

      setTimeout(async () => {
        if (!peerRef.current || peerRef.current.localDescription) return
        try {
          const offer = await createOffer(peerRef.current)
          await sendSignal(channelRef.current, { type: "offer", sdp: offer })
          setStatus("Ringing...")
        } catch (err) { console.warn("Offer failed:", err) }
      }, 1200)
    } catch (err) {
      console.error("Call setup error:", err)
      cleanup()
      setCall(null)
      setStatus("idle")
    }
  }, [user, cleanup, hangUp])

  const toggleMute = useCallback(() => {
    const audio = localStreamRef.current?.getAudioTracks()?.[0]
    if (!audio) return
    audio.enabled = !audio.enabled
    setMuted(!audio.enabled)
  }, [])

  const toggleCamera = useCallback(() => {
    const video = localStreamRef.current?.getVideoTracks()?.[0]
    if (!video) return
    video.enabled = !video.enabled
    setCameraOff(!video.enabled)
  }, [])

  const toggleRaiseHand = useCallback(() => {
    const next = !handRaised
    setHandRaised(next)
    broadcastEvent("raise-hand", { raised: next, userId: user?.id })
  }, [handRaised, broadcastEvent, user?.id])

  const sendEmoji = useCallback((emoji) => {
    const id = `${Date.now()}-${Math.random()}`
    setFloatingEmojis((c) => [...c, { id, emoji, from: "me" }])
    setTimeout(() => setFloatingEmojis((c) => c.filter((e) => e.id !== id)), 3000)
    broadcastEvent("emoji", { emoji, userId: user?.id })
  }, [broadcastEvent, user?.id])

  // Toggle body class ONLY while the full-screen call page is active
  useEffect(() => {
    const applyClass = () => {
      const onCallPage = typeof window !== "undefined" && window.location.pathname === "/calls"
      if (call && onCallPage) {
        document.body.classList.add("call-active")
      } else {
        document.body.classList.remove("call-active")
      }
    }
    applyClass()

    // Listen for navigation changes (back button, links, etc.)
    const onPopOrPush = () => applyClass()
    window.addEventListener("popstate", onPopOrPush)
    // Hook into pushState / replaceState
    const origPush = window.history.pushState
    const origReplace = window.history.replaceState
    window.history.pushState = function (...args) {
      const r = origPush.apply(this, args)
      onPopOrPush()
      return r
    }
    window.history.replaceState = function (...args) {
      const r = origReplace.apply(this, args)
      onPopOrPush()
      return r
    }

    const interval = setInterval(applyClass, 400)

    return () => {
      clearInterval(interval)
      window.removeEventListener("popstate", onPopOrPush)
      window.history.pushState = origPush
      window.history.replaceState = origReplace
      document.body.classList.remove("call-active")
    }
  }, [call])

  return (
    <CallContext.Provider
      value={{
        call,
        status,
        connected,
        muted,
        cameraOff,
        handRaised,
        remoteHandRaised,
        floatingEmojis,
        endedReason,
        localStreamRef,
        remoteStreamRef,
        remoteAudioRef,
        startCall,
        hangUp,
        toggleMute,
        toggleCamera,
        toggleRaiseHand,
        sendEmoji,
      }}
    >
      {children}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />
    </CallContext.Provider>
  )
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error("useCall must be used inside CallProvider")
  return ctx
}
