import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useInfiniteQuery } from "@tanstack/react-query"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  SearchIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { InviteUserDialog } from "@/components/InviteUserDialog"
import { RoleBadge } from "@/components/RoleBadge"
import { ActiveIcon } from "@/components/ActiveIcon"
import { formatDate } from "@/lib/format"
import { listUsersInfiniteQueryOptions, type UserSort } from "@/lib/ashRpc"

const SORTABLE_COLUMNS = [
  "email",
  "name",
  "role",
  "active",
  "insertedAt",
] as const
type SortColumn = (typeof SORTABLE_COLUMNS)[number]

const DEFAULT_SORT: UserSort = "-insertedAt"

const ALLOWED_SORTS: readonly string[] = SORTABLE_COLUMNS.flatMap((c) => [
  c,
  `-${c}`,
])

/**
 * Search/sort live in the URL query string so listings are shareable and
 * bookmarkable. `q` = email search, `sort` = the active sort column (with an
 * optional `-` prefix for descending).
 */
type UsersSearch = { q?: string; sort?: UserSort }

export const Route = createFileRoute("/app/admin/users/")({
  validateSearch: (search: Record<string, unknown>): UsersSearch => ({
    q:
      typeof search.q === "string" && search.q.trim()
        ? search.q.trim()
        : undefined,
    sort:
      typeof search.sort === "string" && ALLOWED_SORTS.includes(search.sort)
        ? (search.sort as UserSort)
        : undefined,
  }),
  component: AdminUsers,
})

function AdminUsers() {
  const { q, sort } = Route.useSearch()
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
    listUsersInfiniteQueryOptions({ search: q, sort: sortValue }),
  )

  const users = query.data?.pages.flatMap((page) => page.results) ?? []

  const toggleSort = (column: SortColumn) => {
    const next: UserSort = sortValue === column ? `-${column}` : column
    navigate({ search: (prev) => ({ ...prev, sort: next }), replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumbs items={[{ label: "admin", to: "/app/admin" }]} />
      <div className="mt-1 mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Users
        </h1>
        <InviteUserDialog />
      </div>

      <div className="relative mb-4 max-w-sm">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by email…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-card ring-1 ring-foreground/5">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Email"
                column="email"
                sort={sortValue}
                onSort={toggleSort}
              />
              <SortableHead
                label="Name"
                column="name"
                sort={sortValue}
                onSort={toggleSort}
              />
              <SortableHead
                label="Role"
                column="role"
                sort={sortValue}
                onSort={toggleSort}
              />
              <SortableHead
                label="Status"
                column="active"
                sort={sortValue}
                onSort={toggleSort}
              />
              <SortableHead
                label="Invited"
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
                    : "Failed to load users."}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link
                      to="/app/admin/users/$userId"
                      params={{ userId: user.id }}
                      className="font-medium hover:underline"
                    >
                      {user.email}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {user.name?.trim() ? (
                      user.name
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <ActiveIcon active={user.active} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.insertedAt)}
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
  sort: UserSort
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
