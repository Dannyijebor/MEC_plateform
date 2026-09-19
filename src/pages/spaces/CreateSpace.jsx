import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Mic,
  Video,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { createSpace } from "../../services/spaces/spaceService"

const themes = [
  { id: "gold", name: "Gold", className: "bg-[#A8873F]" },
  { id: "purple", name: "Purple", className: "bg-purple-500" },
  { id: "green", name: "Green", className: "bg-emerald-500" },
  { id: "rose", name: "Rose", className: "bg-rose-500" },
]

function CreateSpace() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [mode, setMode] = useState(
    searchParams.get("mode") === "video" ? "video" : "audio",
  )
  const [visibility, setVisibility] = useState("family")
  const [theme, setTheme] = useState("gold")

  const [startMode, setStartMode] = useState(
    searchParams.get("scheduled") === "true" ? "scheduled" : "now",
  )

  const [scheduledFor, setScheduledFor] = useState("")

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (mounted) {
        setUser(currentUser)
        setLoadingUser(false)
      }
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [])

  async function handleCreate(event) {
    event.preventDefault()

    if (!user) {
      alert("You must be signed in to create a Space.")
      return
    }

    if (!title.trim()) {
      alert("Please enter a Space title.")
      return
    }

    if (startMode === "scheduled" && !scheduledFor) {
      alert("Please choose a date and time.")
      return
    }

    try {
      setSaving(true)

      const space = await createSpace({
        hostId: user.id,
        title,
        description,
        mode,
        visibility,
        theme,
        status: startMode === "now" ? "live" : "scheduled",
        scheduledFor:
          startMode === "scheduled"
            ? new Date(scheduledFor).toISOString()
            : null,
      })

      navigate(`/spaces/${space.id}`)
    } catch (error) {
      console.error(error)
      alert(error.message || "Unable to create Space.")
    } finally {
      setSaving(false)
    }
  }

  if (loadingUser) {
    return (
    <div data-create-space className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
      </div>
    )
  }

  return (
    <main data-create-space className="min-h-screen bg-white px-4 py-6 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => navigate("/spaces")}
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to Spaces
        </button>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white/[0.04] shadow-2xl">
          <div className="border-b border-gray-200 bg-gradient-to-r from-amber-400/10 via-[#A8873F]/5 to-amber-400/5 p-6 sm:p-8">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
              <Sparkles size={24} />
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Create a Space
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-900/55 sm:text-base">
              Bring the family together for a live conversation, discussion,
              celebration, or video gathering.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-8 p-6 sm:p-8">
            <section>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Space title
              </label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="What are you talking about?"
                className="w-full rounded-2xl border border-gray-200 bg-white/[0.05] px-4 py-4 text-gray-900 outline-none transition placeholder:text-gray-900/30 focus:border-amber-300/50 focus:bg-white/[0.07]"
              />
            </section>

            <section>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Tell your family what this Space is about..."
                className="w-full resize-none rounded-2xl border border-gray-200 bg-white/[0.05] px-4 py-4 text-gray-900 outline-none transition placeholder:text-gray-900/30 focus:border-amber-300/50 focus:bg-white/[0.07]"
              />
            </section>

            <section>
              <div className="mb-3 text-sm font-semibold text-gray-800">
                Space type
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    id: "audio",
                    title: "Audio",
                    description: "Talk with your family",
                    icon: Mic,
                  },
                  {
                    id: "video",
                    title: "Video",
                    description: "See everyone live",
                    icon: Video,
                  },
                                  ].map((item) => {
                  const Icon = item.icon
                  const selected = mode === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-amber-300/60 bg-amber-300/10"
                          : "border-gray-200 bg-gray-50 hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon
                        size={22}
                        className={
                          selected ? "text-amber-300" : "text-gray-600"
                        }
                      />

                      <div className="mt-4 font-semibold">{item.title}</div>
                      <div className="mt-1 text-xs text-gray-900/45">
                        {item.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <div className="mb-3 text-sm font-semibold text-gray-800">
                Who can join?
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVisibility("family")}
                  className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition ${
                    visibility === "family"
                      ? "border-amber-300/60 bg-amber-300/10"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <Users size={22} />
                  <div>
                    <div className="font-semibold">Everyone on MEC</div>
                    <div className="mt-1 text-xs text-gray-900/45">
                      Anyone in the family can join.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility("selected")}
                  className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition ${
                    visibility === "selected"
                      ? "border-amber-300/60 bg-amber-300/10"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <Users size={22} />
                  <div>
                    <div className="font-semibold">Selected members</div>
                    <div className="mt-1 text-xs text-gray-900/45">
                      Invite specific family members.
                    </div>
                  </div>
                </button>
              </div>
            </section>

            <section>
              <div className="mb-3 text-sm font-semibold text-gray-800">
                Theme
              </div>

              <div className="flex flex-wrap gap-3">
                {themes.map((item) => {
                  const selected = theme === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item.id)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                        selected
                          ? "border-white/40 bg-gray-100"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full ${item.className}`}
                      />

                      {item.name}

                      {selected && <Check size={15} />}
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <div className="mb-3 text-sm font-semibold text-gray-800">
                When should it start?
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStartMode("now")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    startMode === "now"
                      ? "border-amber-300/60 bg-amber-300/10"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <Mic size={21} />
                  <div className="mt-3 font-semibold">Start now</div>
                  <div className="mt-1 text-xs text-gray-900/45">
                    Open the Space immediately.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStartMode("scheduled")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    startMode === "scheduled"
                      ? "border-amber-300/60 bg-amber-300/10"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <CalendarDays size={21} />
                  <div className="mt-3 font-semibold">Schedule</div>
                  <div className="mt-1 text-xs text-gray-900/45">
                    Choose a future date and time.
                  </div>
                </button>
              </div>

              {startMode === "scheduled" && (
                <div className="mt-4">
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(event) => setScheduledFor(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white/[0.05] px-4 py-4 text-gray-900 outline-none focus:border-amber-300/50"
                  />
                </div>
              )}
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/spaces")}
                className="rounded-2xl border border-gray-200 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-6 py-3 font-bold text-[#07111f] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {startMode === "now" ? "Start Space" : "Schedule Space"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

export default CreateSpace
