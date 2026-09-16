import { useEffect, useRef } from "react"

function Fireflies() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")

    let animationFrame
    let particles = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr

      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const createParticles = () => {
      const count = Math.min(
        80,
        Math.max(40, Math.floor(window.innerWidth / 15))
      )

      particles = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 0.55 + 0.25

        return {
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,

          radius: Math.random() * 1.4 + 0.6,

          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,

          angle,

          turnSpeed:
            (Math.random() - 0.5) * 0.012,

          phase:
            Math.random() * Math.PI * 2,

          pulseSpeed:
            Math.random() * 0.025 + 0.015,

          brightness:
            Math.random() * 0.35 + 0.65,

          life:
            Math.random() * Math.PI * 2,
        }
      })
    }

    const draw = () => {
      ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      )

      particles.forEach((particle) => {
        /*
         * Slowly change direction.
         * This creates a natural wandering motion.
         */
        particle.angle += particle.turnSpeed

        particle.vx =
          Math.cos(particle.angle) *
          (0.25 + particle.brightness * 0.35)

        particle.vy =
          Math.sin(particle.angle) *
          (0.25 + particle.brightness * 0.35)

        /*
         * Add gentle floating movement.
         */
        particle.life += 0.01

        particle.x +=
          particle.vx +
          Math.sin(particle.life * 1.7) * 0.18

        particle.y +=
          particle.vy +
          Math.cos(particle.life * 1.3) * 0.18

        /*
         * Wrap around the screen.
         */
        if (particle.x < -40) {
          particle.x = window.innerWidth + 40
        }

        if (particle.x > window.innerWidth + 40) {
          particle.x = -40
        }

        if (particle.y < -40) {
          particle.y = window.innerHeight + 40
        }

        if (particle.y > window.innerHeight + 40) {
          particle.y = -40
        }

        /*
         * Pulsing light.
         */
        particle.phase += particle.pulseSpeed

        const pulse =
          (Math.sin(particle.phase) + 1) / 2

        const opacity =
          0.35 +
          pulse * 0.55

        const glow =
          particle.radius *
          (8 + pulse * 10)

        /*
         * Golden outer glow.
         */
        const gradient =
          ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            glow
          )

        gradient.addColorStop(
          0,
          `rgba(255, 245, 210, ${opacity})`
        )

        gradient.addColorStop(
          0.12,
          `rgba(244, 211, 140, ${opacity * 0.65})`
        )

        gradient.addColorStop(
          0.35,
          `rgba(217, 184, 108, ${opacity * 0.2})`
        )

        gradient.addColorStop(
          1,
          "rgba(217, 184, 108, 0)"
        )

        ctx.beginPath()

        ctx.fillStyle = gradient

        ctx.arc(
          particle.x,
          particle.y,
          glow,
          0,
          Math.PI * 2
        )

        ctx.fill()

        /*
         * Bright center.
         */
        ctx.beginPath()

        ctx.fillStyle =
          `rgba(255, 252, 238, ${0.7 + pulse * 0.3})`

        ctx.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        )

        ctx.fill()
      })

      animationFrame =
        requestAnimationFrame(draw)
    }

    const handleResize = () => {
      resize()
      createParticles()
    }

    resize()
    createParticles()
    draw()

    window.addEventListener(
      "resize",
      handleResize
    )

    return () => {
      cancelAnimationFrame(animationFrame)

      window.removeEventListener(
        "resize",
        handleResize
      )
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
