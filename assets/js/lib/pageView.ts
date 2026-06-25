/**
 * A per-page-load correlation id, sent on every RPC (see `rpcHeaders` in
 * lib/ashRpc) as `x-page-view-id` and recorded on each access-log row. It lets the
 * admin access log group all reads triggered by one navigation, so you can see why
 * a set of records was viewed together.
 *
 * A fresh id is minted on each navigation to a new path (see the router
 * subscription in index.tsx); search-param changes (filtering, sorting) keep the
 * same id, since they're the same page load.
 */
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

let current = uuid()

/** The current page-load id. */
export function pageViewId(): string {
  return current
}

/** Mint a new page-load id (call on navigation to a new path). */
export function newPageView(): void {
  current = uuid()
}
