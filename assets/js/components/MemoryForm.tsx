import { useForm } from "@tanstack/react-form"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
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
import { Spinner } from "@/components/ui/spinner"
import { MEMORY_SCOPE_OPTIONS, type MemoryScope } from "@/lib/ashRpc"
import { AshError } from "@/lib/ashErrors"
import { cn } from "@/lib/utils"

export interface MemoryFormValues {
  scope: MemoryScope
  repoKey: string
  content: string
}

const SCOPE_LABEL: Record<MemoryScope, string> = {
  global: "Global",
  repository: "Repository",
  user: "User",
}

/**
 * Shared create/edit form for memories. `scopeEditable` is false on edit (the
 * update action can't move a memory between scopes), where the scope is shown but
 * fixed. `repoKey` is only collected for repository-scoped memories.
 */
export function MemoryForm({
  defaultValues,
  submitLabel,
  pending,
  error,
  scopeEditable = true,
  onSubmit,
  onCancel,
}: {
  defaultValues: MemoryFormValues
  submitLabel: string
  pending: boolean
  error: unknown
  scopeEditable?: boolean
  onSubmit: (values: MemoryFormValues) => Promise<void>
  onCancel: () => void
}) {
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      // Submit failures surface through the `error` prop (the caller's mutation
      // state), so swallow the rejection here to avoid an unhandled rejection.
      try {
        await onSubmit({
          scope: value.scope,
          repoKey: value.repoKey.trim(),
          content: value.content.trim(),
        })
      } catch {
        // Intentionally ignored — shown via `error`.
      }
    },
  })

  const ashError = error instanceof AshError ? error : undefined
  const contentErrors = ashError?.fieldErrors.content
  const repoKeyErrors =
    ashError?.fieldErrors.repoKey ?? ashError?.fieldErrors.repo_key
  const generalError =
    error && !contentErrors?.length && !repoKeyErrors?.length
      ? error instanceof Error
        ? error.message
        : "Something went wrong."
      : undefined

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="scope">
          {(field) => (
            <Field>
              <FieldLabel>Scope</FieldLabel>
              <Select
                value={field.state.value}
                disabled={!scopeEditable}
                onValueChange={(value) =>
                  field.handleChange(value as MemoryScope)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) => SCOPE_LABEL[value as MemoryScope]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_SCOPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Global and repository memories are shared with everyone; user
                memories are private to their owner.
              </FieldDescription>
            </Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.scope}>
          {(scope) =>
            scope === "repository" ? (
              <form.Field name="repoKey">
                {(field) => (
                  <Field
                    data-invalid={repoKeyErrors?.length ? true : undefined}
                  >
                    <FieldLabel htmlFor="repoKey">Repository</FieldLabel>
                    <Input
                      id="repoKey"
                      type="text"
                      placeholder="org/repo"
                      aria-invalid={repoKeyErrors?.length ? true : undefined}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldDescription>
                      A repo URL or “owner/name”. Normalized to lowercase
                      “owner/name” on save.
                    </FieldDescription>
                    <FieldError
                      errors={repoKeyErrors?.map((message) => ({ message }))}
                    />
                  </Field>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>

        <form.Field name="content">
          {(field) => (
            <Field data-invalid={contentErrors?.length ? true : undefined}>
              <FieldLabel htmlFor="content">Content</FieldLabel>
              <Textarea
                id="content"
                required
                rows={6}
                placeholder="What should be remembered?"
                aria-invalid={contentErrors?.length ? true : undefined}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError
                errors={contentErrors?.map((message) => ({ message }))}
              />
            </Field>
          )}
        </form.Field>

        {generalError ? <FieldError>{generalError}</FieldError> : null}

        <FieldSeparator />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Spinner data-icon="inline-start" />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancel
          </button>
        </div>
      </FieldGroup>
    </form>
  )
}
