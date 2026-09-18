import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Reply, Copy, Edit3, Trash2 } from "lucide-react"

const MENU_WIDTH = 220
const MENU_HEIGHT_ESTIMATE = 260
const EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🎉"]

export default function MessageActionMenu({
  message,
  mine,
  canEdit,
  senderName,
  anchor,
  myReaction,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onReact,
}) {
  const menuRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0, visible: false })

  useEffect(() => {
    if (!anchor || !message) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 12
    const rect = anchor.rect

    let x, y

    if (rect) {
      x = mine ? rect.right - MENU_WIDTH : rect.left
      y = rect.bottom + 8
      if (y + MENU_HEIGHT_ESTIMATE > vh - pad) {
        y = rect.top - MENU_HEIGHT_ESTIMATE - 8
      }
    } else {
      x = anchor.x - MENU_WIDTH / 2
      y = anchor.y + 12
      if (y + MENU_HEIGHT_ESTIMATE > vh - pad) {
        y = anchor.y - MENU_HEIGHT_ESTIMATE - 12
      }
    }

    x = Math.max(pad, Math.min(vw - MENU_WIDTH - pad, x))
    y = Math.max(pad, y)

    setPosition({ x, y, visible: true })
  }, [anchor, message, mine])

  if (!message) return null

  const actions = [
    { key: "reply", label: "Reply", icon: Reply, onClick: onReply },
    { key: "copy", label: "Copy", icon: Copy, onClick: onCopy },
    ...(mine
      ? [
          canEdit
            ? { key: "edit", label: "Edit", icon: Edit3, onClick: onEdit }
            : null,
          { key: "delete", label: "Delete", icon: Trash2, danger: true, onClick: onDelete },
        ].filter(Boolean)
      : []),
  ]

  return (
    <AnimatePresence>
      {position.visible && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[150] bg-black/25 backdrop-blur-[3px]"
            style={{ touchAction: "none", overscrollBehavior: "contain" }}
            onClick={onClose}
            onContextMenu={(e) => {
              e.preventDefault()
              onClose()
            }}
          />

          <motion.div
            key="menu"
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.85, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{ left: position.x, top: position.y, width: MENU_WIDTH }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[151] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center justify-around border-b border-gray-100 bg-gray-50/70 px-2 py-2">
              {EMOJIS.map((emoji) => {
                const isActive = myReaction === emoji
                return (
                  <motion.button
                    key={emoji}
                    type="button"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onReact(emoji)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition ${
                      isActive
                        ? "bg-[#3B82F6]/20 ring-2 ring-[#3B82F6]"
                        : "hover:bg-white"
                    }`}
                  >
                    {emoji}
                  </motion.button>
                )
              })}
            </div>

            <div className="p-1">
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={action.onClick}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                      action.danger
                        ? "text-red-500 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon
                      size={15}
                      strokeWidth={2}
                      className={action.danger ? "text-red-500" : "text-gray-500"}
                    />
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
