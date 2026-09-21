import { useLocation } from "react-router-dom"

// Paths where the top navbar + hamburger should be hidden
const HIDE_PATHS = [
  "/messages",
  "/spaces",
  "/family-tree",
  "/events",
  "/committees",
  "/members",
  "/games/neon",
  "/games/clan-combat",
  "/games/mec-strike",
]

export function useHideTopChrome() {
  const location = useLocation()
  return HIDE_PATHS.includes(location.pathname)
}
