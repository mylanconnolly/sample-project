import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))

/** The seeded admin the E2E suite signs in as (see priv/repo/seeds/e2e.exs). */
export const E2E_EMAIL = "e2e@example.com"

/** Where global-setup persists the authenticated session (gitignored). */
export const STORAGE_STATE = path.join(here, ".auth", "user.json")
