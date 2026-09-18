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
