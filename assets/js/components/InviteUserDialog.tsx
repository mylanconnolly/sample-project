import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, Trash2Icon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { inviteNewUser } from "@/lib/ashRpc"
import { AshError } from "@/lib/ashErrors"
import type { InviteUserInput } from "@/ash_rpc"

type Role = NonNullable<InviteUserInput["role"]>

type InviteResult =
  | { email: string; ok: true }
  | { email: string; ok: false; message: string }

/**
 * Modal for inviting one or more users. Each invite pre-creates the account and
 * emails them a magic link. Invites are sent independently so a single bad
 * address doesn't block the rest; per-row failures are surfaced inline.
 */
export function InviteUserDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState<string[]>([""])
  const [role, setRole] = useState<Role>("user")
  const [failures, setFailures] = useState<Record<number, string>>({})

  const reset = () => {
    setEmails([""])
    setRole("user")
    setFailures({})
    mutation.reset()
  }

  const mutation = useMutation({
    mutationFn: async (): Promise<InviteResult[]> => {
      const targets = emails.map((e) => e.trim()).filter(Boolean)
      return Promise.all(
        targets.map(async (email) => {
          try {
            await inviteNewUser({ email, role })
            return { email, ok: true } as const
          } catch (error) {
            const message =
              error instanceof AshError
                ? (error.fieldErrors.email?.[0] ?? error.message)
                : "Failed to invite."
            return { email, ok: false, message } as const
          }
        }),
      )
    },
    onSuccess: (results) => {
      // Refresh every users-list variant (search/sort) after any successful invite.
      if (results.some((r) => r.ok)) {
        queryClient.invalidateQueries({ queryKey: ["User", "list_users"] })
      }

      const nextFailures: Record<number, string> = {}
      const remaining: string[] = []
      const trimmed = emails.map((e) => e.trim())
      results.forEach((result) => {
        if (!result.ok) {
          const idx = trimmed.indexOf(result.email)
          if (idx >= 0) {
            nextFailures[remaining.length] = result.message
            remaining.push(result.email)
          }
        }
      })

      if (remaining.length === 0) {
        setOpen(false)
        reset()
      } else {
        // Keep only the rows that failed, with their messages, for correction.
        setEmails(remaining)
        setFailures(nextFailures)
      }
    },
  })

  const updateEmail = (index: number, value: string) =>
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)))

  const addRow = () => setEmails((prev) => [...prev, ""])

  const removeRow = (index: number) =>
    setEmails((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    )

  const canSubmit = emails.some((e) => e.trim()) && !mutation.isPending

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
          <Button>
            <UserPlusIcon data-icon="inline-start" />
            Invite users
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite users</DialogTitle>
          <DialogDescription>
            Each person gets an account and a magic-link email to sign in.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) mutation.mutate()
          }}
        >
          <FieldGroup>
            {emails.map((email, index) => {
              const error = failures[index]
              return (
                <Field key={index} data-invalid={error ? true : undefined}>
                  {index === 0 ? (
                    <FieldLabel>Email addresses</FieldLabel>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="person@example.com"
                      value={email}
                      aria-invalid={error ? true : undefined}
                      onChange={(e) => updateEmail(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove email"
                      disabled={emails.length === 1}
                      onClick={() => removeRow(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
              )
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={addRow}
            >
              <PlusIcon data-icon="inline-start" />
              Add another
            </Button>

            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as Role)}
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
          </FieldGroup>

          <DialogFooter className="mt-4">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Sending invites…
                </>
              ) : (
                "Send invites"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
