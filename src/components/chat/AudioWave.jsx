import { useEffect, useRef, useState } from "react"

export default function AudioWave({ stream, active, color = "#3B82F6", bars = 28, height = 40, barWidth = 3 }) {
  const canvasRef = useRef(null)
  const analyserRef = useRef(null)
  const audioCtxRef = useRef(null)
  const sourceRef = useRef(null)
  const rafRef = useRef(null)
  const [levels, setLevels] = useState(() => new Array(bars).fill(0.1))

  useEffect(() => {
    if (!stream || !active) return
    const audioTracks = stream.getAudioTracks?.() || []
    if (audioTracks.length === 0) return

    let cancelled = false

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)

      sourceRef.current = source
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        if (cancelled) return
        analyser.getByteFrequencyData(dataArray)

        const next = []
        const step = Math.floor(dataArray.length / bars)
        for (let i = 0; i < bars; i++) {
          const slice = dataArray.slice(i * step, (i + 1) * step)
          const avg = slice.reduce((a, b) => a + b, 0) / slice.length
          next.push(Math.min(1, (avg / 255) * 1.6))
        }
        setLevels(next)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.warn("AudioWave init failed:", err)
    }

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      try { sourceRef.current?.disconnect() } catch {}
      try { analyserRef.current?.disconnect() } catch {}
      try { audioCtxRef.current?.close() } catch {}
    }
  }, [stream, active, bars])

  return (
    <div className="flex h-full w-full items-center justify-center gap-[3px]">
      {levels.map((level, i) => {
        const h = Math.max(4, level * height)
        return (
          <div
            key={i}
            className="rounded-full transition-[height] duration-75 ease-out"
            style={{
              width: `${barWidth}px`,
              height: `${h}px`,
              background: color,
              opacity: 0.35 + level * 0.65,
            }}
          />
        )
      })}
    </div>
  )
}
