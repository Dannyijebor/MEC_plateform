import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  UserPlus,
  X,
  Search,
  Loader2,
  Crown,
  Trash2,
  Check,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"

export default function GroupInfo() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [allProfiles, setAllProfiles] = useState([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)

  const isAdmin = members.some(
    (m) => m.user_id === user?.id && m.is_admin
  )

  // Load group + members
  useEffect(() => {
    if (!conversationId) return
    async function load() {
      setLoading(true)
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single()
      setGroup(conv)

      const { data: mem } = await supabase
        .from("conversation_members")
        .select(`
          user_id,
          is_admin,
          profiles:user_id ( id, full_name, username, avatar_url )
        `)
        .eq("conversation_id", conversationId)
      setMembers(mem || [])
      setLoading(false)
    }
    load()
  }, [conversationId])

  // Load all profiles when add modal opens
  useEffect(() => {
    if (!showAddModal || !user?.id) return
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .order("full_name")
      .limit(200)
      .then(({ data }) => setAllProfiles(data || []))
  }, [showAddModal, user?.id])

  const memberIds = new Set(members.map((m) => m.user_id))
  const filtered = allProfiles.filter((p) => {
    if (memberIds.has(p.id)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.username || "").toLowerCase().includes(q)
    )
  })

  const handleAddMembers = async () => {
    if (selected.length === 0 || !conversationId) return
    setSaving(true)
    try {
      const rows = selected.map((id) => ({
        conversation_id: conversationId,
        user_id: id,
        is_admin: false,
      }))
      await supabase.from("conversation_members").insert(rows)

      // Reload members
      const { data } = await supabase
        .from("conversation_members")
        .select(`
          user_id, is_admin,
          profiles:user_id ( id, full_name, username, avatar_url )
        `)
        .eq("conversation_id", conversationId)
      setMembers(data || [])
      setSelected([])
      setShowAddModal(false)
    } catch (err) {
      console.warn("Add failed:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (userId) => {
    if (!conversationId || !isAdmin) return
    if (!window.confirm("Remove this member from the group?")) return
    await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
    setMembers((m) => m.filter((x) => x.user_id !== userId))
  }

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group? You won't see it anymore.")) return
    await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
    navigate("/messages")
  }

  const handleDisbandGroup = async () => {
    if (!isAdmin) return
    if (!window.confirm("Disband group? This deletes it for everyone.")) return
    await supabase.from("conversations").delete().eq("id", conversationId)
    navigate("/messages")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#1E40AF]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24 text-gray-900">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={19} />
        </button>
        <h1 className="text-lg font-bold">Group info</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        {/* Group summary */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#DBEAFE] text-3xl font-bold text-[#1E40AF]">
            {(group?.name || "G").charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-3 text-xl font-bold text-gray-900">
            {group?.name || "Group"}
          </h2>
          <p className="text-sm text-gray-500">
            {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Members section */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Members · {members.length}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-[#1E40AF]"
              >
                <UserPlus size={13} />
                Add
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
            {members.map((m, i) => {
              const p = m.profiles
              const nm = p?.full_name || p?.username || "MEC Member"
              const isMe = m.user_id === user?.id
              return (
                <div
                  key={m.user_id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < members.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-bold text-[#1E40AF]">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      nm.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {nm}
                      {isMe ? " · You" : ""}
                    </p>
                    {m.is_admin && (
                      <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Crown size={9} />
                        Admin
                      </span>
                    )}
                  </div>
                  {isAdmin && !isMe && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                      aria-label="Remove member"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
          <button
            onClick={handleLeaveGroup}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <X size={17} />
            </span>
            <span className="text-sm font-semibold text-red-500">Exit group</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleDisbandGroup}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3.5 text-left hover:bg-red-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 size={17} />
              </span>
              <span className="text-sm font-semibold text-red-600">
                Disband group
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Add members modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:h-auto sm:max-h-[75vh]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h2 className="text-lg font-bold text-gray-900">Add members</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="border-b border-gray-100 px-4 py-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1E40AF]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-400">
                    No more members to add
                  </p>
                ) : (
                  filtered.map((p) => {
                    const sel = selected.includes(p.id)
                    const nm = p.full_name || p.username || "MEC"
                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          setSelected((s) =>
                            s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${
                          sel ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-bold text-[#1E40AF]">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            nm.charAt(0).toUpperCase()
                          )}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                          {nm}
                        </p>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          sel ? "border-[#1E40AF] bg-[#1E40AF] text-white" : "border-gray-300"
                        }`}>
                          {sel && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              <div className="border-t border-gray-100 p-3">
                <button
                  disabled={selected.length === 0 || saving}
                  onClick={handleAddMembers}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E40AF] py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Add {selected.length || ""} member{selected.length === 1 ? "" : "s"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
