import { Sparkles } from "lucide-react"
import { Outlet } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"
import { Moon, Sun } from "lucide-react"
import Fireflies from "../../components/effects/Fireflies"

function AuthLayout() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div data-auth-shell className="relative flex min-h-screen overflow-hidden bg-[#faf8f3] text-[#202635]">
      {/* Theme toggle top-right */}
      <button
        type="button"
        onClick={toggleTheme}
        data-auth-toggle
        aria-label="Toggle theme"
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-gray-700 shadow-md backdrop-blur transition hover:scale-105 active:scale-95"
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <Fireflies />

      <div className="relative z-10 flex min-h-screen w-full">

        {/* Branding panel */}
        <section className="hidden w-1/2 flex-col justify-between border-r border-[#202635]/[0.09] bg-[#faf8f3]/82 p-10 backdrop-blur-xl lg:flex xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/10">
              <Sparkles
                size={20}
                className="text-[#3B82F6]"
              />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Mack Eselebor Clan
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                Family Community
              </p>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-[#3B82F6]">
              One family. One community.
            </p>

            <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
              Stay connected to the people who matter most.
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-black/55">
              Share memories, celebrate milestones, discover family
              stories, and stay connected with the Mack Eselebor Clan.
            </p>
          </div>

          <p className="text-xs text-black/35">
            Private family community
          </p>
        </section>

        {/* Authentication area */}
        <main className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:px-10 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/10">
                <Sparkles
                  size={18}
                  className="text-[#3B82F6]"
                />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Mack Eselebor Clan
                </p>
                <p className="text-[9px] uppercase tracking-[0.18em] text-black/40">
                  Family Community
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-black/[0.08] bg-white p-5 shadow-xl sm:p-7">
              <Outlet />
            </div>

            <p className="mt-6 text-center text-[10px] leading-5 text-black/35">
              This is a private community for members of the
              Mack Eselebor Clan.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AuthLayout
