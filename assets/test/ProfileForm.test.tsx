import "./routerMock"
import { describe, it, expect } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType } from "react"
import { server } from "./setup"
import { renderWithProviders } from "./utils"
import { rpc, ok, fieldError, spyRpc } from "./rpc"
import { user } from "./fixtures"
import { queryKeys } from "@/lib/ashRpc"
import { Route } from "@/routes/app/me"

// `Me` isn't exported; pull the component off the route. It uses only the free
// `useQuery` hook (plus <Link> in Breadcrumbs, handled by ./routerMock).
const Me = Route.options.component as ComponentType

describe("ProfileForm (in the Me route)", () => {
  it("saves the name and merges the result into the current-user cache", async () => {
    const u = userEvent.setup()
    const update = spyRpc("update_profile", (b) =>
      ok(user({ name: b.input.name })),
    )
    server.use(
      rpc({
        get_current_user: () => ok(user({ name: "Old Name" })),
        list_api_keys: () => ok([]),
        update_profile: update.handler,
      }),
    )

    const { client } = renderWithProviders(<Me />)

    const input = await screen.findByLabelText("Name")
    await u.clear(input)
    await u.type(input, "Mylan")
    await u.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => expect(update.calls).toHaveLength(1))
    expect(update.calls[0].input).toEqual({ name: "Mylan" })

    await waitFor(() =>
      expect(client.getQueryData(queryKeys.currentUser())).toMatchObject({
        name: "Mylan",
      }),
    )
  })

  it("surfaces a server-side field error", async () => {
    const u = userEvent.setup()
    server.use(
      rpc({
        get_current_user: () => ok(user({ name: "Old Name" })),
        list_api_keys: () => ok([]),
        update_profile: () => fieldError("name", "is too long"),
      }),
    )

    renderWithProviders(<Me />)

    await u.click(await screen.findByRole("button", { name: /save/i }))
    expect(await screen.findByText("is too long")).toBeInTheDocument()
  })
})
