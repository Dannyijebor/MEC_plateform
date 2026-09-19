import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"

export default function Welcome() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [checking, setChecking] = useState(true)
  const [countdown, setCountdown] = useState(3)

  // Wait for Supabase to exchange the confirmation token
  useEffect(() => {
    let cancelled = false
    let timer = null

    async function wait() {
      // Give Supabase a moment to process the hash fragment
      await new Promise((r) => setTimeout(r, 600))
      if (!cancelled) setChecking(false)
    }

    wait()
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [])

  // Auto-redirect after countdown
  useEffect(() => {
    if (checking) return
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          if (user) navigate("/app", { replace: true })
          else navigate("/login", { replace: true })
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [checking, user, navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md text-center"
      >
        {checking ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
              <Loader2 size={32} className="animate-spin text-[#3B82F6]" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Confirming your email...
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              One moment while we verify your account.
            </p>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#EFF6FF]"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.3 }}
              >
                <CheckCircle2 size={48} className="text-[#3B82F6]" strokeWidth={2.5} />
              </motion.div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-7 text-[26px] font-bold tracking-tight text-gray-900"
            >
              You're in 💙
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="mt-3 text-[15px] leading-6 text-gray-500"
            >
              Your email is confirmed. Welcome to the Eselebor Ijebor Clan on MEC.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="mt-8 space-y-3"
            >
              <button
                onClick={() =>
                  navigate(user ? "/app" : "/login", { replace: true })
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#2563EB]"
              >
                {user ? "Enter the platform" : "Go to login"}
                <ArrowRight size={16} />
              </button>

              <p className="text-xs text-gray-400">
                Auto-redirecting in {countdown}s
              </p>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  )
}
