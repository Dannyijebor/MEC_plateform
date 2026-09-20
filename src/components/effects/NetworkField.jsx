import { useEffect, useRef } from "react"

const MOBILE_COUNT = 38
const DESKTOP_COUNT = 62
const LINK_DIST = 145
const LINK_DIST_SQ = LINK_DIST * LINK_DIST
const CURSOR_RADIUS = 180
const CURSOR_RADIUS_SQ = CURSOR_RADIUS * CURSOR_RADIUS
const MAX_SPEED = 1.1
const DAMPING = 0.985

function NetworkField() {
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

    const count = width < 768 ? MOBILE_COUNT : DESKTOP_COUNT
    const nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.1 + Math.random() * 1.3,
    }))

    const sparks = []

    const pointer = { x: -9999, y: -9999, active: false }

    const onMove = (x, y) => {
      pointer.x = x
      pointer.y = y
      pointer.active = true
    }
    const onLeave = () => {
      pointer.active = false
      pointer.x = -9999
      pointer.y = -9999
    }
    const onTouchMove = (e) => {
      const t = e.touches?.[0]
      if (t) onMove(t.clientX, t.clientY)
    }
    const onBurst = (e) => {
      const x = e.clientX ?? e.touches?.[0]?.clientX
      const y = e.clientY ?? e.touches?.[0]?.clientY
      if (x == null || y == null) return
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 0.7 + Math.random() * 1.2
        sparks.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
        })
      }
    }

    const onMouseMove = (e) => onMove(e.clientX, e.clientY)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseleave", onLeave)
    window.addEventListener("touchstart", onTouchMove, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: true })
    window.addEventListener("touchend", onLeave)
    window.addEventListener("click", onBurst)

    let raf
    let running = true

    const step = () => {
      if (!running) return
      ctx.clearRect(0, 0, width, height)

      const dark = isDark()
      const nodeRgb = dark ? "186, 230, 253" : "32, 38, 53"
      const linkRgb = dark ? "96, 165, 250" : "32, 38, 53"
      const cursorRgb = dark ? "56, 189, 248" : "59, 130, 246"

      // physics
      for (const n of nodes) {
        if (pointer.active) {
          const dx = pointer.x - n.x
          const dy = pointer.y - n.y
          const d2 = dx * dx + dy * dy
          if (d2 < CURSOR_RADIUS_SQ && d2 > 0.5) {
            const d = Math.sqrt(d2)
            const f = (1 - d / CURSOR_RADIUS) * 0.075
            n.vx += (dx / d) * f
            n.vy += (dy / d) * f
          }
        }
        n.vx *= DAMPING
        n.vy *= DAMPING
        const sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy)
        if (sp > MAX_SPEED) {
          n.vx = (n.vx / sp) * MAX_SPEED
          n.vy = (n.vy / sp) * MAX_SPEED
        }
        n.x += n.vx
        n.y += n.vy
        if (n.x < -10) n.x = width + 10
        else if (n.x > width + 10) n.x = -10
        if (n.y < -10) n.y = height + 10
        else if (n.y > height + 10) n.y = -10
      }

      // links between nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d2 = dx * dx + dy * dy
          if (d2 < LINK_DIST_SQ) {
            const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.32
            ctx.strokeStyle = "rgba(" + linkRgb + ", " + alpha + ")"
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // cursor threads + halo
      if (pointer.active) {
        const grad = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, 90,
        )
        grad.addColorStop(0, "rgba(" + cursorRgb + ", 0.10)")
        grad.addColorStop(1, "rgba(" + cursorRgb + ", 0)")
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, 90, 0, Math.PI * 2)
        ctx.fill()

        for (const n of nodes) {
          const dx = n.x - pointer.x
          const dy = n.y - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 < CURSOR_RADIUS_SQ) {
            const alpha = (1 - Math.sqrt(d2) / CURSOR_RADIUS) * 0.45
            ctx.strokeStyle = "rgba(" + cursorRgb + ", " + alpha + ")"
            ctx.lineWidth = 0.85
            ctx.beginPath()
            ctx.moveTo(pointer.x, pointer.y)
            ctx.lineTo(n.x, n.y)
            ctx.stroke()
          }
        }
      }

      // nodes
      for (const n of nodes) {
        ctx.beginPath()
        ctx.fillStyle = "rgba(" + nodeRgb + ", 0.72)"
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx
        s.y += s.vy
        s.vx *= 0.955
        s.vy *= 0.955
        s.life -= 0.014
        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }
        ctx.beginPath()
        ctx.fillStyle = "rgba(" + cursorRgb + ", " + (s.life * 0.9) + ")"
        ctx.arc(s.x, s.y, 2.4 * s.life + 0.4, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(step)
    }
    step()

    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
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
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseleave", onLeave)
      window.removeEventListener("touchstart", onTouchMove)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onLeave)
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

export default NetworkField
