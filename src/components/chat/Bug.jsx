import { motion } from "framer-motion"

/**
 * Cute animated bug SVG — legs and antennae wiggle.
 */
export function BugIcon({ size = 20, color = "#92400E" }) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      animate={{ rotate: [0, -4, 4, 0] }}
      transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Antennae */}
      <path
        d="M 14 8 Q 11 4 8 3"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="8" cy="3" r="1" fill={color} />
      <path
        d="M 18 8 Q 21 4 24 3"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="24" cy="3" r="1" fill={color} />

      {/* Body */}
      <ellipse cx="16" cy="17" rx="7" ry="9" fill={color} />
      <ellipse cx="16" cy="17" rx="7" ry="9" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="0.8" />

      {/* Head */}
      <circle cx="16" cy="9" r="3.5" fill={color} />
      <circle cx="14.5" cy="9" r="0.8" fill="#fff" />
      <circle cx="17.5" cy="9" r="0.8" fill="#fff" />

      {/* Spots */}
      <circle cx="13" cy="15" r="1.2" fill="#fff" fillOpacity="0.5" />
      <circle cx="19" cy="15" r="1.2" fill="#fff" fillOpacity="0.5" />
      <circle cx="16" cy="19" r="1.4" fill="#fff" fillOpacity="0.5" />
      <circle cx="13" cy="22" r="1" fill="#fff" fillOpacity="0.5" />
      <circle cx="19" cy="22" r="1" fill="#fff" fillOpacity="0.5" />

      {/* Legs */}
      <path d="M 9 13 L 5 11" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 9 18 L 5 18" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 9 23 L 5 25" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 23 13 L 27 11" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 23 18 L 27 18" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 23 23 L 27 25" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </motion.svg>
  )
}

/**
 * BugFly — orbits around the parent bubble using left/top (relative to the
 * containing block), then dives into the middle and vanishes.
 * Parent must be `position: relative`.
 */
export function BugFly({ color = "#78350F", size = 20, playKey }) {
  return (
    <div
      key={playKey}
      className="pointer-events-none absolute inset-0 z-30"
      style={{ overflow: "visible" }}
    >
      <motion.div
        initial={{ opacity: 0, top: "-15%", left: "-15%" }}
        animate={{
          opacity: [0, 1, 1, 1, 1, 1, 0.6, 0],
          top: ["-15%", "-15%", "105%", "105%", "-15%", "40%", "50%", "50%"],
          left: ["-15%", "105%", "105%", "-15%", "-15%", "40%", "50%", "50%"],
          rotate: [0, 90, 180, 270, 360, 480, 600, 720],
          scale: [0.6, 1, 1, 1, 1, 0.85, 0.5, 0],
        }}
        transition={{
          duration: 3.6,
          times: [0, 0.08, 0.32, 0.56, 0.72, 0.84, 0.94, 1],
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        }}
      >
        <BugIcon size={size} color={color} />
      </motion.div>
    </div>
  )
}
