import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { SignInForm } from "../js/components/SignInForm"

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe("SignInForm", () => {
  it("requests a magic link and shows the confirmation state", async () => {
    const user = userEvent.setup()
    renderWithClient(<SignInForm />)

    await user.type(screen.getByLabelText("Email"), "test@example.com")
    await user.click(screen.getByRole("button", { name: /send magic link/i }))

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })
})
