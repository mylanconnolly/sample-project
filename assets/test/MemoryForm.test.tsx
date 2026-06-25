import "./routerMock"
import { describe, it, expect, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType } from "react"
import { server } from "./setup"
import { renderWithProviders } from "./utils"
import { rpc, ok, fieldError, spyRpc } from "./rpc"
import { navigate } from "./routerMock"
import { memory } from "./fixtures"
import { MemoryForm } from "@/components/MemoryForm"
import { Route } from "@/routes/app/admin/memories/new"

describe("MemoryForm", () => {
  it("reveals the repository field only for repository scope", async () => {
    const u = userEvent.setup()
    renderWithProviders(
      <MemoryForm
        defaultValues={{ scope: "global", repoKey: "", content: "" }}
        submitLabel="Create memory"
        pending={false}
        error={undefined}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText("Repository")).not.toBeInTheDocument()

    // base-ui Select: open and pick "Repository".
    await u.click(screen.getByRole("combobox"))
    await u.click(await screen.findByRole("option", { name: "Repository" }))

    expect(await screen.findByLabelText("Repository")).toBeInTheDocument()
  })

  it("submits trimmed values", async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <MemoryForm
        defaultValues={{ scope: "global", repoKey: "", content: "" }}
        submitLabel="Create memory"
        pending={false}
        error={undefined}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await u.type(screen.getByLabelText("Content"), "  remember this  ")
    await u.click(screen.getByRole("button", { name: "Create memory" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      scope: "global",
      repoKey: "",
      content: "remember this",
    })
  })
})

const NewMemory = Route.options.component as ComponentType

describe("new memory route", () => {
  it("creates a memory and navigates to its detail page", async () => {
    navigate.mockClear()
    const u = userEvent.setup()
    const create = spyRpc("create_memory", (b) =>
      ok(memory({ id: "memory-new", content: b.input.content })),
    )
    server.use(rpc({ create_memory: create.handler }))

    renderWithProviders(<NewMemory />)

    await u.type(screen.getByLabelText("Content"), "deploy from main")
    await u.click(screen.getByRole("button", { name: "Create memory" }))

    await waitFor(() => expect(create.calls).toHaveLength(1))
    expect(create.calls[0].input).toMatchObject({
      scope: "global",
      content: "deploy from main",
    })

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/app/admin/memories/$memoryId",
        params: { memoryId: "memory-new" },
      }),
    )
  })

  it("surfaces a server-side content error", async () => {
    const u = userEvent.setup()
    server.use(
      rpc({ create_memory: () => fieldError("content", "is required") }),
    )

    renderWithProviders(<NewMemory />)

    await u.type(screen.getByLabelText("Content"), "x")
    await u.click(screen.getByRole("button", { name: "Create memory" }))

    expect(await screen.findByText("is required")).toBeInTheDocument()
  })
})
