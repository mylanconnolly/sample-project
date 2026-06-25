import { describe, it, expect } from "vitest"
import { server } from "./setup"
import { rpc, ok, keysetPage, spyRpc } from "./rpc"
import { memory } from "./fixtures"
import {
  listMemoriesInfiniteQueryOptions,
  searchMemoriesQueryOptions,
} from "@/lib/ashRpc"
import { Route } from "@/routes/app/admin/memories/index"

// The route's `validateSearch` is a pure normalizer for the URL query string.
const validate = Route.options.validateSearch as (
  s: Record<string, unknown>,
) => { q?: string; scope?: string; sort?: string }

describe("memories list validateSearch", () => {
  it("trims the content search and drops blank/invalid facets", () => {
    expect(
      validate({ q: "  deploy  ", scope: "user", sort: "-insertedAt" }),
    ).toEqual({ q: "deploy", scope: "user", sort: "-insertedAt" })
    expect(validate({ q: "   ", scope: "bogus", sort: "nope" })).toEqual({
      q: undefined,
      scope: undefined,
      sort: undefined,
    })
  })
})

describe("listMemoriesInfiniteQueryOptions", () => {
  it("sends the search, scope, and a deterministic sort with id tiebreaker", async () => {
    const list = spyRpc("list_memories", () => keysetPage([memory()]))
    server.use(rpc({ list_memories: list.handler }))

    const opts = listMemoriesInfiniteQueryOptions({
      search: "  token  ",
      scope: "repository",
      sort: "scope",
    })
    await opts.queryFn!({ pageParam: undefined } as never)

    expect(list.calls).toHaveLength(1)
    expect(list.calls[0].input).toEqual({
      search: "token",
      scope: "repository",
    })
    expect(list.calls[0].sort).toBe("scope,id")
    expect(list.calls[0].page).toMatchObject({ limit: 25 })
  })

  it("omits the input entirely when there are no facets", async () => {
    const list = spyRpc("list_memories", () => keysetPage([]))
    server.use(rpc({ list_memories: list.handler }))

    const opts = listMemoriesInfiniteQueryOptions({})
    await opts.queryFn!({ pageParam: undefined } as never)

    expect(list.calls[0].input).toBeUndefined()
    expect(list.calls[0].sort).toBe("-insertedAt,id")
  })
})

describe("searchMemoriesQueryOptions", () => {
  it("is disabled until there is a query", () => {
    expect(searchMemoriesQueryOptions({ query: "   " }).enabled).toBe(false)
    expect(searchMemoriesQueryOptions({ query: "deploy" }).enabled).toBe(true)
  })

  it("sends the trimmed query and optional scope to the RPC", async () => {
    // search_memories returns a bare list (not a keyset page).
    const search = spyRpc("search_memories", () => ok([memory()]))
    server.use(rpc({ search_memories: search.handler }))

    const opts = searchMemoriesQueryOptions({
      query: "  deploy token  ",
      scope: "global",
    })
    await opts.queryFn!({} as never)

    expect(search.calls[0].input).toEqual({
      query: "deploy token",
      scope: "global",
    })
  })
})
