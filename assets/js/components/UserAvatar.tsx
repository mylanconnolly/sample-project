import { cn } from "@/lib/utils"

/** Tailwind classes for the avatar background/foreground, chosen deterministically per user. */
const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
]

/** Derive up to two uppercase initials from a name, falling back to the email. */
function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

/** Stable index into the color palette so a given user always gets the same color. */
function colorIndex(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(hash) % AVATAR_COLORS.length
}

/** Renders a user's initials in a deterministically-colored circle. */
export function UserAvatar({
  name,
  email,
  className,
}: {
  name: string | null
  email: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full font-heading text-base font-semibold",
        AVATAR_COLORS[colorIndex(email)],
        className,
      )}
    >
      {initials(name, email)}
    </span>
  )
}
