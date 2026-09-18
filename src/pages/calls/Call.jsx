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
  Volume2,
  VolumeX,
  Bluetooth,
  Hand,
  Smile,
} from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "../../hooks/useAuth"
import { useCall } from "../../context/CallContext"
import AudioWave from "../../components/chat/AudioWave"
import { supabase } from "../../lib/supabase"

export default function Call() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const {
    call,
    status,
    connected,
    muted,
    cameraOff,
    handRaised,
    remoteHandRaised,
    floatingEmojis,
    endedReason,
    lastCallEndedAt,
    endedConversationId,
    localStreamRef,
    remoteStreamRef,
    startCall,
    hangUp,
    toggleMute,
    toggleCamera,
    toggleRaiseHand,
    sendEmoji,
  } = useCall()

  const conversationId = searchParams.get("conversation")
  const mode = searchParams.get("mode") === "video" ? "video" : "audio"

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const bootAttemptedRef = useRef(false)

  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [audioOutput, setAudioOutput] = useState("speaker")
  const [hasBluetooth, setHasBluetooth] = useState(false)

  // Boot the call if not already running — ONCE per mount only
  useEffect(() => {
    if (bootAttemptedRef.current) return
    if (!conversationId || !user?.id) return

    // If a call is already running for this conversation, mark as attempted and stop
    if (call?.conversationId === conversationId) {
      bootAttemptedRef.current = true
      return
    }

    // If this conversation recently ended, don't restart
    if (
      endedReason &&
      endedConversationId === conversationId &&
      lastCallEndedAt &&
      Date.now() - lastCallEndedAt < 5000
    ) {
      bootAttemptedRef.current = true
      return
    }

    bootAttemptedRef.current = true

    let cancelled = false
    async function boot() {
      try {
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id)
          .limit(1)

        if (!members?.[0] || cancelled) return

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", members[0].user_id)
          .single()

        if (cancelled) return
        startCall({ conversationId, mode, otherUser: profile })
      } catch (err) {
        console.warn("Failed to boot call:", err)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [conversationId, user?.id, call?.conversationId, lastCallEndedAt, endedReason, endedConversationId, mode, startCall])

  // Bind video streams continuously (streams become available at different times)
  useEffect(() => {
    const bind = () => {
      if (
        localVideoRef.current &&
        localStreamRef.current &&
        localVideoRef.current.srcObject !== localStreamRef.current
      ) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      if (
        remoteVideoRef.current &&
        remoteStreamRef.current &&
        remoteVideoRef.current.srcObject !== remoteStreamRef.current
      ) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
        remoteVideoRef.current.play().catch(() => {})
      }
    }
    bind()
    const timer = setInterval(bind, 300)
    return () => clearInterval(timer)
  }, [call, connected, localStreamRef, remoteStreamRef])

  // Live call duration timer
  useEffect(() => {
    if (!connected) {
      setCallDuration(0)
      return
    }
    const t = setInterval(() => setCallDuration((d) => d + 1), 1000)
    return () => clearInterval(t)
  }, [connected])

  const formatDuration = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    return `${m}:${String(sec).padStart(2, "0")}`
  }

  // Auto-navigate away after a call ends
  useEffect(() => {
    if (!endedReason) return
    // Only navigate away if the ended call was for this conversation
    if (endedConversationId && endedConversationId !== conversationId) return
    const t = setTimeout(() => {
      navigate("/messages", { replace: true })
    }, 1000)
    return () => clearTimeout(t)
  }, [endedReason, endedConversationId, conversationId, navigate])

  // Bluetooth detection
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    let mounted = true
    const check = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          if (!mounted) return
          const hasBt = devices.some(
            (d) => d.kind === "audiooutput" && /bluetooth/i.test(d.label)
          )
          setHasBluetooth(hasBt)
        })
        .catch(() => {})
    }
    check()
    navigator.mediaDevices.addEventListener?.("devicechange", check)
    return () => {
      mounted = false
      navigator.mediaDevices.removeEventListener?.("devicechange", check)
    }
  }, [])

  // Apply audio output device
  useEffect(() => {
    const el = remoteVideoRef.current
    if (!el || typeof el.setSinkId !== "function") return
    const applySink = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const outputs = devices.filter((d) => d.kind === "audiooutput")
        let target = null
        if (audioOutput === "speaker") {
          target = outputs.find((d) => d.deviceId === "default") || outputs[0]
        } else if (audioOutput === "earpiece") {
          target = outputs.find((d) => /earpiece|receiver|phone/i.test(d.label))
        } else if (audioOutput === "bluetooth") {
          target = outputs.find((d) => /bluetooth/i.test(d.label))
        }
        if (target?.deviceId) await el.setSinkId(target.deviceId)
        else if (audioOutput === "speaker") await el.setSinkId("")
      } catch (err) {
        console.warn("setSinkId failed:", err)
      }
    }
    applySink()
  }, [audioOutput, connected])

  const handleHangUp = () => {
    hangUp("user-ended")
  }

  // "Call ended" screen — only if it's for THIS conversation
  if (endedReason && (!endedConversationId || endedConversationId === conversationId)) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-white text-gray-900">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <PhoneOff size={32} className="text-red-500" />
        </div>
        <p className="mt-5 text-xl font-semibold">Call ended</p>
        <p className="mt-1 text-sm text-gray-400">Returning to messages...</p>
      </div>
    )
  }

  // Loading state
  if (!call) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
        <Loader2 size={28} className="animate-spin text-[#2563EB]" />
      </div>
    )
  }

  const otherUser = call.otherUser
  const initial = (otherUser?.full_name || "?").charAt(0).toUpperCase()

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-white text-gray-900">
      {/* Remote video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 h-full w-full object-cover ${
          connected ? "" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Placeholder while connecting */}
      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-white" />
          {otherUser?.avatar_url && (
            <div
              className="absolute inset-0 scale-125 opacity-10 blur-3xl"
              style={{
                backgroundImage: `url(${otherUser.avatar_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          <div className="absolute inset-0 bg-white/40" />

          <div className="relative flex flex-col items-center px-6 text-center">
            <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2 border-[#3B82F6]/40"
              />
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.7,
                }}
                className="absolute inset-0 rounded-full border-2 border-[#3B82F6]/30"
              />
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#DBEAFE] shadow-[0_20px_60px_-15px_rgba(217,184,108,0.5)]">
                {otherUser?.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-bold text-[#2563EB]">
                    {otherUser?.full_name?.charAt(0) || <UserRound size={48} />}
                  </span>
                )}
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-semibold tracking-tight text-gray-900"
            >
              {otherUser?.full_name || "Connecting..."}
            </motion.p>
            {otherUser?.username && (
              <p className="mt-1 text-sm text-[#2563EB]">
                @{otherUser.username}
              </p>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm"
            >
              <Loader2 size={13} className="animate-spin text-[#2563EB]" />
              <span className="text-xs font-medium tracking-wide text-gray-600">
                {status}
              </span>
            </motion.div>
          </div>
        </div>
      )}

      {/* Premium connected view (when no remote video) */}
      {connected && mode === "audio" && (
        <div className="absolute inset-0 flex flex-col overflow-hidden">
          {/* Layered premium background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3d] to-[#050a14]" />

          {/* Aurora blobs */}
          <motion.div
            animate={{
              x: [0, 60, -30, 0],
              y: [0, -40, 30, 0],
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-40 -top-20 h-[500px] w-[500px] rounded-full bg-[#3B82F6]/25 blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -50, 40, 0],
              y: [0, 50, -30, 0],
            }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-40 -bottom-20 h-[500px] w-[500px] rounded-full bg-[#6366F1]/25 blur-[120px]"
          />
          <div className="absolute inset-0 bg-black/20" />

          {/* ─── TOP: Live timer pill ─── */}
          <div className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 backdrop-blur-xl">
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="flex h-2 w-2 rounded-full bg-emerald-400"
              />
              <span className="text-xs font-semibold tabular-nums tracking-wider text-white">
                {formatDuration(callDuration)}
              </span>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#93C5FD] backdrop-blur-xl">
              {mode === "video" ? "Video" : "Voice"}
            </div>
          </div>

          {/* ─── MIDDLE: Avatar with live audio wave ─── */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
            <div className="relative flex h-48 w-48 items-center justify-center">
              {/* Pulsing rings when there is audio activity */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border border-[#60A5FA]/40"
              />
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                className="absolute inset-0 rounded-full border border-[#60A5FA]/30"
              />

              {/* Glow halo */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#3B82F6]/40 to-[#8B5CF6]/40 blur-2xl" />

              {/* Avatar */}
              <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/30 bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] shadow-[0_0_80px_rgba(96,165,250,0.5)]">
                {otherUser?.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-6xl font-bold text-white">
                    {otherUser?.full_name?.charAt(0) || <UserRound size={56} />}
                  </span>
                )}
                <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/30 via-transparent to-white/10" />
              </div>
            </div>

            {/* Name */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-7 text-center"
            >
              <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-white">
                {otherUser?.full_name || "Connected"}
              </h2>
              {otherUser?.username && (
                <p className="mt-1 text-sm font-medium text-[#93C5FD]">
                  @{otherUser.username}
                </p>
              )}
            </motion.div>

            {/* Live audio wave beneath name */}
            <div className="mt-6 h-12 w-64 max-w-full">
              <AudioWave
                stream={remoteStreamRef?.current}
                active={connected}
                color="#60A5FA"
                bars={28}
                height={40}
                barWidth={3}
              />
            </div>

            {/* Live caption */}
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/40">
              <span>Live</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>End-to-end encrypted</span>
            </div>
          </div>

          {/* ─── Raise hand badge ─── */}
          {remoteHandRaised && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute right-5 top-24 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-[#3B82F6]/30 bg-white/95 shadow-2xl backdrop-blur-xl"
            >
              <Hand size={22} className="text-[#2563EB]" />
            </motion.div>
          )}
        </div>
      )}

      {/* Local video PiP */}
      {mode === "video" && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-4 top-4 z-20 h-40 w-28 cursor-grab overflow-hidden rounded-2xl border border-white/60 bg-black/50 shadow-2xl sm:h-48 sm:w-36"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {cameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <CameraOff size={22} className="text-white/60" />
            </div>
          )}
        </motion.div>
      )}

      {/* Top status pill */}
      <div
        className={`absolute left-4 top-4 z-10 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-md ${
          connected
            ? "bg-black/40 text-white/80"
            : "border border-gray-200 bg-white/95 text-gray-700 shadow-sm"
        }`}
      >
        {status}
      </div>

      {/* Remote raised hand indicator */}
      {remoteHandRaised && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute bottom-32 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/20 backdrop-blur-xl"
        >
          <Hand size={20} className="text-[#3B82F6]" />
        </motion.div>
      )}

      {/* Floating emojis */}
      {floatingEmojis.map((e) => (
        <motion.div
          key={e.id}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -180, scale: 1.4 }}
          transition={{ duration: 2.5, ease: "easeOut" }}
          className="pointer-events-none absolute bottom-32 z-30 text-4xl"
          style={{ left: e.from === "me" ? "25%" : "65%" }}
        >
          {e.emoji}
        </motion.div>
      ))}

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-black/50 p-2 backdrop-blur-xl">
        <button
          onClick={toggleMute}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
            muted
              ? "bg-red-500/90 text-white"
              : "bg-white/15 text-white hover:bg-white/25"
          }`}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowAudioMenu((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
              audioOutput === "speaker"
                ? "bg-white/15 text-white hover:bg-white/25"
                : "bg-[#3B82F6] text-[#ffffff]"
            }`}
            aria-label="Audio output"
          >
            {audioOutput === "bluetooth" ? (
              <Bluetooth size={18} />
            ) : audioOutput === "earpiece" ? (
              <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
          {showAudioMenu && (
            <div className="absolute bottom-14 left-1/2 z-40 w-40 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-xl">
              {[
                { key: "speaker", label: "Speaker", icon: Volume2 },
                { key: "earpiece", label: "Earpiece", icon: VolumeX },
                ...(hasBluetooth
                  ? [{ key: "bluetooth", label: "Bluetooth", icon: Bluetooth }]
                  : []),
              ].map((opt) => {
                const OI = opt.icon
                const active = audioOutput === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setAudioOutput(opt.key)
                      setShowAudioMenu(false)
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium transition ${
                      active
                        ? "bg-[#3B82F6]/20 text-[#3B82F6]"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <OI size={13} />
                    <span>{opt.label}</span>
                    {active && <span className="ml-auto text-[10px]">&#9679;</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          onClick={toggleRaiseHand}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
            handRaised
              ? "bg-[#3B82F6] text-[#ffffff]"
              : "bg-white/15 text-white hover:bg-white/25"
          }`}
          aria-label="Raise hand"
        >
          <Hand size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
              showEmojiPicker
                ? "bg-[#3B82F6] text-[#ffffff]"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            aria-label="Send emoji"
          >
            <Smile size={18} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-14 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur-xl">
              {["👍", "👏", "😂", "❤️", "🎉", "😮"].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    sendEmoji(e)
                    setShowEmojiPicker(false)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-110 hover:bg-white/10"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === "video" && (
          <button
            onClick={toggleCamera}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
              cameraOff
                ? "bg-red-500/90 text-white"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            aria-label={cameraOff ? "Camera on" : "Camera off"}
          >
            {cameraOff ? <CameraOff size={18} /> : <Camera size={18} />}
          </button>
        )}

        <button
          onClick={handleHangUp}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
          aria-label="End call"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  )
}
