import { Bell, Search, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#202635]/[0.09] bg-[#faf8f3]/88 backdrop-blur-2xl lg:ml-64">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

        {/* Mobile / tablet branding */}
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 lg:hidden"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d9b86c]/20 bg-[#d9b86c]/10">
            <Sparkles
              size={17}
              className="text-[#d9b86c]"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#f7f3ea]">
              Mark Eselebor
            </p>
            <p className="truncate text-[10px] text-[#f7f3ea]/40">
              Clan Community
            </p>
          </div>
        </Link>

        {/* Desktop search */}
        <div className="relative hidden w-full max-w-md lg:block">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f7f3ea]/35"
          />

          <input
            type="search"
            placeholder="Search the clan..."
            className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.035] pl-10 pr-4 text-sm text-[#f7f3ea] outline-none placeholder:text-[#f7f3ea]/30 transition focus:border-[#d9b86c]/30 focus:bg-white/[0.05]"
          />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#202635]/[0.09] bg-white/[0.035] text-[#f7f3ea]/65 transition hover:bg-white/[0.07] hover:text-[#f7f3ea]"
          >
            <Bell size={18} />

            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d9b86c]" />
          </motion.button>

          {/* Desktop profile */}
          <Link
            to="/settings"
            className="hidden items-center gap-2 rounded-xl border border-[#202635]/[0.09] bg-white/[0.035] px-2 py-1.5 transition hover:bg-white/[0.07] sm:flex"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d9b86c] text-[10px] font-bold text-[#17130a]">
              ME
            </div>

            <span className="hidden text-xs font-medium text-[#f7f3ea]/70 md:block">
              My Profile
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Navbar
