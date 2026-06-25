import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { MemoryForm, type MemoryFormValues } from "@/components/MemoryForm"
import {
  memoryQueryOptions,
  queryKeys,
  updateExistingMemory,
} from "@/lib/ashRpc"
import type { UpdateMemoryInput } from "@/ash_rpc"

export const Route = createFileRoute("/app/admin/memories/$memoryId/edit")({
  component: EditMemory,
})

function EditMemory() {
  const { memoryId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    data: memory,
    isPending,
    isError,
    error,
  } = useQuery(memoryQueryOptions(memoryId))

  const mutation = useMutation({
    mutationFn: (input: UpdateMemoryInput) =>
      updateExistingMemory(memoryId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.memory(memoryId), updated)
      queryClient.invalidateQueries({ queryKey: ["Memory", "list_memories"] })
      navigate({
        to: "/app/admin/memories/$memoryId",
        params: { memoryId },
      })
    },
  })

  const submit = async (values: MemoryFormValues) => {
    const input: UpdateMemoryInput = {
      content: values.content,
      ...(values.scope === "repository"
        ? { repoKey: values.repoKey || null }
        : {}),
    }
    await mutation.mutateAsync(input)
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: "admin", to: "/app/admin" },
          { label: "memories", to: "/app/admin/memories" },
          ...(memory
            ? [
                {
                  label: "detail",
                  to: "/app/admin/memories/$memoryId",
                  params: { memoryId },
                },
              ]
            : []),
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
            <CardTitle className="text-xl">Edit memory</CardTitle>
            <CardDescription>
              Update the note’s content. Changing it re-embeds it for search.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent>
            <MemoryForm
              defaultValues={{
                scope: memory.scope,
                repoKey: memory.repoKey ?? "",
                content: memory.content,
              }}
              submitLabel="Save changes"
              pending={mutation.isPending}
              error={mutation.error}
              scopeEditable={false}
              onSubmit={submit}
              onCancel={() =>
                navigate({
                  to: "/app/admin/memories/$memoryId",
                  params: { memoryId },
                })
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
