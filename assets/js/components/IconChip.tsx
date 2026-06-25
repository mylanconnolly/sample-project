import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

/**
 * The standard "soft chip" icon treatment for section and feature cards: a
 * bordered, rounded square holding a neutral icon. Shared by the marketing
 * FeatureGrid and the in-app section directories so the icon language stays
 * consistent. Pass `className` to tweak the chip (e.g. its size).
 */
export function IconChip({
  icon: Icon,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <span
      className={cn(
        "grid size-9 place-items-center rounded-lg border border-foreground/10 bg-background text-foreground",
        className,
      )}
    >
      <Icon className="size-4.5" />
    </span>
  )
}
