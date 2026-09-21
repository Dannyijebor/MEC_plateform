import { useEffect, useRef, useState, useCallback } from "react"
import { Flame, Crosshair, Users, Rocket } from "lucide-react"
import { createClanCombatEngine } from "../../games/clan-combat/engine"

// ─── Sizing ──────────────────────────────────────────────
const STICK_BASE = 118          // diameter of the visible base ring
const STICK_KNOB = 48           // diameter of the movable knob
const STICK_RADIUS = STICK_BASE / 2 - 6
const STICK_MARGIN = 22         // gap from screen edges
const STICK_CAPTURE = 130       // how far from base counts as a touch on this stick
const JETPACK_SIZE = 68         // size of the jetpack button
const JETPACK_MARGIN = 22

export default function ClanCombat() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const hudTimerRef = useRef(null)
  const containerRef = useRef(null)

  const [hud, setHud] = useState({
    kills: 0, hp: 100, maxHp: 100, fuel: 1.6, maxFuel: 1.6, onGround: true, botsAlive: 0,
  })

  // Container size for absolute positioning of controls
  const [size, setSize] = useState({ w: 0, h: 0 })

  // Left stick — move
  const leftTouchIdRef = useRef(null)
  const [leftKnob, setLeftKnob] = useState({ x: 0, y: 0, active: false })

  // Right stick — aim + fire
  const rightTouchIdRef = useRef(null)
  const [rightKnob, setRightKnob] = useState({ x: 0, y: 0, active: false })

  // Jetpack button
  const [jetpackPressed, setJetpackPressed] = useState(false)

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

  // ── Track container size ────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setSize({ w: r.width, h: r.height })
    return () => ro.disconnect()
  }, [])

  // ── Fixed stick centers ─────────────────────────────
  const leftCenter = {
    x: STICK_MARGIN + STICK_BASE / 2,
    y: size.h - STICK_MARGIN - STICK_BASE / 2,
  }
  const rightCenter = {
    x: size.w - STICK_MARGIN - STICK_BASE / 2,
    y: size.h - STICK_MARGIN - STICK_BASE / 2,
  }
  const jetpackCenter = {
    x: STICK_MARGIN + STICK_BASE / 2,
    y: size.h - STICK_MARGIN - STICK_BASE - JETPACK_SIZE / 2 - 14,
  }

  // ── Touch handling ──────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    const engine = engineRef.current
    if (!engine) return
    const rect = containerRef.current.getBoundingClientRect()

    for (const t of e.changedTouches) {
      const x = t.clientX - rect.left
      const y = t.clientY - rect.top

      // Jetpack button?
      const jdx = x - jetpackCenter.x
      const jdy = y - jetpackCenter.y
      if (Math.hypot(jdx, jdy) < JETPACK_SIZE * 0.8 + 12) {
        setJetpackPressed(true)
        engine.setInput({ jetpack: true })
        continue
      }

      // Left stick?
      const ldx = x - leftCenter.x
      const ldy = y - leftCenter.y
      if (Math.hypot(ldx, ldy) < STICK_CAPTURE && leftTouchIdRef.current == null) {
        leftTouchIdRef.current = t.identifier
        updateLeftStick(x, y)
        continue
      }

      // Right stick?
      const rdx = x - rightCenter.x
      const rdy = y - rightCenter.y
      if (Math.hypot(rdx, rdy) < STICK_CAPTURE && rightTouchIdRef.current == null) {
        rightTouchIdRef.current = t.identifier
        updateRightStick(x, y)
      }
    }
    e.preventDefault()
  }, [size, leftCenter.x, leftCenter.y, rightCenter.x, rightCenter.y, jetpackCenter.x, jetpackCenter.y])

  const handleTouchMove = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect()
    for (const t of e.changedTouches) {
      const x = t.clientX - rect.left
      const y = t.clientY - rect.top
      if (t.identifier === leftTouchIdRef.current) updateLeftStick(x, y)
      else if (t.identifier === rightTouchIdRef.current) updateRightStick(x, y)
    }
    e.preventDefault()
  }, [leftCenter.x, leftCenter.y, rightCenter.x, rightCenter.y])

  const handleTouchEnd = useCallback((e) => {
    const engine = engineRef.current
    for (const t of e.changedTouches) {
      if (t.identifier === leftTouchIdRef.current) {
        leftTouchIdRef.current = null
        setLeftKnob({ x: 0, y: 0, active: false })
        engine?.setInput({ moveX: 0 })
      }
      if (t.identifier === rightTouchIdRef.current) {
        rightTouchIdRef.current = null
        setRightKnob({ x: 0, y: 0, active: false })
        engine?.setInput({ firing: false })
      }
    }
    e.preventDefault()
  }, [])

  const updateLeftStick = (x, y) => {
    const engine = engineRef.current
    if (!engine) return
    const dx = x - leftCenter.x
    const dy = y - leftCenter.y
    const len = Math.hypot(dx, dy)
    const clamped = Math.min(len, STICK_RADIUS)
    const nx = len > 0 ? dx / len : 0
    const ny = len > 0 ? dy / len : 0
    setLeftKnob({ x: nx * clamped, y: ny * clamped, active: true })

    // Move magnitude with deadzone
    const moveX = Math.abs(nx) > 0.18 ? nx : 0
    engine.setInput({ moveX })
  }

  const updateRightStick = (x, y) => {
    const engine = engineRef.current
    if (!engine) return
    const dx = x - rightCenter.x
    const dy = y - rightCenter.y
    const len = Math.hypot(dx, dy)
    const clamped = Math.min(len, STICK_RADIUS)
    const nx = len > 0 ? dx / len : 0
    const ny = len > 0 ? dy / len : 0
    setRightKnob({ x: nx * clamped, y: ny * clamped, active: true })

    if (len > 14) {
      engine.setInput({ aimX: nx, aimY: ny, firing: true })
    } else {
      engine.setInput({ firing: false })
    }
  }

  // ── Jetpack press handlers ──────────────────────────
  const pressJetpack = (e) => {
    e.preventDefault()
    setJetpackPressed(true)
    engineRef.current?.setInput({ jetpack: true })
  }
  const releaseJetpack = (e) => {
    e.preventDefault()
    setJetpackPressed(false)
    engineRef.current?.setInput({ jetpack: false })
  }

  // ── Desktop keyboard (fallback) ─────────────────────
  useEffect(() => {
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
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
    }
  }, [])

  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100)
  const fuelPct = Math.max(0, (hud.fuel / hud.maxFuel) * 100)

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-[#38BDF8]/25 bg-[#050710] shadow-[0_0_60px_-10px_rgba(56,189,248,0.35)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ display: "block" }}
        />

        {/* ── Top HUD ───────────────────────────────── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
              <Crosshair size={12} className="text-[#FDE047]" />
              <span className="text-[11px] font-black tabular-nums text-[#FDE047]">
                {hud.kills}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
              <Users size={12} className="text-[#F87171]" />
              <span className="text-[11px] font-black tabular-nums text-[#F87171]">
                {hud.botsAlive ?? 0}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* HP bar */}
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">HP</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#EF4444] to-[#FCA5A5] transition-all duration-150"
                  style={{ width: hpPct + "%" }}
                />
              </div>
            </div>
            {/* Fuel bar */}
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

        {/* ── Left stick base (always visible) ──────── */}
        <StickBase
          cx={leftCenter.x}
          cy={leftCenter.y}
          size={STICK_BASE}
          color="#38BDF8"
          label="MOVE"
          knob={leftKnob}
          knobSize={STICK_KNOB}
        />

        {/* ── Right stick base (always visible) ──────── */}
        <StickBase
          cx={rightCenter.x}
          cy={rightCenter.y}
          size={STICK_BASE}
          color="#FDE047"
          label="AIM"
          knob={rightKnob}
          knobSize={STICK_KNOB}
        />

        {/* ── Jetpack button ────────────────────────── */}
        <button
          type="button"
          onTouchStart={pressJetpack}
          onTouchEnd={releaseJetpack}
          onTouchCancel={releaseJetpack}
          onMouseDown={pressJetpack}
          onMouseUp={releaseJetpack}
          onMouseLeave={releaseJetpack}
          aria-label="Jetpack"
          className={
            "absolute flex items-center justify-center rounded-full transition-all " +
            "border-2 " +
            (jetpackPressed
              ? "border-[#FB923C] bg-[#FB923C]/35 shadow-[0_0_30px_rgba(251,146,60,0.75)] scale-95"
              : "border-[#FB923C]/50 bg-[#FB923C]/15 shadow-[0_0_18px_rgba(251,146,60,0.35)]")
          }
          style={{
            left: jetpackCenter.x - JETPACK_SIZE / 2,
            top: jetpackCenter.y - JETPACK_SIZE / 2,
            width: JETPACK_SIZE,
            height: JETPACK_SIZE,
            touchAction: "none",
          }}
        >
          <Rocket
            size={26}
            className={jetpackPressed ? "text-white" : "text-[#FB923C]"}
            strokeWidth={2.4}
          />
        </button>

        {/* ── Fire indicator (visual only, top of right stick) ── */}
        {rightKnob.active && Math.hypot(rightKnob.x, rightKnob.y) > 14 && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-[#FDE047] bg-[#FDE047]/20"
            style={{
              left: rightCenter.x - 32,
              top: rightCenter.y - 32,
              width: 64,
              height: 64,
              animation: "fire-pulse 0.35s ease-out infinite",
            }}
          />
        )}

        <style>{`
          @keyframes fire-pulse {
            0%   { transform: scale(0.9); opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
          }
        `}</style>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-black/45">
        Left stick: move. Rocket: jetpack. Right stick: aim + auto-fire.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// StickBase — a fixed circular joystick with a knob
// ─────────────────────────────────────────────────────────
function StickBase({ cx, cy, size, color, label, knob, knobSize }) {
  const half = size / 2
  const knobHalf = knobSize / 2
  const knobX = cx + knob.x
  const knobY = cy + knob.y
  const isActive = knob.active

  return (
    <>
      {/* Base ring */}
      <div
        className="pointer-events-none absolute rounded-full transition-all"
        style={{
          left: cx - half,
          top: cy - half,
          width: size,
          height: size,
          border: `2px solid ${color}${isActive ? "AA" : "55"}`,
          background: `radial-gradient(circle at 50% 50%, ${color}${isActive ? "28" : "12"} 0%, ${color}08 70%, transparent 100%)`,
          boxShadow: isActive
            ? `0 0 30px ${color}66, inset 0 0 24px ${color}44`
            : `0 0 14px ${color}33, inset 0 0 12px ${color}22`,
        }}
      />

      {/* Cardinal ticks */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, i) => {
        const r = half - 2
        const tx = cx + Math.cos(a) * r
        const ty = cy + Math.sin(a) * r
        return (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: tx - 2,
              top: ty - 2,
              width: 4,
              height: 4,
              background: `${color}${isActive ? "AA" : "55"}`,
            }}
          />
        )
      })}

      {/* Label */}
      {!isActive && (
        <div
          className="pointer-events-none absolute text-center font-black tracking-wider"
          style={{
            left: cx - half,
            top: cy - 6,
            width: size,
            color: `${color}88`,
            fontSize: 10,
          }}
        >
          {label}
        </div>
      )}

      {/* Knob */}
      <div
        className="pointer-events-none absolute rounded-full transition-transform duration-75"
        style={{
          left: knobX - knobHalf,
          top: knobY - knobHalf,
          width: knobSize,
          height: knobSize,
          background: `radial-gradient(circle at 35% 30%, ${color}FF 0%, ${color}CC 60%, ${color}88 100%)`,
          boxShadow: isActive
            ? `0 0 26px ${color}CC, inset 0 0 12px ${color}88`
            : `0 0 14px ${color}77, inset 0 0 8px ${color}55`,
          border: `2px solid ${color}${isActive ? "FF" : "99"}`,
        }}
      />
    </>
  )
}
