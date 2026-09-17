import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  MessageCircle,
  Phone,
  Video,
  Search,
  Send,
  Users,
  ArrowLeft,
  MoreVertical,
} from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import {
  getMyConversations,
  getConversationMessages,
  sendMessage,
  subscribeToConversation,
  unsubscribeFromConversation,
} from "../../services/chat/chatService"

function Messages() {
  const [searchParams] = useSearchParams()
  const targetConversationId = searchParams.get("conversation")
  const navigate = useNavigate()
  const { user } = useAuth()

  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    let active = true

    async function loadConversations() {
      try {
        setLoading(true)

        const data = await getMyConversations(user.id)

        if (!active) return

        setConversations(data)

    if (targetConversationId && data) {
      const target = data.find(c => c.id === targetConversationId)
      if (target) setSelectedConversation(target)
    }

        if (data.length > 0) {
          setSelectedConversation(data[0])
        }
      } catch (error) {
        console.error("Unable to load conversations:", error)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadConversations()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!selectedConversation?.id) return

    let active = true
    let channel = null

    async function loadMessages() {
      try {
        setMessagesLoading(true)

        const data = await getConversationMessages(
          selectedConversation.id,
        )

        if (!active) return

        setMessages(data)

        channel = subscribeToConversation(
          selectedConversation.id,
          (newMessage) => {
            if (!active) return

            setMessages((current) => {
              if (current.some((message) => message.id === newMessage.id)) {
                return current
              }

              return [...current, newMessage]
            })
          },
        )
      } catch (error) {
        console.error("Unable to load messages:", error)
      } finally {
        if (active) setMessagesLoading(false)
      }
    }

    loadMessages()

    return () => {
      active = false

      if (channel) {
        unsubscribeFromConversation(channel)
      }
    }
  }, [selectedConversation?.id])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return conversations

    return conversations.filter((conversation) =>
      (conversation.display_name || "Conversation")
        .toLowerCase()
        .includes(query),
    )
  }, [conversations, search])

  async function handleSendMessage(event) {
    event.preventDefault()

    const content = messageText.trim()

    if (!content || !selectedConversation?.id || !user?.id || sending) {
      return
    }

    try {
      setSending(true)

      const newMessage = await sendMessage({
        conversationId: selectedConversation.id,
        senderId: user.id,
        content,
      })

      setMessages((current) => {
        if (current.some((message) => message.id === newMessage.id)) {
          return current
        }

        return [...current, newMessage]
      })

      setMessageText("")
    } catch (error) {
      console.error("Unable to send message:", error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-[calc(100vh-7rem)] min-h-[560px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl backdrop-blur-xl">
      <div className="flex h-full">
        <aside
          className={`w-full border-r border-white/10 sm:w-[320px] lg:w-[360px] ${
            selectedConversation ? "hidden sm:flex" : "flex"
          } flex-col`}
        >
          <div className="border-b border-white/10 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#d9b86c]">
                  Private
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-[#f7f3ea]">
                  Messages
                </h1>
              </div>

              <div className="rounded-2xl border border-[#d9b86c]/20 bg-[#d9b86c]/10 p-3">
                <MessageCircle
                  size={20}
                  className="text-[#d9b86c]"
                />
              </div>
            </div>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-[#d9b86c]/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-white/45">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 rounded-2xl bg-white/5 p-4">
                  <Users size={24} className="text-[#d9b86c]" />
                </div>

                <p className="font-medium text-white/80">
                  No conversations yet
                </p>

                <p className="mt-1 text-sm text-white/40">
                  Your private conversations will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const active =
                  selectedConversation?.id === conversation.id

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversation(conversation)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                      active
                        ? "bg-[#d9b86c]/10"
                        : "hover:bg-white/[0.045]"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d9b86c]/30 to-[#5d3f55]/40 text-[#d9b86c]">
                      {conversation.type === "group" ? (
                        <Users size={18} />
                      ) : (
                        <MessageCircle size={18} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white/90">
                        {conversation.display_name || "Conversation"}
                      </p>

                      <p className="mt-1 text-xs text-white/35">
                        {conversation.type === "group"
                          ? "Group conversation"
                          : "Private conversation"}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <main
          className={`min-w-0 flex-1 ${
            selectedConversation ? "flex" : "hidden sm:flex"
          } flex-col`}
        >
          {!selectedConversation ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-5 rounded-3xl border border-[#d9b86c]/15 bg-[#d9b86c]/5 p-5">
                <MessageCircle
                  size={32}
                  className="text-[#d9b86c]"
                />
              </div>

              <h2 className="text-xl font-semibold text-white/90">
                Your private space
              </h2>

              <p className="mt-2 max-w-sm text-sm text-white/40">
                Select a conversation to start messaging.
              </p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setSelectedConversation(null)}
                  className="rounded-xl p-2 text-white/50 hover:bg-white/5 hover:text-white sm:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={19} />
                </button>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9b86c]/10 text-[#d9b86c]">
                  {selectedConversation.type === "group" ? (
                    <Users size={18} />
                  ) : (
                    <MessageCircle size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-white/90">
                    {selectedConversation.display_name || "Conversation"}
                  </h2>

                  <p className="text-xs text-white/35">
                    {selectedConversation.type === "group"
                      ? "Group conversation"
                      : "Private conversation"}
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl p-2 text-white/45 transition hover:bg-white/5 hover:text-white"
                  aria-label="Conversation options"
                >
                  <MoreVertical size={19} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/40">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-4 rounded-2xl bg-white/5 p-4">
                      <MessageCircle
                        size={24}
                        className="text-[#d9b86c]"
                      />
                    </div>

                    <p className="font-medium text-white/75">
                      No messages yet
                    </p>

                    <p className="mt-1 text-sm text-white/35">
                      Start the conversation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const mine = message.sender_id === user?.id

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            mine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              mine
                                ? "rounded-br-md bg-[#d9b86c] text-[#17130b]"
                                : "rounded-bl-md border border-white/10 bg-white/[0.055] text-white/80"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSendMessage}
                className="border-t border-white/10 p-3 sm:p-4"
              >
                <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
                  <textarea
                    value={messageText}
                    onChange={(event) =>
                      setMessageText(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault()
                        event.currentTarget.form?.requestSubmit()
                      }
                    }}
                    rows={1}
                    placeholder="Write a message..."
                    className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-white/25"
                  />

                  <button
                    type="submit"
                    disabled={!messageText.trim() || sending}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d9b86c] text-[#17130b] transition hover:bg-[#e4ca8c] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Send message"
                  >
                    <Send size={18} />
                  </button>
                </div>

                <p className="mt-2 px-2 text-[11px] text-white/25">
                  Messages automatically disappear after 24 hours.
                </p>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Messages
