import type { AshRpcError } from "../ash_types"

/**
 * Wraps the `errors` array returned by an unsuccessful ash_typescript RPC call
 * so it can be thrown (and surfaced through Tanstack Query's error states).
 */
export class AshError extends Error {
  readonly errors: AshRpcError[]

  constructor(errors: AshRpcError[]) {
    super(errors[0]?.message ?? "Request failed")
    this.name = "AshError"
    this.errors = errors
  }

  /** Field-level validation messages keyed by field name (for forms). */
  get fieldErrors(): Record<string, string[]> {
    const map: Record<string, string[]> = {}
    for (const e of this.errors) {
      for (const field of e.fields ?? []) {
        ;(map[field] ??= []).push(e.shortMessage ?? e.message)
      }
    }
    return map
  }
}

/** True when the error is an Ash `forbidden` (policy) failure. */
export function isForbidden(error: unknown): boolean {
  return (
    error instanceof AshError &&
    error.errors.some((e) => e.type === "forbidden")
  )
}

/** Narrow an RPC result, throwing `AshError` on failure so Query treats it as an error. */
export function unwrap<T>(
  result:
    | { success: true; data: T }
    | { success: false; errors: AshRpcError[] },
): T {
  if (!result.success) throw new AshError(result.errors)
  return result.data
}
