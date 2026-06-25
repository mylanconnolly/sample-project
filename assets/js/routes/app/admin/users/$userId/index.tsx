import type { ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  PencilIcon,
  ScrollTextIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { RoleBadge } from "@/components/RoleBadge"
import { ActiveBadge } from "@/components/ActiveBadge"
import { UserAvatar } from "@/components/UserAvatar"
import { formatDateTime } from "@/lib/format"
import { queryKeys, setUserActive, userQueryOptions } from "@/lib/ashRpc"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/app/admin/users/$userId/")({
  component: UserDetail,
})

function UserDetail() {
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()
  const {
    data: user,
    isPending,
    isError,
    error,
  } = useQuery(userQueryOptions(userId))

  const toggleActive = useMutation({
    mutationFn: (active: boolean) => setUserActive(userId, active),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.user(userId), updated)
      queryClient.invalidateQueries({ queryKey: ["User", "list_users"] })
    },
  })

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: "admin", to: "/app/admin" },
          { label: "users", to: "/app/admin/users" },
        ]}
      />

      {isPending ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load user."}
        </p>
      ) : !user ? (
        <p className="text-muted-foreground">User not found.</p>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <UserAvatar name={user.name} email={user.email} />
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-xl">
                  {user.name?.trim() || user.email}
                </CardTitle>
                {user.name?.trim() ? (
                  <p className="truncate font-mono text-sm text-muted-foreground">
                    {user.email}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RoleBadge role={user.role} />
                  <ActiveBadge active={user.active} />
                </div>
              </div>
            </div>
            <CardAction className="flex gap-2">
              <Button
                variant={user.active ? "outline" : "default"}
                size="sm"
                disabled={toggleActive.isPending}
                onClick={() => toggleActive.mutate(!user.active)}
              >
                {toggleActive.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : user.active ? (
                  <UserXIcon data-icon="inline-start" />
                ) : (
                  <UserCheckIcon data-icon="inline-start" />
                )}
                {user.active ? "Deactivate" : "Activate"}
              </Button>
              <Link
                to="/app/admin/access-log"
                search={{ actorId: userId }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <ScrollTextIcon data-icon="inline-start" />
                Access history
              </Link>
              <Link
                to="/app/admin/users/$userId/edit"
                params={{ userId }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <PencilIcon data-icon="inline-start" />
                Edit
              </Link>
            </CardAction>
          </CardHeader>
          <Separator />
          <CardContent>
            <dl className="divide-y divide-foreground/5">
              <DetailRow label="User ID">
                <span className="font-mono text-xs break-all">{user.id}</span>
              </DetailRow>
              <DetailRow label="Invited">
                {formatDateTime(user.insertedAt)}
              </DetailRow>
              <DetailRow label="Last updated">
                {formatDateTime(user.updatedAt)}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** A label/value pair row used in the profile detail list. */
function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
