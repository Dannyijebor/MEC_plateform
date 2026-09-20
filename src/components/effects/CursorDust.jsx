import { useEffect, useRef } from "react"

function CursorDust() {
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

    const particles = []
    const pointer = { x: -9999, y: -9999, lastX: -9999, lastY: -9999 }

    const onMove = (x, y) => {
      pointer.lastX = pointer.x
      pointer.lastY = pointer.y
      pointer.x = x
      pointer.y = y

      const dx = pointer.x - pointer.lastX
      const dy = pointer.y - pointer.lastY
      if (!isFinite(dx) || !isFinite(dy)) return
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 80)
      const n = Math.min(Math.max(2, Math.floor(dist / 3)), 9)
      const color = isDark() ? [56, 189, 248] : [59, 130, 246]
      for (let i = 0; i < n; i++) {
        const t = i / n
        particles.push({
          x: pointer.lastX + dx * t + (Math.random() - 0.5) * 6,
          y: pointer.lastY + dy * t + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 1,
          r: 1.2 + Math.random() * 2.2,
          color,
        })
      }
    }

    const onMouse = (e) => onMove(e.clientX, e.clientY)
    const onTouch = (e) => { const t = e.touches?.[0]; if (t) onMove(t.clientX, t.clientY) }
    const onBurst = (e) => {
      const x = e.clientX ?? e.touches?.[0]?.clientX
      const y = e.clientY ?? e.touches?.[0]?.clientY
      if (x == null) return
      const color = isDark() ? [56, 189, 248] : [59, 130, 246]
      for (let i = 0; i < 44; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 1.6 + Math.random() * 3.2
        particles.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
          r: 1.5 + Math.random() * 2.4,
          color,
        })
      }
    }

    window.addEventListener("mousemove", onMouse)
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("touchstart", onTouch, { passive: true })
    window.addEventListener("click", onBurst)

    let raf
    let running = true

    const step = () => {
      if (!running) return
      ctx.clearRect(0, 0, width, height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.96
        p.vy *= 0.96
        p.life -= 0.012
        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }
        const [cr, cg, cb] = p.color
        ctx.beginPath()
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${p.life * 0.75})`
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2)
        ctx.fill()
      }

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
      window.removeEventListener("touchmove", onTouch)
      window.removeEventListener("touchstart", onTouch)
      window.removeEventListener("click", onBurst)
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

export default CursorDust
