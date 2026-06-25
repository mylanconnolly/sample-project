import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

export type MarkdownVariant = "default" | "purple"

/**
 * Per-variant prose styling. `default` follows the neutral theme (inverting in
 * dark mode); `purple` retints the Tailwind Typography colour variables to a
 * soft violet for both light and dark, so accent elements (links, headings,
 * bullets, code) and body text read as a gentle purple rather than grey.
 */
const VARIANT_PROSE: Record<MarkdownVariant, string> = {
  default: "dark:prose-invert",
  purple: cn(
    "[--tw-prose-body:var(--color-violet-800)]",
    "[--tw-prose-headings:var(--color-violet-900)]",
    "[--tw-prose-bold:var(--color-violet-900)]",
    "[--tw-prose-links:var(--color-violet-700)]",
    "[--tw-prose-bullets:var(--color-violet-400)]",
    "[--tw-prose-counters:var(--color-violet-500)]",
    "[--tw-prose-quotes:var(--color-violet-800)]",
    "[--tw-prose-quote-borders:var(--color-violet-200)]",
    "[--tw-prose-code:var(--color-violet-900)]",
    "[--tw-prose-hr:var(--color-violet-200)]",
    "dark:[--tw-prose-body:var(--color-violet-200)]",
    "dark:[--tw-prose-headings:var(--color-violet-50)]",
    "dark:[--tw-prose-bold:var(--color-violet-100)]",
    "dark:[--tw-prose-links:var(--color-violet-300)]",
    "dark:[--tw-prose-bullets:var(--color-violet-500)]",
    "dark:[--tw-prose-counters:var(--color-violet-400)]",
    "dark:[--tw-prose-quotes:var(--color-violet-200)]",
    "dark:[--tw-prose-quote-borders:var(--color-violet-800)]",
    "dark:[--tw-prose-code:var(--color-violet-100)]",
    "dark:[--tw-prose-hr:var(--color-violet-900)]",
  ),
}

/**
 * Renders a Markdown string (GitHub-Flavored Markdown — tables, task lists,
 * strikethrough, autolinks) inside a Tailwind Typography `prose` container.
 * Used to display user-authored Markdown content (the `purple` variant tints
 * the prose).
 */
export function Markdown({
  children,
  className,
  variant = "default",
}: {
  children: string
  className?: string
  variant?: MarkdownVariant
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        VARIANT_PROSE[variant],
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
