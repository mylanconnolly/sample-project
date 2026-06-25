import { useState } from "react"
import { createFileRoute, redirect, Outlet, Link } from "@tanstack/react-router"
import { Activity, MenuIcon } from "lucide-react"
import { meQueryOptions } from "../lib/ashRpc"
import { SocketProvider } from "../lib/socket"
import { userLabel } from "@/components/UserLabel"
import { AppSidebar } from "@/components/AppSidebar"
import { Button } from "@/components/ui/button"

/**
 * Authenticated application layout, mounted at `/app`. Gates every child route
 * on the current-user query (forbidden / not signed in → redirect to /sign-in),
 * provides the realtime socket scoped to that user, and renders the app shell:
 * a fixed left navigation rail (a slide-in drawer on mobile) plus the routed
 * content, which centers itself within the remaining width.
 */
export const Route = createFileRoute("/app")({
  beforeLoad: async ({ context }) => {
    try {
      const currentUser =
        await context.queryClient.ensureQueryData(meQueryOptions())
      if (!currentUser) throw new Error("not signed in")
      return { currentUser }
    } catch {
      throw redirect({ to: "/sign-in" })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const { currentUser } = Route.useRouteContext()
  const [mobileOpen, setMobileOpen] = useState(false)

  const userProps = {
    label: userLabel(currentUser),
    name: currentUser.name,
    email: String(currentUser.email),
    hasName: Boolean(currentUser.name?.trim()),
    isAdmin: currentUser.role === "admin",
  }

  return (
    <SocketProvider userId={currentUser.id}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Desktop: fixed full-height rail. */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-foreground/10 md:block">
          <AppSidebar {...userProps} />
        </aside>

        {/* Mobile: the rail slides in over a dimmed backdrop. */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside className="absolute inset-y-0 left-0 w-64 border-r border-foreground/10 shadow-xl">
              <AppSidebar
                {...userProps}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        {/* Content column, offset clear of the desktop rail. */}
        <div className="md:pl-60">
          {/* Mobile top bar with the drawer toggle; hidden once the rail is fixed. */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-foreground/10 bg-sidebar/80 px-3 backdrop-blur md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </Button>
            <Link
              to="/app"
              className="flex items-center gap-2 font-mono text-base font-semibold tracking-tight"
            >
              <span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-[color-mix(in_oklch,var(--primary),white_15%)] to-primary text-primary-foreground shadow-sm shadow-primary/30">
                <Activity className="size-3.5" />
              </span>
              SampleProject
            </Link>
          </header>
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </SocketProvider>
  )
}
