import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

function Modal({
  open,
  onClose,
  title,
  description,
  children,
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0b0b] shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-white/[0.06] p-5">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {title}
                </h2>

                {description && (
                  <p className="mt-1 text-xs leading-5 text-white/35">
                    {description}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Modal
