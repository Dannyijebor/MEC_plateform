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
      <motion.path
        d="M 14 8 Q 11 4 8 3"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        animate={{ d: ["M 14 8 Q 11 4 8 3", "M 14 8 Q 10 4 7 4", "M 14 8 Q 11 4 8 3"] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
      <circle cx="8" cy="3" r="1" fill={color} />
      <motion.path
        d="M 18 8 Q 21 4 24 3"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        animate={{ d: ["M 18 8 Q 21 4 24 3", "M 18 8 Q 22 4 25 4", "M 18 8 Q 21 4 24 3"] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
      <circle cx="24" cy="3" r="1" fill={color} />

      {/* Body */}
      <ellipse cx="16" cy="17" rx="7" ry="9" fill={color} />
      <ellipse cx="16" cy="17" rx="7" ry="9" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="0.8" />

      {/* Head */}
      <circle cx="16" cy="9" r="3.5" fill={color} />
      <circle cx="14.5" cy="9" r="0.8" fill="#fff" />
      <circle cx="17.5" cy="9" r="0.8" fill="#fff" />

      {/* Spots on the back */}
      <circle cx="13" cy="15" r="1.2" fill="#fff" fillOpacity="0.5" />
      <circle cx="19" cy="15" r="1.2" fill="#fff" fillOpacity="0.5" />
      <circle cx="16" cy="19" r="1.4" fill="#fff" fillOpacity="0.5" />
      <circle cx="13" cy="22" r="1" fill="#fff" fillOpacity="0.5" />
      <circle cx="19" cy="22" r="1" fill="#fff" fillOpacity="0.5" />

      {/* Legs — 3 pairs */}
      <motion.path
        d="M 9 13 L 5 11"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        animate={{ d: ["M 9 13 L 5 11", "M 9 13 L 5 12", "M 9 13 L 5 11"] }}
        transition={{ duration: 0.4, repeat: Infinity }}
      />
      <motion.path
        d="M 9 18 L 5 18"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        animate={{ d: ["M 9 18 L 5 18", "M 9 18 L 5 19", "M 9 18 L 5 18"] }}
        transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }}
      />
      <motion.path
        d="M 9 23 L 5 25"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        animate={{ d: ["M 9 23 L 5 25", "M 9 23 L 5 26", "M 9 23 L 5 25"] }}
        transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
      />
      <motion.path
        d="M 23 13 L 27 11"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        animate={{ d: ["M 23 13 L 27 11", "M 23 13 L 27 12", "M 23 13 L 27 11"] }}
        transition={{ duration: 0.4, repeat: Infinity }}
      />
      <motion.path
        d="M 23 18 L 27 18"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        animate={{ d: ["M 23 18 L 27 18", "M 23 18 L 27 19", "M 23 18 L 27 18"] }}
        transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }}
      />
      <motion.path
        d="M 23 23 L 27 25"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        animate={{ d: ["M 23 23 L 27 25", "M 23 23 L 27 26", "M 23 23 L 27 25"] }}
        transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
      />
    </motion.svg>
  )
}

/**
 * BugFly — orbits around the parent bubble, then dives into the center.
 * Place inside a `relative` container that wraps the message.
 */
export function BugFly({ color = "#92400E", size = 18, playKey }) {
  return (
    <motion.div
      key={playKey}
      initial={{ opacity: 0, x: "-10%", y: "-10%", scale: 1, rotate: 0 }}
      animate={{
        // trace the perimeter: TL → TR → BR → BL → TL → dive to center
        opacity: [0, 1, 1, 1, 1, 1, 0.3, 0],
        x: ["-10%", "100%", "100%", "-10%", "-10%", "40%", "50%", "50%"],
        y: ["-10%", "-10%", "100%", "100%", "-10%", "40%", "50%", "50%"],
        rotate: [0, 90, 180, 270, 360, 480, 600, 720],
        scale: [1, 1, 1, 1, 1, 0.8, 0.4, 0],
      }}
      transition={{
        duration: 3.6,
        times: [0, 0.08, 0.32, 0.56, 0.72, 0.84, 0.94, 1],
        ease: "easeInOut",
      }}
      className="pointer-events-none absolute left-0 top-0 z-30"
      style={{ width: size, height: size }}
    >
      <BugIcon size={size} color={color} />
    </motion.div>
  )
}
