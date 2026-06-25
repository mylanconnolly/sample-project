import { test, expect } from "@playwright/test"
import { signInWithMagicLink } from "./helpers"

// Exercise the magic-link flow from scratch, so start from a clean (signed-out)
// context rather than the shared authenticated storageState.
test.use({ storageState: { cookies: [], origins: [] } })

/**
 * Full magic-link round trip: React sign-in form → request link → read it from
 * the Swoosh dev mailbox → follow the (LiveView) interaction page → land
 * authenticated on /app. Uses the seeded E2E user (registration is invite-only;
 * the webServer command applies priv/repo/seeds/e2e.exs).
 */
test("magic-link sign-in lands authenticated in the app", async ({ page }) => {
  await signInWithMagicLink(page)
  await expect(page).toHaveURL(/\/app/)
})
