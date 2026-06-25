import * as React from "react"

/**
 * Theme handling for the SPA. The user can pick an explicit `light`/`dark`
 * preference or fall back to `system`, which follows the OS setting live.
 * The resolved appearance is reflected onto `<html>` via the `.dark` class
 * (see the `dark` custom variant in app.css). An inline script in the root
 * layout applies the same class before React mounts to avoid a flash.
 */
export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

// Keep this key in sync with the inline bootstrap script in spa_root.html.heex.
const STORAGE_KEY = "theme"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

const darkMediaQuery = "(prefers-color-scheme: dark)"

function prefersDark(): boolean {
  return window.matchMedia(darkMediaQuery).matches
}

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === "light" || value === "dark" || value === "system")
      return value
  } catch {
    // Ignore storage access errors (e.g. privacy mode) and fall back to system.
  }
  return "system"
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readStoredTheme)
  const [systemDark, setSystemDark] = React.useState<boolean>(prefersDark)

  // Track the OS preference so `system` reacts to it without a reload.
  React.useEffect(() => {
    const media = window.matchMedia(darkMediaQuery)
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme

  // Reflect the resolved appearance onto <html> whenever it changes.
  React.useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = React.useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore storage write failures; the in-memory state still applies.
    }
    setThemeState(next)
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
