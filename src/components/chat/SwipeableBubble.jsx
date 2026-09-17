import { motion, useMotionValue, useTransform } from "framer-motion"
import { Reply } from "lucide-react"
import { useRef } from "react"
import { useLongPress } from "../../hooks/useLongPress"

export default function SwipeableBubble({ mine, onReply, onLongPress, messageId, children }) {
  const x = useMotionValue(0)
  const absX = useTransform(x, (v) => Math.abs(v))
  const opacity = useTransform(absX, [0, 20, 60], [0, 0.5, 1])
  const scale = useTransform(absX, [0, 60], [0.5, 1])
  const wrapperRef = useRef(null)

  const longPressHandlers = useLongPress((event) => {
    const rect = wrapperRef.current?.getBoundingClientRect?.()
    onLongPress?.({ rect, event })
  }, 500)

  return (
    <motion.div
      ref={wrapperRef}
      data-message-id={messageId}
      drag="x"
      dragConstraints={mine ? { left: -120, right: 0 } : { left: 0, right: 120 }}
      dragElastic={0.2}
      dragSnapToOrigin
      style={{ x }}
      onDrag={(event, info) => {
        if (mine && info.offset.x > 0) x.set(0)
        else if (!mine && info.offset.x < 0) x.set(0)
      }}
      onDragEnd={(e, info) => {
        if ((mine && info.offset.x < -60) || (!mine && info.offset.x > 60)) {
          onReply()
        }
        x.set(0)
      }}
      className={`relative w-fit touch-pan-y ${mine ? "self-end" : "self-start"}`}
    >
      <motion.div
        style={{ opacity, scale }}
        className={`pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[#d9b86c] shadow-lg ${
          mine ? "-right-12" : "-left-12"
        }`}
      >
        <Reply size={16} className="text-white" strokeWidth={2.5} />
      </motion.div>

      <div className="relative z-10" {...longPressHandlers}>
        {children}
      </div>
    </motion.div>
  )
}
