import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import { DownloadIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { ActionTypeBadge } from "@/components/ActionTypeBadge"
import { formatDateTime } from "@/lib/format"
import {
  listAccessLogsInfiniteQueryOptions,
  type AccessLogActionType,
  type AccessLogResourceType,
  type ListAccessLogsParams,
} from "@/lib/ashRpc"

const ALL = "all"

const ACTION_TYPES: AccessLogActionType[] = [
  "read",
  "create",
  "update",
  "destroy",
]

const RESOURCE_TYPES: { value: AccessLogResourceType; label: string }[] = [
  { value: "memory", label: "Memory" },
  { value: "user", label: "User" },
]

const RESOURCE_LABEL: Record<string, string> = Object.fromEntries(
  RESOURCE_TYPES.map((r) => [r.value, r.label]),
)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type AccessLogSearch = {
  q?: string
  actionType?: AccessLogActionType
  resourceType?: AccessLogResourceType
  actorId?: string
  recordId?: string
  projectId?: string
  pageViewId?: string
  from?: string
  to?: string
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export const Route = createFileRoute("/app/admin/access-log/")({
  validateSearch: (search: Record<string, unknown>): AccessLogSearch => ({
    q: asString(search.q),
    actionType: ACTION_TYPES.includes(search.actionType as AccessLogActionType)
      ? (search.actionType as AccessLogActionType)
      : undefined,
    resourceType: RESOURCE_TYPES.some((r) => r.value === search.resourceType)
      ? (search.resourceType as AccessLogResourceType)
      : undefined,
    actorId: asString(search.actorId),
    recordId: asString(search.recordId),
    projectId: asString(search.projectId),
    pageViewId: asString(search.pageViewId),
    from: DATE_RE.test(String(search.from))
      ? (search.from as string)
      : undefined,
    to: DATE_RE.test(String(search.to)) ? (search.to as string) : undefined,
  }),
  component: AccessLog,
})

function AccessLog() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const {
    q,
    actionType,
    resourceType,
    actorId,
    recordId,
    projectId,
    pageViewId,
    from,
    to,
  } = search

  const params: ListAccessLogsParams = {
    actorEmail: q,
    actionType,
    resourceType,
    actorId,
    recordId,
    projectId,
    pageViewId,
    from,
    to,
  }

  const [emailSearch, setEmailSearch] = useState(q ?? "")
  useEffect(() => {
    const id = setTimeout(() => {
      const next = emailSearch.trim() || undefined
      if (next !== q)
        navigate({ search: (prev) => ({ ...prev, q: next }), replace: true })
    }, 300)
    return () => clearTimeout(id)
  }, [emailSearch, q, navigate])

  const query = useInfiniteQuery(listAccessLogsInfiniteQueryOptions(params))
  const logs = query.data?.pages.flatMap((page) => page.results) ?? []
  const groups = groupByPageLoad(logs)

  const set = (patch: Partial<AccessLogSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const idFacets = [
    actorId && { key: "actorId" as const, label: "actor", value: actorId },
    recordId && { key: "recordId" as const, label: "record", value: recordId },
    projectId && {
      key: "projectId" as const,
      label: "project",
      value: projectId,
    },
    pageViewId && {
      key: "pageViewId" as const,
      label: "page load",
      value: pageViewId,
    },
  ].filter(Boolean) as {
    key: keyof AccessLogSearch
    label: string
    value: string
  }[]

  const hasFilters =
    !!q ||
    !!actionType ||
    !!resourceType ||
    !!from ||
    !!to ||
    idFacets.length > 0

  const exportHref = `/app/admin/access-log/export?${buildQuery(search)}`

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Breadcrumbs items={[{ label: "admin", to: "/app/admin" }]} />
      <div className="mt-1 mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Access log
        </h1>
        <Button render={<a href={exportHref} />} variant="outline">
          <DownloadIcon data-icon="inline-start" />
          Export CSV
        </Button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ListFilterIcon className="size-4 shrink-0 text-muted-foreground" />

        <div className="relative w-56">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by actor email…"
            className="pl-8"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
          />
        </div>

        <Select
          items={[
            { value: ALL, label: "Any action" },
            ...ACTION_TYPES.map((a) => ({ value: a, label: a })),
          ]}
          value={actionType ?? ALL}
          onValueChange={(value) =>
            set({
              actionType:
                value === ALL ? undefined : (value as AccessLogActionType),
            })
          }
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Any action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any action</SelectItem>
            {ACTION_TYPES.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[{ value: ALL, label: "Any resource" }, ...RESOURCE_TYPES]}
          value={resourceType ?? ALL}
          onValueChange={(value) =>
            set({
              resourceType:
                value === ALL ? undefined : (value as AccessLogResourceType),
            })
          }
        >
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="Any resource" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any resource</SelectItem>
            {RESOURCE_TYPES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          aria-label="From date"
          className="w-40"
          value={from ?? ""}
          onChange={(e) => set({ from: e.target.value || undefined })}
        />
        <span className="text-sm text-muted-foreground">–</span>
        <Input
          type="date"
          aria-label="To date"
          className="w-40"
          value={to ?? ""}
          onChange={(e) => set({ to: e.target.value || undefined })}
        />

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate({
                search: {},
                replace: true,
              })
            }
          >
            <XIcon data-icon="inline-start" />
            Clear
          </Button>
        ) : null}
      </div>

      {/* Active deep-link facets (from "view access history" links) */}
      {idFacets.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {idFacets.map((facet) => (
            <button
              key={facet.key}
              type="button"
              onClick={() => set({ [facet.key]: undefined })}
              className="inline-flex items-center gap-1 rounded-full border border-foreground/10 bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {facet.label}:{" "}
              <span className="font-mono">{facet.value.slice(0, 8)}</span>
              <XIcon className="size-3" />
            </button>
          ))}
        </div>
      ) : null}

      {query.isPending ? (
        <div className="flex h-24 items-center justify-center rounded-xl border border-foreground/10 bg-card ring-1 ring-foreground/5">
          <Spinner className="size-5" />
        </div>
      ) : query.isError ? (
        <div className="flex h-24 items-center justify-center rounded-xl border border-foreground/10 bg-card text-muted-foreground ring-1 ring-foreground/5">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load the access log."}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-xl border border-foreground/10 bg-card text-muted-foreground ring-1 ring-foreground/5">
          No access events found.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <PageLoadCard key={group.key} group={group} />
          ))}
        </div>
      )}

      {query.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? (
              <>
                <Spinner data-icon="inline-start" />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

// --- Grouping by page load ---------------------------------------------------

type AccessLogRow = {
  id: string
  occurredAt: string
  actionType: AccessLogActionType
  resourceType: string
  recordId: string | null
  actorEmail: string | null
  ipAddress: string | null
  requestPath: string | null
  requestId: string | null
  pageViewId: string | null
}

type RecordAccess = {
  logId: string
  resourceType: string
  recordId: string | null
  actionType: AccessLogActionType
  count: number
}

type PageLoadGroup = {
  key: string
  occurredAt: string
  actorEmail: string | null
  requestPath: string | null
  ipAddress: string | null
  records: RecordAccess[]
}

/**
 * Collapse the flat, newest-first rows into one group per page load (keyed by
 * page_view_id, falling back to request_id / id for non-page access), and within
 * each group one row per distinct record+action (with a hit count). Groups stay in
 * descending time order — first occurrence in the newest-first list. Exported for
 * unit testing.
 */
export function groupByPageLoad(logs: AccessLogRow[]): PageLoadGroup[] {
  const groups: PageLoadGroup[] = []
  const byKey = new Map<string, PageLoadGroup>()
  const recordsByKey = new Map<string, Map<string, RecordAccess>>()

  for (const log of logs) {
    const key = log.pageViewId ?? log.requestId ?? log.id
    let group = byKey.get(key)
    if (!group) {
      group = {
        key,
        occurredAt: log.occurredAt,
        actorEmail: log.actorEmail,
        requestPath: log.requestPath,
        ipAddress: log.ipAddress,
        records: [],
      }
      byKey.set(key, group)
      recordsByKey.set(key, new Map())
      groups.push(group)
    }

    const records = recordsByKey.get(key)!
    const recordKey = `${log.resourceType}|${log.recordId ?? ""}|${log.actionType}`
    const existing = records.get(recordKey)
    if (existing) {
      existing.count += 1
    } else {
      const record: RecordAccess = {
        logId: log.id,
        resourceType: log.resourceType,
        recordId: log.recordId,
        actionType: log.actionType,
        count: 1,
      }
      records.set(recordKey, record)
      group.records.push(record)
    }
  }

  return groups
}

function PageLoadCard({ group }: { group: PageLoadGroup }) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10 bg-card ring-1 ring-foreground/5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-foreground/5 bg-muted/30 px-4 py-2.5 text-sm">
        <span className="font-medium whitespace-nowrap">
          {formatDateTime(group.occurredAt)}
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          {group.actorEmail ?? (
            <span className="text-muted-foreground">system</span>
          )}
        </span>
        {group.requestPath ? (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs text-muted-foreground">
              {group.requestPath}
            </span>
          </>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {group.ipAddress ? `${group.ipAddress} · ` : ""}
          {group.records.length} record{group.records.length === 1 ? "" : "s"}
        </span>
      </div>
      <Table>
        <TableBody>
          {group.records.map((record) => (
            <TableRow key={record.logId}>
              <TableCell className="w-28">
                <ActionTypeBadge actionType={record.actionType} />
              </TableCell>
              <TableCell>
                <Link
                  to="/app/admin/access-log/$logId"
                  params={{ logId: record.logId }}
                  className="hover:underline"
                >
                  {RESOURCE_LABEL[record.resourceType] ?? record.resourceType}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {record.recordId ? record.recordId.slice(0, 8) : "—"}
              </TableCell>
              <TableCell className="w-16 text-right text-xs text-muted-foreground">
                {record.count > 1 ? `×${record.count}` : ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Build the export query string from the current (validated) search state.
// Exported for unit testing.
export function buildQuery(search: AccessLogSearch): string {
  const sp = new URLSearchParams()
  if (search.q) sp.set("q", search.q)
  if (search.actionType) sp.set("actionType", search.actionType)
  if (search.resourceType) sp.set("resourceType", search.resourceType)
  if (search.actorId) sp.set("actorId", search.actorId)
  if (search.recordId) sp.set("recordId", search.recordId)
  if (search.projectId) sp.set("projectId", search.projectId)
  if (search.pageViewId) sp.set("pageViewId", search.pageViewId)
  if (search.from) sp.set("from", search.from)
  if (search.to) sp.set("to", search.to)
  return sp.toString()
}
