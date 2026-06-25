import { type ReactElement, type ReactNode } from "react"
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SocketProvider } from "@/lib/socket"

/** A QueryClient tuned for tests: no retries, no background refetch noise. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

export interface ProviderOptions {
  /** Reuse a specific client (e.g. to assert cache state). Defaults to a fresh one. */
  client?: QueryClient
  /** Wrap in `SocketProvider` (mock `@/lib/socket` first via `./socketMock`). */
  withSocket?: boolean | { userId?: string }
  /** Prime the cache before the first render — for optimistic / merge tests. */
  seed?: (client: QueryClient) => void
  renderOptions?: Omit<RenderOptions, "wrapper">
}

export interface RenderWithProvidersResult extends RenderResult {
  client: QueryClient
}

/**
 * Render a component inside the app's providers (QueryClient + optional
 * SocketProvider). The returned `client` lets tests assert/seed cache state.
 *
 * Use this for components and for route *components* that don't read route-bound
 * hooks. For components using `Route.useParams/useSearch/...`, use `renderRoute`.
 */
export function renderWithProviders(
  ui: ReactElement,
  opts: ProviderOptions = {},
): RenderWithProvidersResult {
  const client = opts.client ?? makeQueryClient()
  opts.seed?.(client)

  const socket = opts.withSocket
  const userId =
    typeof socket === "object" ? (socket.userId ?? "user-1") : "user-1"

  function Wrapper({ children }: { children: ReactNode }) {
    const tree = socket ? (
      <SocketProvider userId={userId}>{children}</SocketProvider>
    ) : (
      children
    )
    return <QueryClientProvider client={client}>{tree}</QueryClientProvider>
  }

  const result = render(ui, { wrapper: Wrapper, ...opts.renderOptions })
  return Object.assign(result, { client })
}
