import { motion, useMotionValue, useTransform } from "framer-motion"
import { Reply } from "lucide-react"

export default function SwipeableBubble({ mine, onReply, children }) {
  const x = useMotionValue(0)

  // Icon opacity: 0 when not swiping, 1 when past threshold
  const iconOpacity = useTransform(x, (value) => {
    const abs = Math.abs(value)
    return Math.min(abs / 50, 1)
  })

  // Icon scale grows as you swipe further
  const iconScale = useTransform(x, (value) => {
    const abs = Math.abs(value)
    return 0.4 + Math.min(abs / 130, 0.9)
  })

  // Icon horizontal position follows the swipe a bit
  const iconX = useTransform(x, (value) => {
    const abs = Math.abs(value)
    return Math.min(abs * 0.6, 40)
  })

  const incoming = !mine // swipe right for others
  const outgoing = mine  // swipe left for own

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      style={{ x }}
      onDragEnd={(event, info) => {
        const threshold = 60
        if (mine && info.offset.x < -threshold) {
          onReply()
        } else if (!mine && info.offset.x > threshold) {
          onReply()
        }
      }}
      className="relative touch-pan-y"
    >
      {/* Reply indicator on the LEFT (for incoming/others' messages) */}
      {incoming && (
        <motion.div
          style={{ opacity: iconOpacity, scale: iconScale, x: iconX }}
          className="pointer-events-none absolute left-0 top-1/2 z-0 -translate-y-1/2 text-[#d9b86c]"
        >
          <Reply size={20} />
        </motion.div>
      )}

      {/* Reply indicator on the RIGHT (for outgoing/own messages) */}
      {outgoing && (
        <motion.div
          style={{ opacity: iconOpacity, scale: iconScale, x: useTransform(iconX, (v) => -v) }}
          className="pointer-events-none absolute right-0 top-1/2 z-0 -translate-y-1/2 text-[#d9b86c]"
        >
          <Reply size={20} />
        </motion.div>
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
