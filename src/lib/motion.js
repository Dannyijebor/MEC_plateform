// Shared motion presets for consistent premium animations across MEC

export const EASE_CALM = [0.32, 0.72, 0, 1]
export const EASE_SOFT = [0.22, 1, 0.36, 1]

// Page / step slide
export const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
}

// Fade up (lists, cards)
export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.4,
      ease: EASE_CALM,
    },
  }),
}

// Fade in (sheets, banners)
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: EASE_CALM } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

// Bottom sheet slide-up
export const sheetUp = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 340, damping: 32, mass: 0.9 },
  },
  exit: {
    y: "100%",
    transition: { type: "spring", stiffness: 340, damping: 34 },
  },
}

// Modal scale in
export const modalScale = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.18 },
  },
}

// Backdrop
export const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

// Card hover lift
export const cardHover = {
  rest: { y: 0 },
  hover: { y: -2, transition: { duration: 0.25, ease: EASE_CALM } },
}

// Button press
export const tapScale = { whileTap: { scale: 0.97 } }

// Stagger container
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

export const staggerChild = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_CALM },
  },
}
