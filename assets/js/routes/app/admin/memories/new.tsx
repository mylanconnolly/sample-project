import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { MemoryForm, type MemoryFormValues } from "@/components/MemoryForm"
import { createNewMemory } from "@/lib/ashRpc"
import type { CreateMemoryInput } from "@/ash_rpc"

export const Route = createFileRoute("/app/admin/memories/new")({
  component: NewMemory,
})

function NewMemory() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: MemoryFormValues) => {
      const input: CreateMemoryInput = {
        scope: values.scope,
        content: values.content,
        // repo_key is only meaningful for repository scope; the server clears it
        // otherwise, but we avoid sending a stray value.
        ...(values.scope === "repository"
          ? { repoKey: values.repoKey || null }
          : {}),
      }
      return createNewMemory(input)
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["Memory", "list_memories"] })
      navigate({
        to: "/app/admin/memories/$memoryId",
        params: { memoryId: created.id },
      })
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New memory</CardTitle>
          <CardDescription>
            Record a note for agents to recall over MCP.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent>
          <MemoryForm
            defaultValues={{ scope: "global", repoKey: "", content: "" }}
            submitLabel="Create memory"
            pending={mutation.isPending}
            error={mutation.error}
            onSubmit={async (values) => {
              await mutation.mutateAsync(values)
            }}
            onCancel={() => navigate({ to: "/app/admin/memories" })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
