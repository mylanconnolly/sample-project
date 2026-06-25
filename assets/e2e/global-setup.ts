import { chromium, type FullConfig } from "@playwright/test"
import { STORAGE_STATE } from "./constants"

/**
 * Authenticate once and persist the session to `STORAGE_STATE`; every test
 * project loads it via `use.storageState`, so authenticated specs start already
 * signed in.
 *
 * Uses the dev-only `/dev/login` route, which find-or-creates the user inside
 * the server process and sets the session directly — no email round trip. We
 * call it as an API request (not a navigation) so the Set-Cookie lands in the
 * context's jar deterministically, and so a non-302 response yields a precise
 * error instead of an opaque navigation timeout. The real magic-link flow stays
 * covered by `login.spec.ts`.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:4000"

  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL })

  try {
    const resp = await page.request.get("/dev/login", { maxRedirects: 0 })
    const status = resp.status()
    if (status !== 302) {
      const body = (await resp.text()).slice(0, 500)
      throw new Error(
        `/dev/login expected 302, got ${status} ` +
          `(location=${resp.headers()["location"]}). Body: ${body}`,
      )
    }

    // The 302's Set-Cookie is now in the context jar. Confirm it actually
    // authenticates us (a bad session would bounce /app → /sign-in).
    await page.goto("/app")
    await page.waitForURL(/\/app(\/|$)/, { timeout: 10_000 }).catch(() => {
      throw new Error(
        `/dev/login set no usable session: /app landed on ${page.url()}`,
      )
    })

    await page.context().storageState({ path: STORAGE_STATE })
  } finally {
    await browser.close()
  }
}
