import { describe, it, expect } from "vitest"
import { screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { server } from "./setup"
import { renderWithProviders } from "./utils"
import { rpc, ok, fieldError, spyRpc } from "./rpc"
import { user } from "./fixtures"
import { InviteUserDialog } from "@/components/InviteUserDialog"

async function openDialog(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole("button", { name: /invite users/i }))
  return await screen.findByRole("dialog")
}

describe("InviteUserDialog", () => {
  it("invites an email and closes on success", async () => {
    const u = userEvent.setup()
    const invite = spyRpc("invite_user", () =>
      ok(user({ email: "new@example.com" })),
    )
    server.use(rpc({ invite_user: invite.handler }))

    renderWithProviders(<InviteUserDialog />)

    const dialog = await openDialog(u)
    await u.type(
      within(dialog).getByPlaceholderText("person@example.com"),
      "new@example.com",
    )
    await u.click(within(dialog).getByRole("button", { name: /send invites/i }))

    // The invite RPC is sent with the typed email + default role.
    await waitFor(() => expect(invite.calls).toHaveLength(1))
    expect(invite.calls[0].input).toEqual({
      email: "new@example.com",
      role: "user",
    })

    // All invites succeeded → the dialog closes.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
  })

  it("keeps the dialog open and shows a per-row error when an invite fails", async () => {
    const u = userEvent.setup()
    server.use(
      rpc({ invite_user: () => fieldError("email", "has already been taken") }),
    )

    renderWithProviders(<InviteUserDialog />)

    const dialog = await openDialog(u)
    await u.type(
      within(dialog).getByPlaceholderText("person@example.com"),
      "dupe@example.com",
    )
    await u.click(within(dialog).getByRole("button", { name: /send invites/i }))

    // The failing row's message is surfaced inline and the dialog stays open.
    expect(
      await screen.findByText(/has already been taken/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})
