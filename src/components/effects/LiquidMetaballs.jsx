import { useEffect, useRef } from "react"

function LiquidMetaballs() {
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

    const palette = [
      [56, 189, 248],
      [96, 165, 250],
      [139, 92, 246],
      [34, 211, 238],
      [168, 85, 247],
    ]
    const BLOBS = width < 768 ? 4 : 5
    const blobs = Array.from({ length: BLOBS }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: 120 + Math.random() * 70,
      color: palette[i % palette.length],
    }))

    const pointer = { x: -9999, y: -9999, active: false }
    const onMouse = (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true }
    const onTouch = (e) => { const t = e.touches?.[0]; if (t) { pointer.x = t.clientX; pointer.y = t.clientY; pointer.active = true } }
    const onLeave = () => { pointer.active = false; pointer.x = -9999; pointer.y = -9999 }
    window.addEventListener("mousemove", onMouse)
    window.addEventListener("mouseleave", onLeave)
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("touchend", onLeave)

    let raf
    let running = true

    const step = () => {
      if (!running) return
      ctx.clearRect(0, 0, width, height)

      const dark = isDark()
      const op = dark ? 0.55 : 0.42
      ctx.globalCompositeOperation = "lighter"

      for (const b of blobs) {
        if (pointer.active) {
          const dx = pointer.x - b.x
          const dy = pointer.y - b.y
          const d2 = dx * dx + dy * dy
          const R = 340
          if (d2 < R * R && d2 > 1) {
            const d = Math.sqrt(d2)
            const f = (1 - d / R) * 0.08
            b.vx += (dx / d) * f
            b.vy += (dy / d) * f
          }
        }
        b.vx *= 0.98
        b.vy *= 0.98
        const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
        if (sp > 1.2) { b.vx = (b.vx / sp) * 1.2; b.vy = (b.vy / sp) * 1.2 }
        b.x += b.vx
        b.y += b.vy

        if (b.x < -120) b.x = width + 120
        else if (b.x > width + 120) b.x = -120
        if (b.y < -120) b.y = height + 120
        else if (b.y > height + 120) b.y = -120

        const [cr, cg, cb] = b.color
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${op})`)
        grad.addColorStop(0.55, `rgba(${cr}, ${cg}, ${cb}, ${op * 0.35})`)
        grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = "source-over"
      raf = requestAnimationFrame(step)
    }
    step()

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

export default LiquidMetaballs
