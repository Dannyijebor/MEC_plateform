import { useEffect } from "react"
import { Phone, PhoneOff, Video, UserRound, Volume2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function IncomingCallPopup({ call, onAccept, onDecline }) {
  useEffect(() => {
    if (!call) return

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    let stopped = false

    function ring() {
      if (stopped) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.value = 800
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.6)
      setTimeout(ring, 1200)
    }
    ring()

    if ("vibrate" in navigator) navigator.vibrate([300, 200, 300, 200, 300])

    const autoDismissTimer = setTimeout(() => {
      onDecline?.()
    }, 30000)

    return () => {
      stopped = true
      clearTimeout(autoDismissTimer)
      ctx.close().catch(() => {})
      if ("vibrate" in navigator) navigator.vibrate(0)
    }
  }, [call, onDecline])

  return (
    <AnimatePresence>
      {call && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 px-4 pt-4 backdrop-blur-md sm:pt-6"
        >
          <motion.div
            initial={{ y: -60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 28,
              mass: 0.9,
            }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_30px_80px_-10px_rgba(0,0,0,0.35)]"
          >
            {/* Gold accent line at top */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent" />

            {/* Blurred background using caller avatar */}
            {call.callerAvatar && (
              <div
                className="absolute inset-0 scale-125 opacity-10 blur-3xl"
                style={{
                  backgroundImage: `url(${call.callerAvatar})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}

            <div className="relative px-6 pt-6 pb-5">
              {/* Header row */}
              <div className="flex items-center gap-2">
                {call.mode === "video" ? (
                  <Video size={13} className="text-[#2563EB]" />
                ) : (
                  <Phone size={13} className="text-[#2563EB]" />
                )}
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">
                  Incoming {call.mode === "video" ? "video call" : "call"}
                </p>
                <Volume2 size={12} className="ml-auto text-gray-300" />
              </div>

              {/* Avatar with pulsing rings */}
              <div className="mt-5 flex justify-center">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2 border-[#3B82F6]/60"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                    className="absolute inset-0 rounded-full border-2 border-[#3B82F6]/40"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#DBEAFE] shadow-[0_10px_40px_-10px_rgba(217,184,108,0.6)]"
                  >
                    {call.callerAvatar ? (
                      <img
                        src={call.callerAvatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-[#2563EB]">
                        {call.callerName?.charAt(0) || <UserRound size={32} />}
                      </span>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Caller info */}
              <div className="mt-5 text-center">
                <p className="text-xl font-semibold tracking-tight text-gray-900">
                  {call.callerName || "MEC Member"}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  is calling you...
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-7 flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={onDecline}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-50 py-3.5 text-sm font-semibold text-red-500 transition hover:bg-red-100"
                >
                  <PhoneOff size={17} />
                  Decline
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={onAccept}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(16,185,129,0.5)",
                      "0 0 0 12px rgba(16,185,129,0)",
                      "0 0 0 0 rgba(16,185,129,0.5)",
                    ],
                  }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-600"
                >
                  <Phone size={17} />
                  Accept
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
