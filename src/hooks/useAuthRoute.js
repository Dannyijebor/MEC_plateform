import { useLocation } from "react-router-dom"

const AUTH_PATHS = ["/login", "/register", "/auth"]

export function useAuthRoute() {
  const location = useLocation()
  return AUTH_PATHS.includes(location.pathname)
}
