import { useEffect, useRef, useState } from "react"
import { Play, Pause, Mic } from "lucide-react"
import { supabase } from "../../lib/supabase"

export default function VoiceMessagePlayer({ mediaUrl, mine, theme }) {
  const [audioUrl, setAudioUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!mediaUrl) return
    let cancelled = false

    async function load() {
      // If it's already a full URL, use it directly
      if (/^https?:\/\//.test(mediaUrl)) {
        setAudioUrl(mediaUrl)
        setLoading(false)
        return
      }
      // Otherwise fetch a signed URL
      try {
        const { data, error } = await supabase.storage
          .from("community-media")
          .createSignedUrl(mediaUrl, 60 * 60 * 24)
        if (cancelled) return
        if (error) {
          console.warn("Sign URL failed:", error)
        } else if (data?.signedUrl) {
          setAudioUrl(data.signedUrl)
        }
      } catch (err) {
        console.warn("Voice load failed:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [mediaUrl])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  const formatTime = (s) => {
    if (!isFinite(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 py-1" style={{ minWidth: 200 }}>
      {/* Play/pause */}
      <button
        type="button"
        onClick={toggle}
        disabled={loading || !audioUrl}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
          mine
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
        } disabled:opacity-50`}
      >
        {loading ? (
          <Mic size={16} className="animate-pulse" />
        ) : playing ? (
          <Pause size={16} />
        ) : (
          <Play size={16} className="ml-0.5" />
        )}
      </button>

      {/* Waveform / progress */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: 32 }).map((_, i) => {
            const h = 6 + ((i * 7 + 3) % 18)
            const filled = (i / 32) * 100 <= progress
            return (
              <span
                key={i}
                className={`w-[2px] rounded-full transition-colors ${
                  filled
                    ? mine
                      ? "bg-white"
                      : "bg-[#3B82F6]"
                    : mine
                      ? "bg-white/40"
                      : "bg-gray-300"
                }`}
                style={{ height: h }}
              />
            )
          })}
        </div>
        <div
          className={`flex items-center justify-between text-[10px] ${
            mine ? "text-white/80" : "text-gray-500"
          }`}
        >
          <span>{formatTime(playing || currentTime > 0 ? currentTime : duration)}</span>
          <span className="flex items-center gap-1">
            <Mic size={9} />
            Voice
          </span>
        </div>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setCurrentTime(0)
            if (audioRef.current) audioRef.current.currentTime = 0
          }}
        />
      )}
    </div>
  )
}
