import { AshError } from "@/lib/ashErrors"

/**
 * Build an `AshError` for components that take a server error as a prop (the
 * presentational form pattern). For RPC-driven tests use `fieldError()` from
 * `./rpc` instead, which returns a `/rpc/run` response.
 */
export const ashError = (field: string, message: string) =>
  new AshError([
    {
      type: "invalid",
      message,
      shortMessage: message,
      vars: {},
      fields: [field],
      path: [field],
    },
  ])

/**
 * Plain data factories for tests. Each takes a `Partial` of overrides and holds
 * only the fields the query field-lists actually select. Types mirror the
 * hand-written wrapper interfaces in `lib/ashRpc.ts` (NOT the `*ResourceSchema`
 * envelopes, which carry `__type`/`__primitiveFields` and won't assign).
 */

let seq = 0
const id = (prefix: string) => `${prefix}-${++seq}`

/** Reset the id counter between tests if you assert on generated ids. */
export const resetFixtureIds = () => {
  seq = 0
}

export interface UserRow {
  id: string
  email: string
  name: string | null
  role: "admin" | "user"
  active: boolean
}

export const user = (o: Partial<UserRow> = {}): UserRow => ({
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "user",
  active: true,
  ...o,
})

export interface ApiKeyRow {
  id: string
  name: string | null
  expiresAt: string
  insertedAt: string
  valid: boolean | null
}

export const apiKey = (o: Partial<ApiKeyRow> = {}): ApiKeyRow => ({
  id: id("key"),
  name: "CI deploy bot",
  expiresAt: "2027-01-01T00:00:00Z",
  insertedAt: "2026-06-01T00:00:00Z",
  valid: true,
  ...o,
})

export interface MemoryRow {
  id: string
  scope: "global" | "repository" | "user"
  repoKey: string | null
  content: string
  insertedAt: string
  updatedAt: string
  createdBy: { id: string; email: string; name: string | null } | null
}

export const memory = (o: Partial<MemoryRow> = {}): MemoryRow => ({
  id: id("memory"),
  scope: "global",
  repoKey: null,
  content: "Deploys run from the `main` branch via the Deploy workflow.",
  insertedAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
  createdBy: { id: "user-1", email: "owner@example.com", name: "Owner" },
  ...o,
})
