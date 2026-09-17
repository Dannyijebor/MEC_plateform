import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Search,
  Send,
  MessageCircle,
  Users,
  MoreVertical,
  Phone,
  Video,
  Palette,
  Check,
  Loader2,
  Sparkles,
  X, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PhoneOff } from "lucide-react"
import IncomingCallPopup from "../../components/chat/IncomingCallPopup"
import { useAuth } from "../../hooks/useAuth"
import {
  getMyConversations,
  getConversationMessages,
  sendMessage,
  subscribeToConversation,
} from "../../services/chat/chatService"
import {
  broadcastCallCancelled,
  broadcastIncomingCall,
  subscribeToIncomingCalls,
} from "../../services/calls/callService"

// ==========================================
// 🎨 6 BEAUTIFUL THEMES
// ==========================================
const THEMES = {
  classic: {
    name: "Classic",
    preview: "linear-gradient(135deg, #FCFBF7 0%, #D9B86C 100%)",
    page: "bg-gradient-to-br from-[#F7F5EF] via-[#FCFBF7] to-[#F1EFE8]",
    sidebar: "bg-[#FCFBF7]",
    chatBg: "bg-[#FAF8F3]",
    ownBubble: "bg-[#111827] text-white",
    otherBubble: "bg-white text-[#111827] border border-[#DCD9D0]",
    accent: "#111827",
    accentText: "text-[#111827]",
    accentBg: "bg-[#111827]",
    accentHover: "hover:bg-[#1B2435]",
    headerBg: "bg-[#FCFBF7]/95",
    headerBorder: "border-[#DCD9D0]",
    inputBg: "bg-white",
    inputBorder: "border-[#DCD9D0]",
    iconAccent: "text-[#A8873F]",
    iconBg: "bg-[#F1E7CC]",
    text: "text-[#111827]",
    textMuted: "text-[#5F6673]",
    textFaint: "text-[#8A8F98]",
    dark: false,
  },
  sunset: {
    name: "Warm Sunset",
    preview: "linear-gradient(135deg, #FFE4CC 0%, #FF6B35 100%)",
    page: "bg-gradient-to-br from-[#FFF4E6] via-[#FFE4CC] to-[#FFD1A3]",
    sidebar: "bg-[#FFF8F0]",
    chatBg: "bg-[#FFF8F0]",
    ownBubble: "bg-gradient-to-br from-[#FF8C42] to-[#FF6B35] text-white",
    otherBubble: "bg-white text-[#5C2E0E] border border-[#FFD1A3]",
    accent: "#FF6B35",
    accentText: "text-[#FF6B35]",
    accentBg: "bg-[#FF6B35]",
    accentHover: "hover:bg-[#E55A28]",
    headerBg: "bg-[#FFF4E6]/95",
    headerBorder: "border-[#FFD1A3]",
    inputBg: "bg-white",
    inputBorder: "border-[#FFD1A3]",
    iconAccent: "text-[#FF8C42]",
    iconBg: "bg-[#FFE4CC]",
    text: "text-[#5C2E0E]",
    textMuted: "text-[#8A5A2E]",
    textFaint: "text-[#B8845A]",
    dark: false,
  },
  ocean: {
    name: "Ocean Blue",
    preview: "linear-gradient(135deg, #BAE6FD 0%, #0284C7 100%)",
    page: "bg-gradient-to-br from-[#E0F2FE] via-[#BAE6FD] to-[#7DD3FC]",
    sidebar: "bg-[#F0F9FF]",
    chatBg: "bg-[#F0F9FF]",
    ownBubble: "bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white",
    otherBubble: "bg-white text-[#0C4A6E] border border-[#BAE6FD]",
    accent: "#0284C7",
    accentText: "text-[#0284C7]",
    accentBg: "bg-[#0284C7]",
    accentHover: "hover:bg-[#0369A1]",
    headerBg: "bg-[#E0F2FE]/95",
    headerBorder: "border-[#BAE6FD]",
    inputBg: "bg-white",
    inputBorder: "border-[#BAE6FD]",
    iconAccent: "text-[#0EA5E9]",
    iconBg: "bg-[#E0F2FE]",
    text: "text-[#0C4A6E]",
    textMuted: "text-[#3E6B8A]",
    textFaint: "text-[#6BA3C7]",
    dark: false,
  },
  forest: {
    name: "Forest Green",
    preview: "linear-gradient(135deg, #D1FAE5 0%, #059669 100%)",
    page: "bg-gradient-to-br from-[#ECFDF5] via-[#D1FAE5] to-[#A7F3D0]",
    sidebar: "bg-[#F0FDF4]",
    chatBg: "bg-[#F0FDF4]",
    ownBubble: "bg-gradient-to-br from-[#059669] to-[#047857] text-white",
    otherBubble: "bg-white text-[#064E3B] border border-[#A7F3D0]",
    accent: "#059669",
    accentText: "text-[#059669]",
    accentBg: "bg-[#059669]",
    accentHover: "hover:bg-[#047857]",
    headerBg: "bg-[#ECFDF5]/95",
    headerBorder: "border-[#A7F3D0]",
    inputBg: "bg-white",
    inputBorder: "border-[#A7F3D0]",
    iconAccent: "text-[#10B981]",
    iconBg: "bg-[#ECFDF5]",
    text: "text-[#064E3B]",
    textMuted: "text-[#3E6B5A]",
    textFaint: "text-[#6BA39A]",
    dark: false,
  },
  midnight: {
    name: "Midnight",
    preview: "linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)",
    page: "bg-gradient-to-br from-[#0F0D24] via-[#1E1B4B] to-[#0F0D24]",
    sidebar: "bg-[#1A1633]",
    chatBg: "bg-[#1A1633]",
    ownBubble: "bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white",
    otherBubble: "bg-[#2E2A50] text-white border border-[#4C4780]",
    accent: "#8B5CF6",
    accentText: "text-[#A78BFA]",
    accentBg: "bg-[#8B5CF6]",
    accentHover: "hover:bg-[#7C3AED]",
    headerBg: "bg-[#1E1B4B]/95",
    headerBorder: "border-[#4C4780]",
    inputBg: "bg-[#2E2A50]",
    inputBorder: "border-[#4C4780]",
    iconAccent: "text-[#A78BFA]",
    iconBg: "bg-[#2E2A50]",
    text: "text-white",
    textMuted: "text-white/70",
    textFaint: "text-white/40",
    dark: true,
  },
  rosegold: {
    name: "Rose Gold",
    preview: "linear-gradient(135deg, #FBCFE8 0%, #D9A86C 100%)",
    page: "bg-gradient-to-br from-[#FDF2F8] via-[#FCE7F3] to-[#FBCFE8]",
    sidebar: "bg-[#FEF5F8]",
    chatBg: "bg-[#FEF5F8]",
    ownBubble: "bg-gradient-to-br from-[#E11D48] to-[#BE123C] text-white",
    otherBubble: "bg-white text-[#831843] border border-[#FBCFE8]",
    accent: "#E11D48",
    accentText: "text-[#E11D48]",
    accentBg: "bg-[#E11D48]",
    accentHover: "hover:bg-[#BE123C]",
    headerBg: "bg-[#FDF2F8]/95",
    headerBorder: "border-[#FBCFE8]",
    inputBg: "bg-white",
    inputBorder: "border-[#FBCFE8]",
    iconAccent: "text-[#D9A86C]",
    iconBg: "bg-[#FEF3C7]",
    text: "text-[#831843]",
    textMuted: "text-[#A8527A]",
    textFaint: "text-[#C98BA8]",
    dark: false,
  },
}

function useChatTheme() {
  const [themeKey, setThemeKey] = useState(() => {
    if (typeof window === "undefined") return "classic"
    return localStorage.getItem("mec-chat-theme") || "classic"
  })
  useEffect(() => {
    localStorage.setItem("mec-chat-theme", themeKey)
  }, [themeKey])
  return [themeKey, setThemeKey, THEMES[themeKey] || THEMES.classic]
}

// ==========================================
// 🎨 THEME PICKER
// ==========================================
function ThemePicker({ current, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/20"
        aria-label="Change theme"
        title="Change theme"
      >
        <Palette size={17} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-[#DCD9D0] bg-white p-2 shadow-2xl"
          >
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#8A8F98]">
              Chat theme
            </p>
            {Object.entries(THEMES).map(([key, theme]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[#F1EFE8]"
              >
                <span
                  className="h-6 w-6 rounded-full border border-black/10 shadow-inner"
                  style={{ background: theme.preview }}
                />
                <span className="flex-1 text-sm font-medium text-[#111827]">
                  {theme.name}
                </span>
                {current === key && (
                  <Check size={15} className="text-[#111827]" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ==========================================
// 💬 MAIN MESSAGES COMPONENT
// ==========================================
function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetConversationId = searchParams.get("conversation")

  const [themeKey, setThemeKey, theme] = useChatTheme()

  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [incomingCall, setIncomingCall] = useState(null)
  const [missedCall, setMissedCall] = useState(null)

  const handleAcceptIncoming = () => {
    if (!incomingCall) return
    const { conversationId, mode } = incomingCall
    setIncomingCall(null)
    navigate(`/calls?conversation=${conversationId}&mode=${mode}`)
  }

  const handleDeclineIncoming = () => {
    setIncomingCall(null)
  }

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Load all conversations
  const loadConversations = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError("")
    try {
      const data = await getMyConversations(user.id)
      setConversations(data)

      if (targetConversationId && data) {
        const target = data.find((c) => c.id === targetConversationId)
        if (target) setSelectedConversation(target)
      }
    } catch (err) {
      console.error("Unable to load conversations:", err)
      setError("Could not load your conversations.")
    }
    setLoading(false)
  }, [user, targetConversationId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Load messages for selected conversation
  const loadMessages = useCallback(async () => {
    if (!selectedConversation) return
    setMessagesLoading(true)
    setError("")
    try {
      const data = await getConversationMessages(selectedConversation.id)
      setMessages(data || [])
    } catch (err) {
      console.error("Unable to load messages:", err)
      setError("Could not load messages.")
    }
    setMessagesLoading(false)
  }, [selectedConversation])

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([])
      return
    }
    loadMessages()

    let unsubscribe
    try {
      if (typeof subscribeToConversation === "function") {
        unsubscribe = subscribeToConversation(
          selectedConversation.id,
          (newMsg) => {
            setMessages((current) => {
              if (current.some((m) => m.id === newMsg.id)) return current
              return [...current, newMsg]
            })
          }
        )
      }
    } catch (err) {
      console.warn("Realtime not available:", err)
    }
    return () => unsubscribe?.()
  }, [selectedConversation, loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Subscribe to incoming call invites (safe, never crashes)
  useEffect(() => {
    if (!user) return
    let channel = null
    try {
      channel = subscribeToIncomingCalls(user.id, {
        onIncoming: (payload) => {
          if (!payload || payload.callerId === user.id) return
          console.log("📞 Incoming call from", payload.callerName)
          setIncomingCall(payload)
        },
        onCancelled: (payload) => {
          if (!payload || payload.callerId === user.id) return
          console.log("📵 Missed call from", payload.callerName)
          setIncomingCall(null)
          setMissedCall({ callerName: payload.callerName || "MEC Member" })
          setTimeout(() => setMissedCall(null), 4000)
        },
      })
    } catch (err) {
      console.warn("Incoming calls unavailable:", err)
    }
    return () => {
      try {
        if (channel && typeof channel.unsubscribe === "function") {
          channel.unsubscribe()
        }
      } catch (err) {
        console.warn("Channel cleanup failed:", err)
      }
    }
  }, [user])

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    const content = messageText.trim()
    if (!content || !selectedConversation || !user || sending) return

    setSending(true)
    setError("")
    try {
      const newMessage = await sendMessage({
        conversationId: selectedConversation.id,
        senderId: user.id,
        content,
      })

      setMessages((current) => {
        if (current.some((m) => m.id === newMessage.id)) return current
        return [...current, newMessage]
      })
      setMessageText("")
      textareaRef.current?.focus()
    } catch (err) {
      console.error("Unable to send message:", err)
      setError("Could not send your message.")
    }
    setSending(false)
  }

  // Keyboard: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  // Call actions
  const startCall = async (type) => {
    if (!selectedConversation || !user) return

    try {
      const members = selectedConversation.conversation_members || []
      const other = members.find((m) => m.user_id !== user.id)
      if (other?.user_id) {
        await broadcastIncomingCall(other.user_id, {
          conversationId: selectedConversation.id,
          callerId: user.id,
          callerName: user.user_metadata?.full_name || user.email,
          callerAvatar: user.user_metadata?.avatar_url,
          mode: type,
        })
      }
    } catch (err) {
      console.warn("Could not broadcast invite:", err)
    }

    navigate(`/calls?conversation=${selectedConversation.id}&mode=${type}`)
  }

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter((c) =>
      (c.display_name || "").toLowerCase().includes(q)
    )
  }, [conversations, search])

  const formatTime = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return "now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  return (
    <div className={`h-[calc(100vh-4rem)] w-full overflow-hidden ${theme.page}`}>
      <div className="flex h-full">
        {/* ============================================
            SIDEBAR — Conversation List
            ============================================ */}
        <aside
          className={`w-full flex-col border-r ${theme.headerBorder} ${theme.sidebar} ${
            selectedConversation ? "hidden sm:flex sm:w-[340px]" : "flex"
          }`}
        >
          {/* Sidebar header */}
          <div className={`border-b ${theme.headerBorder} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${theme.iconBg} ${theme.iconAccent}`}>
                    <MessageCircle size={14} />
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.22em] ${theme.iconAccent}`}>
                    Messages
                  </span>
                </div>
                <h1 className={`mt-2 text-2xl font-semibold tracking-tight ${theme.text}`}>
                  Your chats
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/calls/history")}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${theme.headerBorder} ${theme.sidebar} ${theme.textMuted} transition hover:opacity-80`}
                  aria-label="Call history"
                  title="Call history"
                >
                  <Clock size={17} />
                </button>
                <ThemePicker current={themeKey} onChange={setThemeKey} />
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-4">
              <Search
                size={16}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textFaint}`}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className={`w-full rounded-xl border ${theme.inputBorder} ${theme.inputBg} py-2.5 pl-9 pr-3 text-sm ${theme.text} outline-none transition focus:border-current placeholder:${theme.textFaint}`}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className={`flex h-40 items-center justify-center text-sm ${theme.textMuted}`}>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Loading...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className={`flex h-full flex-col items-center justify-center px-6 text-center ${theme.textMuted}`}>
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${theme.iconBg}`}>
                  <MessageCircle size={24} className={theme.iconAccent} />
                </div>
                <p className="text-sm font-semibold">No conversations yet</p>
                <p className="mt-1 text-xs">
                  Tap a member's profile to start chatting.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => {
                  const active = selectedConversation?.id === conv.id
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedConversation(conv)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                        active
                          ? theme.dark
                            ? "bg-white/10"
                            : "bg-black/5"
                          : theme.dark
                            ? "hover:bg-white/5"
                            : "hover:bg-black/[0.03]"
                      }`}
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${theme.iconBg} text-sm font-bold ${theme.iconAccent}`}>
                        {conv.display_avatar ? (
                          <img src={conv.display_avatar} alt="" className="h-full w-full object-cover" />
                        ) : conv.is_direct ? (
                          (conv.display_name || "?").charAt(0).toUpperCase()
                        ) : (
                          <Users size={20} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${theme.text}`}>
                          {conv.display_name || "Conversation"}
                        </p>
                        <p className={`mt-0.5 text-xs ${theme.textMuted}`}>
                          {conv.is_direct ? "Private conversation" : "Group conversation"}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ============================================
            MAIN — Chat Area
            ============================================ */}
        <main
          className={`min-w-0 flex-1 flex-col ${
            selectedConversation ? "flex" : "hidden sm:flex"
          }`}
        >
          {!selectedConversation ? (
            <div className={`flex h-full flex-col items-center justify-center px-6 text-center ${theme.chatBg}`}>
              <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-3xl ${theme.iconBg}`}>
                <Sparkles size={32} className={theme.iconAccent} />
              </div>
              <h2 className={`text-2xl font-semibold ${theme.text}`}>
                Pick a conversation
              </h2>
              <p className={`mt-2 max-w-sm text-sm ${theme.textMuted}`}>
                Choose a chat from the list or start a new one from someone's profile.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <header className={`flex items-center gap-2 border-b ${theme.headerBorder} ${theme.headerBg} px-3 py-3 backdrop-blur-md sm:px-5 sm:py-4`}>
                <button
                  type="button"
                  onClick={() => setSelectedConversation(null)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.textMuted} transition ${theme.dark ? "hover:bg-white/10" : "hover:bg-black/5"} sm:hidden`}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ${theme.iconBg} text-sm font-bold ${theme.iconAccent}`}>
                  {selectedConversation.display_avatar ? (
                    <img src={selectedConversation.display_avatar} alt="" className="h-full w-full object-cover" />
                  ) : selectedConversation.is_direct ? (
                    (selectedConversation.display_name || "?").charAt(0).toUpperCase()
                  ) : (
                    <Users size={20} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className={`truncate text-sm font-semibold ${theme.text}`}>
                    {selectedConversation.display_name || "Conversation"}
                  </h2>
                  <p className={`text-xs ${theme.textMuted}`}>
                    {selectedConversation.is_direct ? "Private conversation" : "Group conversation"}
                  </p>
                </div>

                {/* Call buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startCall("audio")}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.textMuted} transition ${theme.dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                    aria-label="Start audio call"
                    title="Audio call"
                  >
                    <Phone size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startCall("video")}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.textMuted} transition ${theme.dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                    aria-label="Start video call"
                    title="Video call"
                  >
                    <Video size={18} />
                  </button>
                  <button
                    type="button"
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.textMuted} transition ${theme.dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                    aria-label="Conversation options"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </header>

              {/* Messages area */}
              <div className={`flex-1 overflow-y-auto px-3 py-5 sm:px-6 ${theme.chatBg}`}>
                {messagesLoading ? (
                  <div className={`flex h-full items-center justify-center text-sm ${theme.textMuted}`}>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className={`flex h-full flex-col items-center justify-center text-center ${theme.textMuted}`}>
                    <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${theme.iconBg}`}>
                      <MessageCircle size={28} className={theme.iconAccent} />
                    </div>
                    <p className="text-sm font-semibold">Start the conversation</p>
                    <p className="mt-1 text-xs">Send the first message.</p>
                  </div>
                ) : (
                  <div className="mx-auto max-w-2xl space-y-3">
                    {messages.map((message) => {
                      const mine = message.sender_id === user?.id
                      const isCallEvent = message.content?.startsWith("[MEC_CALL]")

                      if (isCallEvent) {
                        let callInfo = {}
                        try {
                          callInfo = JSON.parse(message.content.slice(10))
                        } catch {}
                        const isMissed = callInfo.status === "missed"
                        const isAnswered = callInfo.status === "answered"
                        const isDeclined = callInfo.status === "declined"
                        const iAmCaller = callInfo.callerId === user?.id
                        const outgoing = iAmCaller
                        const durationLabel =
                          isAnswered && callInfo.duration
                            ? ` · ${Math.floor(callInfo.duration / 60)}:${String(callInfo.duration % 60).padStart(2, "0")}`
                            : ""
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-center py-2"
                          >
                            <div
                              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium ${theme.headerBorder} ${theme.sidebar} ${theme.textMuted}`}
                            >
                              <span>{callInfo.mode === "video" ? "📹" : "📞"}</span>
                              <span>
                                {isMissed
                                  ? outgoing
                                    ? "Outgoing call"
                                    : "Missed call"
                                  : isDeclined
                                    ? outgoing
                                      ? "Call declined"
                                      : "Declined call"
                                    : isAnswered
                                      ? outgoing
                                        ? "Outgoing call"
                                        : "Incoming call"
                                      : "Call"}
                              </span>
                              <span className={isMissed ? "text-red-400" : theme.textFaint}>
                                {callInfo.mode === "video" ? "video" : "audio"}
                                {durationLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => startCall(callInfo.mode || "audio")}
                                className={`ml-1 flex h-7 w-7 items-center justify-center rounded-full ${theme.iconBg} ${theme.iconAccent} transition hover:scale-110`}
                                aria-label="Call back"
                                title="Call back"
                              >
                                <Phone size={12} />
                              </button>
                            </div>
                          </motion.div>
                        )
                      }
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div className="flex max-w-[80%] flex-col">
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                mine ? theme.ownBubble : theme.otherBubble
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                            <span className={`mt-1 px-1 text-[10px] ${theme.textFaint} ${mine ? "text-right" : "text-left"}`}>
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                        </motion.div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className={`border-t ${theme.headerBorder} ${theme.headerBg} px-3 py-3 backdrop-blur-md sm:px-5 sm:py-4`}>
                {error && (
                  <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="mx-auto flex max-w-2xl items-end gap-2">
                  <div className={`flex flex-1 items-end gap-2 rounded-2xl border ${theme.inputBorder} ${theme.inputBg} p-2`}>
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder="Write a message..."
                      className={`max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm ${theme.text} outline-none placeholder:${theme.textFaint}`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sending}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${theme.accentBg} text-white shadow-lg transition ${theme.accentHover} disabled:cursor-not-allowed disabled:opacity-40`}
                    aria-label="Send message"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
                <p className={`mt-2 text-center text-[10px] ${theme.textFaint}`}>
                  Messages disappear after 24 hours
                </p>
              </div>
            </>
          )}
        </main>
      </div>

      <IncomingCallPopup
        call={incomingCall}
        onAccept={handleAcceptIncoming}
        onDecline={handleDeclineIncoming}
      />

      {missedCall && (
        <div className="fixed left-1/2 top-4 z-[195] -translate-x-1/2 rounded-2xl border border-red-500/30 bg-[#0b1020]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15">
              <PhoneOff size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                Missed call
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                from {missedCall.callerName}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Messages
