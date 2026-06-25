import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { queryKeys, updateExistingUser, userQueryOptions } from "@/lib/ashRpc"
import { AshError } from "@/lib/ashErrors"
import { cn } from "@/lib/utils"
import type { UpdateUserInput } from "@/ash_rpc"

type Role = NonNullable<UpdateUserInput["role"]>

export const Route = createFileRoute("/app/admin/users/$userId/edit")({
  component: EditUser,
})

function EditUser() {
  const { userId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    data: user,
    isPending,
    isError,
    error,
  } = useQuery(userQueryOptions(userId))

  const mutation = useMutation({
    mutationFn: (input: UpdateUserInput) => updateExistingUser(userId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.user(userId), updated)
      queryClient.invalidateQueries({ queryKey: ["User", "list_users"] })
      navigate({ to: "/app/admin/users/$userId", params: { userId } })
    },
  })

  const form = useForm({
    defaultValues: {
      email: user?.email ?? "",
      name: user?.name ?? "",
      role: (user?.role ?? "user") as Role,
    },
    onSubmit: async ({ value }) => {
      // Store a blank name as null rather than an empty string.
      await mutation.mutateAsync({ ...value, name: value.name.trim() || null })
    },
  })

  const ashError =
    mutation.error instanceof AshError ? mutation.error : undefined
  const emailErrors = ashError?.fieldErrors.email
  const nameErrors = ashError?.fieldErrors.name
  const generalError =
    mutation.isError && !emailErrors?.length
      ? mutation.error instanceof Error
        ? mutation.error.message
        : "Something went wrong."
      : undefined

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs
        items={[
          { label: "admin", to: "/app/admin" },
          { label: "users", to: "/app/admin/users" },
          ...(user
            ? [
                {
                  label: user.name?.trim() || user.email,
                  to: "/app/admin/users/$userId",
                  params: { userId },
                },
              ]
            : []),
        ]}
        className="mb-6"
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
            <CardTitle className="text-xl">Edit user</CardTitle>
            <CardDescription>
              Update this person’s account details and role.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup>
                <form.Field name="email">
                  {(field) => (
                    <Field
                      data-invalid={emailErrors?.length ? true : undefined}
                    >
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        required
                        aria-invalid={emailErrors?.length ? true : undefined}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError
                        errors={emailErrors?.map((message) => ({ message }))}
                      />
                    </Field>
                  )}
                </form.Field>

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

                <form.Field name="role">
                  {(field) => (
                    <Field>
                      <FieldLabel>Role</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value as Role)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>

                {generalError ? <FieldError>{generalError}</FieldError> : null}

                <FieldSeparator />
                <div className="flex gap-2">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                      <>
                        <Spinner data-icon="inline-start" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                  <Link
                    to="/app/admin/users/$userId"
                    params={{ userId }}
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Cancel
                  </Link>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
