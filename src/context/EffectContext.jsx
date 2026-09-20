import { createContext, useContext, useState } from "react"

const EffectContext = createContext(null)

export const EFFECTS = [
  { key: "network",     name: "Constellation" },
  { key: "butterflies", name: "Butterflies & Snow" },
  { key: "aurora",      name: "Aurora Ribbons" },
  { key: "metaballs",   name: "Liquid Metaballs" },
  { key: "dust",        name: "Cursor Dust" },
  { key: "none",        name: "None" },
]

export function EffectProvider({ children }) {
  const [effect, setEffectState] = useState(() => {
    if (typeof window === "undefined") return "network"
    try { return localStorage.getItem("mec-bg-effect") || "network" } catch { return "network" }
  })

  const setEffect = (key) => {
    setEffectState(key)
    try { localStorage.setItem("mec-bg-effect", key) } catch {}
  }

  return (
    <EffectContext.Provider value={{ effect, setEffect, effects: EFFECTS }}>
      {children}
    </EffectContext.Provider>
  )
}

export function useBgEffect() {
  const ctx = useContext(EffectContext)
  if (!ctx) throw new Error("useBgEffect must be used within EffectProvider")
  return ctx
}
