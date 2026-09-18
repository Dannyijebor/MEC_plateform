import { motion } from "framer-motion"

export default function Butterfly({ color1 = "#8b5cf6", color2 = "#a78bfa", bodyColor = "#1e1b4b", className = "" }) {
  return (
    <motion.svg
      viewBox="0 0 40 40"
      className={`h-7 w-7 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left wings — pivot at right edge (near body) */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "right center" }}
        animate={{ scaleX: [1, 0.5, 1] }}
        transition={{ duration: 0.32, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="13" cy="14" rx="8" ry="9" transform="rotate(-30 13 14)" fill={color1} fillOpacity="0.9" />
        <ellipse cx="14" cy="24" rx="6" ry="6" transform="rotate(25 14 24)" fill={color2} fillOpacity="0.9" />
      </motion.g>

      {/* Right wings — pivot at left edge (near body) */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "left center" }}
        animate={{ scaleX: [1, 0.5, 1] }}
        transition={{ duration: 0.32, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="27" cy="14" rx="8" ry="9" transform="rotate(30 27 14)" fill={color1} fillOpacity="0.9" />
        <ellipse cx="26" cy="24" rx="6" ry="6" transform="rotate(-25 26 24)" fill={color2} fillOpacity="0.9" />
      </motion.g>

      {/* Body */}
      <ellipse cx="20" cy="20" rx="1.3" ry="7" fill={bodyColor} />

      {/* Antennae */}
      <path d="M 19.3 14 Q 17 9 14.5 7" stroke={bodyColor} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <path d="M 20.7 14 Q 23 9 25.5 7" stroke={bodyColor} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <circle cx="14.5" cy="7" r="0.9" fill={bodyColor} />
      <circle cx="25.5" cy="7" r="0.9" fill={bodyColor} />
    </motion.svg>
  )
}
