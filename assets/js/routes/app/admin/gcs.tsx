import { useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { UploadIcon } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { gcsConfigQueryOptions, queryKeys, saveGcsConfig } from "@/lib/ashRpc"
import { AshError } from "@/lib/ashErrors"

/**
 * Admin screen for the Google Cloud Storage integration, mounted at
 * `/app/admin/gcs`. The parent `/app/admin` route gates non-admins. The service
 * account key is write-only: it's never read back, and submitting a blank key
 * keeps the stored one. The bucket is assumed to already exist.
 */
export const Route = createFileRoute("/app/admin/gcs")({
  component: GcsSettings,
})

function GcsSettings() {
  const queryClient = useQueryClient()
  const {
    data: config,
    isPending,
    isError,
    error,
  } = useQuery(gcsConfigQueryOptions())

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs
        items={[{ label: "admin", to: "/app/admin" }, { label: "Storage" }]}
        className="mb-6"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">File storage</CardTitle>
          <CardDescription>
            Configure the Google Cloud Storage bucket and service account used
            to store uploaded files. The bucket must already exist.
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
            <GcsSettingsForm
              serviceAccountJsonSet={config?.serviceAccountJsonSet ?? false}
              bucketName={config?.bucketName ?? ""}
              onSaved={() =>
                queryClient.invalidateQueries({
                  queryKey: queryKeys.gcsConfig(),
                })
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface GcsSettingsValues {
  bucketName: string
  serviceAccountJson: string
}

function GcsSettingsForm({
  serviceAccountJsonSet,
  bucketName,
  onSaved,
}: {
  serviceAccountJsonSet: boolean
  bucketName: string
  onSaved: () => void
}) {
  const mutation = useMutation({
    mutationFn: (values: GcsSettingsValues) => {
      const json = values.serviceAccountJson.trim()
      return saveGcsConfig({
        bucketName: values.bucketName.trim(),
        // Omit the key when blank so the stored one is preserved.
        ...(json ? { serviceAccountJson: json } : {}),
      })
    },
    onSuccess: () => {
      // Clear the key field after a successful save; never re-display it.
      form.setFieldValue("serviceAccountJson", "")
      setFileName(null)
      onSaved()
    },
  })

  const form = useForm({
    defaultValues: { bucketName, serviceAccountJson: "" } as GcsSettingsValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  // Google exports the service account credentials as a downloadable JSON file,
  // so let admins pick that file directly rather than copy/paste its contents.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const readKeyFile = async (file: File | undefined) => {
    if (!file) return
    setFileError(null)
    const text = await file.text()
    // The server validates the contents on save; this is just an early sanity check.
    try {
      JSON.parse(text)
    } catch {
      setFileError(`"${file.name}" isn't valid JSON.`)
      setFileName(null)
      return
    }
    form.setFieldValue("serviceAccountJson", text)
    setFileName(file.name)
    // Reset so picking the same file again still fires `change`.
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const ashError =
    mutation.error instanceof AshError ? mutation.error : undefined
  const bucketErrors = ashError?.fieldErrors.bucketName
  const jsonErrors = ashError?.fieldErrors.serviceAccountJson
  const generalError =
    mutation.error && !bucketErrors?.length && !jsonErrors?.length
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
        <form.Field name="bucketName">
          {(field) => (
            <Field data-invalid={bucketErrors?.length ? true : undefined}>
              <FieldLabel htmlFor="bucketName">Bucket name</FieldLabel>
              <Input
                id="bucketName"
                autoComplete="off"
                placeholder="my-attachments-bucket"
                aria-invalid={bucketErrors?.length ? true : undefined}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldDescription>
                The existing GCS bucket attachments are stored in.
              </FieldDescription>
              <FieldError
                errors={bucketErrors?.map((message) => ({ message }))}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="serviceAccountJson">
          {(field) => (
            <Field data-invalid={jsonErrors?.length ? true : undefined}>
              <FieldLabel htmlFor="serviceAccountJson">
                Service account key (JSON)
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon data-icon="inline-start" />
                  Upload JSON file
                </Button>
                {fileName ? (
                  <span className="truncate text-sm text-muted-foreground">
                    {fileName}
                  </span>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => void readKeyFile(e.target.files?.[0])}
                />
              </div>
              <Textarea
                id="serviceAccountJson"
                autoComplete="off"
                spellCheck={false}
                className="min-h-40 font-mono text-xs"
                placeholder={
                  serviceAccountJsonSet
                    ? "•••••••• (leave blank to keep the current key)"
                    : '{\n  "type": "service_account",\n  "project_id": "…",\n  …\n}'
                }
                aria-invalid={jsonErrors?.length ? true : undefined}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                  // Manual edits supersede a previously-picked file.
                  setFileName(null)
                }}
              />
              <FieldDescription>
                {serviceAccountJsonSet
                  ? "A key is configured. Upload the downloaded JSON key file (or paste it) to replace it, or leave blank to keep it."
                  : "Upload the JSON key file Google gave you, or paste its contents."}
              </FieldDescription>
              {fileError ? <FieldError>{fileError}</FieldError> : null}
              <FieldError
                errors={jsonErrors?.map((message) => ({ message }))}
              />
            </Field>
          )}
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
