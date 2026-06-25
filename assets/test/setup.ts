import "@testing-library/jest-dom/vitest"
import { afterAll, afterEach, beforeAll, vi } from "vitest"
import { setupServer } from "msw/node"
import { handlers } from "./handlers"

// jsdom ships neither of these, but base-ui (Select/Popover positioning) and the
// API-key copy button reach for them. Provide inert stubs so components mount;
// tests that care can spy on `navigator.clipboard.writeText`.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Always a spy: jsdom 25 ships a clipboard whose writeText isn't mockable, so
// override it outright. Tests assert via `navigator.clipboard.writeText`.
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
})

// MDXEditor is built on Lexical/contentEditable, which jsdom can't drive. Stub
// the package with a plain textarea so components embedding the markdown editor
// stay testable (value flows through `markdown`/`onChange` as before).
vi.mock("@mdxeditor/editor", async () => {
  const React = await import("react")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MDXEditor = ({ markdown, onChange, placeholder, autoFocus }: any) =>
    React.createElement("textarea", {
      "data-slot": "mdxeditor-mock",
      autoFocus,
      placeholder,
      value: markdown,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange: (e: any) => onChange?.(e.target.value, false),
    })
  // Plugin factories and toolbar components are inert in the stub.
  const noop = () => null
  return new Proxy(
    { __esModule: true, MDXEditor },
    {
      get(target: Record<string | symbol, unknown>, prop) {
        if (prop in target) return target[prop]
        // Avoid making the mock look like a thenable module namespace.
        if (typeof prop === "symbol" || prop === "then") return undefined
        return noop
      },
    },
  )
})

// The markdown editor wrapper pulls in MDXEditor (already stubbed above) and a
// ThemeProvider context. Stub the wrapper itself as a plain textarea so any form
// embedding it (TicketForm, CommentForm, ProjectForm, AiIntake) is testable
// without per-file boilerplate. Value flows through `value`/`onChange` as before.
vi.mock("@/components/ui/markdown-editor", async () => {
  const React = await import("react")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MarkdownEditor = ({ value, onChange, id, placeholder }: any) =>
    React.createElement("textarea", {
      id,
      placeholder,
      value,
      "data-slot": "markdown-editor-mock",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange: (e: any) => onChange?.(e.target.value),
    })
  return { MarkdownEditor }
})

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
