import { useMemo } from "react"

const DROP_COUNT = 45

export default function RainBackground() {
  const drops = useMemo(() => {
    return Array.from({ length: DROP_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 1.4 + Math.random() * 1.4,
      opacity: 0.18 + Math.random() * 0.4,
      height: 28 + Math.random() * 45,
      width: 1 + Math.random() * 1.4,
    }))
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {drops.map((d) => (
        <div
          key={d.id}
          className="absolute top-0 rounded-full"
          style={{
            left: d.left + "%",
            width: d.width + "px",
            height: d.height + "px",
            background:
              "linear-gradient(to bottom, rgba(56,189,248,0), rgba(186,230,253,0.9))",
            animation: `mec-rain-fall ${d.duration}s linear ${d.delay}s infinite`,
            willChange: "transform, opacity",
            "--d-op": String(d.opacity),
          }}
        />
      ))}

      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "linear-gradient(to top, rgba(56,189,248,0.12), transparent)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 100%, rgba(56,189,248,0.06), transparent 70%)",
        }}
      />

      <style>{`
        @keyframes mec-rain-fall {
          0%   { transform: translateY(-15vh); opacity: 0; }
          8%   { opacity: var(--d-op, 0.5); }
          92%  { opacity: var(--d-op, 0.5); }
          100% { transform: translateY(105vh); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
