import { useEffect, useRef } from "react"

function AuroraRibbons() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
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

    const isDark = () => document.documentElement.classList.contains("dark")

    const pointer = { x: -9999, y: -9999, active: false }
    const onMouse = (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true }
    const onTouch = (e) => { const t = e.touches?.[0]; if (t) { pointer.x = t.clientX; pointer.y = t.clientY; pointer.active = true } }
    const onLeave = () => { pointer.active = false; pointer.x = -9999; pointer.y = -9999 }
    window.addEventListener("mousemove", onMouse)
    window.addEventListener("mouseleave", onLeave)
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("touchend", onLeave)

    const palette = [
      [139, 92, 246],
      [59, 130, 246],
      [34, 211, 238],
      [168, 85, 247],
    ]
    const RIBBON_COUNT = 4
    const POINTS = 7
    const ribbons = Array.from({ length: RIBBON_COUNT }, (_, i) => ({
      phase: Math.random() * Math.PI * 2,
      speed: 0.00035 + Math.random() * 0.0004,
      amp: 60 + Math.random() * 90,
      baseY: (i + 0.5) / RIBBON_COUNT,
      color: palette[i % palette.length],
    }))

    let raf
    let running = true
    const start = performance.now()

    const step = (now) => {
      if (!running) return
      const t = now - start
      ctx.clearRect(0, 0, width, height)

      const dark = isDark()
      const opMult = dark ? 0.6 : 0.34

      for (const r of ribbons) {
        const points = []
        for (let i = 0; i <= POINTS; i++) {
          const p = i / POINTS
          const x = p * width
          const baseY = r.baseY * height
          let y = baseY
            + Math.sin(t * r.speed + r.phase + p * 4) * r.amp
            + Math.cos(t * r.speed * 0.7 + p * 6) * r.amp * 0.35

          if (pointer.active) {
            const dx = pointer.x - x
            const dy = pointer.y - y
            const d2 = dx * dx + dy * dy
            const R = 260
            if (d2 < R * R) {
              const d = Math.sqrt(d2)
              const f = (1 - d / R) * 0.5
              y += (pointer.y - y) * f * 0.35
            }
          }
          points.push([x, y])
        }

        const [cr, cg, cb] = r.color
        const layers = [
          { w: 42, a: 0.05 },
          { w: 22, a: 0.10 },
          { w: 10, a: 0.18 },
          { w: 3,  a: 0.38 },
        ]
        for (const layer of layers) {
          ctx.beginPath()
          ctx.moveTo(points[0][0], points[0][1])
          for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i][0] + points[i + 1][0]) / 2
            const yc = (points[i][1] + points[i + 1][1]) / 2
            ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc)
          }
          ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${layer.a * opMult})`
          ctx.lineWidth = layer.w
          ctx.lineCap = "round"
          ctx.stroke()
        }
      }

      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf) }
      else if (!running) { running = true; raf = requestAnimationFrame(step) }
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
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

export default AuroraRibbons
