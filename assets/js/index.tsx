import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { queryClient } from "./lib/queryClient"
import { newPageView } from "./lib/pageView"
import { ThemeProvider } from "./lib/theme"
import "../css/app.css"

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // Let Query own caching; the router just triggers loads.
  defaultPreloadStaleTime: 0,
})

// Mint a new access-log page-load id on each navigation to a different path, so the
// reads it triggers share one id (search/sort changes keep the same id).
let lastPath = router.state.location.pathname
router.subscribe("onResolved", ({ toLocation }) => {
  if (toLocation.pathname !== lastPath) {
    lastPath = toLocation.pathname
    newPageView()
  }
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
