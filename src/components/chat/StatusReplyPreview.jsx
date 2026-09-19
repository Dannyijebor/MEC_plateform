export function parseStatusReply(content) {
  if (!content || !content.startsWith("[MEC_STATUS]")) {
    return { isStatus: false, status: null, text: content || "" }
  }
  const raw = content.slice(11)
  const newlineIdx = raw.indexOf("\n\n")
  const jsonPart = newlineIdx !== -1 ? raw.slice(0, newlineIdx) : raw
  const textPart = newlineIdx !== -1 ? raw.slice(newlineIdx + 2) : ""
  let status = {}
  try {
    status = JSON.parse(jsonPart)
  } catch {
    status = {}
  }
  return { isStatus: true, status, text: textPart }
}

export function StatusReplyPreview({ status }) {
  if (!status || !status.mediaUrl) return null
  const isVideo = (status.mediaType || "").startsWith("video")
  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-white/20">
      <div className="flex items-center gap-1.5 bg-black/50 px-2 py-1 text-[9px] font-semibold text-white">
        <span>Replied to {status.authorName || "a"} status</span>
      </div>
      {isVideo ? (
        <video
          src={status.mediaUrl}
          muted
          autoPlay
          loop
          playsInline
          className="max-h-40 w-full object-cover"
        />
      ) : (
        <img
          src={status.mediaUrl}
          alt=""
          className="max-h-40 w-full object-cover"
        />
      )}
    </div>
  )
}
