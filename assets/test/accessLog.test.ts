import { describe, it, expect } from "vitest"
import { accessLogInput } from "@/lib/ashRpc"
import {
  buildQuery,
  groupByPageLoad,
} from "@/routes/app/admin/access-log/index"

function row(
  over: Partial<Parameters<typeof groupByPageLoad>[0][number]> = {},
) {
  return {
    id: "log-" + Math.random().toString(16).slice(2),
    occurredAt: "2026-06-20T10:00:00.000000Z",
    actionType: "read" as const,
    resourceType: "memory",
    recordId: "rec-1",
    actorEmail: "a@x.io",
    ipAddress: "127.0.0.1",
    requestPath: "/app/admin/memories",
    requestId: "req-1",
    pageViewId: "pv-1",
    ...over,
  }
}

describe("accessLogInput", () => {
  it("is empty when no facets are set (and ignores resourceType)", () => {
    expect(accessLogInput({})).toEqual({})
    // resourceType rides the generated `filter`, not the action input.
    expect(accessLogInput({ resourceType: "memory" })).toEqual({})
  })

  it("maps facets and expands day bounds to UTC datetimes", () => {
    expect(
      accessLogInput({
        actorEmail: "  alice  ",
        actionType: "read",
        actorId: "u-1",
        recordId: "r-1",
        projectId: "p-1",
        from: "2026-06-01",
        to: "2026-06-30",
      }),
    ).toEqual({
      actorEmail: "alice",
      actionType: "read",
      actorId: "u-1",
      recordId: "r-1",
      projectId: "p-1",
      from: "2026-06-01T00:00:00.000000Z",
      to: "2026-06-30T23:59:59.999999Z",
    })
  })

  it("drops a blank email search", () => {
    expect(accessLogInput({ actorEmail: "   " })).toEqual({})
  })
})

describe("groupByPageLoad", () => {
  it("groups by page load and collapses repeated record reads into a count", () => {
    const groups = groupByPageLoad([
      row({ recordId: "t-1" }),
      row({ recordId: "t-1" }), // same page load + record + action -> count 2
      row({ recordId: "a-1", resourceType: "attachment" }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe("pv-1")
    expect(groups[0].records).toHaveLength(2)
    const record = groups[0].records.find((r) => r.recordId === "t-1")
    expect(record?.count).toBe(2)
  })

  it("keeps separate page loads as separate groups, newest first", () => {
    const groups = groupByPageLoad([
      row({ pageViewId: "pv-new", occurredAt: "2026-06-20T12:00:00.000000Z" }),
      row({ pageViewId: "pv-old", occurredAt: "2026-06-20T09:00:00.000000Z" }),
    ])

    expect(groups.map((g) => g.key)).toEqual(["pv-new", "pv-old"])
  })

  it("merges non-contiguous rows that share a page load (across pagination)", () => {
    const groups = groupByPageLoad([
      row({ pageViewId: "pv-1", recordId: "t-1" }),
      row({ pageViewId: "pv-2", recordId: "t-2" }),
      row({ pageViewId: "pv-1", recordId: "t-3" }), // same load as the first
    ])

    expect(groups).toHaveLength(2)
    const first = groups.find((g) => g.key === "pv-1")
    expect(first?.records.map((r) => r.recordId).sort()).toEqual(["t-1", "t-3"])
  })

  it("falls back to request id / id when there is no page-view id", () => {
    const groups = groupByPageLoad([
      row({ pageViewId: null, requestId: "req-9", recordId: "t-1" }),
      row({ pageViewId: null, requestId: "req-9", recordId: "t-2" }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe("req-9")
  })
})

describe("buildQuery (CSV export href)", () => {
  it("serializes only the present facets", () => {
    expect(buildQuery({ resourceType: "memory", actionType: "read" })).toBe(
      "actionType=read&resourceType=memory",
    )
    expect(buildQuery({ q: "alice@x.io", recordId: "r-1" })).toBe(
      "q=alice%40x.io&recordId=r-1",
    )
    expect(buildQuery({})).toBe("")
  })
})
