import { Fragment } from "react"
import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

export type Crumb = {
  label: string
  /** When set, the segment renders as a link; otherwise it is plain text. */
  to?: string
  /** Route params for `to` when it points at a dynamic route. */
  params?: Record<string, string>
}

/**
 * Monospace `// admin / users` breadcrumb trail used in the admin section.
 * Segments with a `to` are navigable; the last segment is typically the
 * current section and rendered as plain text.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[]
  className?: string
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 font-mono text-xs tracking-tight text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden>//</span>
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <span aria-hidden>/</span>}
          {item.to ? (
            <Link
              to={item.to}
              params={item.params}
              className="max-w-[12rem] truncate transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
