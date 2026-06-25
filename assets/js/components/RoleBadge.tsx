import { ShieldIcon, UserIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/** Renders a user's role as an icon + label Badge (admins use the warning color). */
export function RoleBadge({ role }: { role: "admin" | "user" }) {
  if (role === "admin") {
    return (
      <Badge variant="warning">
        <ShieldIcon data-icon="inline-start" />
        admin
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      <UserIcon data-icon="inline-start" />
      user
    </Badge>
  )
}
