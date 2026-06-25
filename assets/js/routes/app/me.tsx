import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ApiKeysCard } from "@/components/ApiKeysCard"
import { McpSetupCard } from "@/components/McpSetupCard"
import { RoleBadge } from "@/components/RoleBadge"
import { ActiveBadge } from "@/components/ActiveBadge"
import { UserAvatar } from "@/components/UserAvatar"
import { meQueryOptions, queryKeys, updateCurrentProfile } from "@/lib/ashRpc"
import { AshError } from "@/lib/ashErrors"

export const Route = createFileRoute("/app/me")({ component: Me })

function Me() {
  // Prefetched by the /app gate; live-updates via channel payload pushes.
  const { data: user, isPending, isError, error } = useQuery(meQueryOptions())

  if (isPending) {
    return (
      <Centered>
        <Spinner className="size-8" />
      </Centered>
    )
  }
  if (isError) {
    return (
      <Centered>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load."}
        </p>
      </Centered>
    )
  }
  if (!user) {
    return (
      <Centered>
        <p className="text-muted-foreground">No current user.</p>
      </Centered>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs items={[{ label: "profile" }]} />
      <h1 className="mt-1 mb-6 font-heading text-3xl font-semibold tracking-tight">
        Profile
      </h1>
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
        </CardHeader>
        <Separator />
        <CardContent>
          <dl className="divide-y divide-foreground/5">
            <DetailRow label="User ID">
              <span className="font-mono text-xs break-all">{user.id}</span>
            </DetailRow>
            <DetailRow label="Email">
              <span className="font-mono text-xs break-all">{user.email}</span>
            </DetailRow>
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Display name</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm userId={user.id} name={user.name ?? ""} />
        </CardContent>
      </Card>

      <ApiKeysCard />

      <McpSetupCard />

      <p className="mt-4 text-sm text-muted-foreground">
        This view updates in realtime — changes to your account are pushed over
        the channel and written straight into the cache.
      </p>
    </div>
  )
}

/** Self-service form for the signed-in user to set their own display name. */
function ProfileForm({ userId, name }: { userId: string; name: string }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (value: string) =>
      updateCurrentProfile(userId, { name: value.trim() || null }),
    onSuccess: (updated) => {
      // The channel also pushes this; write it through immediately for snappiness.
      queryClient.setQueryData(queryKeys.currentUser(), updated)
    },
  })

  const form = useForm({
    defaultValues: { name },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value.name)
    },
  })

  const ashError =
    mutation.error instanceof AshError ? mutation.error : undefined
  const nameErrors = ashError?.fieldErrors.name
  const generalError =
    mutation.isError && !nameErrors?.length
      ? mutation.error instanceof Error
        ? mutation.error.message
        : "Something went wrong."
      : undefined

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        // The mutation's rejection is surfaced via `mutation.error`; swallow the
        // duplicate here so a failed save doesn't leak an unhandled rejection.
        form.handleSubmit().catch(() => {})
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <Field data-invalid={nameErrors?.length ? true : undefined}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Optional display name"
                aria-invalid={nameErrors?.length ? true : undefined}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError
                errors={nameErrors?.map((message) => ({ message }))}
              />
            </Field>
          )}
        </form.Field>

        {generalError ? <FieldError>{generalError}</FieldError> : null}

        <div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

/** A label/value pair row used in the profile detail list. */
function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      {children}
    </div>
  )
}
