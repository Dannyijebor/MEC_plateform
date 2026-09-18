import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Search, Send, MessageCircle, Users, MoreVertical, Phone, Video, Palette, Check, CheckCheck, Loader2, Sparkles, X, Clock, Plus, ChevronRight, Mic } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PhoneOff } from "lucide-react"
import IncomingCallPopup from "../../components/chat/IncomingCallPopup"
import SwipeableBubble from "../../components/chat/SwipeableBubble"
import MessageActionMenu from "../../components/chat/MessageActionMenu"
import VoiceRecorder from "../../components/chat/VoiceRecorder"
import VoiceMessagePlayer from "../../components/chat/VoiceMessagePlayer"
import Butterfly from "../../components/chat/Butterfly"
import ChatHeaderMenu from "../../components/chat/ChatHeaderMenu"
import UserProfileModal from "../../components/common/UserProfileModal"
import NewChatModal from "../../components/chat/NewChatModal"
import { useAuth } from "../../hooks/useAuth"
import { useOnlineUsers } from "../../context/PresenceContext"
import { supabase } from "../../lib/supabase"
import {
  getMyConversations,
  getConversationMessages,
  sendMessage,
  subscribeToConversation,
  markConversationAsRead,
  sendReplyMessage,
  editMessage,
  deleteMessage,
  getReactionsForMessages,
  toggleReaction,
  getUnreadCounts,
  setConversationTheme,
  logThemeChange,
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
    preview: "linear-gradient(135deg, #FCFBF7 0%, #3B82F6 100%)",
    page: "bg-gradient-to-br from-[#F7F5EF] via-[#FCFBF7] to-[#F1EFE8]",
    sidebar: "bg-[#FCFBF7]",
    chatBg: "bg-[#FAF8F3]",
    ownBubble: "bg-[#DBEAFE] text-[#3A2F1B]",
    otherBubble: "bg-white text-[#111827] border border-[#DCD9D0]",
    accent: "#111827",
    accentText: "text-[#111827]",
    accentBg: "bg-[#111827]",
    accentHover: "hover:bg-[#1B2435]",
    headerBg: "bg-[#FCFBF7]/95",
    headerBorder: "border-[#DCD9D0]",
    inputBg: "bg-white",
    inputBorder: "border-[#DCD9D0]",
    iconAccent: "text-[#2563EB]",
    iconBg: "bg-[#DBEAFE]",
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
    ownBubble: "bg-gradient-to-br from-[#FFD4B8] to-[#FFB88C] text-[#5C2E0E]",
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
    ownBubble: "bg-gradient-to-br from-[#B8DDF5] to-[#8FC5EE] text-[#0C4A6E]",
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
    ownBubble: "bg-gradient-to-br from-[#C8E6D0] to-[#A2D4B3] text-[#064E3B]",
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
    ownBubble: "bg-gradient-to-br from-[#D4C5F7] to-[#B8A3EE] text-[#2E1065]",
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
    ownBubble: "bg-gradient-to-br from-[#F8D4DD] to-[#EFB0C0] text-[#831843]",
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
  butterflyGarden: {
    name: "Butterfly Garden",
    preview: "linear-gradient(135deg, #dcfce7 0%, #fef3c7 50%, #fce7f3 100%)",
    page: "bg-gradient-to-br from-[#f0fdf4] via-[#fef9e7] to-[#fdf2f8]",
    sidebar: "bg-[#fafff8]",
    chatBg: "bg-[#fafff8]",
    ownBubble: "bg-gradient-to-br from-[#86efac] to-[#4ade80] text-[#14532d]",
    otherBubble: "bg-white text-[#166534] border border-[#bbf7d0]",
    accent: "#16a34a",
    accentText: "text-[#16a34a]",
    accentBg: "bg-[#16a34a]",
    accentHover: "hover:bg-[#15803d]",
    headerBg: "bg-[#f0fdf4]/95",
    headerBorder: "border-[#bbf7d0]",
    inputBg: "bg-white",
    inputBorder: "border-[#bbf7d0]",
    iconAccent: "text-[#16a34a]",
    iconBg: "bg-[#dcfce7]",
    text: "text-[#14532d]",
    textMuted: "text-[#3E6B5A]",
    textFaint: "text-[#86a894]",
    dark: false,
    hasButterfly: true,
    butterflyColors: { color1: "#22c55e", color2: "#86efac", bodyColor: "#14532d" },
  },
  lavenderDream: {
    name: "Lavender Dream",
    preview: "linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%)",
    page: "bg-gradient-to-br from-[#faf5ff] via-[#f3e8ff] to-[#ede9fe]",
    sidebar: "bg-[#fdfaff]",
    chatBg: "bg-[#fdfaff]",
    ownBubble: "bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white",
    otherBubble: "bg-white text-[#4c1d95] border border-[#ddd6fe]",
    accent: "#7c3aed",
    accentText: "text-[#7c3aed]",
    accentBg: "bg-[#7c3aed]",
    accentHover: "hover:bg-[#6d28d9]",
    headerBg: "bg-[#faf5ff]/95",
    headerBorder: "border-[#ddd6fe]",
    inputBg: "bg-white",
    inputBorder: "border-[#ddd6fe]",
    iconAccent: "text-[#7c3aed]",
    iconBg: "bg-[#ede9fe]",
    text: "text-[#4c1d95]",
    textMuted: "text-[#6b5b9e]",
    textFaint: "text-[#a99ecc]",
    dark: false,
    hasButterfly: true,
    butterflyColors: { color1: "#a78bfa", color2: "#c4b5fd", bodyColor: "#4c1d95" },
  },
  oceanBreeze: {
    name: "Ocean Breeze",
    preview: "linear-gradient(135deg, #cffafe 0%, #67e8f9 100%)",
    page: "bg-gradient-to-br from-[#ecfeff] via-[#cffafe] to-[#a5f3fc]",
    sidebar: "bg-[#f0fdff]",
    chatBg: "bg-[#f0fdff]",
    ownBubble: "bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white",
    otherBubble: "bg-white text-[#155e75] border border-[#a5f3fc]",
    accent: "#0891b2",
    accentText: "text-[#0891b2]",
    accentBg: "bg-[#0891b2]",
    accentHover: "hover:bg-[#0e7490]",
    headerBg: "bg-[#ecfeff]/95",
    headerBorder: "border-[#a5f3fc]",
    inputBg: "bg-white",
    inputBorder: "border-[#a5f3fc]",
    iconAccent: "text-[#0891b2]",
    iconBg: "bg-[#cffafe]",
    text: "text-[#155e75]",
    textMuted: "text-[#4a7c94]",
    textFaint: "text-[#8db8c9]",
    dark: false,
    hasButterfly: true,
    butterflyColors: { color1: "#06b6d4", color2: "#67e8f9", bodyColor: "#155e75" },
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
  const onlineUsers = useOnlineUsers()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetConversationId = searchParams.get("conversation")
  const incomingCallConv = searchParams.get("incomingCall")
  const incomingCallMode = searchParams.get("mode") || "audio"
  const incomingCallRingId = searchParams.get("ringId")
  const incomingCallerName = searchParams.get("callerName")

  const [themeKey, setThemeKey, globalTheme] = useChatTheme()

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
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [reactions, setReactions] = useState({})
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [chatMuted, setChatMuted] = useState(false)
  const [viewingProfileId, setViewingProfileId] = useState(null)

  // Active theme: conversation-specific or fallback to global
  const theme = selectedConversation?.theme
    ? (THEMES[selectedConversation.theme] || globalTheme)
    : globalTheme
  const [unreadCounts, setUnreadCounts] = useState({})
  const [showMenuFor, setShowMenuFor] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 })
  const [typingUsers, setTypingUsers] = useState([])
  const typingChannelRef = useRef(null)
  const [missedCall, setMissedCall] = useState(null)

  // Push a history entry when a chat is opened, so the phone's back button
  // closes the chat instead of leaving the /messages page entirely
  const chatOpenHistoryPushed = useRef(false)
  useEffect(() => {
    if (typeof window === "undefined") return

    if (selectedConversation && !chatOpenHistoryPushed.current) {
      chatOpenHistoryPushed.current = true
      window.history.pushState({ mecChatOpen: true }, "")
    } else if (!selectedConversation && chatOpenHistoryPushed.current) {
      chatOpenHistoryPushed.current = false
    }

    const handlePop = () => {
      // If the user pressed browser/phone back while a chat is open, close the chat
      if (chatOpenHistoryPushed.current) {
        chatOpenHistoryPushed.current = false
        setSelectedConversation(null)
      }
    }

    window.addEventListener("popstate", handlePop)
    return () => {
      window.removeEventListener("popstate", handlePop)
    }
  }, [selectedConversation])

  // Toggle a body class so the layout can hide its chrome on mobile
  useEffect(() => {
    if (selectedConversation) {
      document.body.classList.add("chat-open")
    } else {
      document.body.classList.remove("chat-open")
    }
    return () => document.body.classList.remove("chat-open")
  }, [selectedConversation])

  // Edge-swipe-to-go-back gesture state
  const swipeBackRef = useRef({ active: false, startX: 0, startY: 0 })

  const handleSwipeStart = (e) => {
    if (!selectedConversation) return
    const touch = e.touches?.[0]
    if (!touch) return
    if (touch.clientX < 40) {
      swipeBackRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
      }
    }
  }

  const handleSwipeMove = (e) => {
    if (!swipeBackRef.current.active) return
    const touch = e.touches?.[0]
    if (!touch) return
    const dx = touch.clientX - swipeBackRef.current.startX
    const dy = Math.abs(touch.clientY - swipeBackRef.current.startY)
    if (dy > 30 && dy > dx) {
      swipeBackRef.current.active = false
    }
  }

  const handleSwipeEnd = (e) => {
    if (!swipeBackRef.current.active) return
    const touch = e.changedTouches?.[0]
    if (!touch) {
      swipeBackRef.current.active = false
      return
    }
    const dx = touch.clientX - swipeBackRef.current.startX
    if (dx > 80) {
      setSelectedConversation(null)
    }
    swipeBackRef.current.active = false
  }

  // If a push notification opened this page with call info, show the popup
  useEffect(() => {
    if (!incomingCallConv) return
    setIncomingCall({
      conversationId: incomingCallConv,
      mode: incomingCallMode,
      ringId: incomingCallRingId,
      callerName: incomingCallerName ? decodeURIComponent(incomingCallerName) : "MEC Member",
      callerAvatar: null,
    })
    // Fetch the caller's avatar for a premium look
    if (incomingCallConv && user?.id) {
      supabase
        .from("conversation_members")
        .select("user_id, profiles:user_id (full_name, avatar_url, username)")
        .eq("conversation_id", incomingCallConv)
        .neq("user_id", user.id)
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data?.profiles) {
            setIncomingCall((c) => c ? {
              ...c,
              callerName: data.profiles.full_name || data.profiles.username || c.callerName,
              callerAvatar: data.profiles.avatar_url,
            } : c)
          }
        })
        .catch(() => {})
    }
  }, [incomingCallConv, incomingCallMode, incomingCallRingId, incomingCallerName, user?.id])

  const handleAcceptIncoming = () => {
    if (!incomingCall) return
    const { conversationId, mode } = incomingCall
    setIncomingCall(null)
    // Clear the incoming-call query params
    try {
      const params = new URLSearchParams(searchParams)
      params.delete("incomingCall")
      params.delete("mode")
      params.delete("ringId")
      params.delete("callerName")
      setSearchParams(params, { replace: true })
    } catch {}
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

      try {
        const counts = await getUnreadCounts(user.id)
        setUnreadCounts(counts || {})
      } catch (err) {
        console.warn("Failed to load unread counts:", err)
      }

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

    // Mark incoming messages as read (when opening the chat)
    if (user?.id) {
      markConversationAsRead(selectedConversation.id, user.id).catch((err) => {
        console.warn("markConversationAsRead failed:", err)
      })
    }

    let unsubscribe
    let updateChannel
    try {
      if (typeof subscribeToConversation === "function") {
        unsubscribe = subscribeToConversation(
          selectedConversation.id,
          (newMsg) => {
            setMessages((current) => {
              if (current.some((m) => m.id === newMsg.id)) return current
              return [...current, newMsg]
            })

            // If it's from the other person, mark as read
            if (newMsg.sender_id !== user?.id && user?.id) {
              markConversationAsRead(selectedConversation.id, user.id).catch(() => {})
            }
          }
        )
      }

      // Subscribe to UPDATE events so tick marks update live
      updateChannel = supabase
        .channel(`messages-update:${selectedConversation.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${selectedConversation.id}`,
          },
          (payload) => {
            const updated = payload.new
            if (!updated) return
            setMessages((current) =>
              current.map((m) =>
                m.id === updated.id ? { ...m, ...updated } : m
              )
            )
          }
        )
        .subscribe()
    } catch (err) {
      console.warn("Realtime not available:", err)
    }
    return () => {
      try { unsubscribe?.() } catch {}
      try { if (updateChannel) supabase.removeChannel(updateChannel) } catch {}
    }
  }, [selectedConversation, loadMessages, user])

  // Typing indicator subscription
  useEffect(() => {
    if (!selectedConversation || !user) {
      setTypingUsers([])
      return
    }
    const channel = supabase
      .channel(`typing:${selectedConversation.id}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload || payload.userId === user.id) return
        setTypingUsers((current) => {
          const others = current.filter((u) => u.userId !== payload.userId)
          return [...others, { userId: payload.userId, name: payload.name, at: Date.now() }]
        })
      })
      .subscribe()
    typingChannelRef.current = channel
    return () => {
      try { supabase.removeChannel(channel) } catch {}
      typingChannelRef.current = null
      setTypingUsers([])
    }
  }, [selectedConversation, user])

  // Expire typing users after 3s of inactivity
  useEffect(() => {
    if (typingUsers.length === 0) return
    const t = setTimeout(() => {
      const now = Date.now()
      setTypingUsers((current) => {
        const filtered = current.filter((u) => now - u.at < 3000)
        return filtered.length === current.length ? current : filtered
      })
    }, 1500)
    return () => clearTimeout(t)
  }, [typingUsers])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Realtime reaction subscription
  useEffect(() => {
    if (!selectedConversation) return
    const channel = supabase
      .channel(`reactions:${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          if (messages.length === 0) return
          const ids = messages.map((m) => m.id)
          getReactionsForMessages(ids)
            .then((grouped) => setReactions(grouped || {}))
            .catch(() => {})
        }
      )
      .subscribe()
    return () => {
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [selectedConversation, messages])

  // Load reactions whenever messages change
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setReactions({})
      return
    }
    const ids = messages.map((m) => m.id)
    let cancelled = false
    getReactionsForMessages(ids)
      .then((grouped) => {
        if (!cancelled) setReactions(grouped || {})
      })
      .catch((err) => {
        console.warn("Failed to load reactions:", err)
      })
    return () => {
      cancelled = true
    }
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
  const handleSendVoiceNote = async (blob, mimeType, seconds) => {
    if (!selectedConversation || !user?.id) return
    try {
      const ext = mimeType.includes("mp4") ? "m4a" : "webm"
      const filePath = `${user.id}/voice-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("community-media")
        .upload(filePath, blob, { contentType: mimeType, upsert: false })

      if (uploadError) throw uploadError

      const newMessage = await sendMessage({
        conversationId: selectedConversation.id,
        senderId: user.id,
        content: `[voice]${seconds}s`,
      })

      // Update the message row with media info
      await supabase
        .from("messages")
        .update({ media_url: filePath, media_type: "voice" })
        .eq("id", newMessage.id)

      const enriched = { ...newMessage, media_url: filePath, media_type: "voice" }
      setMessages((current) => {
        if (current.some((m) => m.id === enriched.id)) return current
        return [...current, enriched]
      })
    } catch (err) {
      console.error("Voice upload failed:", err)
      alert("Could not send voice note. Try again.")
    } finally {
      setVoiceRecording(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    const content = messageText.trim()
    if (!content || !selectedConversation || !user || sending) return

    setSending(true)
    setError("")
    try {
      if (editingMessage) {
        const updated = await editMessage(editingMessage.id, content)
        setMessages((current) =>
          current.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
        )
        setMessageText("")
        setEditingMessage(null)
        textareaRef.current?.focus()
        setSending(false)
        return
      }

      const newMessage = replyingTo
        ? await sendReplyMessage({
            conversationId: selectedConversation.id,
            senderId: user.id,
            content,
            replyToId: replyingTo.id,
          })
        : await sendMessage({
            conversationId: selectedConversation.id,
            senderId: user.id,
            content,
          })

      setMessages((current) => {
        if (current.some((m) => m.id === newMessage.id)) return current
        return [...current, newMessage]
      })
      setMessageText("")
      setReplyingTo(null)
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
    <div
      data-messages-shell
      onTouchStart={handleSwipeStart}
      onTouchMove={handleSwipeMove}
      onTouchEnd={handleSwipeEnd}
      className={`w-full overflow-hidden ${theme.page} ${
        selectedConversation
          ? "fixed inset-0 z-40 h-[100dvh] pt-[env(safe-area-inset-top)] lg:static lg:z-auto lg:h-[calc(100dvh-4rem)] lg:pt-0"
          : "h-[calc(100dvh-4rem)]"
      }`}
    >
      <div className="flex h-full">
        {/* ============================================
            SIDEBAR — Conversation List
            ============================================ */}
        <aside
          data-messages-sidebar
          className={`w-full flex-col border-r ${theme.headerBorder} ${theme.sidebar} ${
            selectedConversation ? "hidden sm:flex sm:w-[340px]" : "flex"
          }`}
        >
          {/* Sidebar header */}
          <div className={`border-b ${theme.headerBorder} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${theme.iconBg} ${theme.iconAccent}`}>
                    <MessageCircle size={15} />
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.22em] ${theme.iconAccent}`}>
                    Messages
                  </span>
                </div>
                <h1 className={`mt-2.5 text-3xl font-semibold tracking-tight ${theme.text}`}>
                  Your chats
                </h1>
                <p className={`mt-1 text-xs ${theme.textMuted}`}>
                  Stay connected with your community.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate("/calls/history")}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${theme.headerBorder} ${theme.sidebar} ${theme.textMuted} transition hover:opacity-80`}
                  aria-label="Call history"
                  title="Call history"
                >
                  <MessageCircle size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1e2e] to-[#0b1020] text-white shadow-[0_10px_30px_-8px_rgba(15,23,42,0.5)] transition hover:scale-105 active:scale-95"
                  aria-label="New chat"
                  title="Start new chat"
                >
                  <Plus size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-5">
              <Search
                size={17}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textFaint}`}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className={`w-full rounded-full border ${theme.inputBorder} ${theme.inputBg} py-3 pl-11 pr-11 text-sm ${theme.text} outline-none transition focus:border-[#3B82F6] placeholder:${theme.textFaint}`}
              />
              <button
                type="button"
                className={`absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full ${theme.textMuted} transition hover:bg-black/5`}
                aria-label="Filter"
                title="Filter"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="10" y1="18" x2="14" y2="18" />
                  <circle cx="9" cy="6" r="1.6" fill="currentColor" />
                  <circle cx="15" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="12" cy="18" r="1.6" fill="currentColor" />
                </svg>
              </button>
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
              <div className="space-y-2">
                {filteredConversations.map((conv) => {
                  const active = selectedConversation?.id === conv.id
                  const unread = unreadCounts[conv.id] || 0
                  const isOnline = Array.isArray(conv.conversation_members) &&
                    conv.conversation_members.some(
                      (m) => m?.user_id && m.user_id !== user?.id && onlineUsers.has(m.user_id)
                    )

                  const timeLabel = (() => {
                    const ts = conv.last_message_at
                    if (!ts) return ""
                    const d = new Date(ts)
                    const now = new Date()
                    const diffMins = Math.floor((now - d) / 60000)
                    if (diffMins < 1) return "now"
                    if (diffMins < 60) return `${diffMins}m`
                    const sameDay = d.toDateString() === now.toDateString()
                    if (sameDay) {
                      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    }
                    const yest = new Date(now); yest.setDate(now.getDate() - 1)
                    if (d.toDateString() === yest.toDateString()) return "Yesterday"
                    return d.toLocaleDateString([], { month: "short", day: "numeric" })
                  })()

                  const previewText = (() => {
                    const raw = conv.last_message_preview
                    if (!raw) {
                      return conv.is_direct ? "Say hi 👋" : "Group conversation"
                    }
                    const prefix = conv.last_message_mine ? "You: " : ""
                    return `${prefix}${raw}`
                  })()

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedConversation(conv)}
                      className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-[#3B82F6]/40 bg-[#3B82F6]/5"
                          : theme.dark
                            ? "border-white/5 hover:border-white/10 hover:bg-white/5"
                            : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE] text-sm font-bold text-[#2563EB]`}>
                          {conv.display_avatar ? (
                            <img src={conv.display_avatar} alt="" className="h-full w-full object-cover" />
                          ) : conv.is_direct ? (
                            (conv.display_name || "?").charAt(0).toUpperCase()
                          ) : (
                            <Users size={20} />
                          )}
                        </div>
                        {conv.is_direct && (
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                              isOnline ? "bg-emerald-500" : "bg-gray-300"
                            }`}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-sm font-semibold ${
                            unread > 0 ? "text-gray-900" : theme.dark ? "text-white/90" : "text-gray-800"
                          }`}>
                            {conv.display_name || "Conversation"}
                          </p>
                          <span className={`shrink-0 text-[10px] ${
                            unread > 0 ? "font-semibold text-[#4F7CFF]" : "text-gray-400"
                          }`}>
                            {timeLabel}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className={`truncate text-xs ${
                            unread > 0 ? "font-medium text-gray-600" : "text-gray-400"
                          }`}>
                            {previewText}
                          </p>
                          {unread > 0 && (
                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#4F7CFF] px-1.5 text-[10px] font-bold text-white">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={15} className="ml-0.5 shrink-0 text-gray-300" />
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
          data-chat-view
          className={`chat-conversation min-w-0 flex-1 flex-col ${
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

                <div className="relative shrink-0">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ${theme.iconBg} text-sm font-bold ${theme.iconAccent}`}>
                    {selectedConversation.display_avatar ? (
                      <img src={selectedConversation.display_avatar} alt="" className="h-full w-full object-cover" />
                    ) : selectedConversation.is_direct ? (
                      (selectedConversation.display_name || "?").charAt(0).toUpperCase()
                    ) : (
                      <Users size={20} />
                    )}
                  </div>
                  {selectedConversation.is_direct && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                        Array.isArray(selectedConversation.conversation_members) &&
                        selectedConversation.conversation_members.some(
                          (m) => m?.user_id && m.user_id !== user?.id && onlineUsers.has(m.user_id)
                        )
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />
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
                    onClick={() => setShowChatMenu(true)}
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

                      const isThemeEvent = message.content?.startsWith("[MEC_THEME]")
                      if (isThemeEvent) {
                        let info = {}
                        try { info = JSON.parse(message.content.slice(11)) } catch {}
                        const isMine = message.sender_id === user?.id
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="flex justify-center py-2"
                          >
                            <div className={`flex items-center gap-2 rounded-full border ${theme.headerBorder} ${theme.sidebar} ${theme.textMuted} px-4 py-2 text-xs font-medium shadow-sm`}>
                              <span>🎨</span>
                              <span>
                                {isMine ? "You" : (info.userName || "They")} changed the theme to{" "}
                                <span className={`font-semibold ${theme.iconAccent}`}>{info.themeName}</span>
                              </span>
                            </div>
                          </motion.div>
                        )
                      }

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
                          <div className="relative flex max-w-[80%] flex-col">
                            <SwipeableBubble
                              mine={mine}
                              messageId={message.id}
                              onReply={() => {
                                setReplyingTo({
                                  id: message.id,
                                  content: message.content,
                                  sender_id: message.sender_id,
                                })
                                setEditingMessage(null)
                                textareaRef.current?.focus()
                              }}
                              onLongPress={({ rect, event }) => {
                                const touch = event?.touches?.[0] || event || {}
                                const x = touch.clientX ?? window.innerWidth / 2
                                const y = touch.clientY ?? window.innerHeight / 2
                                setMenuAnchor({ rect, x, y })
                                setShowMenuFor(message.id)
                              }}
                            >
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all duration-200 ${
                                mine ? theme.ownBubble : theme.otherBubble
                              } ${
                                showMenuFor === message.id
                                  ? "ring-2 ring-[#3B82F6] ring-offset-2 ring-offset-white/60 scale-[1.02]"
                                  : ""
                              }`}
                            >
                              {message.reply_to_id && (() => {
                                const original = messages.find((m) => m.id === message.reply_to_id)
                                if (!original) return null
                                let name = "MEC Member"
                                if (original.sender_id === user?.id) {
                                  name = "You"
                                } else {
                                  const member = (selectedConversation?.conversation_members || []).find(
                                    (m) => m?.user_id === original.sender_id
                                  )
                                  name = member?.profiles?.full_name
                                    || member?.profiles?.username
                                    || "MEC Member"
                                }
                                return (
                                  <div className="mb-2 rounded-lg border-l-2 border-l-current/40 px-2 py-1 text-[11px] opacity-70">
                                    <p className="font-semibold">{name}</p>
                                    <p className="mt-0.5 line-clamp-2">
                                      {original?.content || "Original message"}
                                    </p>
                                  </div>
                                )
                              })()}
                              {message.media_type === "voice" && message.media_url ? (
                                <VoiceMessagePlayer
                                  mediaUrl={message.media_url}
                                  mine={mine}
                                  theme={theme}
                                />
                              ) : (
                                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              )}
                              {message.edited_at && (
                                <p className="mt-1 text-[10px] opacity-60">(edited)</p>
                              )}
                            </div>

                            </SwipeableBubble>
                            {(() => {
                              const list = reactions[message.id] || []
                              if (list.length === 0) return null
                              // Group by emoji
                              const grouped = {}
                              for (const r of list) {
                                if (!grouped[r.emoji]) grouped[r.emoji] = []
                                grouped[r.emoji].push(r)
                              }
                              return (
                                <div className={`mt-1 flex flex-wrap items-center gap-1 px-1 ${mine ? "justify-end" : "justify-start"}`}>
                                  {Object.entries(grouped).map(([emoji, arr]) => {
                                    const iReacted = arr.some((r) => r.user_id === user?.id)
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() =>
                                          toggleReaction({
                                            messageId: message.id,
                                            userId: user.id,
                                            emoji,
                                          }).catch(() => {})
                                        }
                                        className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition ${
                                          iReacted
                                            ? "border-[#3B82F6] bg-[#3B82F6]/15"
                                            : "border-gray-200 bg-white/70 hover:bg-white"
                                        }`}
                                      >
                                        <span>{emoji}</span>
                                        {arr.length > 1 && (
                                          <span className="text-[9px] opacity-70">
                                            {arr.length}
                                          </span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              )
                            })()}
                            <span className={`mt-1 flex items-center gap-1 px-1 text-[10px] ${theme.textFaint} ${mine ? "justify-end" : "justify-start"}`}>
                              <span>{formatTime(message.created_at)}</span>
                              {mine && (() => {
                                const otherMember = (selectedConversation?.conversation_members || []).find(
                                  (m) => m?.user_id && m.user_id !== user?.id
                                )
                                const recipientOnline = otherMember?.user_id
                                  ? onlineUsers.has(otherMember.user_id)
                                  : false
                                const isRead = Boolean(message.read_at)
                                const isDelivered = isRead || recipientOnline
                                return (
                                  <span
                                    className={
                                      isRead
                                        ? "text-sky-500"
                                        : isDelivered
                                          ? "text-gray-400"
                                          : "opacity-50"
                                    }
                                    title={isRead ? "Read" : isDelivered ? "Delivered" : "Sent"}
                                  >
                                    {isDelivered ? (
                                      <CheckCheck size={13} />
                                    ) : (
                                      <Check size={13} />
                                    )}
                                  </span>
                                )
                              })()}
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
                {typingUsers.length > 0 && (
                  <div className={`mb-2 text-center text-xs italic ${theme.textMuted}`}>
                    {typingUsers.map((u) => u.name).join(", ")}{" "}
                    {typingUsers.length === 1 ? "is" : "are"} typing...
                  </div>
                )}
                {editingMessage && (
                  <div className={`mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-xl border-l-4 border-l-sky-500 ${theme.inputBg} px-3 py-2 ${theme.headerBorder} border`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                        Editing message
                      </p>
                      <p className={`mt-0.5 truncate text-xs ${theme.textMuted}`}>
                        {editingMessage.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(null)
                        setMessageText("")
                      }}
                      className={`shrink-0 rounded-lg p-1.5 ${theme.textMuted} transition ${theme.dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                      aria-label="Cancel edit"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {!editingMessage && replyingTo && (
                  <div className={`mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-xl border-l-4 border-l-[#3B82F6] ${theme.inputBg} px-3 py-2 ${theme.headerBorder} border`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.iconAccent}`}>
                        Replying to {(() => {
                          if (replyingTo.sender_id === user?.id) return "yourself"
                          const member = (selectedConversation?.conversation_members || []).find(
                            (m) => m?.user_id === replyingTo.sender_id
                          )
                          return member?.profiles?.full_name
                            || member?.profiles?.username
                            || "MEC Member"
                        })()}
                      </p>
                      <p className={`mt-0.5 truncate text-xs ${theme.textMuted}`}>
                        {replyingTo.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className={`shrink-0 rounded-lg p-1.5 ${theme.textMuted} transition ${theme.dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                      aria-label="Cancel reply"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="mx-auto flex max-w-2xl items-end gap-2">
                  <div className={`flex flex-1 items-end gap-2 rounded-2xl border ${theme.inputBorder} ${theme.inputBg} p-2 focus-within:ring-0 focus-within:outline-none`}>
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value)
                        if (typingChannelRef.current && user?.id) {
                          typingChannelRef.current.send({
                            type: "broadcast",
                            event: "typing",
                            payload: {
                              userId: user.id,
                              name: user.user_metadata?.full_name || user.email || "MEC Member",
                            },
                          }).catch(() => {})
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder="Write a message..."
                      className={`max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm ${theme.text} outline-none focus:outline-none focus:ring-0 focus:border-transparent appearance-none`}
                    />
                  </div>
                  {messageText.trim() ? (
                    <button
                      type="submit"
                      disabled={sending}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3B82F6] text-white shadow-lg transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40`}
                      aria-label="Send message"
                    >
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVoiceRecording(true)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3B82F6] text-white shadow-lg transition hover:bg-[#2563EB]"
                      aria-label="Record voice note"
                    >
                      <Mic size={18} />
                    </button>
                  )}
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

      {viewingProfileId && (
        <UserProfileModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}

      <ChatHeaderMenu
        open={showChatMenu}
        onClose={() => setShowChatMenu(false)}
        themeKey={selectedConversation?.theme || "classic"}
        onChangeTheme={async (newThemeKey) => {
          if (!selectedConversation || !user?.id) return
          // Optimistically update the local conversation
          setSelectedConversation((c) => c ? { ...c, theme: newThemeKey } : c)
          setConversations((list) =>
            list.map((c) => c.id === selectedConversation.id ? { ...c, theme: newThemeKey } : c)
          )
          setShowChatMenu(false)
          try {
            await setConversationTheme(selectedConversation.id, newThemeKey)
            const themeName = THEMES[newThemeKey]?.name || "a new theme"
            await logThemeChange({
              conversationId: selectedConversation.id,
              userId: user.id,
              userName: user.user_metadata?.full_name || user.email || "MEC Member",
              themeName,
            })
          } catch (err) {
            console.warn("Failed to save theme:", err)
          }
        }}
        muted={chatMuted}
        onToggleMute={() => setChatMuted((v) => !v)}
        onClearChat={() => {}}
        onViewProfile={() => {
          if (selectedConversation?.conversation_members) {
            const other = selectedConversation.conversation_members.find(
              (m) => m?.user_id !== user?.id
            )
            if (other?.user_id) {
              setShowChatMenu(false)
              setViewingProfileId?.(other.user_id)
            }
          }
        }}
        otherUser={{
          full_name: selectedConversation?.display_name,
        }}
        theme={theme}
      />

      {voiceRecording && (
        <VoiceRecorder
          onCancel={() => setVoiceRecording(false)}
          onComplete={handleSendVoiceNote}
        />
      )}

      <NewChatModal
        open={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onStartConversation={async (conversationId) => {
          try {
            const data = await getMyConversations(user.id)
            setConversations(data || [])
            const target = (data || []).find((c) => c.id === conversationId)
            if (target) setSelectedConversation(target)
          } catch (err) {
            console.warn("Refresh failed:", err)
          }
        }}
      />

      {showMenuFor && (() => {
        const targetMsg = messages.find((m) => m.id === showMenuFor)
        if (!targetMsg) return null
        const targetMine = targetMsg.sender_id === user?.id
        const targetSender = (selectedConversation?.conversation_members || []).find(
          (m) => m?.user_id === targetMsg.sender_id
        )
        const targetName = targetMine
          ? "You"
          : targetSender?.profiles?.full_name || targetSender?.profiles?.username || "MEC Member"
        const EDIT_WINDOW_MS = 30 * 60 * 1000
        const messageAge = Date.now() - new Date(targetMsg.created_at).getTime()
        const withinEditWindow = messageAge < EDIT_WINDOW_MS
        const canEdit =
          targetMine &&
          !targetMsg.content?.startsWith("[MEC_CALL]") &&
          withinEditWindow
        return (
          <MessageActionMenu
            message={targetMsg}
            mine={targetMine}
            canEdit={canEdit}
            senderName={targetName}
            anchor={menuAnchor}
            myReaction={(() => {
              const list = reactions[targetMsg.id] || []
              const mineReaction = list.find((r) => r.user_id === user?.id)
              return mineReaction?.emoji || null
            })()}
            onClose={() => setShowMenuFor(null)}
            onReact={async (emoji) => {
              setShowMenuFor(null)
              if (!user?.id) return

              // Optimistic update
              setReactions((current) => {
                const list = current[targetMsg.id] || []
                const existing = list.find(
                  (r) => r.user_id === user.id && r.emoji === emoji
                )
                if (existing) {
                  return {
                    ...current,
                    [targetMsg.id]: list.filter((r) => r.id !== existing.id),
                  }
                }
                const withoutMyOld = list.filter((r) => r.user_id !== user.id)
                return {
                  ...current,
                  [targetMsg.id]: [
                    ...withoutMyOld,
                    { id: `temp-${Date.now()}`, user_id: user.id, emoji },
                  ],
                }
              })

              try {
                await toggleReaction({
                  messageId: targetMsg.id,
                  userId: user.id,
                  emoji,
                })
              } catch (err) {
                console.warn("Reaction failed:", err)
              }
            }}
            onReply={() => {
              setReplyingTo({
                id: targetMsg.id,
                content: targetMsg.content,
                sender_id: targetMsg.sender_id,
              })
              setEditingMessage(null)
              setShowMenuFor(null)
              setTimeout(() => textareaRef.current?.focus(), 200)
            }}
            onCopy={() => {
              navigator.clipboard?.writeText(targetMsg.content || "").catch(() => {})
              setShowMenuFor(null)
            }}
            onEdit={() => {
              setEditingMessage({ id: targetMsg.id, content: targetMsg.content })
              setMessageText(targetMsg.content || "")
              setReplyingTo(null)
              setShowMenuFor(null)
              setTimeout(() => textareaRef.current?.focus(), 200)
            }}
            onDelete={async () => {
              setShowMenuFor(null)
              if (!window.confirm("Delete this message? This cannot be undone.")) return
              try {
                await deleteMessage(targetMsg.id)
                setMessages((current) => current.filter((m) => m.id !== targetMsg.id))
              } catch (err) {
                console.warn("Delete failed:", err)
                alert("Could not delete the message.")
              }
            }}
          />
        )
      })()}

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