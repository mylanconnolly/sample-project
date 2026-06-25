import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Breadcrumbs } from "@/components/Breadcrumbs"
import {
  anthropicConfigQueryOptions,
  anthropicModelsQueryOptions,
  queryKeys,
  saveAnthropicConfig,
} from "@/lib/ashRpc"
import { AshError } from "@/lib/ashErrors"

/** Sentinel select value for "no default model" (maps to null on save). */
const NO_MODEL = "__none__"

/**
 * Admin screen for the Anthropic/Claude integration, mounted at `/app/admin/ai`.
 * The parent `/app/admin` route gates non-admins. The API key is write-only:
 * it's never read back, and submitting a blank key keeps the stored one.
 */
export const Route = createFileRoute("/app/admin/ai")({ component: AiSettings })

function AiSettings() {
  const queryClient = useQueryClient()
  const {
    data: config,
    isPending,
    isError,
    error,
  } = useQuery(anthropicConfigQueryOptions())

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs
        items={[{ label: "admin", to: "/app/admin" }, { label: "AI" }]}
        className="mb-6"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">AI integration</CardTitle>
          <CardDescription>
            Configure the Anthropic API key and default Claude model used by
            LLM-enhanced features.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent>
          {isPending ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : isError ? (
            <p className="text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to load settings."}
            </p>
          ) : (
            <AiSettingsForm
              apiKeySet={config?.apiKeySet ?? false}
              defaultModel={config?.defaultModel ?? null}
              onSaved={() =>
                queryClient.invalidateQueries({
                  queryKey: queryKeys.anthropicConfig(),
                })
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface AiSettingsValues {
  apiKey: string
  defaultModel: string
}

function AiSettingsForm({
  apiKeySet,
  defaultModel,
  onSaved,
}: {
  apiKeySet: boolean
  defaultModel: string | null
  onSaved: () => void
}) {
  // Models can only be listed once a key is configured (the list comes from the
  // Anthropic API). Server-cached ~1h; see anthropicModelsQueryOptions.
  const modelsQuery = useQuery({
    ...anthropicModelsQueryOptions(),
    enabled: apiKeySet,
  })
  const models = modelsQuery.data

  const mutation = useMutation({
    mutationFn: (values: AiSettingsValues) => {
      const apiKey = values.apiKey.trim()
      const model = values.defaultModel
      return saveAnthropicConfig({
        defaultModel: model === NO_MODEL ? null : model,
        // Omit the key when blank so the stored one is preserved.
        ...(apiKey ? { apiKey } : {}),
      })
    },
    onSuccess: () => {
      // Clear the key field after a successful save; never re-display it.
      form.setFieldValue("apiKey", "")
      onSaved()
    },
  })

  const form = useForm({
    defaultValues: {
      apiKey: "",
      defaultModel: defaultModel || NO_MODEL,
    } as AiSettingsValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  const ashError =
    mutation.error instanceof AshError ? mutation.error : undefined
  const apiKeyErrors = ashError?.fieldErrors.apiKey
  const modelErrors = ashError?.fieldErrors.defaultModel
  const generalError =
    mutation.error && !apiKeyErrors?.length && !modelErrors?.length
      ? mutation.error instanceof Error
        ? mutation.error.message
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
        <form.Field name="apiKey">
          {(field) => (
            <Field data-invalid={apiKeyErrors?.length ? true : undefined}>
              <FieldLabel htmlFor="apiKey">API key</FieldLabel>
              <Input
                id="apiKey"
                type="password"
                autoComplete="off"
                placeholder={
                  apiKeySet
                    ? "•••••••• (leave blank to keep current key)"
                    : "sk-ant-…"
                }
                aria-invalid={apiKeyErrors?.length ? true : undefined}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldDescription>
                {apiKeySet
                  ? "A key is configured. Enter a new one to replace it, or leave blank to keep it."
                  : "No key configured yet. Paste your Anthropic API key to enable LLM features."}
              </FieldDescription>
              <FieldError
                errors={apiKeyErrors?.map((message) => ({ message }))}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="defaultModel">
          {(field) => {
            const value = field.state.value
            const knownIds = new Set(models?.map((m) => m.id))
            // Keep a previously-saved model selectable even if it's no longer
            // returned by the API (e.g. deprecated).
            const missingCurrent =
              value !== NO_MODEL && value.length > 0 && !knownIds.has(value)
            const hint = !apiKeySet
              ? "Save an API key first to load the available models."
              : modelsQuery.isError
                ? "Couldn’t load models from Anthropic — check the API key."
                : "The Claude model used when a request doesn’t specify one. Optional."

            return (
              <Field data-invalid={modelErrors?.length ? true : undefined}>
                <FieldLabel htmlFor="defaultModel">Default model</FieldLabel>
                <Select
                  value={value}
                  onValueChange={(next) => field.handleChange(String(next))}
                  disabled={!apiKeySet || modelsQuery.isLoading}
                >
                  <SelectTrigger id="defaultModel" className="w-full">
                    <SelectValue placeholder="Select a model">
                      {(selected) => {
                        if (selected === NO_MODEL || !selected)
                          return "No default model"
                        const model = models?.find((m) => m.id === selected)
                        return model ? model.displayName : String(selected)
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MODEL}>No default model</SelectItem>
                    {missingCurrent ? (
                      <SelectItem value={value}>
                        {value} (unavailable)
                      </SelectItem>
                    ) : null}
                    {models?.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{hint}</FieldDescription>
                <FieldError
                  errors={modelErrors?.map((message) => ({ message }))}
                />
              </Field>
            )
          }}
        </form.Field>

        {generalError ? <FieldError>{generalError}</FieldError> : null}
        {mutation.isSuccess && !mutation.isPending ? (
          <p className="text-sm text-muted-foreground">Settings saved.</p>
        ) : null}

        <FieldSeparator />
        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Saving…
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
