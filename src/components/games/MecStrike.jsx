import { useEffect, useRef, useState, useCallback } from "react"
import { Crosshair, Heart, Zap, Target } from "lucide-react"
import { createMecStrikeEngine } from "../../games/mec-strike/engine"

export default function MecStrike() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const hudTimerRef = useRef(null)

  const [hud, setHud] = useState({
    hp: 100, maxHp: 100, score: 0, wave: 1, kills: 0, distance: 0, enemiesLeft: 0, phase: "playing",
  })
  const [crosshair, setCrosshair] = useState({ x: 0, y: 0, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = createMecStrikeEngine(canvas, {})
    engineRef.current = engine
    engine.start()

    hudTimerRef.current = setInterval(() => {
      setHud(engine.getHud())
    }, 100)

    return () => {
      clearInterval(hudTimerRef.current)
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  const restart = useCallback(() => {
    engineRef.current?.reset()
  }, [])

  const onPointerMove = useCallback((e) => {
    const t = e.touches ? e.touches[0] : e
    if (!t) return
    const rect = e.currentTarget.getBoundingClientRect()
    setCrosshair({ x: t.clientX - rect.left, y: t.clientY - rect.top, active: true })
  }, [])
  const onPointerLeave = useCallback(() => {
    setCrosshair((c) => ({ ...c, active: false }))
  }, [])

  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100)

  return (
    <div className="relative w-full">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-[#38BDF8]/25 bg-[#050912] shadow-[0_0_60px_-10px_rgba(56,189,248,0.35)]"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onTouchMove={onPointerMove}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ display: "block" }}
        />

        <div
          className="pointer-events-none absolute transition-opacity duration-150"
          style={{
            left: crosshair.x - 22,
            top: crosshair.y - 22,
            opacity: crosshair.active ? 0.9 : 0.35,
          }}
        >
          <svg width="44" height="44" viewBox="-22 -22 44 44">
            <circle cx="0" cy="0" r="16" fill="none" stroke="#FDE047" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="2" fill="#FDE047" />
            <line x1="-22" y1="0" x2="-10" y2="0" stroke="#FDE047" strokeWidth="1.5" />
            <line x1="22" y1="0" x2="10" y2="0" stroke="#FDE047" strokeWidth="1.5" />
            <line x1="0" y1="-22" x2="0" y2="-10" stroke="#FDE047" strokeWidth="1.5" />
            <line x1="0" y1="22" x2="0" y2="10" stroke="#FDE047" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
            <Target size={12} className="text-[#FDE047]" />
            <span className="text-[11px] font-black tabular-nums text-[#FDE047]">
              {hud.score}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
              <Heart size={11} className="text-rose-400" />
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#EF4444] to-[#FCA5A5] transition-all duration-150"
                  style={{ width: hpPct + "%" }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums text-rose-100">{hud.hp}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 backdrop-blur-md">
              <Zap size={10} className="text-[#38BDF8]" />
              <span className="text-[10px] font-black tabular-nums text-[#38BDF8]">
                WAVE {hud.wave}
              </span>
            </div>
            {hud.enemiesLeft > 0 && (
              <div className="rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-md">
                <span className="text-[10px] font-semibold text-white/60">
                  {hud.enemiesLeft} left
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-3 text-[10px]">
          <div className="rounded-full bg-black/50 px-2.5 py-1 font-bold tracking-wider text-white/50 backdrop-blur-md">
            {hud.distance}m
          </div>
          <div className="rounded-full bg-black/50 px-2.5 py-1 font-bold tracking-wider text-white/50 backdrop-blur-md">
            {hud.kills} KILLS
          </div>
        </div>

        {hud.phase === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 px-6 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-400">K.I.A.</p>
            <h2 className="mt-3 text-5xl font-black tabular-nums text-white">
              {hud.score.toLocaleString()}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Wave {hud.wave} · {hud.kills} kills · {hud.distance}m
            </p>
            <button
              type="button"
              onClick={restart}
              className="mt-6 flex items-center gap-2 rounded-2xl bg-[#38BDF8] px-6 py-3 text-sm font-bold text-[#050912] transition hover:bg-[#7DD3FC] active:scale-[0.98]"
            >
              <Crosshair size={16} /> Deploy again
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-black/45">
        Tap enemies to shoot. Kill them before they reach you.
      </p>
    </div>
  )
}
