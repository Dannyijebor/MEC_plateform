import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { X, Search, Loader2, Check, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { sheetUp } from "../../lib/motion"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"
import { createGroupConversation } from "../../services/chat/chatService"

export default function NewGroupModal({ open, onClose, onCreated }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState("pick")
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState([])
  const [groupName, setGroupName] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open || !user?.id) return
    setLoading(true); setStep("pick"); setSelected([])
    setGroupName(""); setSearch("")
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .neq("id", user.id)
      .order("full_name")
      .limit(200)
      .then(({ data }) => { setProfiles(data || []); setLoading(false) })
  }, [open, user?.id])

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles
    const q = search.toLowerCase()
    return profiles.filter(
      (p) =>
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.username || "").toLowerCase().includes(q)
    )
  }, [profiles, search])

  const toggle = (id) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])

  const handleCreate = async () => {
    if (!user?.id || !groupName.trim() || selected.length === 0) return
    setCreating(true)
    try {
      const conv = await createGroupConversation({
        name: groupName.trim(),
        creatorId: user.id,
        memberIds: selected,
      })
      onClose()
      if (onCreated) onCreated(conv.id)
      else navigate(`/messages?conversation=${conv.id}`)
    } catch (err) {
      console.warn("Group creation failed:", err)
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-md sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          variants={sheetUp}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[80vh] sm:rounded-3xl"
        >
          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E40AF]">
                {step === "pick" ? "New group" : "Name the group"}
              </p>
              <h2 className="mt-0.5 text-xl font-semibold text-gray-900">
                {step === "pick" ? `Select members · ${selected.length}` : groupName || "New group"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <X size={16} />
            </button>
          </div>

          {step === "pick" ? (
            <>
              <div className="border-b border-gray-100 px-4 py-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search members..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1E40AF] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                    No members found
                  </div>
                ) : (
                  filtered.map((p) => {
                    const isSel = selected.includes(p.id)
                    const nm = p.full_name || p.username || "MEC"
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                          isSel ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-bold text-[#1E40AF]">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            nm.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">{nm}</p>
                          {p.username && (
                            <p className="truncate text-xs text-gray-500">@{p.username}</p>
                          )}
                        </div>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          isSel ? "border-[#1E40AF] bg-[#1E40AF] text-white" : "border-gray-300"
                        }`}>
                          {isSel && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              <div className="border-t border-gray-100 p-3">
                <button
                  onClick={() => setStep("name")}
                  disabled={selected.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E40AF] py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Users size={16} />
                  Continue with {selected.length}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Group name
                </label>
                <input
                  autoFocus
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Eselebor Reunion 2026"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#1E40AF] focus:bg-white"
                />

                <p className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Members · {selected.length + 1}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E40AF] text-[10px] font-bold text-white">
                      You
                    </div>
                    <p className="text-sm font-semibold text-gray-900">You (Admin)</p>
                  </div>
                  {selected.map((id) => {
                    const p = profiles.find((x) => x.id === id)
                    if (!p) return null
                    const nm = p.full_name || p.username || "MEC"
                    return (
                      <div key={id} className="flex items-center gap-3 rounded-xl px-3 py-2">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-[10px] font-bold text-[#1E40AF]">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            nm.charAt(0).toUpperCase()
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{nm}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 p-3 flex gap-2">
                <button
                  onClick={() => setStep("pick")}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!groupName.trim() || creating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1E40AF] py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  {creating ? "Creating..." : "Create group"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
