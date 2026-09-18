import { NavLink } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import {
  Bell,
  CalendarDays,
  Compass,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Shield,
  Sparkles,
  Users,
  UsersRound,
  Video,
  User,
} from "lucide-react"

const mainNavigation = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Community", icon: Compass, path: "/community" },
  { label: "Messages", icon: MessageCircle, path: "/messages" },
  { label: "Spaces", icon: Video, path: "/spaces" },
  { label: "Family Tree", icon: UsersRound, path: "/family-tree" },
  { label: "Profile", icon: User, path: "/profile" },
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
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B82F6] text-[#ffffff]">
          <Sparkles size={18} />
        </div>

        <div className="ml-3">
          <p className="text-sm font-bold tracking-tight text-[#111827]">
            MEC
          </p>

          <p className="text-[10px] text-[#111827]/40">
            Mack Eselebor Clan
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#111827]/30">
          Main
        </p>

        <nav className="space-y-1">
          {mainNavigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-[#3B82F6] text-[#ffffff]"
                      : "text-[#111827]/60 hover:bg-[#3B82F6]/[0.08] hover:text-[#111827]"
                  }`
                }
              >
                <Icon size={17} />

                <span>{item.label}</span>

                {item.label === "Messages" && (
                  <span className="ml-auto rounded-full bg-[#3B82F6]/10 px-2 py-0.5 text-[10px] text-[#111827]/60">
                    3
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#111827]/30">
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
                      ? "bg-[#3B82F6] text-[#ffffff]"
                      : "text-[#111827]/60 hover:bg-[#3B82F6]/[0.08] hover:text-[#111827]"
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
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#111827]/60 transition hover:bg-[#3B82F6]/[0.08] hover:text-[#111827]"
        >
          <Bell size={17} />
          Notifications
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#111827]/60 transition hover:bg-[#3B82F6]/[0.08] hover:text-[#111827]"
        >
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
