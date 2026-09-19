import { useEffect, useRef } from "react"
import { Mic, MicOff, Hand } from "lucide-react"

function initials(name = "MEC") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()
}

export function VideoTile({
  participant,
  track,           // optional MediaStreamTrack for this participant
  isActive,
  isLocal,
  videoElement,    // optional LiveKit video element
  onClick,
}) {
  const videoRef = useRef(null)

  const name =
    participant?.profile?.full_name ||
    participant?.profile?.username ||
    participant?.name ||
    participant?.identity ||
    "MEC Member"
  const avatar = participant?.profile?.avatar_url
  const micOn = participant?.isMicrophoneEnabled
  const handRaised = participant?.hand_raised

  // Attach LiveKit track if provided
  useEffect(() => {
    if (track && videoRef.current) {
      track.attach(videoRef.current)
      return () => track.detach(videoRef.current)
    }
  }, [track])

  // If we got a videoElement (LiveKit Publication), attach
  useEffect(() => {
    if (videoElement && videoRef.current && !videoElement.attached) {
      videoElement.attach(videoRef.current)
    }
  }, [videoElement])

  const hasVideo = Boolean(track || videoElement)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-video w-[280px] shrink-0 snap-center overflow-hidden rounded-2xl border-2 bg-gray-900 text-left transition sm:w-[320px] ${
        isActive ? "border-emerald-400 shadow-lg shadow-emerald-400/20" : "border-gray-200"
      }`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F1E7CC] to-[#D9B86C]">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white/60 text-lg font-bold text-[#A8873F] shadow-lg">
            {avatar ? (
              <img src={avatar} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials(name)
            )}
          </div>
        </div>
      )}

      {/* Hand-raised badge */}
      {handRaised && (
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-sm shadow-lg">
          ✋
        </span>
      )}

      {/* Name + mic overlay */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-6">
        <span className="truncate text-xs font-semibold text-white">
          {name}
          {isLocal ? " · You" : ""}
        </span>
        {micOn ? (
          <Mic size={12} className="ml-auto shrink-0 text-emerald-400" />
        ) : (
          <MicOff size={12} className="ml-auto shrink-0 text-red-400" />
        )}
      </div>
    </button>
  )
}
