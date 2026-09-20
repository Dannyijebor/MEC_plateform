import { useState } from "react"
import { NavLink } from "react-router-dom"
import {
  Home,
  MessageCircle,
  Radio,
  Users,
  CalendarDays,
  Compass,
  Shield,
  FileText,
  UsersRound,
  Settings,
  LogOut,
  Moon,
  Sun,
  X,
  Menu,
  User,

  Sparkles,
  ChevronDown,
  Check,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useHideTopChrome } from "../../hooks/useHideTopChrome"
import { useAuthRoute } from "../../hooks/useAuthRoute"
import { useTheme } from "../../context/ThemeContext"
import { useBgEffect, EFFECTS } from "../../context/EffectContext"

function MobileNav() {
  const [open, setOpen] = useState(false)
  const hideTopChrome = useHideTopChrome()
  const { theme, toggleTheme } = useTheme()
  const { effect, setEffect } = useBgEffect()
  const [showEffects, setShowEffects] = useState(false)
  const isAuthRoute = useAuthRoute()

  if (isAuthRoute) return null

  const quickItems = [
    { label: "Home", icon: Home, to: "/" },
    { label: "Messages", icon: MessageCircle, to: "/messages" },
    { label: "Spaces", icon: Radio, to: "/spaces" },
    { label: "Family", icon: UsersRound, to: "/family-tree" },
    { label: "Events", icon: CalendarDays, to: "/events" },
  ]

  const menuItems = [
    { label: "Home", icon: Home, to: "/" },
    { label: "Community", icon: Compass, to: "/community" },
    { label: "Messages", icon: MessageCircle, to: "/messages" },
    { label: "Spaces", icon: Radio, to: "/spaces" },
    { label: "Family Tree", icon: UsersRound, to: "/family-tree" },
    { label: "Members", icon: Users, to: "/members" },
    { label: "Events", icon: CalendarDays, to: "/events" },
    { label: "Committees", icon: Shield, to: "/committees" },
    { label: "Documents", icon: FileText, to: "/documents" },
  ]

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Unable to sign out:", error)
    }
  }

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className={`fixed left-3 top-3 z-[10000] flex h-9 w-9 items-center justify-center rounded-lg border border-[#202635]/[0.09] bg-[#faf8f3]/95 text-[#111827]/70 shadow-sm backdrop-blur-xl transition hover:bg-white lg:hidden ${hideTopChrome ? "hidden" : ""}`}
      >
        <Menu size={19} />
      </button>

      {/* Backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[10001] bg-black/30 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[10002] w-[82%] max-w-xs transform border-r border-[#202635]/[0.09] bg-[#faf8f3] shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#202635]/[0.09] px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B82F6] text-[#ffffff]">
              <span className="text-sm font-bold">ME</span>
            </div>

            <div>
              <p className="text-sm font-bold text-[#111827]">
                MEC
              </p>
              <p className="text-[10px] text-[#111827]/45">
                Clan Community
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#111827]/50 transition hover:bg-black/[0.04] hover:text-[#111827]"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#111827]/30">
            Main
          </p>

          <nav className="space-y-1">
            {menuItems.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={label}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    isActive
                      ? "bg-[#3B82F6] text-[#ffffff]"
                      : "text-[#111827]/65 hover:bg-[#3B82F6]/[0.08] hover:text-[#111827]"
                  }`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-[#202635]/[0.09] pt-3">
            <NavLink
              to="/profile"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  isActive
                    ? "bg-[#3B82F6] text-[#ffffff]"
                    : "text-[#111827]/65 hover:bg-[#3B82F6]/[0.08]"
                }`
              }
            >
              <User size={18} />
              Profile
            </NavLink>

            <NavLink
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#111827]/65 transition hover:bg-[#3B82F6]/[0.08]"
            >
              <Settings size={18} />
              Settings
            </NavLink>

            {/* Background effect picker */}
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setShowEffects((v) => !v)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#111827]/65 transition hover:bg-[#3B82F6]/[0.08]"
              >
                <Sparkles size={18} />
                <span className="flex-1 text-left">
                  Background:{" "}
                  <span className="font-semibold text-[#111827]">
                    {EFFECTS.find((e) => e.key === effect)?.name || "Constellation"}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={"transition " + (showEffects ? "rotate-180" : "")}
                />
              </button>
              {showEffects && (
                <div className="mt-0.5 space-y-0.5">
                  {EFFECTS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setEffect(opt.key)
                        setShowEffects(false)
                      }}
                      className={
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 pl-11 text-sm transition " +
                        (effect === opt.key
                          ? "bg-[#3B82F6]/[0.10] font-semibold text-[#111827]"
                          : "text-[#111827]/60 hover:bg-[#3B82F6]/[0.06]")
                      }
                    >
                      <span className="flex-1 text-left">{opt.name}</span>
                      {effect === opt.key && (
                        <Check size={14} className="text-[#3B82F6]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#B44B40] transition hover:bg-[#FFF3F0]"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>

          {/* Dark mode toggle — bottom-right of the drawer */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="absolute bottom-20 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1e2e] to-[#0b1020] text-white shadow-[0_10px_30px_-8px_rgba(15,23,42,0.6)] transition hover:scale-105 active:scale-95"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <Sun size={20} strokeWidth={2.2} />
            ) : (
              <Moon size={20} strokeWidth={2.2} />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile quick navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-[9999] border-t border-[#202635]/[0.09] bg-[#faf8f3]/97 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {quickItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-medium transition ${
                  isActive
                    ? "bg-[#3B82F6]/10 text-[#1E40AF]"
                    : "text-[#111827]/45"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}

export default MobileNav
