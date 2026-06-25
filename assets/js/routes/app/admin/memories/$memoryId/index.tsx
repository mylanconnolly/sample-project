import type { ReactNode } from "react"
import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
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
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { Markdown } from "@/components/Markdown"
import { formatDateTime } from "@/lib/format"
import {
  deleteExistingMemory,
  memoryQueryOptions,
  type MemoryScope,
} from "@/lib/ashRpc"
import { cn } from "@/lib/utils"

const SCOPE_LABEL: Record<MemoryScope, string> = {
  global: "Global",
  repository: "Repository",
  user: "User",
}

export const Route = createFileRoute("/app/admin/memories/$memoryId/")({
  component: MemoryDetail,
})

function MemoryDetail() {
  const { memoryId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const {
    data: memory,
    isPending,
    isError,
    error,
  } = useQuery(memoryQueryOptions(memoryId))

  const deleteMutation = useMutation({
    mutationFn: () => deleteExistingMemory(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Memory", "list_memories"] })
      navigate({ to: "/app/admin/memories" })
    },
  })

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: "admin", to: "/app/admin" },
          { label: "memories", to: "/app/admin/memories" },
        ]}
      />

      {isPending ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load memory."}
        </p>
      ) : !memory ? (
        <p className="text-muted-foreground">Memory not found.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Badge variant="secondary">{SCOPE_LABEL[memory.scope]}</Badge>
              {memory.repoKey ? (
                <span className="font-mono text-sm text-muted-foreground">
                  {memory.repoKey}
                </span>
              ) : null}
            </CardTitle>
            <CardAction className="flex gap-2">
              <Link
                to="/app/admin/memories/$memoryId/edit"
                params={{ memoryId }}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <PencilIcon data-icon="inline-start" />
                Edit
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  deleteMutation.reset()
                  setConfirmingDelete(true)
                }}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </CardAction>
          </CardHeader>
          <Separator />
          <CardContent>
            <Markdown className="mb-6">{memory.content}</Markdown>

            <dl className="divide-y divide-foreground/5">
              <DetailRow label="Owner">
                {memory.createdBy?.email ?? "—"}
              </DetailRow>
              <DetailRow label="Memory ID">
                <span className="font-mono text-xs break-all">{memory.id}</span>
              </DetailRow>
              <DetailRow label="Created">
                {formatDateTime(memory.insertedAt)}
              </DetailRow>
              <DetailRow label="Last updated">
                {formatDateTime(memory.updatedAt)}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this memory?</DialogTitle>
            <DialogDescription>
              This permanently removes the memory. Agents will no longer recall
              it.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError ? (
            <p className="text-sm text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "Could not delete the memory."}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" disabled={deleteMutation.isPending} />
              }
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete memory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** A label/value pair row used in the detail list. */
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
