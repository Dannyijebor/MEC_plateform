import { motion } from "framer-motion"

function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const variants = {
    primary:
      "bg-white text-black hover:bg-white/90",
    secondary:
      "border border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08]",
    ghost:
      "text-white/50 hover:bg-white/[0.06] hover:text-white",
    danger:
      "border border-red-400/10 bg-red-400/[0.06] text-red-300 hover:bg-red-400/[0.1]",
  }

  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`rounded-xl font-medium transition ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export default Button
