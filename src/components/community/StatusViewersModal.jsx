import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { X, Eye, Heart, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../../lib/supabase"

function initials(name = "MEC") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()
}

export default function StatusViewersModal({ postId, open, onClose, liked }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState("views")
  const [viewers, setViewers] = useState([])
  const [likers, setLikers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !postId) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase
        .from("post_views")
        .select("user_id, viewed_at, profiles:user_id ( id, full_name, username, avatar_url )")
        .eq("post_id", postId)
        .order("viewed_at", { ascending: false }),
      supabase
        .from("post_reactions")
        .select("user_id, created_at, profiles:user_id ( id, full_name, username, avatar_url )")
        .eq("post_id", postId)
        .order("created_at", { ascending: false }),
    ]).then(([viewsRes, reactionsRes]) => {
      if (cancelled) return
      setViewers(viewsRes.data || [])
      setLikers(reactionsRes.data || [])
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [open, postId])

  if (!open) return null

  const list = tab === "views" ? viewers : likers
  const emptyIcon = tab === "views" ? Eye : Heart
  const EmptyIcon = emptyIcon
  const emptyText = tab === "views" ? "No views yet" : "No likes yet"

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
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:h-auto sm:max-h-[75vh] sm:rounded-3xl"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-bold text-gray-900">Status activity</h2>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTab("views")}
              className="relative flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition"
            >
              <Eye size={15} className={tab === "views" ? "text-[#1E40AF]" : "text-gray-400"} />
              <span className={tab === "views" ? "text-[#1E40AF]" : "text-gray-500"}>
                {viewers.length} Views
              </span>
              {tab === "views" && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-16 -translate-x-1/2 rounded-full bg-[#1E40AF]" />
              )}
            </button>
            <button
              onClick={() => setTab("likes")}
              className="relative flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition"
            >
              <Heart size={15} className={tab === "likes" ? "text-red-500" : "text-gray-400"} fill={tab === "likes" ? "currentColor" : "none"} />
              <span className={tab === "likes" ? "text-red-500" : "text-gray-500"}>
                {likers.length} Likes
              </span>
              {tab === "likes" && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-16 -translate-x-1/2 rounded-full bg-red-500" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                <Loader2 size={16} className="mr-2 animate-spin" />
                Loading...
              </div>
            ) : list.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-gray-400">
                <EmptyIcon size={26} className="text-gray-300" />
                <p className="mt-2 text-sm">{emptyText}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {list.map((u) => {
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
