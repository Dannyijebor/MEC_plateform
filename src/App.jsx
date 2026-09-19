import { BrowserRouter, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import Fireflies from "./components/effects/Fireflies"
import Navbar from "./components/layout/Navbar"
import Sidebar from "./components/layout/Sidebar"
import MobileNav from "./components/layout/MobileNav"
import PageContainer from "./components/layout/PageContainer"
import AppRoutes from "./routes/AppRoutes"
import PageTransition from "./components/layout/PageTransition"
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
              <PageTransition key={location.pathname}>
                <AppRoutes />
              </PageTransition>
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
