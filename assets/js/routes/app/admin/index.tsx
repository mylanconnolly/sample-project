import type { ComponentType } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  BrainCircuit,
  HardDrive,
  ScrollText,
  Sparkles,
  Users,
} from "lucide-react"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { IconChip } from "@/components/IconChip"

/**
 * Admin landing page, mounted at `/app/admin`. A simple directory of the admin
 * sections. The parent `/app/admin` route already gates non-admins.
 */
export const Route = createFileRoute("/app/admin/")({ component: AdminHome })

function AdminHome() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumbs items={[{ label: "admin" }]} />
      <h1 className="mt-1 mb-6 font-heading text-3xl font-semibold tracking-tight">
        Admin
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard
          to="/app/admin/users"
          icon={Users}
          title="Users"
          description="Invite people, manage roles, and activate or deactivate accounts."
        />
        <SectionCard
          to="/app/admin/ai"
          icon={Sparkles}
          title="AI"
          description="Configure the Anthropic API key and default Claude model for LLM features."
        />
        <SectionCard
          to="/app/admin/gcs"
          icon={HardDrive}
          title="Storage"
          description="Configure the Google Cloud Storage bucket used for file storage."
        />
        <SectionCard
          to="/app/admin/access-log"
          icon={ScrollText}
          title="Access log"
          description="Review who has accessed records across the application."
        />
        <SectionCard
          to="/app/admin/memories"
          icon={BrainCircuit}
          title="Memories"
          description="View and manage the knowledge agents record and recall over MCP."
        />
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
