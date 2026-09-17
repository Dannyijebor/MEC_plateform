import { motion, useMotionValue, useTransform } from "framer-motion"
import { Reply } from "lucide-react"

export default function SwipeableBubble({ mine, onReply, children }) {
  const x = useMotionValue(0)

  // Icon opacity and scale grow as you swipe
  const iconOpacity = useTransform(x, (value) => {
    const abs = Math.abs(value)
    return Math.min(abs / 60, 1)
  })

  const iconScale = useTransform(x, (value) => {
    const abs = Math.abs(value)
    return 0.5 + Math.min(abs / 120, 0.7)
  })

  const indicatorLeft = useTransform(x, (value) => {
    if (value > 0) return 8 // swipe right (incoming)
    return undefined
  })

  const indicatorRight = useTransform(x, (value) => {
    if (value < 0) return 8 // swipe left (outgoing)
    return undefined
  })

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      style={{ x }}
      onDragEnd={(event, info) => {
        const threshold = 60
        if (mine && info.offset.x < -threshold) {
          onReply()
        } else if (!mine && info.offset.x > threshold) {
          onReply()
        }
      }}
      className="relative"
    >
      {/* Reply indicator — appears from the side you swipe toward */}
      {!mine && (
        <motion.div
          style={{ opacity: iconOpacity, scale: iconScale, left: indicatorLeft }}
          className="pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 text-[#d9b86c]"
        >
          <Reply size={20} />
        </motion.div>
      )}
      {mine && (
        <motion.div
          style={{ opacity: iconOpacity, scale: iconScale, right: indicatorRight }}
          className="pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 text-[#d9b86c]"
        >
          <Reply size={20} />
        </motion.div>
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
