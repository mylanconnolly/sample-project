import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { formatDate } from "@/lib/format"
import {
  listMemoriesInfiniteQueryOptions,
  MEMORY_SCOPE_OPTIONS,
  type MemoryScope,
  type MemorySort,
} from "@/lib/ashRpc"
import { cn } from "@/lib/utils"

const SORTABLE_COLUMNS = ["scope", "repoKey", "insertedAt"] as const
type SortColumn = (typeof SORTABLE_COLUMNS)[number]

const DEFAULT_SORT: MemorySort = "-insertedAt"

const ALLOWED_SORTS: readonly string[] = SORTABLE_COLUMNS.flatMap((c) => [
  c,
  `-${c}`,
])

const SCOPE_VALUES: readonly string[] = MEMORY_SCOPE_OPTIONS.map((o) => o.value)
const SCOPE_LABEL: Record<MemoryScope, string> = {
  global: "Global",
  repository: "Repository",
  user: "User",
}

/**
 * Search/scope/sort live in the URL query string so listings are shareable. `q` =
 * content search, `scope` = scope filter, `sort` = active sort column (with an
 * optional `-` prefix for descending).
 */
type MemoriesSearch = { q?: string; scope?: MemoryScope; sort?: MemorySort }

export const Route = createFileRoute("/app/admin/memories/")({
  validateSearch: (search: Record<string, unknown>): MemoriesSearch => ({
    q:
      typeof search.q === "string" && search.q.trim()
        ? search.q.trim()
        : undefined,
    scope:
      typeof search.scope === "string" && SCOPE_VALUES.includes(search.scope)
        ? (search.scope as MemoryScope)
        : undefined,
    sort:
      typeof search.sort === "string" && ALLOWED_SORTS.includes(search.sort)
        ? (search.sort as MemorySort)
        : undefined,
  }),
  component: AdminMemories,
})

function AdminMemories() {
  const { q, scope, sort } = Route.useSearch()
  const navigate = Route.useNavigate()
  const sortValue = sort ?? DEFAULT_SORT

  // Local mirror of the search box for responsive typing; debounced into the URL.
  const [search, setSearch] = useState(q ?? "")

  useEffect(() => {
    const id = setTimeout(() => {
      const next = search.trim() || undefined
      if (next !== q)
        navigate({ search: (prev) => ({ ...prev, q: next }), replace: true })
    }, 300)
    return () => clearTimeout(id)
  }, [search, q, navigate])

  const query = useInfiniteQuery(
    listMemoriesInfiniteQueryOptions({ search: q, scope, sort: sortValue }),
  )

  const memories = query.data?.pages.flatMap((page) => page.results) ?? []

  const toggleSort = (column: SortColumn) => {
    const next: MemorySort = sortValue === column ? `-${column}` : column
    navigate({ search: (prev) => ({ ...prev, sort: next }), replace: true })
  }

  const setScope = (next: MemoryScope | "all") => {
    navigate({
      search: (prev) => ({ ...prev, scope: next === "all" ? undefined : next }),
      replace: true,
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumbs items={[{ label: "admin", to: "/app/admin" }]} />
      <div className="mt-1 mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Memories
        </h1>
        <Link to="/app/admin/memories/new" className={cn(buttonVariants({}))}>
          <PlusIcon data-icon="inline-start" />
          New memory
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search content…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={scope ?? "all"}
          onValueChange={(value) => setScope(value as MemoryScope | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value) =>
                value === "all"
                  ? "All scopes"
                  : SCOPE_LABEL[value as MemoryScope]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            {MEMORY_SCOPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-card ring-1 ring-foreground/5">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Scope"
                column="scope"
                sort={sortValue}
                onSort={toggleSort}
              />
              <TableHead>Content</TableHead>
              <SortableHead
                label="Repository"
                column="repoKey"
                sort={sortValue}
                onSort={toggleSort}
              />
              <TableHead>Owner</TableHead>
              <SortableHead
                label="Created"
                column="insertedAt"
                sort={sortValue}
                onSort={toggleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Spinner className="mx-auto size-5" />
                </TableCell>
              </TableRow>
            ) : query.isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {query.error instanceof Error
                    ? query.error.message
                    : "Failed to load memories."}
                </TableCell>
              </TableRow>
            ) : memories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No memories found.
                </TableCell>
              </TableRow>
            ) : (
              memories.map((memory) => (
                <TableRow key={memory.id}>
                  <TableCell>
                    <Badge variant="secondary">
                      {SCOPE_LABEL[memory.scope]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <Link
                      to="/app/admin/memories/$memoryId"
                      params={{ memoryId: memory.id }}
                      className="line-clamp-2 hover:underline"
                    >
                      {memory.content}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {memory.repoKey ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {memory.createdBy?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(memory.insertedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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

function SortableHead({
  label,
  column,
  sort,
  onSort,
}: {
  label: string
  column: SortColumn
  sort: MemorySort
  onSort: (column: SortColumn) => void
}) {
  const active = sort === column || sort === `-${column}`
  const descending = sort === `-${column}`

  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground"
      >
        {label}
        {!active ? (
          <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
        ) : descending ? (
          <ArrowDownIcon className="size-3.5" />
        ) : (
          <ArrowUpIcon className="size-3.5" />
        )}
      </button>
    </TableHead>
  )
}
