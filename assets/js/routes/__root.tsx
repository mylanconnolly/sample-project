import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  errorComponent: ErrorScreen,
  pendingComponent: PendingScreen,
})

function ErrorScreen({ error }: { error: unknown }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function PendingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="size-8" />
    </div>
  )
}
