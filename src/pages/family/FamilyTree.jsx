import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Crown, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { ROOTS, CHILDREN } from "../../data/familyTree"

export default function FamilyTree() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, birthday, parent_slug")
      .then(({ data }) => {
        setProfiles(data || [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#1E40AF]" size={26} />
      </div>
    )
  }

  const memberCount = profiles.length

  return (
    <div data-family-tree className="min-h-screen bg-white pb-24 text-gray-900 dark:bg-[#0a0f18] dark:text-white">
      <div className="bg-gradient-to-br from-[#F1E7CC] via-[#FEF9E7] to-[#DBEAFE] px-5 pb-8 pt-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1E40AF]/15 bg-white/70 px-3 py-1.5">
            <Crown size={13} className="text-[#A8873F]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A8873F]">
              The Eselebor Ijebor Clan
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Our family tree</h1>
          <p className="mt-2 text-sm text-gray-600">
            {memberCount} members registered
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
          Grandparents
        </p>
        <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
          {ROOTS.map((r) => (
            <div
              key={r.slug}
              className="flex w-[200px] flex-col items-center gap-3 rounded-3xl border border-[#A8873F]/20 bg-gradient-to-br from-[#FEF9E7] to-[#F1E7CC] p-5"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#A8873F] text-xl font-bold text-white">
                {r.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{r.name}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#A8873F]">
                  {r.role}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
          Children
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHILDREN.map((c) => (
            <div
              key={c.slug}
              className="flex items-center gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-sm font-bold text-[#1E40AF]">
                {c.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
              </div>
              <p className="text-sm font-bold text-gray-900">{c.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
