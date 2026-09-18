import { useEffect, useRef, useState } from "react"
import { Mic, X, Send, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function VoiceRecorder({ onCancel, onComplete }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [uploading, setUploading] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const cancelledRef = useRef(false)

  // Start recording on mount
  useEffect(() => {
    let mounted = true

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/mp4"

        const recorder = new MediaRecorder(stream, { mimeType })
        audioChunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop())
          if (cancelledRef.current) return

          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          if (blob.size < 500) {
            onCancel?.()
            return
          }

          setUploading(true)
          try {
            await onComplete?.(blob, mimeType, seconds)
          } finally {
            setUploading(false)
          }
        }

        recorder.start()
        mediaRecorderRef.current = recorder
        setRecording(true)

        timerRef.current = setInterval(() => {
          setSeconds((s) => {
            if (s >= 300) {
              stop()
              return s
            }
            return s + 1
          })
        }, 1000)
      } catch (err) {
        console.error("Mic access failed:", err)
        alert("Microphone access denied. Please allow it in settings.")
        onCancel?.()
      }
    }

    start()

    return () => {
      mounted = false
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current?.state === "recording") {
        cancelledRef.current = true
        try { mediaRecorderRef.current.stop() } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }

  const cancel = () => {
    cancelledRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === "recording") {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    onCancel?.()
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, "0")}`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)]"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {/* Cancel */}
          <button
            type="button"
            onClick={cancel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
            aria-label="Cancel recording"
          >
            <X size={18} />
          </button>

          {/* Recording indicator */}
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex h-3 w-3 shrink-0 rounded-full bg-red-500"
            />
            <span className="text-sm font-medium text-red-600">
              Recording {formatTime(seconds)}
            </span>
            {/* Fake waveform bars */}
            <div className="ml-auto flex items-end gap-[3px]">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.span
                  key={i}
                  animate={{
                    height: [4, 14, 6, 18, 8, 4][i % 6],
                  }}
                  transition={{
                    duration: 0.5 + i * 0.1,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                  className="w-[3px] rounded-full bg-red-400"
                  style={{ height: 4 }}
                />
              ))}
            </div>
          </div>

          {/* Stop & send */}
          <button
            type="button"
            onClick={stop}
            disabled={uploading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-white shadow-lg transition hover:bg-[#2563EB] disabled:opacity-50"
            aria-label="Send voice note"
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-gray-400">
          Tap send to finish or X to cancel · Max 5 minutes
        </p>
      </motion.div>
    </AnimatePresence>
  )
}
