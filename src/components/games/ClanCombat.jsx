import { useEffect, useRef, useState } from "react"
import { Zap, Flame, Crosshair } from "lucide-react"
import { createClanCombatEngine } from "../../games/clan-combat/engine"

const STICK_RADIUS = 58
const STICK_KNOB = 26

export default function ClanCombat() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const hudTimerRef = useRef(null)

  const [hud, setHud] = useState({ kills: 0, hp: 100, maxHp: 100, fuel: 1.6, maxFuel: 1.6, onGround: true })

  // Left stick (move + jetpack)
  const leftTouchIdRef = useRef(null)
  const leftOriginRef = useRef({ x: 0, y: 0 })
  const [leftKnob, setLeftKnob] = useState(null) // { x, y } relative to origin

  // Right stick (aim + fire)
  const rightTouchIdRef = useRef(null)
  const rightOriginRef = useRef({ x: 0, y: 0 })
  const [rightKnob, setRightKnob] = useState(null)

  // ── Engine lifecycle ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = createClanCombatEngine(canvas)
    engineRef.current = engine
    engine.start()

    hudTimerRef.current = setInterval(() => {
      setHud(engine.getHud())
    }, 80)

    return () => {
      clearInterval(hudTimerRef.current)
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  // ── Touch handling ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = () => canvas.getBoundingClientRect()

    const getLocal = (clientX, clientY) => {
      const r = rect()
      return { x: clientX - r.left, y: clientY - r.top, w: r.width }
    }

    const handleStart = (e) => {
      const engine = engineRef.current
      if (!engine) return
      for (const touch of e.changedTouches) {
        const { x, y, w } = getLocal(touch.clientX, touch.clientY)
        const isLeft = x < w / 2
        if (isLeft && leftTouchIdRef.current == null) {
          leftTouchIdRef.current = touch.identifier
          leftOriginRef.current = { x, y }
          setLeftKnob({ x: 0, y: 0 })
        } else if (!isLeft && rightTouchIdRef.current == null) {
          rightTouchIdRef.current = touch.identifier
          rightOriginRef.current = { x, y }
          setRightKnob({ x: 0, y: 0 })
          // Default aim direction is up-right; will update on move
          engine.setInput({ firing: false, aimX: 1, aimY: 0 })
        }
      }
      e.preventDefault()
    }

    const handleMove = (e) => {
      const engine = engineRef.current
      if (!engine) return
      for (const touch of e.changedTouches) {
        const { x, y } = getLocal(touch.clientX, touch.clientY)

        // Left stick
        if (touch.identifier === leftTouchIdRef.current) {
          const dx = x - leftOriginRef.current.x
          const dy = y - leftOriginRef.current.y
          const len = Math.hypot(dx, dy)
          const clampedLen = Math.min(len, STICK_RADIUS)
          const nx = len > 0 ? dx / len : 0
          const ny = len > 0 ? dy / len : 0
          setLeftKnob({ x: nx * clampedLen, y: ny * clampedLen })

          const moveX = Math.abs(dx) > 12 ? Math.max(-1, Math.min(1, dx / STICK_RADIUS)) : 0
          const jetpack = dy < -22 // push up
          engine.setInput({ moveX, jetpack })
        }

        // Right stick — aim + auto-fire
        if (touch.identifier === rightTouchIdRef.current) {
          const dx = x - rightOriginRef.current.x
          const dy = y - rightOriginRef.current.y
          const len = Math.hypot(dx, dy)
          const clampedLen = Math.min(len, STICK_RADIUS)
          const nx = len > 0 ? dx / len : 0
          const ny = len > 0 ? dy / len : 0
          setRightKnob({ x: nx * clampedLen, y: ny * clampedLen })

          if (len > 14) {
            engine.setInput({ aimX: nx, aimY: ny, firing: true })
          } else {
            engine.setInput({ firing: false })
          }
        }
      }
      e.preventDefault()
    }

    const handleEnd = (e) => {
      const engine = engineRef.current
      for (const touch of e.changedTouches) {
        if (touch.identifier === leftTouchIdRef.current) {
          leftTouchIdRef.current = null
          setLeftKnob(null)
          engine?.setInput({ moveX: 0, jetpack: false })
        }
        if (touch.identifier === rightTouchIdRef.current) {
          rightTouchIdRef.current = null
          setRightKnob(null)
          engine?.setInput({ firing: false })
        }
      }
      e.preventDefault()
    }

    canvas.addEventListener("touchstart", handleStart, { passive: false })
    canvas.addEventListener("touchmove", handleMove, { passive: false })
    canvas.addEventListener("touchend", handleEnd, { passive: false })
    canvas.addEventListener("touchcancel", handleEnd, { passive: false })

    // Desktop fallback — WASD + mouse click
    const keys = { w: false, a: false, s: false, d: false }
    const applyKeys = () => {
      const moveX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0)
      engineRef.current?.setInput({ moveX, jetpack: keys.w })
    }
    const kd = (e) => {
      const k = e.key.toLowerCase()
      if (k in keys) { keys[k] = true; applyKeys(); e.preventDefault() }
      if (k === " ") { engineRef.current?.setInput({ firing: true, aimX: 1, aimY: 0 }); e.preventDefault() }
    }
    const ku = (e) => {
      const k = e.key.toLowerCase()
      if (k in keys) { keys[k] = false; applyKeys(); e.preventDefault() }
      if (k === " ") { engineRef.current?.setInput({ firing: false }); e.preventDefault() }
    }
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)

    return () => {
      canvas.removeEventListener("touchstart", handleStart)
      canvas.removeEventListener("touchmove", handleMove)
      canvas.removeEventListener("touchend", handleEnd)
      canvas.removeEventListener("touchcancel", handleEnd)
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
    }
  }, [])

  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100)
  const fuelPct = Math.max(0, (hud.fuel / hud.maxFuel) * 100)

  return (
    <div className="relative w-full">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-[#38BDF8]/25 bg-[#050710] shadow-[0_0_60px_-10px_rgba(56,189,248,0.35)]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ display: "block" }}
        />

        {/* HUD top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
            <Crosshair size={12} className="text-[#FDE047]" />
            <span className="text-[11px] font-black tabular-nums text-[#FDE047]">
              {hud.kills}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
              <Flame size={11} className="text-[#FB923C]" />
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FB923C] to-[#FCD34D] transition-all duration-150"
                  style={{ width: fuelPct + "%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Left joystick */}
        {leftKnob && (
          <>
            <div
              className="pointer-events-none absolute rounded-full border-2 border-[#38BDF8]/40 bg-[#38BDF8]/5"
              style={{
                left: leftOriginRef.current.x - STICK_RADIUS,
                top: leftOriginRef.current.y - STICK_RADIUS,
                width: STICK_RADIUS * 2,
                height: STICK_RADIUS * 2,
              }}
            />
            <div
              className="pointer-events-none absolute rounded-full bg-[#38BDF8]/70 shadow-[0_0_20px_rgba(56,189,248,0.6)]"
              style={{
                left: leftOriginRef.current.x + leftKnob.x - STICK_KNOB / 2,
                top: leftOriginRef.current.y + leftKnob.y - STICK_KNOB / 2,
                width: STICK_KNOB,
                height: STICK_KNOB,
              }}
            />
          </>
        )}

        {/* Right joystick */}
        {rightKnob && (
          <>
            <div
              className="pointer-events-none absolute rounded-full border-2 border-[#FDE047]/40 bg-[#FDE047]/5"
              style={{
                left: rightOriginRef.current.x - STICK_RADIUS,
                top: rightOriginRef.current.y - STICK_RADIUS,
                width: STICK_RADIUS * 2,
                height: STICK_RADIUS * 2,
              }}
            />
            <div
              className="pointer-events-none absolute rounded-full bg-[#FDE047]/80 shadow-[0_0_20px_rgba(253,224,71,0.7)]"
              style={{
                left: rightOriginRef.current.x + rightKnob.x - STICK_KNOB / 2,
                top: rightOriginRef.current.y + rightKnob.y - STICK_KNOB / 2,
                width: STICK_KNOB,
                height: STICK_KNOB,
              }}
            />
          </>
        )}

        {/* Idle control hints */}
        {!leftKnob && !rightKnob && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-between px-6">
            <div className="rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#38BDF8]/80 backdrop-blur-md">
              ◐ Move / Jetpack
            </div>
            <div className="rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#FDE047]/80 backdrop-blur-md">
              Aim / Fire ◑
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-black/45">
        <Zap size={11} className="mr-1 inline" />
        Drag left half to move & jetpack. Drag right half to aim and fire.
      </p>
    </div>
  )
}
