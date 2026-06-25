import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { sendMagicLink } from "@/lib/ashRpc"
import { AshError } from "@/lib/ashErrors"

/**
 * Magic-link request form. On success the email link (handled server-side)
 * establishes the session and redirects back into the SPA.
 */
export function SignInForm() {
  const mutation = useMutation({
    mutationFn: (email: string) => sendMagicLink(email),
  })

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value.email)
    },
  })

  if (mutation.isSuccess) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-muted-foreground">
          We sent you a magic link to sign in.
        </p>
      </div>
    )
  }

  const ashError =
    mutation.error instanceof AshError ? mutation.error : undefined
  const emailErrors = ashError?.fieldErrors.email
  const generalError =
    mutation.isError && !emailErrors?.length
      ? mutation.error instanceof Error
        ? mutation.error.message
        : "Something went wrong."
      : undefined

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field name="email">
            {(field) => (
              <Field data-invalid={emailErrors?.length ? true : undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="you@example.com"
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

          {generalError ? <FieldError>{generalError}</FieldError> : null}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Sending…
              </>
            ) : (
              "Send magic link"
            )}
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}
