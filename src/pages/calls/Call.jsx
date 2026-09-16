import { useEffect, useRef, useState } from "react"
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  UserRound,
  Wifi,
} from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import {
  closeCallChannel,
  createCallChannel,
  sendCallState,
} from "../../services/calls/callService"
import {
  addLocalTracks,
  closePeerConnection,
  createAnswer,
  createOffer,
  createPeerConnection,
  getLocalMedia,
  setRemoteDescription,
  stopMediaStream,
} from "../../services/calls/webrtcService"

function Call() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const callId = searchParams.get("call")
  const mode = searchParams.get("mode") === "video" ? "video" : "audio"

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerRef = useRef(null)
  const channelRef = useRef(null)
  const localStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])

  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(mode !== "video")
  const [status, setStatus] = useState("Connecting...")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!callId || !user) {
      setError("Invalid call.")
      return
    }

    let mounted = true

    async function startCall() {
      try {
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

        const peer = createPeerConnection({
          onIceCandidate: async (candidate) => {
            if (channelRef.current) {
              await channelRef.current.send({
                type: "broadcast",
                event: "signal",
                payload: {
                  type: "ice-candidate",
                  candidate,
                  senderId: user.id,
                },
              })
            }
          },

          onTrack: (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream
            }
          },

          onConnectionStateChange: (connectionState) => {
            if (!mounted) return

            if (connectionState === "connected") {
              setStatus("Connected")
            } else if (
              connectionState === "disconnected" ||
              connectionState === "failed"
            ) {
              setStatus("Connection lost")
            } else {
              setStatus("Connecting...")
            }
          },
        })

        peerRef.current = peer
        addLocalTracks(peer, stream)

        const channel = createCallChannel(callId, {
          onSignal: async (signal) => {
            if (!mounted || signal.senderId === user.id) return

            try {
              if (signal.type === "offer") {
                await setRemoteDescription(peer, signal.offer)

                for (const candidate of pendingCandidatesRef.current) {
                  await peer.addIceCandidate(candidate)
                }

                pendingCandidatesRef.current = []

                const answer = await createAnswer(peer)

                await channel.send({
                  type: "broadcast",
                  event: "signal",
                  payload: {
                    type: "answer",
                    answer,
                    senderId: user.id,
                  },
                })
              }

              if (signal.type === "answer") {
                await setRemoteDescription(peer, signal.answer)

                for (const candidate of pendingCandidatesRef.current) {
                  await peer.addIceCandidate(candidate)
                }

                pendingCandidatesRef.current = []
              }

              if (signal.type === "ice-candidate") {
                const candidate = new RTCIceCandidate(
                  signal.candidate,
                )

                if (peer.remoteDescription) {
                  await peer.addIceCandidate(candidate)
                } else {
                  pendingCandidatesRef.current.push(candidate)
                }
              }

              if (signal.type === "end-call") {
                endCall(false)
              }
            } catch (signalError) {
              console.error("Call signaling error:", signalError)
            }
          },

          onCallState: (state) => {
            if (state?.status === "ended") {
              endCall(false)
            }
          },
        })

        channelRef.current = channel

        await new Promise((resolve) => {
          setTimeout(resolve, 500)
        })

        const offer = await createOffer(peer)

        await channel.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "offer",
            offer,
            senderId: user.id,
          },
        })

        setStatus("Calling...")
      } catch (callError) {
        console.error(callError)

        if (mounted) {
          setError(
            callError?.message ||
              "Unable to access your microphone or camera.",
          )
          setStatus("Call unavailable")
        }
      }
    }

    startCall()

    return () => {
      mounted = false

      stopMediaStream(localStreamRef.current)
      closePeerConnection(peerRef.current)
      closeCallChannel(channelRef.current)

      peerRef.current = null
      channelRef.current = null
      localStreamRef.current = null
    }
  }, [callId, mode, user])

  async function endCall(notify = true) {
    if (notify && channelRef.current) {
      await sendCallState(channelRef.current, {
        status: "ended",
        userId: user?.id,
      })

      await channelRef.current.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "end-call",
          senderId: user?.id,
        },
      })
    }

    stopMediaStream(localStreamRef.current)
    closePeerConnection(peerRef.current)
    closeCallChannel(channelRef.current)

    peerRef.current = null
    channelRef.current = null
    localStreamRef.current = null

    navigate("/messages")
  }

  function toggleMute() {
    const stream = localStreamRef.current
    if (!stream) return

    const audioTracks = stream.getAudioTracks()

    audioTracks.forEach((track) => {
      track.enabled = !track.enabled
    })

    setMuted((value) => !value)
  }

  function toggleCamera() {
    if (mode !== "video") return

    const stream = localStreamRef.current
    if (!stream) return

    const videoTracks = stream.getVideoTracks()

    videoTracks.forEach((track) => {
      track.enabled = !track.enabled
    })

    setCameraOff((value) => !value)
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#202635]/[0.09] bg-white/[0.05] p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-300">
            <Wifi size={28} />
          </div>

          <h1 className="text-xl font-semibold">
            Call unavailable
          </h1>

          <p className="mt-3 text-sm text-white/55">{error}</p>

          <button
            type="button"
            onClick={() => navigate("/messages")}
            className="mt-6 rounded-xl bg-[#d9b86c] px-5 py-3 text-sm font-semibold text-[#17130c] transition hover:bg-[#e4c77f]"
          >
            Return to messages
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-[#202635]/[0.09] bg-[#faf8f3]/92 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(217,184,108,0.12),transparent_35%)]" />

      <div className="relative flex min-h-[calc(100vh-120px)] flex-col">
        <header className="flex items-center justify-between border-b border-[#202635]/[0.09] px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#d9b86c]/70">
              MEC Call
            </p>

            <h1 className="mt-1 text-lg font-semibold">
              {mode === "video" ? "Video Call" : "Audio Call"}
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#202635]/[0.09] bg-white/[0.05] px-3 py-1.5 text-xs text-white/65">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {status}
          </div>
        </header>

        <main className="relative flex flex-1 items-center justify-center p-4 sm:p-8">
          {mode === "video" ? (
            <div className="relative h-full min-h-[420px] w-full max-w-5xl overflow-hidden rounded-3xl border border-[#202635]/[0.09] bg-black/40 shadow-2xl">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full min-h-[420px] w-full object-cover"
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[#202635]/[0.09] bg-white/[0.06] text-white/30">
                  <UserRound size={40} />
                </div>
              </div>

              <div className="absolute right-4 top-4 h-32 w-24 overflow-hidden rounded-2xl border border-white/15 bg-[#12182a] shadow-xl sm:h-44 sm:w-32">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />

                {cameraOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#12182a] text-white/50">
                    <CameraOff size={24} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border border-[#d9b86c]/30 bg-[#d9b86c]/10 shadow-[0_0_80px_rgba(217,184,108,0.12)]">
                <UserRound size={52} className="text-[#d9b86c]" />
              </div>

              <h2 className="mt-6 text-2xl font-semibold">
                MEC Member
              </h2>

              <p className="mt-2 text-sm text-white/45">
                {status}
              </p>
            </div>
          )}
        </main>

        <footer className="flex items-center justify-center gap-3 border-t border-[#202635]/[0.09] px-4 py-5 sm:gap-4">
          <button
            type="button"
            onClick={toggleMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
              muted
                ? "border-red-400/30 bg-red-400/15 text-red-300"
                : "border-[#202635]/[0.09] bg-white/[0.07] text-white hover:bg-white/[0.12]"
            }`}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {mode === "video" && (
            <button
              type="button"
              onClick={toggleCamera}
              className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
                cameraOff
                  ? "border-red-400/30 bg-red-400/15 text-red-300"
                  : "border-[#202635]/[0.09] bg-white/[0.07] text-white hover:bg-white/[0.12]"
              }`}
              aria-label={
                cameraOff ? "Turn camera on" : "Turn camera off"
              }
            >
              {cameraOff ? (
                <CameraOff size={20} />
              ) : (
                <Camera size={20} />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => endCall(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400"
            aria-label="End call"
          >
            <PhoneOff size={22} />
          </button>
        </footer>
      </div>
    </div>
  )
}

export default Call
