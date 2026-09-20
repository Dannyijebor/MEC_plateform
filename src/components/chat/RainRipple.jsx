export default function RainRipple() {
  return (
    <span className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
      <span
        className="absolute -right-1 -top-1 h-8 w-8 rounded-full bg-white/35"
        style={{ animation: "mec-ripple 1.1s ease-out forwards" }}
      />
      <span
        className="absolute -right-1 -top-1 h-8 w-8 rounded-full border border-white/70"
        style={{ animation: "mec-ripple 1.1s ease-out 0.08s forwards" }}
      />
      <span
        className="absolute inset-0 rounded-2xl"
        style={{
          background:
            "radial-gradient(circle at 85% 20%, rgba(255,255,255,0.35), transparent 55%)",
          animation: "mec-sheen 1.1s ease-out forwards",
        }}
      />
      <style>{`
        @keyframes mec-ripple {
          0%   { transform: scale(0.2); opacity: 0.95; }
          70%  { transform: scale(2.2); opacity: 0.15; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes mec-sheen {
          0%   { opacity: 0; }
          22%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </span>
  )
}
