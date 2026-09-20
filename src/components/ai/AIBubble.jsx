import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, X, Send, Mic, MicOff, Loader2, MessageCircle, Zap,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"

const QUICK_PROMPTS = [
  "What's happening in the family?",
  "Help me plan a birthday party",
  "Write a caption for my post",
  "Summarize today's events",
]

export default function AIBubble() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [mediaPlaying, setMediaPlaying] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [mode, setMode] = useState("chat")
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const scrollRef = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    const isVideo = (el) => el && el.tagName === "VIDEO"
    const check = () => {
      const anyPlaying = Array.from(document.querySelectorAll("video")).some(
        (v) => !v.paused && !v.ended
      )
      setMediaPlaying(anyPlaying)
    }
    const onPlay = (e) => { if (isVideo(e.target)) check() }
    const onPause = (e) => { if (isVideo(e.target)) check() }
    const onEnded = (e) => { if (isVideo(e.target)) check() }
    document.addEventListener("play", onPlay, true)
    document.addEventListener("pause", onPause, true)
    document.addEventListener("ended", onEnded, true)
    return () => {
      document.removeEventListener("play", onPlay, true)
      document.removeEventListener("pause", onPause, true)
      document.removeEventListener("ended", onEnded, true)
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  // Greeting when first opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: "greet",
          role: "assistant",
          content:
            "Hi 👋 I'm your MEC assistant. Ask me anything — help with school work, plan a celebration, or just chat. What's on your mind?",
        },
      ])
    }
  }, [open, messages.length])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || sending || !user?.id) return

    const userMsg = { id: "u-" + Date.now(), role: "user", content }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    setSending(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke("super-processor", {
        body: {
          messages: next
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
          mode,
          user_id: session?.user?.id,
        },
      })

      if (res.error) throw res.error
      const reply =
        res.data?.reply ||
        "Sorry, I couldn't think of a reply just now. Try again?"
      const sources = Array.isArray(res.data?.sources) ? res.data.sources : []

      setMessages((current) => [
        ...current,
        { id: "a-" + Date.now(), role: "assistant", content: reply, sources },
      ])
    } catch (err) {
      console.error("AI error:", err)
      setMessages((current) => [
        ...current,
        {
          id: "e-" + Date.now(),
          role: "assistant",
          content: "I couldn't reach my brain just now. Try again in a moment.",
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert("Voice input isn't supported on this browser.")
      return
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }
    const rec = new SR()
    rec.lang = "en-US"
    rec.interimResults = false
    rec.continuous = false
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      setInput(text)
      setListening(false)
      setTimeout(() => send(text), 200)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1
    u.pitch = 1
    window.speechSynthesis.speak(u)
  }

  if (!user?.id) return null

  if (mediaPlaying) return null

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="bubble"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-4 z-[150] flex h-14 items-center justify-center gap-2 rounded-full bg-[#3B82F6] px-5 text-white shadow-[0_12px_40px_-8px_rgba(59,130,246,0.6)] sm:bottom-28"
            aria-label="Open MEC Assistant"
          >
            <Sparkles size={20} />
            <span className="text-sm font-semibold tracking-wide">AI</span>
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile only) */}
            <motion.div
              key="bd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[149] bg-black/30 backdrop-blur-sm sm:hidden"
            />

            <motion.div
              key="panel"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-[150] flex h-[80vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-gray-100 bg-white shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.35)] sm:inset-auto sm:bottom-28 sm:right-4 sm:h-[600px] sm:w-[400px] sm:rounded-3xl"
            >
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF] text-[#3B82F6]">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">MEC Assistant</p>
                  <p className="text-[10px] text-gray-500">
                    {mode === "gist" ? "Gist mode · casual" : "Online · here to help"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMode(mode === "gist" ? "chat" : "gist")
                  }}
                  className={
                    "flex h-8 items-center gap-1 rounded-full px-3 text-[10px] font-bold transition " +
                    (mode === "gist"
                      ? "bg-[#FEF3C7] text-amber-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                  }
                  title="Switch to gist mode (casual chat)"
                >
                  <Zap size={11} />
                  Gist
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4"
              >
                <div className="space-y-3">
                  {messages.map((m) => {
                    const mine = m.role === "user"
                    return (
                      <div
                        key={m.id}
                        className={"flex " + (mine ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={
                            "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm " +
                            (mine
                              ? "bg-[#3B82F6] text-white"
                              : "border border-gray-100 bg-gray-50 text-gray-800")
                          }
                        >
                          {m.role === "assistant" ? (
                              <div className="break-words text-sm leading-relaxed [&_h1]:font-bold [&_h1]:text-lg [&_h1]:my-2 [&_h2]:font-bold [&_h2]:my-2 [&_h3]:font-semibold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_table]:text-xs [&_table]:border-collapse [&_table]:my-2 [&_td]:border [&_td]:border-gray-300 [&_td]:p-1 [&_th]:border [&_th]:border-gray-300 [&_th]:p-1 [&_strong]:font-semibold [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_a]:text-blue-600 [&_a]:underline">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                {Array.isArray(m.sources) && m.sources.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {m.sources.map((s, i) => (
                                      <a
                                        key={i}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="max-w-[180px] truncate rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 transition hover:bg-gray-100"
                                      >
                                        {s.title || "source"}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            )}
                          {!mine && m.id !== "greet" && (
                            <button
                              onClick={() => speak(m.content)}
                              className="mt-1.5 text-[10px] font-semibold text-[#3B82F6] hover:underline"
                            >
                              🔊 Listen
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {sending && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                        <Loader2 size={14} className="animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick prompts (only when few messages) */}
                {messages.length <= 1 && !sending && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 transition hover:border-[#3B82F6]/40 hover:text-[#3B82F6]"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 bg-white px-3 py-3">
                <div className="flex items-end gap-2">
                  <button
                    onClick={toggleVoice}
                    className={
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition " +
                      (listening
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                    }
                    aria-label={listening ? "Stop listening" : "Speak"}
                  >
                    {listening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    rows={1}
                    placeholder={
                      mode === "gist" ? "Just chat..." : "Ask me anything..."
                    }
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#3B82F6] focus:bg-white"
                  />

                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || sending}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3B82F6] text-white transition hover:bg-[#2563EB] disabled:opacity-40"
                    aria-label="Send"
                  >
                    {sending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
