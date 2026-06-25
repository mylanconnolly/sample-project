/** Format an ISO/UTC datetime string as a locale date, falling back to the raw value. */
export function formatDate(value: string) {
  // Date-only values (`YYYY-MM-DD`) are parsed by `Date`
  // as UTC midnight, which renders a day early in timezones behind UTC. Build a
  // local date from the parts so the calendar day is preserved.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

/**
 * Format an ISO/UTC datetime string as a locale date+time without seconds,
 * falling back to the raw value.
 */
export function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
}

/**
 * Relative time like "2 hours ago" for recent timestamps, falling back to an
 * absolute date once something is older than ~30 days. Returns the raw value
 * when it can't be parsed. Pair with `formatDateTime` as a tooltip for the
 * exact time.
 */
export function formatRelativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
  const absSec = Math.abs(diffSec)
  const MINUTE = 60
  const HOUR = 60 * MINUTE
  const DAY = 24 * HOUR

  if (absSec < 45) return "just now"

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  if (absSec < HOUR) return rtf.format(Math.round(diffSec / MINUTE), "minute")
  if (absSec < DAY) return rtf.format(Math.round(diffSec / HOUR), "hour")
  if (absSec < 30 * DAY) return rtf.format(Math.round(diffSec / DAY), "day")
  return formatDate(value)
}

/** Format a byte count as a human-readable size (e.g. "1.4 MB"). */
export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 1024)
    return `${Math.max(0, Math.round(bytes))} B`
  const units = ["KB", "MB", "GB", "TB"]
  let size = bytes / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`
}

/**
 * True when a date-only string (`YYYY-MM-DD`) is the viewer's local today.
 * Both dates are formatted through `en-US` and compared, so the match is against
 * the local calendar day (not UTC).
 */
export function isDueToday(dateOnly: string | null | undefined) {
  if (!dateOnly) return false
  const [year, month, day] = dateOnly.split("-").map(Number)
  return (
    new Date(year, month - 1, day).toLocaleDateString("en-US") ===
    new Date().toLocaleDateString("en-US")
  )
}
