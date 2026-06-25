import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
  apiKeysQueryOptions,
  deleteExistingApiKey,
  generateNewApiKey,
  queryKeys,
  type GeneratedApiKey,
} from "@/lib/ashRpc"
import { AshError } from "@/lib/ashErrors"
import { formatDate, formatRelativeTime } from "@/lib/format"

/**
 * Self-service API key management. Lists the signed-in user's keys and lets them
 * generate new ones (the full key is shown exactly once) or revoke existing
 * ones. There is no edit — keys are immutable once created.
 */
export function ApiKeysCard() {
  const {
    data: keys,
    isPending,
    isError,
    error,
  } = useQuery(apiKeysQueryOptions())

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>
          Use API keys to authenticate programmatic access to your account. Keep
          them secret — anyone with a key can act as you.
        </CardDescription>
        <CardAction>
          <GenerateApiKeyDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-6" />
          </div>
        ) : isError ? (
          <p className="py-2 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Failed to load API keys."}
          </p>
        ) : keys.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            You don't have any API keys yet.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/5 overflow-hidden rounded-xl border border-foreground/10 bg-card ring-1 ring-foreground/5">
            {keys.map((key) => (
              <ApiKeyRow
                key={key.id}
                id={key.id}
                name={key.name}
                insertedAt={key.insertedAt}
                expiresAt={key.expiresAt}
                valid={key.valid}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/** A single key row: label, metadata, validity badge, and a revoke action. */
function ApiKeyRow({
  id,
  name,
  insertedAt,
  expiresAt,
  valid,
}: {
  id: string
  name: string | null
  insertedAt: string
  expiresAt: string
  valid: boolean | null
}) {
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: () => deleteExistingApiKey(id),
    onSuccess: () => {
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() })
    },
  })

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {name?.trim() || "Unnamed key"}
          </span>
          {valid ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="destructive">Expired</Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          Created {formatRelativeTime(insertedAt)} ·{" "}
          {valid ? "expires" : "expired"} {formatDate(expiresAt)}
        </p>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Revoke API key">
              <Trash2Icon />
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              {name?.trim() ? `"${name.trim()}" ` : "This key "}
              will stop working immediately and can't be restored. Any
              integration using it will lose access.
            </DialogDescription>
          </DialogHeader>
          {mutation.isError ? (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to revoke key."}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Revoking…
                </>
              ) : (
                "Revoke key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}

/** Expiration choices offered when generating a key, in days. */
const EXPIRY_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
] as const

const DEFAULT_EXPIRY = "90"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Dialog that generates a new key. After creation it swaps to a one-time reveal
 * of the full plaintext key (which the server never returns again).
 */
function GenerateApiKeyDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [expiry, setExpiry] = useState<string>(DEFAULT_EXPIRY)
  const [created, setCreated] = useState<GeneratedApiKey | null>(null)

  const reset = () => {
    setName("")
    setExpiry(DEFAULT_EXPIRY)
    setCreated(null)
    mutation.reset()
  }

  const mutation = useMutation({
    mutationFn: () => {
      const days = Number(expiry)
      const expiresAt = new Date(Date.now() + days * DAY_MS).toISOString()
      return generateNewApiKey({ name: name.trim() || null, expiresAt })
    },
    onSuccess: (key) => {
      setCreated(key)
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() })
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon data-icon="inline-start" />
            Generate key
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        {created ? (
          <RevealedKey
            plaintext={created.plaintextApiKey}
            onDone={() => {
              setOpen(false)
              reset()
            }}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!mutation.isPending) mutation.mutate()
            }}
          >
            <DialogHeader>
              <DialogTitle>Generate API key</DialogTitle>
              <DialogDescription>
                Give the key a name so you can recognize it later.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="mt-4">
              <Field data-invalid={nameErrors?.length ? true : undefined}>
                <FieldLabel htmlFor="api-key-name">Name</FieldLabel>
                <Input
                  id="api-key-name"
                  type="text"
                  placeholder="e.g. CI deploy bot"
                  autoFocus
                  value={name}
                  aria-invalid={nameErrors?.length ? true : undefined}
                  onChange={(e) => setName(e.target.value)}
                />
                <FieldError
                  errors={nameErrors?.map((message) => ({ message }))}
                />
              </Field>

              <Field>
                <FieldLabel>Expires after</FieldLabel>
                <Select
                  value={expiry}
                  onValueChange={(value) => setExpiry(value as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {EXPIRY_OPTIONS.find((o) => o.value === expiry)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  The key stops working after this period.
                </FieldDescription>
              </Field>

              {generalError ? <FieldError>{generalError}</FieldError> : null}
            </FieldGroup>

            <DialogFooter className="mt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Generating…
                  </>
                ) : (
                  "Generate key"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** One-time display of a freshly generated key, with copy-to-clipboard. */
function RevealedKey({
  plaintext,
  onDone,
}: {
  plaintext: string
  onDone: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plaintext)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); the key is still
      // visible for the user to select and copy manually.
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Copy your API key</DialogTitle>
        <DialogDescription>
          This is the only time the full key will be shown. Store it somewhere
          safe — you won't be able to see it again.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
        <span>Once you close this dialog the key cannot be recovered.</span>
      </div>

      <div className="mt-3 flex min-w-0 items-start gap-2">
        <code className="min-w-0 flex-1 rounded-md border border-foreground/10 bg-muted px-3 py-2 font-mono text-sm break-all">
          {plaintext}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Copy API key"
          onClick={copy}
        >
          {copied ? (
            <CheckIcon className="text-success-foreground" />
          ) : (
            <CopyIcon />
          )}
        </Button>
      </div>

      <DialogFooter className="mt-4">
        <Button type="button" onClick={onDone}>
          Done
        </Button>
      </DialogFooter>
    </>
  )
}
