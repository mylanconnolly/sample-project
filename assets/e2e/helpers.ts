import { type Page, expect } from "@playwright/test"
import { E2E_EMAIL } from "./constants"

/**
 * Poll the Swoosh dev mailbox JSON API until the magic-link email for `email`
 * arrives, then return its URL. Using the API (not the mailbox iframe) avoids
 * both the async-delivery race — "check your email" can render before Local
 * storage has the email — and the fragility of scraping the preview frame.
 */
type MailboxEntry = {
  to?: string[]
  subject?: string
  html_body?: string
  text_body?: string
}

async function readMagicLink(
  page: Page,
  email: string,
  timeoutMs = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let mailbox: MailboxEntry[] = []
  while (Date.now() < deadline) {
    const res = await page.request.get("/dev/mailbox/json")
    if (res.ok()) {
      mailbox = ((await res.json()) as { data?: MailboxEntry[] }).data ?? []
      // `all()` is newest-first, so the first match is the freshest token.
      for (const mail of mailbox) {
        if (!(mail.to ?? []).some((to) => to.includes(email))) continue
        const body = `${mail.html_body ?? ""}\n${mail.text_body ?? ""}`
        const match = body.match(
          /https?:\/\/[^\s"'<>]+\/magic_link\/[^\s"'<>]+/,
        )
        if (match) return match[0]
      }
    }
    await page.waitForTimeout(500)
  }

  // Self-explaining failure: dump what the mailbox held. Empty ⇒ the request
  // found no user (is e2e@example.com seeded in the server's DB?). Non-empty ⇒
  // the recipient/link didn't match.
  const summary = mailbox.length
    ? mailbox
        .map((m) => `to=${JSON.stringify(m.to)} subj=${m.subject}`)
        .join("; ")
    : "(mailbox empty — user likely not seeded)"
  throw new Error(
    `no magic-link email for ${email} after ${timeoutMs}ms. Mailbox: ${summary}`,
  )
}

/**
 * Drive the full magic-link sign-in against the real server + Swoosh dev mailbox
 * and land authenticated on `/app`. Shared by `global-setup` (which then saves
 * the session) and `login.spec` (which asserts the flow itself).
 *
 * The interaction page is a LiveView, so the confirm button only works once its
 * socket has connected — we wait for that and retry the click to cover the race.
 */
export async function signInWithMagicLink(page: Page, email = E2E_EMAIL) {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByRole("button", { name: /send magic link/i }).click()
  await expect(page.getByText(/check your email/i)).toBeVisible()

  const href = await readMagicLink(page, email)
  await page.goto(href)
  await page
    .waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).liveSocket?.isConnected?.(),
      null,
      { timeout: 15_000 },
    )
    .catch(() => {})

  const confirm = page.getByRole("button", { name: /sign in/i }).first()
  await confirm.waitFor()
  for (let attempt = 1; ; attempt++) {
    await confirm.click().catch(() => {})
    try {
      await page.waitForURL(/\/app/, { timeout: 5_000 })
      return
    } catch (e) {
      if (attempt >= 4) throw e
    }
  }
}
