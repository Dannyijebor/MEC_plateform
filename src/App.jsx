import { BrowserRouter } from "react-router-dom"
import Fireflies from "./components/effects/Fireflies"
import Navbar from "./components/layout/Navbar"
import Sidebar from "./components/layout/Sidebar"
import MobileNav from "./components/layout/MobileNav"
import PageContainer from "./components/layout/PageContainer"
import AppRoutes from "./routes/AppRoutes"
import FloatingCallWidget from "./components/chat/FloatingCallWidget"
import { PresenceProvider } from "./context/PresenceContext"

function App() {
  return (
    <BrowserRouter>
      <PresenceProvider>
        <div className="min-h-screen overflow-x-hidden bg-[#faf8f3] text-[#202635]">
          <Fireflies />

          <div className="relative z-10">
            <Sidebar />
            <Navbar />

            <PageContainer>
              <AppRoutes />
            </PageContainer>

            <MobileNav />
          </div>

          <FloatingCallWidget />
        </div>
      </PresenceProvider>
    </BrowserRouter>
  )
}

export default App
