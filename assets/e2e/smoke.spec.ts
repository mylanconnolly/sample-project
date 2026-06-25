import { test, expect } from "@playwright/test"

/**
 * Authenticated smoke tests. These reuse the shared session from global-setup
 * (the seeded E2E admin), so they start already signed in. They assert the big
 * surfaces render against the real stack rather than exhaustively driving flows
 * — that depth lives in the Vitest component suite.
 */

test("the dashboard loads for a signed-in user", async ({ page }) => {
  await page.goto("/app")
  // The app shell renders the dashboard; we're not bounced to /sign-in.
  await expect(page).toHaveURL(/\/app/)
  await expect(page.getByText(/welcome back/i)).toBeVisible()
})

test("the profile page lists the API keys section", async ({ page }) => {
  await page.goto("/app/me")
  await expect(page.getByRole("heading", { name: /profile/i })).toBeVisible()
  await expect(page.getByText(/API keys/i).first()).toBeVisible()
})

test("an admin can reach the users admin page", async ({ page }) => {
  await page.goto("/app/admin/users")
  await expect(page).toHaveURL(/\/app\/admin\/users/)
  // Admin gate passed (non-admins are redirected to /app).
  await expect(
    page.getByRole("button", { name: /invite users/i }),
  ).toBeVisible()
})
