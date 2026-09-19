import { Bell, Search, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import { useHideTopChrome } from "../../hooks/useHideTopChrome"
import { useAuthRoute } from "../../hooks/useAuthRoute"

function Navbar() {
  const navigate = useNavigate()
  const hideTopChrome = useHideTopChrome()
  const isAuthRoute = useAuthRoute()

  if (hideTopChrome || isAuthRoute) return null

  return (
    <header className="sticky top-0 z-40 border-b border-[#202635]/[0.09] bg-[#faf8f3]/95 backdrop-blur-2xl lg:ml-64">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-6 lg:px-8">

        {/* Mobile / tablet branding */}
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5 lg:hidden"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#3B82F6]/20 bg-[#3B82F6]/10 sm:h-9 sm:w-9 sm:rounded-xl">
            <Sparkles
              size={16}
              className="text-[#1E40AF] sm:size-[17px]"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#111827] sm:text-sm">
              Mark Eselebor
            </p>
            <p className="truncate text-[9px] text-[#111827]/45 sm:text-[10px]">
              Clan Community
            </p>
          </div>
        </Link>

        {/* Desktop search */}
        <div className="relative hidden w-full max-w-md lg:block">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#111827]/35"
          />

          <input
            type="search"
            placeholder="Search the clan..."
            className="h-10 w-full rounded-xl border border-[#202635]/[0.09] bg-white/60 pl-10 pr-4 text-sm text-[#111827] outline-none placeholder:text-[#111827]/30 transition focus:border-[#3B82F6]/40 focus:bg-white"
          />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#202635]/[0.09] bg-white/70 text-[#111827]/65 transition hover:bg-white hover:text-[#111827] sm:h-10 sm:w-10 sm:rounded-xl"
          >
            <Bell size={17} className="sm:size-[18px]" />

            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#3B82F6] sm:right-2 sm:top-2" />
          </motion.button>

          {/* Desktop profile */}
          <Link
            to="/profile"
            className="hidden items-center gap-2 rounded-xl border border-[#202635]/[0.09] bg-white/70 px-2 py-1.5 transition hover:bg-white sm:flex"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6] text-[10px] font-bold text-[#ffffff]">
              ME
            </div>

            <span className="hidden text-xs font-medium text-[#111827]/70 md:block">
              My Profile
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Navbar
