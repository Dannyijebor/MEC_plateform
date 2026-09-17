import { NavLink } from "react-router-dom"
import {
  Home,
  MessageCircle,
  Radio,
  Users,
  CalendarDays,
} from "lucide-react"

function MobileNav() {
  const items = [
    {
      label: "Home",
      icon: Home,
      to: "/",
    },
    {
      label: "Messages",
      icon: MessageCircle,
      to: "/messages",
    },
    {
      label: "Spaces",
      icon: Radio,
      to: "/spaces",
    },
    {
      label: "Family",
      icon: Users,
      to: "/family-tree",
    },
    {
      label: "Events",
      icon: CalendarDays,
      to: "/events",
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#202635]/[0.09] bg-[#faf8f3]/97 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-medium transition sm:gap-1 sm:py-2 sm:text-[10px] ${
                isActive
                  ? "bg-[#d9b86c]/10 text-[#9b7a2f]"
                  : "text-[#111827]/45 hover:text-[#111827]/75"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className="sm:size-[20px]"
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default MobileNav
