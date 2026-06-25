import { defineConfig, devices } from "@playwright/test"
import { STORAGE_STATE } from "./e2e/constants"

/**
 * E2E config. Runs against a real Phoenix server (with dev routes for the Swoosh
 * mailbox and a seeded DB).
 *
 * `globalSetup` signs in once and saves the session to STORAGE_STATE, which the
 * `chromium` project loads via `use.storageState` — so authenticated specs start
 * already signed in. The `login.spec.ts` test opts OUT of that state to exercise
 * the magic-link flow from scratch.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:4000",
    storageState: STORAGE_STATE,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Seed deterministic fixtures, then boot the server (which also starts the
    // Vite watcher in dev). Seeding is idempotent, so reusing a server is safe.
    command: "cd .. && mix run priv/repo/seeds/e2e.exs && mix phx.server",
    url: "http://localhost:4000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Surface the Phoenix server's logs in CI output (Logger writes here); without
    // this, swallowed server-side errors are invisible to the test run.
    stdout: "pipe",
    stderr: "pipe",
  },
})
