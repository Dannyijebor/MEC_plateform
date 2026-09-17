import { createContext, useContext } from "react"
import { usePresence } from "../hooks/usePresence"
import { useAuth } from "../hooks/useAuth"

const PresenceContext = createContext(new Set())

export function PresenceProvider({ children }) {
  const { user } = useAuth()
  const onlineUsers = usePresence(user)
  return (
    <PresenceContext.Provider value={onlineUsers}>
      {children}
    </PresenceContext.Provider>
  )
}

export function useOnlineUsers() {
  return useContext(PresenceContext)
}
