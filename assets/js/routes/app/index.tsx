import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { ComponentType } from "react"
import { ShieldIcon, UserIcon } from "lucide-react"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { IconChip } from "@/components/IconChip"
import { userLabel } from "@/components/UserLabel"
import { meQueryOptions } from "@/lib/ashRpc"

export const Route = createFileRoute("/app/")({
  component: Dashboard,
})

export function Dashboard() {
  // Prefetched by the /app gate; live-updates via channel payload pushes.
  const { data: user } = useQuery(meQueryOptions())
  const name = user ? userLabel(user) : "there"
  const isAdmin = user?.role === "admin"

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <Breadcrumbs items={[{ label: "dashboard" }]} />
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          Welcome back, {name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and settings from here.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard
          to="/app/me"
          icon={UserIcon}
          title="Profile"
          description="Update your display name and manage your personal API keys."
        />
        {isAdmin ? (
          <SectionCard
            to="/app/admin"
            icon={ShieldIcon}
            title="Admin"
            description="Manage users, settings, the access log, and memories."
          />
        ) : null}
      </div>
    </div>
  )
}

function SectionCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-foreground/10 bg-card p-5 ring-1 ring-foreground/5 transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center gap-3">
        <IconChip icon={Icon} />
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {title}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
