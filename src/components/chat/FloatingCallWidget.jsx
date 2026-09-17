import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, PhoneOff, Video, UserRound, Maximize2 } from "lucide-react"
import { useCall } from "../../context/CallContext"

export default function FloatingCallWidget() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    call,
    status,
    connected,
    muted,
    toggleMute,
    hangUp,
    remoteStreamRef,
  } = useCall()

  // Don't show the widget when we're already on the call page
  if (!call || location.pathname === "/calls") return null

  const otherUser = call.otherUser
  const initial = (otherUser?.full_name || "?").charAt(0).toUpperCase()

  const expand = () => {
    navigate(`/calls?conversation=${call.conversationId}&mode=${call.mode}`)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        drag
        dragMomentum={false}
        dragElastic={0.15}
        className="fixed bottom-24 right-4 z-[180] touch-none select-none sm:bottom-28"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-[#0b1020]/95 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {/* Pulsing green dot when connected */}
          {connected && (
            <span className="absolute left-2 top-2 z-10 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}

          {/* Tap to expand */}
          <button
            type="button"
            onClick={expand}
            className="flex w-56 cursor-pointer items-center gap-3 p-3 text-left"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-[#d9b86c]/15">
              {otherUser?.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#d9b86c]">
                  {initial}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {otherUser?.full_name || "In call"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/60">
                {call.mode === "video" && <Video size={10} />}
                <span>{connected ? "Connected" : status}</span>
              </p>
            </div>
            <Maximize2 size={14} className="shrink-0 text-white/40" />
          </button>

          {/* Controls */}
          <div className="flex items-center justify-around border-t border-white/10 px-2 py-2">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                muted
                  ? "bg-red-500/90 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            <button
              type="button"
              onClick={() => hangUp("user-ended")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600"
              aria-label="End call"
            >
              <PhoneOff size={16} />
            </button>

            <button
              type="button"
              onClick={expand}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Expand call"
            >
              <UserRound size={15} />
            </button>
          </div>

          {/* Hidden audio sink for the remote stream */}
          <video
            ref={(el) => {
              if (el && remoteStreamRef?.current && el.srcObject !== remoteStreamRef.current) {
                el.srcObject = remoteStreamRef.current
                el.play().catch(() => {})
              }
            }}
            autoPlay
            playsInline
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
