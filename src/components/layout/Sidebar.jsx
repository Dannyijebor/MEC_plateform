import { NavLink } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { MessageCircle,
  Bell,
  CalendarDays,
  Compass,
  FileText,
  Home,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Users,
  UsersRound,
  Video,
} from "lucide-react"

const mainNavigation = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Community", icon: Compass, path: "/community" },
  { label: "Messages", icon: MessageCircle, path: "/messages" },
  { label: "Spaces", icon: Video, path: "/spaces" },
  { label: "Family Tree", icon: UsersRound, path: "/family-tree" },
]

const clanNavigation = [
  { label: "Members", icon: Users, path: "/members" },
  { label: "Events", icon: CalendarDays, path: "/events" },
  { label: "Committees", icon: Shield, path: "/committees" },
  { label: "Documents", icon: FileText, path: "/documents" },
]

function Sidebar() {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Unable to sign out:", error)
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-[#202635]/[0.09] bg-[#faf8f3]/92 backdrop-blur-2xl lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-[#202635]/[0.09] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d9b86c] text-[#17130a]">
          <Sparkles size={18} />
        </div>

        <div className="ml-3">
          <p className="text-sm font-bold tracking-tight">
            MEC
          </p>
          <p className="text-[10px] text-[#f7f3ea]/35">
            Mack Eselebor Clan
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ea]/25">
          Main
        </p>

        <nav className="space-y-1">
          {mainNavigation.map((item, index) => {
            const Icon = item.icon
            const active = index === 0

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[#d9b86c] text-[#17130a]"
                    : "text-[#f7f3ea]/50 hover:bg-[#d9b86c]/[0.06] hover:text-white"
                }`}
              >
                <Icon size={17} />
                <span>{item.label}</span>

                {item.label === "Messages" && (
                  <span className="ml-auto rounded-full bg-[#d9b86c]/10 px-2 py-0.5 text-[10px] text-white/60">
                    3
                  </span>
                )}
              </NavLink>
       )
          })}
        </nav>

        <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ea]/25">
          Clan
        </p>

        <nav className="space-y-1">
          {clanNavigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-[#d9b86c] text-[#17130a]"
                      : "text-[#111827]/60 hover:bg-[#d9b86c]/[0.08] hover:text-[#111827]"
                  }`
                }
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-[#202635]/[0.09] p-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#f7f3ea]/45 transition hover:bg-[#d9b86c]/[0.06] hover:text-white">
          <Bell size={17} />
          Notifications
        </button>

        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#f7f3ea]/45 transition hover:bg-[#d9b86c]/[0.06] hover:text-white">
          <Settings size={17} />
          Settings
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#111827]/60 transition hover:bg-[#FFF3F0] hover:text-[#B44B40]"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
