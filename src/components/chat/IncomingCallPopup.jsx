import { useEffect, useRef } from "react"
import { Phone, PhoneOff, Video, UserRound } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function IncomingCallPopup({ call, onAccept, onDecline }) {
  const audioRef = useRef(null)

  // Play a ringtone while the popup is visible
  useEffect(() => {
    if (!call) return

    // Simple Web Audio API ringtone (no external file needed)
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

    // Vibrate on mobile if supported
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 200, 300, 200, 300])
    }

    return () => {
      stopped = true
      ctx.close().catch(() => {})
      if ("vibrate" in navigator) navigator.vibrate(0)
    }
  }, [call])

  return (
    <AnimatePresence>
      {call && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          className="fixed left-1/2 top-4 z-[200] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-3xl border border-[#d9b86c]/30 bg-[#0b1020]/95 p-5 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#d9b86c]/30 bg-[#d9b86c]/10 text-xl font-bold text-[#d9b86c]">
              {call.callerAvatar ? (
                <img src={call.callerAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                call.callerName?.charAt(0) || <UserRound size={24} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {call.mode === "video" ? (
                  <Video size={14} className="text-[#d9b86c]" />
                ) : (
                  <Phone size={14} className="text-[#d9b86c]" />
                )}
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#d9b86c]">
                  Incoming {call.mode === "video" ? "video" : "audio"} call
                </p>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {call.callerName || "MEC Member"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={onDecline}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500/15 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/25"
            >
              <PhoneOff size={16} />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
            >
              <Phone size={16} />
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
