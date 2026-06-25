import { createFileRoute, redirect, Outlet } from "@tanstack/react-router"

/**
 * Admin section layout, mounted at `/app/admin`. Gates every child route on the
 * current user being an admin (the user is already loaded by the `/app` gate and
 * passed down through route context). Non-admins are bounced to the dashboard.
 */
export const Route = createFileRoute("/app/admin")({
  beforeLoad: ({ context }) => {
    if (context.currentUser?.role !== "admin") {
      throw redirect({ to: "/app" })
    }
  },
  component: () => <Outlet />,
})
