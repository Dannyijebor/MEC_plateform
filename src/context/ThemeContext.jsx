import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light"
    return localStorage.getItem("mec-theme") || "light"
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
      document.body.classList.add("dark")
    } else {
      root.classList.remove("dark")
      document.body.classList.remove("dark")
    }
    localStorage.setItem("mec-theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
