import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, PhoneOff, Maximize2 } from "lucide-react"
import { useCall } from "../../context/CallContext"
import { useEffect, useRef } from "react"

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

  const videoRef = useRef(null)

  // Bind remote stream to the widget's video element
  useEffect(() => {
    const bind = () => {
      if (
        videoRef.current &&
        remoteStreamRef?.current &&
        videoRef.current.srcObject !== remoteStreamRef.current
      ) {
        videoRef.current.srcObject = remoteStreamRef.current
        videoRef.current.play().catch(() => {})
      }
    }
    bind()
    const timer = setInterval(bind, 400)
    return () => clearInterval(timer)
  }, [remoteStreamRef, connected])

  if (!call || location.pathname === "/calls") return null

  const otherUser = call.otherUser
  const initial = (otherUser?.full_name || "?").charAt(0).toUpperCase()
  const isVideo = call.mode === "video"

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
        className="fixed bottom-24 right-3 z-[180] touch-none select-none sm:bottom-28"
      >
        <div className="relative w-[136px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]">
          {/* Main tappable area */}
          <button
            type="button"
            onClick={expand}
            className="block w-full text-left"
          >
            {/* Top media: video if video call, avatar if audio */}
            {isVideo && connected ? (
              <div className="relative h-32 w-full bg-gray-900">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                {/* Small avatar badge overlaid */}
                <div className="absolute bottom-1.5 left-1.5 h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-[#f1e7cc] shadow-md">
                  {otherUser?.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#a8873f]">
                      {initial}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center pt-3 pb-1">
                <div className="relative h-14 w-14">
                  <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#d9b86c]/30 bg-[#f1e7cc]">
                    {otherUser?.avatar_url ? (
                      <img
                        src={otherUser.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-base font-bold text-[#a8873f]">
                        {initial}
                      </div>
                    )}
                  </div>
                  {connected && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Name + status */}
            <div className="px-2 pb-2 pt-1.5 text-center">
              <p className="truncate text-[11px] font-semibold text-gray-900">
                {otherUser?.full_name || "In call"}
              </p>
              <p className="mt-0.5 truncate text-[9px] text-gray-400">
                {connected ? "Connected" : status}
              </p>
            </div>
          </button>

          {/* Controls */}
          <div className="flex items-center justify-around border-t border-gray-100 bg-gray-50/60 px-1.5 py-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                muted
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
              }`}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff size={13} /> : <Mic size={13} />}
            </button>

            <button
              type="button"
              onClick={() => hangUp("user-ended")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600"
              aria-label="End call"
            >
              <PhoneOff size={14} />
            </button>

            <button
              type="button"
              onClick={expand}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-gray-100"
              aria-label="Expand"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
