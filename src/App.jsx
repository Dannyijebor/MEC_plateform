import { BrowserRouter, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import NetworkField from "./components/effects/NetworkField"
import Fireflies from "./components/effects/Fireflies"
import AuroraRibbons from "./components/effects/AuroraRibbons"
import LiquidMetaballs from "./components/effects/LiquidMetaballs"
import CursorDust from "./components/effects/CursorDust"
import { EffectProvider, useBgEffect } from "./context/EffectContext"
import Navbar from "./components/layout/Navbar"
import Sidebar from "./components/layout/Sidebar"
import MobileNav from "./components/layout/MobileNav"
import PageContainer from "./components/layout/PageContainer"
import AppRoutes from "./routes/AppRoutes"
import { usePushNotifications } from "./hooks/usePushNotifications"
import { useAuth } from "./hooks/useAuth"
import FloatingCallWidget from "./components/chat/FloatingCallWidget"
import AIBubble from "./components/ai/AIBubble"
import { PresenceProvider } from "./context/PresenceContext"

function AppContent() {
  const { user } = useAuth()
  const location = useLocation()
  const { effect } = useBgEffect()
  usePushNotifications(user?.id)

  return (
    <PresenceProvider>
      <div className="min-h-screen overflow-x-hidden bg-[#faf8f3] text-[#202635]">
        {!["/login", "/register", "/welcome"].includes(location.pathname) && (
          <>
            {effect === "network" && <NetworkField />}
            {effect === "butterflies" && <Fireflies />}
            {effect === "aurora" && <AuroraRibbons />}
            {effect === "metaballs" && <LiquidMetaballs />}
            {effect === "dust" && <CursorDust />}
          </>
        )}

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
        {(location.pathname === "/" || location.pathname === "/community") && <AIBubble />}
      </div>
    </PresenceProvider>
  )
}

function App() {
  return (
    <EffectProvider>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
    </EffectProvider>
  )
}

export default App
