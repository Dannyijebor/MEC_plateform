import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"

function initials(name) {
  if (!name) return "M"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export default function FollowListModal({ open, onClose, userId, mode = "following" }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const matchCol = mode === "following" ? "follower_id" : "following_id"
        const fetchCol = mode === "following" ? "following_id" : "follower_id"

        const { data: rows, error } = await supabase
          .from("follows")
          .select(fetchCol)
          .eq(matchCol, userId)

        if (error) throw error

        const ids = (rows || []).map((r) => r[fetchCol]).filter(Boolean)
        if (ids.length === 0) {
          if (!cancelled) setUsers([])
          return
        }

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", ids)

        if (!cancelled) setUsers(profiles || [])
      } catch (err) {
        console.error("Follow list load failed:", err)
        if (!cancelled) setUsers([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [open, userId, mode])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-[201] flex max-h-[70vh] w-full flex-col overflow-hidden rounded-t-[24px] border border-gray-100 bg-white shadow-2xl sm:inset-auto sm:bottom-1/2 sm:left-1/2 sm:max-h-[600px] sm:w-[420px] sm:-translate-x-1/2 sm:translate-y-1/2 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold capitalize text-gray-900">{mode}</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={22} className="animate-spin text-gray-400" />
                </div>
              ) : users.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-gray-500">
                    {mode === "following" ? "Not following anyone yet." : "No followers yet."}
                  </p>
                </div>
              ) : (
                <ul>
                  {users.map((u) => {
                    const name = u.full_name || u.username || "MEC Member"
                    return (
                      <li key={u.id}>
                        <button
                          onClick={() => {
                            onClose()
                            navigate(`/user/${u.id}`)
                          }}
                          className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-gray-50"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-[#F1E7CC] text-sm font-bold text-[#A8873F]">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials(name)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                            {u.username && (
                              <p className="truncate text-xs text-gray-500">@{u.username}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
