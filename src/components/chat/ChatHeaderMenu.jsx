import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Palette,
  Search,
  BellOff,
  Bell,
  UserRound,
  Trash2,
  Flag,
  X,
  Check,
  ArrowLeft,
} from "lucide-react"

const THEME_KEYS = [
  { key: "classic", name: "Classic", preview: "linear-gradient(135deg, #fcfbf7 0%, #3B82F6 100%)" },
  { key: "sunset", name: "Warm Sunset", preview: "linear-gradient(135deg, #FFE4CC 0%, #FF6B35 100%)" },
  { key: "ocean", name: "Ocean Blue", preview: "linear-gradient(135deg, #BAE6FD 0%, #0284C7 100%)" },
  { key: "forest", name: "Forest Green", preview: "linear-gradient(135deg, #D1FAE5 0%, #059669 100%)" },
  { key: "midnight", name: "Midnight", preview: "linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)" },
  { key: "rosegold", name: "Rose Gold", preview: "linear-gradient(135deg, #FBCFE8 0%, #D9A86C 100%)" },
  { key: "butterflyGarden", name: "Butterfly Garden", preview: "linear-gradient(135deg, #dcfce7 0%, #fef3c7 50%, #fce7f3 100%)" },
  { key: "lavenderDream", name: "Lavender Dream", preview: "linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%)" },
  { key: "oceanBreeze", name: "Ocean Breeze", preview: "linear-gradient(135deg, #cffafe 0%, #67e8f9 100%)" },
  { key: "rainfall", name: "Rain Fall", preview: "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #38bdf8 100%)" },
]

export default function ChatHeaderMenu({
  open,
  onClose,
  themeKey,
  onChangeTheme,
  muted,
  onToggleMute,
  onClearChat,
  onViewProfile,
  otherUser,
  theme,
}) {
  const [view, setView] = useState("main") // "main" | "themes"

  useEffect(() => {
    if (!open) setView("main")
  }, [open])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-[180] bg-black/30 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-20 w-[300px] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] sm:right-6 sm:top-24"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            {view === "themes" && (
              <button
                type="button"
                onClick={() => setView("main")}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
                {view === "main" ? "Options" : "Themes"}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
                {view === "main"
                  ? otherUser?.full_name || "Conversation"
                  : "Pick a look"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Main menu */}
          {view === "main" && (
            <div className="p-1.5">
              {[
                { key: "theme", label: "Change theme", icon: Palette, onClick: () => setView("themes") },
                { key: "search", label: "Search in chat", icon: Search, onClick: () => { onClose?.() } },
                {
                  key: "mute",
                  label: muted ? "Unmute notifications" : "Mute notifications",
                  icon: muted ? Bell : BellOff,
                  onClick: () => { onToggleMute?.(); onClose?.() },
                },
                { key: "profile", label: "View profile", icon: UserRound, onClick: () => { onViewProfile?.(); onClose?.() } },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
                      <Icon size={15} />
                    </span>
                    <span>{item.label}</span>
                  </button>
                )
              })}

              <div className="my-1 h-px bg-gray-100" />

              <button
                type="button"
                onClick={() => { onClearChat?.(); onClose?.() }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <Trash2 size={15} />
                </span>
                <span>Clear chat</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <Flag size={15} />
                </span>
                <span>Report</span>
              </button>
            </div>
          )}

          {/* Theme picker */}
          {view === "themes" && (
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {THEME_KEYS.map((t) => {
                const active = themeKey === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onChangeTheme?.(t.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                      active ? "bg-[#DBEAFE]" : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-full border border-black/10 shadow-inner"
                      style={{ background: t.preview }}
                    />
                    <span className={`flex-1 text-sm font-medium ${active ? "text-[#2563EB]" : "text-gray-800"}`}>
                      {t.name}
                    </span>
                    {active && <Check size={15} className="text-[#2563EB]" />}
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
