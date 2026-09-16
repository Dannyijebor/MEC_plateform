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
      to: "/app",
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
      to: "/family",
    },
    {
      label: "Events",
      icon: CalendarDays,
      to: "/events",
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#202635]/[0.09] bg-[#faf8f3]/96 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] transition ${
                isActive
                  ? "text-[#d9b86c]"
                  : "text-[#f7f3ea]/45 hover:text-[#f7f3ea]/80"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 1.8}
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
