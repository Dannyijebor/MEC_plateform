import { useEffect, useState } from "react"
import { Phone, PhoneOff, Video, UserRound, Wifi, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function IncomingCallPopup({ call, onAccept, onDecline }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!call) return

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    let stopped = false

    function ring() {
      if (stopped) return
      // Two-tone chime
      const now = ctx.currentTime

      const o1 = ctx.createOscillator()
      const g1 = ctx.createGain()
      o1.connect(g1)
      g1.connect(ctx.destination)
      o1.type = "sine"
      o1.frequency.value = 660
      g1.gain.setValueAtTime(0.15, now)
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      o1.start(now)
      o1.stop(now + 0.4)

      const o2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      o2.connect(g2)
      g2.connect(ctx.destination)
      o2.type = "sine"
      o2.frequency.value = 880
      g2.gain.setValueAtTime(0, now + 0.4)
      g2.gain.linearRampToValueAtTime(0.15, now + 0.5)
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.85)
      o2.start(now + 0.4)
      o2.stop(now + 0.9)

      setTimeout(ring, 1800)
    }
    ring()

    if ("vibrate" in navigator) navigator.vibrate([400, 200, 400, 200, 400])

    const autoDismissTimer = setTimeout(() => onDecline?.(), 30000)
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000)

    return () => {
      stopped = true
      clearTimeout(autoDismissTimer)
      clearInterval(tick)
      ctx.close().catch(() => {})
      if ("vibrate" in navigator) navigator.vibrate(0)
    }
  }, [call, onDecline])

  if (!call) return null

  const other = call.callerName || "MEC Member"
  const initial = other.charAt(0).toUpperCase()
  const isVideo = call.mode === "video"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden px-4"
      >
        {/* Layered gradient background — premium deep navy */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3d] to-[#050a14]" />

        {/* Animated aurora blobs */}
        <motion.div
          animate={{
            x: [0, 60, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-40 -top-20 h-[500px] w-[500px] rounded-full bg-[#3B82F6]/25 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 40, 0],
            y: [0, 50, -30, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-40 -bottom-20 h-[500px] w-[500px] rounded-full bg-[#6366F1]/25 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -30, 40, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/3 top-1/3 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/15 blur-[100px]"
        />

        {/* Subtle noise/grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Main card */}
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="relative w-full max-w-[380px]"
        >
          {/* Glass card with golden accent border */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-[1px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            {/* Inner glow border */}
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-white/[0.15] via-transparent to-transparent" />

            <div className="relative rounded-[31px] bg-gradient-to-b from-white/[0.02] to-transparent p-7">
              {/* Top status pill */}
              <div className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="flex h-1.5 w-1.5 rounded-full bg-[#60A5FA]"
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#93C5FD]">
                  {isVideo ? "Video" : "Voice"} call incoming
                </span>
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: 0.8 }}
                  className="flex h-1.5 w-1.5 rounded-full bg-[#60A5FA]"
                />
              </div>

              {/* Avatar with concentric pulsing rings */}
              <div className="mt-8 flex justify-center">
                <div className="relative flex h-44 w-44 items-center justify-center">
                  {/* Pulsing rings — 3 layers */}
                  {[0, 0.5, 1].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.5, 1.5],
                        opacity: [0.5, 0, 0],
                      }}
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay,
                      }}
                      className="absolute inset-0 rounded-full border-2 border-[#60A5FA]/60"
                    />
                  ))}

                  {/* Glow halo */}
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#3B82F6]/40 to-[#8B5CF6]/40 blur-2xl" />

                  {/* Avatar */}
                  <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/40 bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] shadow-[0_0_60px_rgba(96,165,250,0.6)]"
                  >
                    {call.callerAvatar ? (
                      <img
                        src={call.callerAvatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-white">
                        {initial || <UserRound size={48} />}
                      </span>
                    )}

                    {/* Subtle inner highlight */}
                    <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/20 via-transparent to-white/10" />
                  </motion.div>

                  {/* Verified/presence badge */}
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#0a1628] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg"
                  >
                    <Wifi size={13} className="text-white" strokeWidth={3} />
                  </motion.div>
                </div>
              </div>

              {/* Caller name + subtitle */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-7 text-center"
              >
                <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-white">
                  {other}
                </h2>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <Sparkles size={11} className="text-[#93C5FD]" />
                  <p className="text-sm font-medium text-[#93C5FD]">
                    {elapsed < 3
                      ? "Calling you..."
                      : elapsed < 10
                        ? "Waiting for you..."
                        : "Still waiting..."}
                  </p>
                </div>
              </motion.div>

              {/* Buttons — stacked large, premium */}
              <div className="mt-9 space-y-3">
                {/* Accept — primary glowing */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onAccept}
                  animate={{
                    boxShadow: [
                      "0 8px 32px -8px rgba(16,185,129,0.5)",
                      "0 8px 40px -8px rgba(16,185,129,0.9)",
                      "0 8px 32px -8px rgba(16,185,129,0.5)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-base font-semibold text-white"
                >
                  {/* Shine sweep */}
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  />
                  <Phone size={20} className="relative z-10" />
                  <span className="relative z-10">Answer</span>
                </motion.button>

                {/* Decline — secondary, elegant */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onDecline}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] py-4 text-base font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/[0.12]"
                >
                  <PhoneOff size={20} />
                  Decline
                </motion.button>
              </div>

              {/* Bottom meta info */}
              <div className="mt-5 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest text-white/30">
                <span>{isVideo ? "Video" : "Audio"}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>End-to-end</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>Secure</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
