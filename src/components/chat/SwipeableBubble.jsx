import { motion, useMotionValue, useTransform } from "framer-motion"
import { Reply } from "lucide-react"

export default function SwipeableBubble({ mine, onReply, children }) {
  const x = useMotionValue(0)
  const absX = useTransform(x, (v) => Math.abs(v))
  const opacity = useTransform(absX, [0, 20, 60], [0, 0.5, 1])
  const scale = useTransform(absX, [0, 60], [0.5, 1])

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      style={{ x }}
      onDragEnd={(e, info) => {
        if ((mine && info.offset.x < -60) || (!mine && info.offset.x > 60)) {
          onReply()
        }
      }}
      className={`relative w-fit touch-pan-y ${mine ? "self-end" : "self-start"}`}
    >
      {/* Reply icon — visible behind the bubble */}
      <motion.div
        style={{ opacity, scale }}
        className={`pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[#d9b86c] shadow-lg ${
          mine ? "-right-12" : "-left-12"
        }`}
      >
        <Reply size={16} className="text-white" strokeWidth={2.5} />
      </motion.div>

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
