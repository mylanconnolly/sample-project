import { createFileRoute, redirect } from "@tanstack/react-router"
import { Card, CardContent } from "@/components/ui/card"
import { SignInForm } from "@/components/SignInForm"
import { meQueryOptions } from "@/lib/ashRpc"

export const Route = createFileRoute("/sign-in")({
  // Already signed in → send straight to the app instead of the sign-in form.
  beforeLoad: async ({ context }) => {
    const currentUser = await context.queryClient
      .ensureQueryData(meQueryOptions())
      .catch(() => null)
    if (currentUser) throw redirect({ to: "/app" })
  },
  component: SignIn,
})

function SignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
    </div>
  )
}
