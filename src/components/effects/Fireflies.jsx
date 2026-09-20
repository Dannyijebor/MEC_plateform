import { useEffect, useRef } from "react"

function Fireflies() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = Math.min(window.devicePixelRatio || 1, 1.75)

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 1.75)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = width + "px"
      canvas.style.height = height + "px"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    let resizeTimer = null
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 150)
    }
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize)
    }

    const isDark = () => document.documentElement.classList.contains("dark")
    const isMobile = width < 768

    /* ---------- Snow ---------- */
    const SNOW_COUNT = isMobile ? 42 : 72
    const snow = []

    const resetSnowflake = (f, initial) => {
      f.x = Math.random() * width
      f.y = initial ? Math.random() * height : -10 - Math.random() * 40
      f.vy = 0.35 + Math.random() * 0.85
      f.vx = (Math.random() - 0.5) * 0.25
      f.radius = 1.1 + Math.random() * 2.4
      f.opacity = 0.32 + Math.random() * 0.5
      f.swayPhase = Math.random() * Math.PI * 2
      f.swayAmp = 0.35 + Math.random() * 0.7
      f.swaySpeed = 0.6 + Math.random() * 0.8
    }

    for (let i = 0; i < SNOW_COUNT; i++) {
      const f = {}
      resetSnowflake(f, true)
      snow.push(f)
    }

    /* ---------- Butterflies ---------- */
    const BUTTERFLY_COUNT = isMobile ? 4 : 6
    const butterflies = []
    for (let i = 0; i < BUTTERFLY_COUNT; i++) {
      butterflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 9 + Math.random() * 8,
        angle: Math.random() * Math.PI * 2,
        flapPhase: Math.random() * Math.PI * 2,
        flapSpeed: 0.18 + Math.random() * 0.14,
        wanderPhase: Math.random() * Math.PI * 2,
        wanderSpeed: 0.004 + Math.random() * 0.008,
      })
    }

    /* ---------- Sparkles ---------- */
    const SPARKLE_COUNT = isMobile ? 14 : 24
    const sparkles = []
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      sparkles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.7 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.016,
        opacity: 0.32 + Math.random() * 0.5,
      })
    }

    /* ---------- Cursor ---------- */
    const pointer = { x: -9999, y: -9999, active: false }
    const onMove = (x, y) => {
      pointer.x = x
      pointer.y = y
      pointer.active = true
    }
    const onMouse = (e) => onMove(e.clientX, e.clientY)
    const onTouch = (e) => {
      const t = e.touches?.[0]
      if (t) onMove(t.clientX, t.clientY)
    }
    const onLeave = () => {
      pointer.active = false
      pointer.x = -9999
      pointer.y = -9999
    }
    window.addEventListener("mousemove", onMouse)
    window.addEventListener("mouseleave", onLeave)
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("touchend", onLeave)

    /* ---------- Butterfly drawing ---------- */
    const drawButterfly = (b, rgb) => {
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.angle)

      // Wing flap: 0..1 mapped from sin, where 1 = wings fully spread
      const flap = (Math.sin(b.flapPhase) + 1) * 0.5
      const wingX = 0.28 + flap * 0.82

      const s = b.size

      // Upper wings
      ctx.fillStyle = "rgba(" + rgb + ", 0.72)"
      ctx.beginPath()
      ctx.ellipse(-s * 0.55, -s * 0.15, s * 0.55 * wingX, s * 0.65, -0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(s * 0.55, -s * 0.15, s * 0.55 * wingX, s * 0.65, 0.15, 0, Math.PI * 2)
      ctx.fill()

      // Lower wings
      ctx.fillStyle = "rgba(" + rgb + ", 0.6)"
      ctx.beginPath()
      ctx.ellipse(-s * 0.42, s * 0.35, s * 0.42 * wingX, s * 0.5, 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(s * 0.42, s * 0.35, s * 0.42 * wingX, s * 0.5, -0.15, 0, Math.PI * 2)
      ctx.fill()

      // Body
      ctx.fillStyle = "rgba(" + rgb + ", 0.9)"
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.1, s * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()

      // Antennae
      ctx.strokeStyle = "rgba(" + rgb + ", 0.6)"
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.moveTo(-s * 0.05, -s * 0.5)
      ctx.quadraticCurveTo(-s * 0.2, -s * 0.75, -s * 0.3, -s * 0.85)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(s * 0.05, -s * 0.5)
      ctx.quadraticCurveTo(s * 0.2, -s * 0.75, s * 0.3, -s * 0.85)
      ctx.stroke()

      ctx.restore()
    }

    /* ---------- Animation ---------- */
    let raf
    let running = true
    let lastTime = performance.now()

    const step = (now) => {
      if (!running) return
      const dt = Math.min((now - lastTime) / 16.67, 2.2)
      lastTime = now

      ctx.clearRect(0, 0, width, height)

      const dark = isDark()
      const snowRgb = dark ? "255, 255, 255" : "32, 38, 53"
      const sparkleRgb = dark ? "255, 255, 255" : "32, 38, 53"
      const butterflyRgb = dark ? "125, 211, 252" : "59, 130, 246"

      /* --- Snow --- */
      for (const f of snow) {
        f.swayPhase += f.swaySpeed * 0.02 * dt
        f.x += (f.vx + Math.sin(f.swayPhase) * f.swayAmp) * dt
        f.y += f.vy * dt

        if (f.y > height + 10 || f.x < -20 || f.x > width + 20) {
          resetSnowflake(f, false)
        }

        // Soft halo for bigger flakes
        if (f.radius > 2.3) {
          ctx.beginPath()
          ctx.fillStyle = "rgba(" + snowRgb + ", " + (f.opacity * 0.28) + ")"
          ctx.arc(f.x, f.y, f.radius * 1.9, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.beginPath()
        ctx.fillStyle = "rgba(" + snowRgb + ", " + f.opacity + ")"
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      /* --- Sparkles --- */
      for (const s of sparkles) {
        s.phase += s.speed * dt
        const pulse = (Math.sin(s.phase) + 1) * 0.5
        const alpha = s.opacity * (0.15 + pulse * 0.85)
        const r = s.radius * (0.5 + pulse * 0.8)
        ctx.beginPath()
        ctx.fillStyle = "rgba(" + sparkleRgb + ", " + alpha + ")"
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      /* --- Butterflies --- */
      for (const b of butterflies) {
        // Wander noise
        b.wanderPhase += b.wanderSpeed * dt
        b.vx += Math.cos(b.wanderPhase) * 0.06 * dt
        b.vy += Math.sin(b.wanderPhase * 1.3) * 0.06 * dt

        // Cursor attraction
        if (pointer.active) {
          const dx = pointer.x - b.x
          const dy = pointer.y - b.y
          const d2 = dx * dx + dy * dy
          const R = 220
          if (d2 < R * R && d2 > 400) {
            const d = Math.sqrt(d2)
            const f = (1 - d / R) * 0.055
            b.vx += (dx / d) * f * dt
            b.vy += (dy / d) * f * dt
          }
        }

        // Damping + speed cap
        b.vx *= 0.97
        b.vy *= 0.97
        const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
        const maxSp = 1.25
        if (sp > maxSp) {
          b.vx = (b.vx / sp) * maxSp
          b.vy = (b.vy / sp) * maxSp
        }

        b.x += b.vx * dt
        b.y += b.vy * dt

        // Wrap
        if (b.x < -30) b.x = width + 30
        else if (b.x > width + 30) b.x = -30
        if (b.y < -30) b.y = height + 30
        else if (b.y > height + 30) b.y = -30

        // Face direction of motion
        if (sp > 0.12) {
          const target = Math.atan2(b.vy, b.vx) + Math.PI / 2
          let diff = target - b.angle
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          b.angle += diff * 0.08 * dt
        }

        b.flapPhase += b.flapSpeed * dt
        drawButterfly(b, butterflyRgb)
      }

      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        lastTime = performance.now()
        raf = requestAnimationFrame(step)
      }
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize)
      }
      window.removeEventListener("mousemove", onMouse)
      window.removeEventListener("mouseleave", onLeave)
      window.removeEventListener("touchmove", onTouch)
      window.removeEventListener("touchend", onLeave)
      document.removeEventListener("visibilitychange", onVis)
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}

export default Fireflies
