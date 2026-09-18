import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { X, Search, Loader2, UserRound, MessageCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"
import { getOrCreateConversation } from "../../services/chat/chatService"

export default function NewChatModal({ open, onClose, onStartConversation }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [starting, setStarting] = useState(null)

  useEffect(() => {
    if (!open || !user?.id) return
    setLoading(true)
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, bio")
      .neq("id", user.id)
      .order("full_name", { ascending: true })
      .limit(200)
      .then(({ data, error }) => {
        if (error) {
          console.warn("Failed to load profiles:", error)
          setProfiles([])
        } else {
          setProfiles(data || [])
        }
        setLoading(false)
      })
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

  const handlePick = async (profile) => {
    if (!user?.id || starting) return
    setStarting(profile.id)
    try {
      const conversationId = await getOrCreateConversation(user.id, profile.id)
      onClose()
      if (onStartConversation) {
        onStartConversation(conversationId, profile)
      } else {
        navigate(`/messages?conversation=${conversationId}`)
      }
    } catch (err) {
      console.warn("Failed to start conversation:", err)
    } finally {
      setStarting(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-md sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] sm:h-auto sm:max-h-[80vh] sm:rounded-3xl"
          >
            <div className="flex justify-center pt-2 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">
                  New chat
                </p>
                <h2 className="mt-0.5 text-xl font-semibold text-gray-900">
                  Start a conversation
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-b border-gray-100 px-4 py-3">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or username..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#3B82F6] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Loading members...
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center px-6 text-center text-gray-400">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                    <UserRound size={22} />
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    No members found
                  </p>
                  <p className="mt-1 text-xs">
                    {search ? "Try a different search" : "No other members yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((profile) => {
                    const isStarting = starting === profile.id
                    const initial = (profile.full_name || "?").charAt(0).toUpperCase()
                    return (
                      <motion.button
                        key={profile.id}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePick(profile)}
                        disabled={!!starting}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-bold text-[#2563EB]">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initial
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {profile.full_name || "MEC Member"}
                          </p>
                          {profile.username && (
                            <p className="mt-0.5 truncate text-xs text-[#2563EB]">
                              @{profile.username}
                            </p>
                          )}
                          {profile.bio && (
                            <p className="mt-0.5 truncate text-xs text-gray-400">
                              {profile.bio}
                            </p>
                          )}
                        </div>
                        {isStarting ? (
                          <Loader2
                            size={16}
                            className="shrink-0 animate-spin text-[#2563EB]"
                          />
                        ) : (
                          <MessageCircle
                            size={16}
                            className="shrink-0 text-gray-300"
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
