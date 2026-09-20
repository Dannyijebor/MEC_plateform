import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.jsx"
import { AuthProvider } from "./context/AuthContext.jsx"
import { CallProvider } from "./context/CallContext.jsx"
import { ThemeProvider } from "./context/ThemeContext.jsx"
import "./index.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <CallProvider>
        <App />
        </CallProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
)

// Register the service worker as early as possible so the PWA is
// installable even from the login screen (before the user signs in).
// The push-subscription flow still waits for auth — this just boots the SW.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("Service worker registration failed:", err)
    })
  })
}
