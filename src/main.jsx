import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.jsx"
import { AuthProvider } from "./context/AuthContext.jsx"
import { CallProvider } from "./context/CallContext.jsx"
import "./index.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <CallProvider>
        <App />
      </CallProvider>
    </AuthProvider>
  </StrictMode>
)
