import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/lib/theme"
import { Switch } from "@/components/ui/switch"

/**
 * Sliding light/dark toggle, flanked by sun and moon icons. Reflects the
 * resolved appearance (so it tracks the OS while the preference is `system`)
 * and writes an explicit `light`/`dark` choice when toggled.
 */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div className="flex items-center gap-2">
      <Sun className="size-3.5 text-muted-foreground" aria-hidden />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      />
      <Moon className="size-3.5 text-muted-foreground" aria-hidden />
    </div>
  )
}
