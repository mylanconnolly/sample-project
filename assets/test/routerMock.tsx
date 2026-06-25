import { vi } from "vitest"

/**
 * Mocks `@tanstack/react-router` so components using the *free* `<Link>` /
 * `useNavigate()` hooks render outside a real router. Import this module (for its
 * side effect) at the TOP of a test file, before importing the component under
 * test:
 *
 *   import { navigate } from "./routerMock"
 *   import { TicketSearch } from "@/components/TicketSearch"
 *
 * `navigate` is a shared spy — assert with
 * `expect(navigate).toHaveBeenCalledWith({ to, params })`. Call
 * `navigate.mockClear()` in `beforeEach` if a file has multiple navigating tests.
 *
 * Route components that call route-bound hooks (`Route.useParams/useSearch/...`)
 * are NOT covered by this — use `renderRoute` from ./router instead.
 */
const hoisted = vi.hoisted(() => ({ navigate: vi.fn() }))

export const navigate = hoisted.navigate

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Link: ({ to, params, search, children, ...rest }: any) => (
      <a href={typeof to === "string" ? to : "#"} {...rest}>
        {children}
      </a>
    ),
    useNavigate: () => hoisted.navigate,
  }
})
