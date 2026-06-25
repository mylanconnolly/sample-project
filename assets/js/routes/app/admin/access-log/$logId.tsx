import type { ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { ActionTypeBadge } from "@/components/ActionTypeBadge"
import { formatDateTime } from "@/lib/format"
import { accessLogQueryOptions } from "@/lib/ashRpc"

const RESOURCE_LABEL: Record<string, string> = {
  memory: "Memory",
  user: "User",
}

export const Route = createFileRoute("/app/admin/access-log/$logId")({
  component: AccessLogDetail,
})

function AccessLogDetail() {
  const { logId } = Route.useParams()
  const {
    data: log,
    isPending,
    isError,
    error,
  } = useQuery(accessLogQueryOptions(logId))

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: "admin", to: "/app/admin" },
          { label: "access log", to: "/app/admin/access-log" },
        ]}
      />

      {isPending ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "Failed to load the access event."}
        </p>
      ) : !log ? (
        <p className="text-muted-foreground">Access event not found.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {formatDateTime(log.occurredAt)}
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ActionTypeBadge actionType={log.actionType} />
              <span className="text-sm text-muted-foreground">
                {RESOURCE_LABEL[log.resourceType] ?? log.resourceType} ·{" "}
                {log.actionName}
              </span>
            </div>
          </CardHeader>
          <Separator />
          <CardContent>
            <dl className="divide-y divide-foreground/5">
              <DetailRow label="Actor">
                {log.actorId ? (
                  <Link
                    to="/app/admin/users/$userId"
                    params={{ userId: log.actorId }}
                    className="hover:underline"
                  >
                    {log.actorEmail ?? log.actorId}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">system</span>
                )}
              </DetailRow>
              <DetailRow label="Record">
                <Mono value={log.recordId} />
              </DetailRow>
              <DetailRow label="Project">
                {log.projectId ? (
                  <span className="font-mono text-xs break-all">
                    {log.projectId}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="Page">
                {log.requestPath ? (
                  <span className="text-xs break-all">{log.requestPath}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="Page load">
                {log.pageViewId ? (
                  <Link
                    to="/app/admin/access-log"
                    search={{ pageViewId: log.pageViewId }}
                    className="text-xs hover:underline"
                  >
                    View all reads from this page load
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="IP address">
                {log.ipAddress ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="User agent">
                {log.userAgent ? (
                  <span className="text-xs break-all">{log.userAgent}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="Request ID">
                <Mono value={log.requestId} />
              </DetailRow>
              <DetailRow label="Event ID">
                <Mono value={log.id} />
              </DetailRow>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Mono({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return <span className="font-mono text-xs break-all">{value}</span>
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
