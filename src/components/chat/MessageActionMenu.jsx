import { motion } from "framer-motion"
import { Reply, Copy, Edit3, Trash2, X } from "lucide-react"

const backdropVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
}

const menuVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 28,
      staggerChildren: 0.045,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 10,
    transition: { duration: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } },
}

export default function MessageActionMenu({
  message,
  mine,
  canEdit,
  senderName,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) {
  if (!message) return null

  const actions = [
    {
      key: "reply",
      label: "Reply",
      icon: Reply,
      onClick: onReply,
    },
    {
      key: "copy",
      label: "Copy text",
      icon: Copy,
      onClick: onCopy,
    },
    ...(mine
      ? [
          canEdit
            ? {
                key: "edit",
                label: "Edit",
                icon: Edit3,
                onClick: onEdit,
              }
            : null,
          {
            key: "delete",
            label: "Delete",
            icon: Trash2,
            danger: true,
            onClick: onDelete,
          },
        ].filter(Boolean)
      : []),
  ]

  const previewText =
    message.content?.startsWith("[MEC_CALL]")
      ? "Call event"
      : message.content?.slice(0, 120) || ""

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="show"
      exit="hidden"
      transition={{ duration: 0.18 }}
      onClick={onClose}
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 p-4 backdrop-blur-md sm:items-center"
    >
      <motion.div
        variants={menuVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a1e2e] to-[#0f1320] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
      >
        {/* Gold accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#d9b86c] to-transparent" />

        {/* Header with preview */}
        <div className="border-b border-white/5 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d9b86c]">
                {mine ? "Your message" : senderName || "Message"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-white/70">
                {previewText || "..."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
              aria-label="Close menu"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Action items */}
        <div className="p-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.key}
                variants={itemVariants}
                whileHover={{ scale: 1.015, x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.onClick}
                className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  action.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-white/90 hover:bg-white/[0.06]"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    action.danger
                      ? "bg-red-500/10 text-red-400 group-hover:bg-red-500/20"
                      : "bg-[#d9b86c]/10 text-[#d9b86c] group-hover:bg-[#d9b86c]/20"
                  }`}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <span className="flex-1 text-sm font-medium">{action.label}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
