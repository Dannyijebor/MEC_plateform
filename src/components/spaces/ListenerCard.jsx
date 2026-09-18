import { motion } from "framer-motion"
import { Mic, MicOff, Hand, Crown, Shield } from "lucide-react"

const ROLE_BADGE = {
  host: { label: "Host", icon: Crown, color: "bg-amber-100 text-amber-700 border-amber-200" },
  cohost: { label: "Co-host", icon: Shield, color: "bg-blue-100 text-blue-700 border-blue-200" },
  speaker: { label: "Speaker", icon: Mic, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  listener: { label: "Listener", icon: MicOff, color: "bg-gray-100 text-gray-600 border-gray-200" },
}

export default function ListenerCard({
  participant,
  onTap,
  handRaised = false,
}) {
  const name =
    participant.profile?.full_name ||
    participant.name ||
    participant.identity ||
    "MEC Member"
  const avatar = participant.profile?.avatar_url
  const initial = (name || "?").charAt(0).toUpperCase()
  const role = participant.role || "listener"
  const badge = ROLE_BADGE[role]

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      onClick={onTap}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-[0_4px_12px_-6px_rgba(0,0,0,0.08)] transition hover:border-[#3B82F6]/40 hover:shadow-[0_10px_30px_-8px_rgba(59,130,246,0.25)]"
    >
      {/* Avatar */}
      <div className="relative h-12 w-12 shrink-0">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-bold text-[#2563EB]">
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {/* Mic indicator badge */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
            participant.isMicrophoneEnabled
              ? "bg-emerald-500"
              : "bg-gray-400"
          }`}
        >
          {participant.isMicrophoneEnabled ? (
            <Mic size={9} className="text-white" strokeWidth={3} />
          ) : (
            <MicOff size={9} className="text-white" strokeWidth={3} />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">
          {name}
          {participant.is_local ? " · You" : ""}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}
          >
            <badge.icon size={9} strokeWidth={2.5} />
            {badge.label}
          </span>
          {handRaised && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              <Hand size={9} strokeWidth={2.5} />
              Raised
            </span>
          )}
        </div>
      </div>

      {/* Chevron hint */}
      <div className="shrink-0 text-gray-300 transition group-hover:text-[#3B82F6]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </motion.button>
  )
}
