import { http, HttpResponse } from "msw"

/**
 * Helpers for stubbing ash_typescript RPC. Every RPC call hits a single
 * `POST /rpc/run` whose body carries `{ action, input, fields, ... }` and which
 * answers `{ success: true, data }` or `{ success: false, errors }`. These
 * builders + the `rpc()` dispatcher remove the per-test boilerplate the older
 * tests duplicated.
 */

/** The parsed `/rpc/run` request body. Only the fields tests commonly read. */
export interface RpcBody {
  action: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input?: any
  fields?: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: any
  sort?: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page?: any
  identity?: string
  metadataFields?: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any
}

export interface AshErrorLike {
  type?: string
  message: string
  shortMessage?: string
  fields?: string[]
  path?: string[]
}

function fillError(e: AshErrorLike) {
  return {
    type: e.type ?? "invalid",
    message: e.message,
    shortMessage: e.shortMessage ?? e.message,
    fields: e.fields ?? [],
    path: e.path ?? [],
  }
}

/** A successful RPC response carrying `data`. */
export const ok = (data: unknown, metadata?: unknown) =>
  HttpResponse.json(
    metadata === undefined
      ? { success: true, data }
      : { success: true, data, metadata },
  )

/** A failed RPC response carrying one or more Ash errors. */
export const errors = (errs: AshErrorLike[]) =>
  HttpResponse.json({ success: false, errors: errs.map(fillError) })

/** Sugar for a single field-level validation error (drives `AshError.fieldErrors`). */
export const fieldError = (field: string, message: string) =>
  errors([{ type: "invalid", message, fields: [field], path: [field] }])

/**
 * The keyset-page envelope ash_typescript returns for countable reads — the
 * shape `unwrap()` hands to `*InfiniteQueryOptions` / the `my*` lists.
 */
export const keysetPage = (
  results: unknown[],
  opts: {
    count?: number
    hasMore?: boolean
    limit?: number
    after?: string | null
    before?: string | null
    nextPage?: string | null
    previousPage?: string | null
  } = {},
) =>
  ok({
    results,
    type: "keyset",
    limit: opts.limit ?? results.length,
    hasMore: opts.hasMore ?? false,
    after: opts.after ?? null,
    before: opts.before ?? null,
    nextPage: opts.nextPage ?? null,
    previousPage: opts.previousPage ?? null,
    count: opts.count ?? results.length,
  })

type Responder = (body: RpcBody) => Response | Promise<Response>

/**
 * Build a `POST /rpc/run` handler that dispatches on the action name. Pass a map
 * of `actionName -> responder`; unknown actions resolve to a structured
 * "Unhandled action" Ash error so a missing stub surfaces as the component's
 * error state (not an unhandled rejection). Override per-test with
 * `server.use(rpc({ ... }))`.
 */
export function rpc(
  handlers: Record<string, Responder>,
  opts: { onUnhandled?: Responder } = {},
) {
  return http.post("/rpc/run", async ({ request }) => {
    const body = (await request.json()) as RpcBody
    const handler = handlers[body.action]
    if (handler) return handler(body)
    if (opts.onUnhandled) return opts.onUnhandled(body)
    return errors([
      {
        type: "unknown",
        message: `Unhandled action: ${body.action}`,
        shortMessage: "Unhandled action",
      },
    ])
  })
}

/**
 * Like a single `rpc` entry, but records every call so tests can assert the
 * request `input`/`fields`. Returns `{ handler, calls }` — spread `handler` into
 * an `rpc({ action: handler })`.
 */
export function spyRpc(_action: string, responder: Responder) {
  const calls: RpcBody[] = []
  const handler: Responder = (body) => {
    calls.push(body)
    return responder(body)
  }
  return { handler, calls }
}
