import { useRef } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { Heart, MessageCircle, Reply } from "lucide-react"

export default function SpacePostCard({
  post,
  currentUserId,
  onLike,
  onComment,
  onMenu,
}) {
  const name =
    post.profiles?.full_name || post.profiles?.username || "MEC Member"
  const avatar = post.profiles?.avatar_url
  const isMine = post.author_id === currentUserId

  const x = useMotionValue(0)
  const iconOpacity = useTransform(x, (v) => Math.min(Math.abs(v) / 60, 1))
  const timer = useRef(null)
  const moved = useRef(false)

  const onStart = () => {
    moved.current = false
    timer.current = setTimeout(() => {
      if (!moved.current && isMine) onMenu(post)
    }, 500)
  }
  const onMove = () => {
    moved.current = true
    if (timer.current) clearTimeout(timer.current)
  }
  const onEnd = () => {
    if (timer.current) clearTimeout(timer.current)
  }

  return (
    <div className="relative overflow-hidden">
      <motion.div
        style={{ opacity: iconOpacity }}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-[#A8873F] text-white"
      >
        <Reply size={14} />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        dragSnapToOrigin
        style={{ x }}
        onDragEnd={(e, info) => {
          if (Math.abs(info.offset.x) > 60) onComment(post)
        }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onContextMenu={(e) => {
          if (isMine) {
            e.preventDefault()
            onMenu(post)
          }
        }}
        className="relative rounded-2xl border border-gray-200 bg-white p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#F1E7CC] text-xs font-bold text-[#A8873F]">
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {name}
              {isMine ? " · You" : ""}
            </p>
            <p className="text-[10px] text-gray-400">
              {new Date(post.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
          {post.content}
        </p>

        <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-3">
          <button
            onClick={() => onLike(post)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            <Heart size={13} />
            Like
          </button>
          <button
            onClick={() => onComment(post)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            <MessageCircle size={13} />
            Comment
          </button>
        </div>
      </motion.div>
    </div>
  )
}
