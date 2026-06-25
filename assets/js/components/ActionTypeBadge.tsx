import { EyeIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AccessLogActionType } from "@/lib/ashRpc"

const META: Record<
  AccessLogActionType,
  {
    label: string
    variant: "secondary" | "success" | "info" | "destructive"
    icon: typeof EyeIcon
  }
> = {
  read: { label: "read", variant: "secondary", icon: EyeIcon },
  create: { label: "create", variant: "success", icon: PlusIcon },
  update: { label: "update", variant: "info", icon: PencilIcon },
  destroy: { label: "destroy", variant: "destructive", icon: Trash2Icon },
}

/** Renders an access-log action type as an icon + label Badge. */
export function ActionTypeBadge({
  actionType,
}: {
  actionType: AccessLogActionType
}) {
  const { label, variant, icon: Icon } = META[actionType]

  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {label}
    </Badge>
  )
}
