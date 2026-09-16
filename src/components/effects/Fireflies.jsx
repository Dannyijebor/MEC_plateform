import { useEffect, useRef } from "react"

function Fireflies() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
    })

    if (!ctx) return

    let animationFrame
    let width = window.innerWidth
    let height = window.innerHeight

    let snow = []
    let butterflies = []
    let sparkles = []

    const pointer = {
      x: -1000,
      y: -1000,
      active: false,
      lastInteraction: 0,
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    )

    const isReducedMotion = () => reducedMotion.matches

    const random = (min, max) =>
      Math.random() * (max - min) + min

    const distance = (x1, y1, x2, y2) => {
      const dx = x2 - x1
      const dy = y2 - y1
      return Math.sqrt(dx * dx + dy * dy)
    }

    const lerp = (a, b, amount) =>
      a + (b - a) * amount

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        1.75
      )

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)

      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const createSnow = () => {
      const area = width * height

      const count = isReducedMotion()
        ? Math.min(60, Math.max(30, Math.floor(area / 18000)))
        : Math.min(160, Math.max(65, Math.floor(area / 9000)))

      snow = Array.from({ length: count }, () => {
        const depth = random(0, 1)

        return {
          x: random(-30, width + 30),
          y: random(-height, height),

          radius:
            depth < 0.5
              ? random(0.6, 1.4)
              : random(1, 2.7),

          speed:
            depth < 0.5
              ? random(0.22, 0.6)
              : random(0.5, 1.15),

          drift: random(-0.22, 0.22),

          opacity:
            depth < 0.5
              ? random(0.2, 0.42)
              : random(0.36, 0.72),

          depth,

          phase: random(0, Math.PI * 2),
          phaseSpeed: random(0.004, 0.012),
        }
      })
    }

    const createButterflies = () => {
      const count = isReducedMotion()
        ? 3
        : width < 640
          ? 5
          : 8

      butterflies = Array.from(
        { length: count },
        (_, index) => {
          const angle = random(0, Math.PI * 2)

          return {
            id: index,

            x: random(width * 0.08, width * 0.92),
            y: random(height * 0.08, height * 0.92),

            size:
              width < 640
                ? random(5.5, 8)
                : random(7, 12),

            angle,
            targetAngle: angle,

            speed: random(0.16, 0.4),

            wingPhase: random(0, Math.PI * 2),
            wingSpeed: random(0.075, 0.12),

            driftPhase: random(0, Math.PI * 2),
            driftSpeed: random(0.004, 0.009),

            turnTimer: random(80, 240),

            glow: random(0.45, 0.85),
            opacity: random(0.4, 0.74),

            interaction: 0,
            followingPointer: false,

            hue: index % 3,
          }
        }
      )
    }

    const createSparkles = () => {
      const count = isReducedMotion() ? 10 : 24

      sparkles = Array.from(
        { length: count },
        () => ({
          x: random(0, width),
          y: random(0, height),
          radius: random(0.35, 0.9),
          phase: random(0, Math.PI * 2),
          speed: random(0.008, 0.018),
          opacity: random(0.1, 0.3),
        })
      )
    }

    const drawButterfly = (butterfly) => {
      const {
        x,
        y,
        size,
        wingPhase,
        opacity,
        glow,
        hue,
      } = butterfly

      ctx.save()

      ctx.translate(x, y)
      ctx.rotate(butterfly.angle)

      const wing =
        Math.cos(wingPhase)

      const wingScale =
        0.42 + Math.abs(wing) * 0.58

      const haloRadius =
        size * (2.5 + glow * 2)

      const halo =
        ctx.createRadialGradient(
          0,
          0,
          0,
          0,
          0,
          haloRadius
        )

      halo.addColorStop(
        0,
        `rgba(255, 239, 216, ${opacity * 0.16})`
      )

      halo.addColorStop(
        0.45,
        `rgba(171, 177, 255, ${opacity * 0.06})`
      )

      halo.addColorStop(
        1,
        "rgba(171, 177, 255, 0)"
      )

      ctx.fillStyle = halo

      ctx.beginPath()
      ctx.arc(
        0,
        0,
        haloRadius,
        0,
        Math.PI * 2
      )
      ctx.fill()

      let wingA
      let wingB

      if (hue === 0) {
        wingA = "rgba(143, 151, 255,"
        wingB = "rgba(210, 185, 255,"
      } else if (hue === 1) {
        wingA = "rgba(255, 181, 145,"
        wingB = "rgba(255, 219, 192,"
      } else {
        wingA = "rgba(139, 205, 232,"
        wingB = "rgba(204, 232, 245,"
      }

      const drawWingPair = (side) => {
        const direction = side === "left" ? -1 : 1

        ctx.save()
        ctx.scale(
          wingScale * direction,
          1
        )

        const gradient =
          ctx.createRadialGradient(
            size * 0.65,
            -size * 0.45,
            0,
            size * 0.65,
            -size * 0.45,
            size * 1.2
          )

        gradient.addColorStop(
          0,
          `${wingB} ${opacity})`
        )

        gradient.addColorStop(
          0.45,
          `${wingA} ${opacity * 0.7})`
        )

        gradient.addColorStop(
          1,
          `${wingA} 0)`
        )

        ctx.fillStyle = gradient

        ctx.beginPath()

        ctx.ellipse(
          size * 0.58,
          -size * 0.42,
          size * 0.78,
          size * 0.58,
          0.55,
          0,
          Math.PI * 2
        )

        ctx.fill()

        ctx.beginPath()

        ctx.ellipse(
          size * 0.54,
          size * 0.38,
          size * 0.58,
          size * 0.4,
          -0.42,
          0,
          Math.PI * 2
        )

        ctx.fill()

        ctx.restore()
      }

      drawWingPair("left")
      drawWingPair("right")

      ctx.beginPath()

      ctx.fillStyle =
        `rgba(61, 66, 91, ${Math.min(
          0.72,
          opacity + 0.12
        )})`

      ctx.ellipse(
        0,
        0,
        size * 0.12,
        size * 0.62,
        0,
        0,
        Math.PI * 2
      )

      ctx.fill()

      ctx.strokeStyle =
        `rgba(80, 83, 110, ${opacity * 0.5})`

      ctx.lineWidth = 0.55

      ctx.beginPath()

      ctx.moveTo(
        -size * 0.05,
        -size * 0.38
      )

      ctx.quadraticCurveTo(
        -size * 0.25,
        -size * 0.82,
        -size * 0.42,
        -size * 0.88
      )

      ctx.moveTo(
        size * 0.05,
        -size * 0.38
      )

      ctx.quadraticCurveTo(
        size * 0.25,
        -size * 0.82,
        size * 0.42,
        -size * 0.88
      )

      ctx.stroke()

      ctx.restore()
    }

    const drawSnowflake = (flake) => {
      const {
        x,
        y,
        radius,
        opacity,
        depth,
      } = flake

      if (depth > 0.7) {
        ctx.shadowBlur = radius * 3
        ctx.shadowColor =
          `rgba(255, 255, 255, ${opacity * 0.4})`
      }

      ctx.beginPath()

      ctx.fillStyle =
        `rgba(255, 255, 255, ${opacity})`

      ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
      )

      ctx.fill()

      ctx.shadowBlur = 0
    }

    const updateSnow = () => {
      snow.forEach((flake) => {
        flake.phase += flake.phaseSpeed

        const sway =
          Math.sin(flake.phase) *
          (0.15 + flake.depth * 0.3)

        flake.x +=
          flake.drift +
          sway

        flake.y += flake.speed

        if (
          pointer.active &&
          !isReducedMotion()
        ) {
          const d = distance(
            flake.x,
            flake.y,
            pointer.x,
            pointer.y
          )

          if (d < 60) {
            const force = (60 - d) / 60

            flake.x +=
              (flake.x - pointer.x) *
              force *
              0.003
          }
        }

        if (flake.y > height + 15) {
          flake.y = -15
          flake.x = random(-20, width + 20)
        }

        if (flake.x > width + 20) {
          flake.x = -20
        }

        if (flake.x < -20) {
          flake.x = width + 20
        }
      })
    }

    const updateButterflies = () => {
      butterflies.forEach((butterfly) => {
        butterfly.wingPhase +=
          butterfly.wingSpeed

        butterfly.driftPhase +=
          butterfly.driftSpeed

        butterfly.turnTimer -= 1

        if (butterfly.turnTimer <= 0) {
          butterfly.targetAngle +=
            random(-0.75, 0.75)

          butterfly.turnTimer =
            random(100, 280)
        }

        let nearPointer = false

        if (
          pointer.active &&
          !isReducedMotion()
        ) {
          const d = distance(
            butterfly.x,
            butterfly.y,
            pointer.x,
            pointer.y
          )

          const interactionRadius =
            Math.max(
              48,
              butterfly.size * 5
            )

          if (d < interactionRadius) {
            nearPointer = true

            butterfly.interaction =
              lerp(
                butterfly.interaction,
                1,
                0.09
              )

            const targetAngle =
              Math.atan2(
                pointer.y - butterfly.y,
                pointer.x - butterfly.x
              )

            butterfly.targetAngle =
              lerp(
                butterfly.targetAngle,
                targetAngle,
                0.035
              )

            butterfly.followingPointer = true
          }
        }

        if (!nearPointer) {
          butterfly.interaction =
            lerp(
              butterfly.interaction,
              0,
              0.025
            )

          if (
            butterfly.interaction < 0.02
          ) {
            butterfly.followingPointer = false
          }
        }

        let angleDifference =
          butterfly.targetAngle -
          butterfly.angle

        while (
          angleDifference > Math.PI
        ) {
          angleDifference -=
            Math.PI * 2
        }

        while (
          angleDifference < -Math.PI
        ) {
          angleDifference +=
            Math.PI * 2
        }

        butterfly.angle +=
          angleDifference * 0.018

        const floatX =
          Math.sin(
            butterfly.driftPhase
          ) * 0.16

        const floatY =
          Math.cos(
            butterfly.driftPhase * 1.4
          ) * 0.13

        const interactionSpeed =
          1 +
          butterfly.interaction * 0.6

        butterfly.x +=
          Math.cos(butterfly.angle) *
            butterfly.speed *
            interactionSpeed +
          floatX

        butterfly.y +=
          Math.sin(butterfly.angle) *
            butterfly.speed *
            interactionSpeed +
          floatY

        const margin = 70

        if (butterfly.x < -margin) {
          butterfly.x = width + margin
          butterfly.targetAngle =
            random(-Math.PI, Math.PI)
        }

        if (butterfly.x > width + margin) {
          butterfly.x = -margin
          butterfly.targetAngle =
            random(-Math.PI, Math.PI)
        }

        if (butterfly.y < -margin) {
          butterfly.y = height + margin
          butterfly.targetAngle =
            random(-Math.PI, Math.PI)
        }

        if (butterfly.y > height + margin) {
          butterfly.y = -margin
          butterfly.targetAngle =
            random(-Math.PI, Math.PI)
        }
      })
    }

    const drawSparkles = () => {
      sparkles.forEach((sparkle) => {
        sparkle.phase += sparkle.speed

        const pulse =
          (Math.sin(sparkle.phase) + 1) / 2

        const opacity =
          sparkle.opacity *
          (0.45 + pulse * 0.55)

        ctx.beginPath()

        ctx.fillStyle =
          `rgba(255, 255, 255, ${opacity})`

        ctx.arc(
          sparkle.x,
          sparkle.y,
          sparkle.radius,
          0,
          Math.PI * 2
        )

        ctx.fill()
      })
    }

    const handlePointerMove = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
      pointer.lastInteraction =
        performance.now()
    }

    const handlePointerDown = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
      pointer.lastInteraction =
        performance.now()

      if (!isReducedMotion()) {
        butterflies.forEach((butterfly) => {
          const d = distance(
            butterfly.x,
            butterfly.y,
            pointer.x,
            pointer.y
          )

          if (d < 75) {
            butterfly.interaction =
              Math.max(
                butterfly.interaction,
                0.8
              )

            butterfly.targetAngle =
              Math.atan2(
                pointer.y - butterfly.y,
                pointer.x - butterfly.x
              )
          }
        })
      }
    }

    const handlePointerLeave = () => {
      pointer.active = false
    }

    const draw = () => {
      ctx.clearRect(
        0,
        0,
        width,
        height
      )

      updateSnow()
      updateButterflies()

      snow
        .filter((flake) => flake.depth < 0.5)
        .forEach(drawSnowflake)

      drawSparkles()

      snow
        .filter((flake) => flake.depth >= 0.5)
        .forEach(drawSnowflake)

      butterflies.forEach(drawButterfly)

      if (
        pointer.active &&
        performance.now() -
          pointer.lastInteraction >
          1800
      ) {
        pointer.active = false
      }

      animationFrame =
        requestAnimationFrame(draw)
    }

    const handleMotionChange = () => {
      createSnow()
      createButterflies()
      createSparkles()
    }

    resize()
    createSnow()
    createButterflies()
    createSparkles()
    draw()

    window.addEventListener(
      "resize",
      resize,
      { passive: true }
    )

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: true }
    )

    window.addEventListener(
      "pointerdown",
      handlePointerDown,
      { passive: true }
    )

    window.addEventListener(
      "pointerleave",
      handlePointerLeave,
      { passive: true }
    )

    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener(
        "change",
        handleMotionChange
      )
    }

    return () => {
      cancelAnimationFrame(animationFrame)

      window.removeEventListener(
        "resize",
        resize
      )

      window.removeEventListener(
        "pointermove",
        handlePointerMove
      )

      window.removeEventListener(
        "pointerdown",
        handlePointerDown
      )

      window.removeEventListener(
        "pointerleave",
        handlePointerLeave
      )

      if (reducedMotion.removeEventListener) {
        reducedMotion.removeEventListener(
          "change",
          handleMotionChange
        )
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
      aria-hidden="true"
    />
  )
}

export default Fireflies
