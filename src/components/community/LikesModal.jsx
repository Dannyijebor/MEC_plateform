import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { X, Heart, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { sheetUp } from "../../lib/motion"
import { supabase } from "../../lib/supabase"

function initials(name = "MEC") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()
}

export default function LikesModal({ postId, open, onClose }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !postId) return
    let cancelled = false
    setLoading(true)

    supabase
      .from("post_reactions")
      .select("user_id, created_at, profiles:user_id ( id, full_name, username, avatar_url )")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setUsers(data || [])
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [open, postId])

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
          className="relative flex h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:h-auto sm:max-h-[70vh] sm:rounded-3xl"
        >
          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Heart size={14} fill="currentColor" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">Likes</p>
                <p className="text-[11px] text-gray-500">
                  {users.length} {users.length === 1 ? "person" : "people"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                <Loader2 size={16} className="mr-2 animate-spin" />
                Loading...
              </div>
            ) : users.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-gray-400">
                <Heart size={26} className="text-gray-300" />
                <p className="mt-2 text-sm">No likes yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((u) => {
                  const p = u.profiles
                  const nm = p?.full_name || p?.username || "MEC Member"
                  return (
                    <button
                      key={u.user_id}
                      onClick={() => {
                        if (p?.id) navigate("/user/" + p.id)
                        onClose()
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-gray-50"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-bold text-[#1E40AF]">
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(nm)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{nm}</p>
                        {p?.username && (
                          <p className="truncate text-xs text-gray-500">@{p.username}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
