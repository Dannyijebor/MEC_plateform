import { BrowserRouter, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import Fireflies from "./components/effects/Fireflies"
import Navbar from "./components/layout/Navbar"
import Sidebar from "./components/layout/Sidebar"
import MobileNav from "./components/layout/MobileNav"
import PageContainer from "./components/layout/PageContainer"
import AppRoutes from "./routes/AppRoutes"
import { usePushNotifications } from "./hooks/usePushNotifications"
import { useAuth } from "./hooks/useAuth"
import FloatingCallWidget from "./components/chat/FloatingCallWidget"
import { PresenceProvider } from "./context/PresenceContext"

function AppContent() {
  const { user } = useAuth()
  const location = useLocation()
  usePushNotifications(user?.id)

  return (
    <PresenceProvider>
      <div className="min-h-screen overflow-x-hidden bg-[#faf8f3] text-[#202635]">
        <Fireflies />

        <div className="relative z-10">
          <Sidebar />
          <Navbar />

          <PageContainer>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                style={{ minHeight: "100%" }}
              >
                <AppRoutes />
              </motion.div>
            </AnimatePresence>
          </PageContainer>

          <MobileNav />
        </div>

        <FloatingCallWidget />
      </div>
    </PresenceProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
