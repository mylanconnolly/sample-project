import { describe, it, expect, beforeEach } from "vitest"
import { screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { server } from "./setup"
import { renderWithProviders } from "./utils"
import { rpc, ok, keysetPage, spyRpc } from "./rpc"
import { apiKey } from "./fixtures"
import { ApiKeysCard } from "@/components/ApiKeysCard"

describe("ApiKeysCard", () => {
  it("lists existing keys with an active badge", async () => {
    server.use(
      rpc({
        list_api_keys: () => ok([apiKey({ name: "Prod token", valid: true })]),
      }),
    )

    renderWithProviders(<ApiKeysCard />)

    expect(await screen.findByText("Prod token")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("shows the empty state when there are no keys", async () => {
    server.use(rpc({ list_api_keys: () => ok([]) }))
    renderWithProviders(<ApiKeysCard />)
    expect(
      await screen.findByText(/don't have any API keys yet/i),
    ).toBeInTheDocument()
  })

  it("generates a key, reveals the plaintext once, and copies it", async () => {
    const u = userEvent.setup()
    const generate = spyRpc("generate_api_key", () =>
      ok(apiKey({ name: "CI" }), {
        plaintextApiKey: "sampleproject_secret_value",
      }),
    )
    server.use(
      rpc({
        list_api_keys: () => ok([]),
        generate_api_key: generate.handler,
      }),
    )

    renderWithProviders(<ApiKeysCard />)

    await u.click(await screen.findByRole("button", { name: /generate key/i }))

    const dialog = await screen.findByRole("dialog")
    await u.type(within(dialog).getByLabelText("Name"), "CI")
    await u.click(within(dialog).getByRole("button", { name: /generate key/i }))

    // The full key is revealed exactly once.
    expect(
      await screen.findByText("sampleproject_secret_value"),
    ).toBeInTheDocument()
    expect(generate.calls[0].input).toEqual(
      expect.objectContaining({ name: "CI" }),
    )

    // userEvent.setup() installs its own clipboard stub; read the value back.
    await u.click(screen.getByRole("button", { name: /copy api key/i }))
    await waitFor(async () =>
      expect(await navigator.clipboard.readText()).toBe(
        "sampleproject_secret_value",
      ),
    )
  })

  it("revokes a key after confirmation and refetches the list", async () => {
    const u = userEvent.setup()
    let destroyed = false
    server.use(
      rpc({
        list_api_keys: () =>
          destroyed ? ok([]) : ok([apiKey({ name: "Old key" })]),
        destroy_api_key: () => {
          destroyed = true
          return ok({})
        },
      }),
    )

    renderWithProviders(<ApiKeysCard />)

    await u.click(
      await screen.findByRole("button", { name: /revoke api key/i }),
    )
    const dialog = await screen.findByRole("dialog")
    await u.click(within(dialog).getByRole("button", { name: /revoke key/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/don't have any API keys yet/i),
      ).toBeInTheDocument(),
    )
  })
})
