import { Badge } from "@/components/ui/badge"

/** Renders a user's active status as a Badge. */
export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "destructive"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}
