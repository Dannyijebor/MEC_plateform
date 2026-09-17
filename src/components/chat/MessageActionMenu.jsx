import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Reply, Copy, Edit3, Trash2 } from "lucide-react"

const MENU_WIDTH = 180
const MENU_HEIGHT_ESTIMATE = 200

export default function MessageActionMenu({
  message,
  mine,
  canEdit,
  senderName,
  anchor,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) {
  const menuRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0, visible: false })

  useEffect(() => {
    if (!anchor || !message) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 12

    let x = anchor.x - MENU_WIDTH / 2
    let y = anchor.y + 12

    x = Math.max(pad, Math.min(vw - MENU_WIDTH - pad, x))
    if (y + MENU_HEIGHT_ESTIMATE > vh - pad) {
      y = anchor.y - MENU_HEIGHT_ESTIMATE - 12
    }
    y = Math.max(pad, y)

    setPosition({ x, y, visible: true })
  }, [anchor, message])

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
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[150]"
            onClick={onClose}
            onContextMenu={(e) => {
              e.preventDefault()
              onClose()
            }}
          />

          <motion.div
            key="menu"
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{ left: position.x, top: position.y, width: MENU_WIDTH }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[151] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_10px_40px_-8px_rgba(0,0,0,0.25)]"
          >
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
