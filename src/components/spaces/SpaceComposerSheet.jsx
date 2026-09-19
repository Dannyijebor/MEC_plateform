import { useState } from "react"
import { X, Send, Heart, MessageCircle } from "lucide-react"

export default function SpaceComposerSheet({
  open,
  onClose,
  spacePosts,
  postText,
  setPostText,
  onSubmit,
  onDelete,
  onEdit,
  currentUserId,
}) {
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState("")

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:h-[75vh] sm:rounded-3xl sm:rounded-b-none">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A8873F]">
              Posts in this Space
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              Only people here can see these
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {spacePosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
              <p className="text-sm font-semibold text-gray-600">No posts yet</p>
              <p className="mt-1 text-xs text-gray-400">Be the first to share</p>
            </div>
          ) : (
            <div className="space-y-3">
              {spacePosts.map((post) => {
                const name =
                  post.profiles?.full_name ||
                  post.profiles?.username ||
                  "MEC Member"
                const avatar = post.profiles?.avatar_url
                const isMine = post.author_id === currentUserId
                const isEditing = editId === post.id

                return (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                    onContextMenu={(e) => {
                      if (!isMine) return
                      e.preventDefault()
                      const act = window.prompt("edit or delete?", "edit")
                      if (!act) return
                      if (act.toLowerCase() === "delete") {
                        if (window.confirm("Delete this post?")) onDelete(post)
                      } else if (act.toLowerCase() === "edit") {
                        setEditId(post.id)
                        setEditText(post.content || "")
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#F1E7CC] text-xs font-bold text-[#A8873F]">
                        {avatar ? (
                          <img src={avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {name}{isMine ? " · You" : ""}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(post.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-3">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditId(null)
                              setEditText("")
                            }}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (editText.trim()) {
                                onEdit(post, editText.trim())
                                setEditId(null)
                                setEditText("")
                              }
                            }}
                            className="rounded-xl bg-[#1E40AF] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                        {post.content}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-3">
                      <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500">
                        <Heart size={13} /> Like
                      </button>
                      <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500">
                        <MessageCircle size={13} /> Comment
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={1}
              placeholder="Share a thought with the space..."
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
            />
            <button
              disabled={!postText.trim()}
              onClick={onSubmit}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1E40AF] text-white disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
