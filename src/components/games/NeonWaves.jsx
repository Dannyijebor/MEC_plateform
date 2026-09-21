import { useEffect, useRef, useState } from "react"
import { Heart, Zap, Target, Sparkles } from "lucide-react"
import { createNeonEngine } from "../../games/neon/engine"

export default function NeonWaves({ onRunEnd }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const hudTimerRef = useRef(null)

  const [hud, setHud] = useState({ hp: 100, maxHp: 100, wave: 1, score: 0, xp: 0, enemiesLeft: 0 })
  const [phase, setPhase] = useState("playing")
  const [choices, setChoices] = useState([])
  const [deathInfo, setDeathInfo] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = createNeonEngine(canvas, {
      onWaveComplete: (wave, upChoices) => {
        setChoices(upChoices)
        setPhase("choosing")
      },
      onDeath: (info) => {
        setDeathInfo(info)
        setPhase("dead")
        onRunEnd?.(info)
      },
    })
    engineRef.current = engine
    engine.start()

    // Poll HUD at 10fps
    hudTimerRef.current = setInterval(() => {
      setHud(engine.getHud())
    }, 100)

    return () => {
      clearInterval(hudTimerRef.current)
      engine.destroy()
      engineRef.current = null
    }
  }, [onRunEnd])

  const pickUpgrade = (id) => {
    const engine = engineRef.current
    if (!engine) return
    engine.applyUpgrade(id)
    setPhase("playing")
    setChoices([])
  }

  const restart = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Destroy + recreate engine
    engineRef.current?.destroy()
    const engine = createNeonEngine(canvas, {
      onWaveComplete: (wave, upChoices) => {
        setChoices(upChoices)
        setPhase("choosing")
      },
      onDeath: (info) => {
        setDeathInfo(info)
        setPhase("dead")
        onRunEnd?.(info)
      },
    })
    engineRef.current = engine
    engine.start()
    setPhase("playing")
    setDeathInfo(null)
    setChoices([])
  }

  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100)

  return (
    <div className="relative mx-auto w-full max-w-2xl select-none">
      {/* Canvas arena */}
      <div className="relative aspect-[3/5] w-full overflow-hidden rounded-3xl border border-[#38BDF8]/20 bg-[#080812] shadow-[0_0_60px_-10px_rgba(56,189,248,0.4)]">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          style={{ display: "block" }}
        />

        {/* HUD overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {/* HP bar */}
          <div className="flex-1 max-w-[180px]">
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
              <Heart size={12} className="text-rose-400" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300 transition-all duration-200"
                  style={{ width: hpPct + "%" }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums text-rose-100">
                {hud.hp}
              </span>
            </div>
          </div>

          {/* Wave + score */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 backdrop-blur-md">
              <Sparkles size={11} className="text-[#38BDF8]" />
              <span className="text-[11px] font-black tabular-nums text-[#38BDF8]">
                WAVE {hud.wave}
              </span>
            </div>
            <div className="rounded-full bg-black/60 px-3 py-0.5 backdrop-blur-md">
              <span className="text-[11px] font-bold tabular-nums text-white/90">
                {hud.score.toLocaleString()}
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

        {/* Upgrade picker */}
        {phase === "choosing" && choices.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#38BDF8]">
              Choose an upgrade
            </p>
            <div className="grid w-full max-w-md grid-cols-1 gap-2.5">
              {choices.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => pickUpgrade(u.id)}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.12] active:scale-[0.98]"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: u.color + "22" }}
                  >
                    {u.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{u.name}</p>
                    <p className="text-xs text-white/60">{u.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Death screen */}
        {phase === "dead" && deathInfo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-400">
              Run ended
            </p>
            <h2 className="mt-3 text-5xl font-black text-white tabular-nums">
              Wave {deathInfo.wave}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Score: <span className="font-bold text-white tabular-nums">{deathInfo.score.toLocaleString()}</span>
            </p>
            <button
              type="button"
              onClick={restart}
              className="mt-6 flex items-center gap-2 rounded-2xl bg-[#38BDF8] px-6 py-3 text-sm font-bold text-[#080812] transition hover:bg-[#7DD3FC] active:scale-[0.98]"
            >
              <Zap size={16} /> Run again
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-black/40">
        <Target size={11} /> Drag to move. Ship auto-fires at the nearest enemy.
      </p>
    </div>
  )
}
