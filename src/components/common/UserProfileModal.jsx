import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { X, MessageCircle } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getOrCreateConversation } from "../../services/chat/chatService"
import { useAuth } from "../../hooks/useAuth"

export default function UserProfileModal({ userId, onClose }) {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startingChat, setStartingChat] = useState(false)

  useEffect(() => {
    if (!userId) return
    async function fetchProfile() {
      setLoading(true)
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()
      if (error) { console.error("Error fetching profile:", error) } else { setProfile(data) }
      setLoading(false)
    }
    fetchProfile()
  }, [userId])

  const handleStartChat = async () => {
    if (!currentUser || !userId || currentUser.id === userId) return
    setStartingChat(true)
    try {
      const conversationId = await getOrCreateConversation(currentUser.id, userId)
      if (conversationId) {
        onClose()
        navigate(`/messages?conversation=${conversationId}`)
      }
    } catch (error) { 
      console.error("Failed to start chat:", error) 
      alert("Could not start chat. Please check your database setup.")
    } finally { 
      setStartingChat(false) 
    }
  }

  if (!userId) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      {/* White Modal Container */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500">
            Loading profile...
          </div>
        ) : profile ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#d9b86c]/30 bg-[#d9b86c]/10 text-2xl font-bold text-[#d9b86c]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
              ) : (
                profile.full_name?.charAt(0) || "M"
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              {profile.full_name || "MEC Member"}
            </h2>
            
            {profile.username && (
              <p className="mt-1 text-sm text-[#d9b86c]">@{profile.username}</p>
            )}

            {profile.bio && (
              <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                {profile.bio}
              </p>
            )}

            <div className="mt-8 flex w-full gap-3">
              {currentUser?.id !== userId ? (
                <button
                  onClick={handleStartChat}
                  disabled={startingChat}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d9b86c] py-3 text-sm font-bold text-gray-900 transition hover:bg-[#c4a45b] disabled:opacity-50"
                >
                  <MessageCircle size={18} />
                  {startingChat ? "Starting..." : "Message"}
                </button>
              ) : (
                <button
                  onClick={() => { onClose(); navigate("/profile") }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-100"
                >
                  Edit My Profile
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-red-500">
            User not found.
          </div>
        )}
      </div>
    </div>
  )
}
