import * as React from "react"

import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

/** Props handed to the lazily-loaded MDXEditor implementation. */
export interface MarkdownEditorImplProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  compact?: boolean
  autoFocus?: boolean
  /** Whether the app is in dark mode; toggles MDXEditor's `dark-theme` palette. */
  dark?: boolean
}

export interface MarkdownEditorProps {
  value: string
  onChange: (markdown: string) => void
  /** Fired when focus leaves the editor — wired to TanStack Form's `handleBlur`. */
  onBlur?: () => void
  placeholder?: string
  id?: string
  ariaInvalid?: boolean
  ariaLabel?: string
  /** Trimmed toolbar and smaller min-height; used for the inline comment box. */
  compact?: boolean
  autoFocus?: boolean
  className?: string
}

// MDXEditor (Lexical + CodeMirror) is heavy, so it lives in its own chunk and is
// only fetched when an editor actually mounts.
const MarkdownEditorImpl = React.lazy(() => import("./markdown-editor-impl"))

/** Border/ring chrome mirroring `ui/textarea.tsx` so the editor matches inputs. */
const chrome = cn(
  "w-full overflow-hidden rounded-lg border border-input bg-transparent text-sm transition-colors",
  "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  "dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
)

/**
 * A GitHub-style WYSIWYG markdown editor. Reads and writes GitHub-Flavored
 * Markdown strings, so it drops straight into any markdown-backed field and
 * TanStack Form bindings.
 */
export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  id,
  ariaInvalid,
  ariaLabel,
  compact,
  autoFocus,
  className,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme()

  return (
    <div
      id={id}
      role="group"
      data-slot="markdown-editor"
      onBlur={onBlur}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid || undefined}
      className={cn(chrome, className)}
    >
      <React.Suspense
        fallback={
          <div className={cn("animate-pulse", compact ? "h-24" : "h-48")} />
        }
      >
        <MarkdownEditorImpl
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          compact={compact}
          autoFocus={autoFocus}
          dark={resolvedTheme === "dark"}
        />
      </React.Suspense>
    </div>
  )
}
