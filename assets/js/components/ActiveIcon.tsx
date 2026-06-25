import { CircleCheckIcon, CircleXIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Compact active-status indicator for dense views like tables: a green check
 * circle when active, a red x circle when inactive. Labelled for accessibility
 * since it conveys status by colour/icon alone.
 */
export function ActiveIcon({
  active,
  className,
}: {
  active: boolean
  className?: string
}) {
  const Icon = active ? CircleCheckIcon : CircleXIcon
  const label = active ? "Active" : "Inactive"

  return (
    <Icon
      role="img"
      aria-label={label}
      className={cn(
        "size-4",
        active ? "text-green-600" : "text-destructive",
        className,
      )}
    />
  )
}
