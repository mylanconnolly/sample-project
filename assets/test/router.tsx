import { render } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import {
  createRootRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
  type AnyRoute,
} from "@tanstack/react-router"
import {
  makeQueryClient,
  type ProviderOptions,
  type RenderWithProvidersResult,
} from "./utils"

export interface RenderRouteOptions extends ProviderOptions {
  /** Memory-history URLs, e.g. `["/app/projects?sort=-name"]`. */
  initialEntries: string[]
  /** Context for `Route.useRouteContext()` (e.g. `{ currentUser }`). */
  routeContext?: Record<string, unknown>
}

/**
 * Render a real file `Route` (the object exported by `createFileRoute(...)`) so
 * its route-bound hooks — `Route.useParams/useSearch/useNavigate/
 * useRouteContext` — resolve for real against `validateSearch` + the memory URL.
 * The leaf route is reparented under a synthetic root so we avoid importing the
 * generated `routeTree.gen.ts`.
 *
 *   import { Route } from "@/routes/app/projects/index"
 *   const { client } = await renderRoute(Route, {
 *     initialEntries: ["/app/projects?sort=-name"],
 *   })
 *
 * Async: the router resolves its initial match before we assert.
 */
export async function renderRoute(
  route: AnyRoute,
  opts: RenderRouteOptions,
): Promise<RenderWithProvidersResult> {
  const client = opts.client ?? makeQueryClient()
  opts.seed?.(client)

  const rootRoute = createRootRoute({ component: Outlet })
  // Reparent the real leaf route under our synthetic root.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(route as any).options.getParentRoute = () => rootRoute
  rootRoute.addChildren([route])

  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: opts.initialEntries }),
    context: opts.routeContext ?? {},
    defaultPendingMinMs: 0,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await router.load()

  const result = render(
    <QueryClientProvider client={client}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
    opts.renderOptions,
  )
  return Object.assign(result, { client })
}
