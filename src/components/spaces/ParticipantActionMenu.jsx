import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserRound,
  Crown,
  Star,
  Mic,
  MicOff,
  UserMinus,
  ChevronRight,
  Shield,
  X,
} from "lucide-react"

const MENU_WIDTH = 220
const MENU_HEIGHT = 260

const ROLE_LABELS = {
  host: "Host",
  cohost: "Co-host",
  speaker: "Speaker",
  listener: "Listener",
}

const ROLE_ICONS = {
  host: Crown,
  cohost: Shield,
  speaker: Mic,
  listener: MicOff,
}

/**
 * Actions a caller can perform on a target participant.
 * currentRole: caller's role
 * targetRole: target's role
 */
function buildActions(currentRole, targetRole, isSelf) {
  const actions = []
  if (isSelf) return actions

  // Everyone can view profiles
  actions.push({
    key: "view-profile",
    label: "View profile",
    icon: UserRound,
    color: "gray",
  })

  const iAmHost = currentRole === "host"
  const iAmCohost = currentRole === "cohost"
  const iCanModerate = iAmHost || iAmCohost

  // Can't act on the host, or on people above us
  if (targetRole === "host") return actions
  if (iAmCohost && targetRole === "cohost") return actions

  if (targetRole === "listener") {
    if (iCanModerate) {
      actions.push({
        key: "make-speaker",
        label: "Make Speaker",
        icon: Mic,
        color: "blue",
      })
    }
    if (iAmHost) {
      actions.push({
        key: "make-cohost",
        label: "Make Co-host",
        icon: Shield,
        color: "blue",
      })
    }
    if (iCanModerate) {
      actions.push({
        key: "remove",
        label: "Remove from Space",
        icon: UserMinus,
        color: "red",
      })
    }
  }

  if (targetRole === "speaker") {
    if (iAmHost) {
      actions.push({
        key: "make-cohost",
        label: "Make Co-host",
        icon: Shield,
        color: "blue",
      })
    }
    if (iCanModerate) {
      actions.push({
        key: "make-listener",
        label: "Move to Listener",
        icon: MicOff,
        color: "gray",
      })
      actions.push({
        key: "remove",
        label: "Remove from Space",
        icon: UserMinus,
        color: "red",
      })
    }
  }

  if (targetRole === "cohost") {
    if (iAmHost) {
      actions.push({
        key: "make-speaker",
        label: "Demote to Speaker",
        icon: Mic,
        color: "gray",
      })
      actions.push({
        key: "remove",
        label: "Remove from Space",
        icon: UserMinus,
        color: "red",
      })
    }
  }

  return actions
}

export default function ParticipantActionMenu({
  participant,
  currentUserRole,
  anchor,
  onAction,
  onClose,
}) {
  const menuRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0, visible: false })

  useEffect(() => {
    if (!anchor || !participant) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 12
    const rect = anchor.rect

    let x, y

    if (rect) {
      x = rect.right - MENU_WIDTH
      y = rect.bottom + 8
      if (y + MENU_HEIGHT > vh - pad) {
        y = rect.top - MENU_HEIGHT - 8
      }
    } else {
      x = (anchor.x || vw / 2) - MENU_WIDTH / 2
      y = anchor.y + 12
    }

    x = Math.max(pad, Math.min(vw - MENU_WIDTH - pad, x))
    y = Math.max(pad, y)
    setPosition({ x, y, visible: true })
  }, [anchor, participant])

  if (!participant) return null

  const targetRole = participant.role || "listener"
  const isSelf = participant.is_local
  const actions = buildActions(currentUserRole, targetRole, isSelf)
  const RoleIcon = ROLE_ICONS[targetRole] || MicOff
  const name =
    participant.profile?.full_name ||
    participant.name ||
    participant.identity ||
    "MEC Member"
  const initial = (name || "?").charAt(0).toUpperCase()

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
            className="fixed inset-0 z-[150] bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            key="menu"
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{ left: position.x, top: position.y, width: MENU_WIDTH }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[151] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)]"
          >
            {/* Header — shows who we're acting on */}
            <div className="border-b border-gray-100 p-3">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#F1E7CC] text-sm font-bold text-[#A8873F]">
                  {participant.profile?.avatar_url ? (
                    <img
                      src={participant.profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {initial}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <RoleIcon size={11} />
                    <span>{ROLE_LABELS[targetRole]}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="p-1">
              {actions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-400">
                  No actions available
                </div>
              ) : (
                actions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => {
                        onAction(action.key)
                        onClose()
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                        action.color === "red"
                          ? "text-red-500 hover:bg-red-50"
                          : action.color === "blue"
                            ? "text-[#A8873F] hover:bg-[#FEF9E7]"
                            : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon
                        size={15}
                        strokeWidth={2}
                        className={
                          action.color === "red"
                            ? "text-red-500"
                            : action.color === "blue"
                              ? "text-[#A8873F]"
                              : "text-gray-500"
                        }
                      />
                      <span>{action.label}</span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
