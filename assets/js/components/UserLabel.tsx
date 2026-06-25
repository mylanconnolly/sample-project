import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ExternalLinkIcon, MailIcon } from "lucide-react"
import { ActiveBadge } from "@/components/ActiveBadge"
import { RoleBadge } from "@/components/RoleBadge"
import { UserAvatar } from "@/components/UserAvatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { meQueryOptions } from "@/lib/ashRpc"
import { cn } from "@/lib/utils"

/** The minimal user shape the label needs; loaded user records satisfy it
 * structurally (`email` is left as `unknown` to tolerate ci_string types). */
export type Labelable = { name?: string | null; email: unknown }

/** The richer shape the popover can display when the fields are loaded. */
type PopoverUser = Labelable & {
  id?: string | null
  role?: string | null
  active?: boolean | null
}

/** Prefer a non-blank display name; fall back to the email address. */
export function userLabel(user: Labelable): string {
  const name = user.name?.trim()
  return name ? name : String(user.email)
}

interface UserLabelProps {
  user?: PopoverUser | null
  /** Text rendered when there is no user. */
  fallback?: string
  /** Classes applied to the clickable trigger (or the fallback span). */
  className?: string
}

/**
 * A user's name rendered as a button that opens a popover with their details
 * (avatar, name, email, role, status). Admins additionally get a link to the
 * user's detail page. Reusable anywhere a user is shown.
 */
export function UserLabel({
  user,
  fallback = "Unassigned",
  className,
}: UserLabelProps) {
  const { data: currentUser } = useQuery(meQueryOptions())

  if (!user) {
    return (
      <span className={cn("text-muted-foreground", className)}>{fallback}</span>
    )
  }

  const email = String(user.email)
  const displayName = userLabel(user)
  const role = user.role === "admin" || user.role === "user" ? user.role : null
  const showAdminLink = currentUser?.role === "admin" && Boolean(user.id)

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "cursor-pointer rounded text-left underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          className,
        )}
      >
        {displayName}
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center gap-3">
          <UserAvatar
            name={user.name ?? null}
            email={email}
            className="size-10 text-sm"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName}</p>
            <a
              href={`mailto:${email}`}
              className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              <MailIcon className="size-3.5 shrink-0" />
              <span className="truncate">{email}</span>
            </a>
          </div>
        </div>

        {role || typeof user.active === "boolean" ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-foreground/10 pt-3">
            {role ? <RoleBadge role={role} /> : null}
            {typeof user.active === "boolean" ? (
              <ActiveBadge active={user.active} />
            ) : null}
          </div>
        ) : null}

        {showAdminLink ? (
          <Link
            to="/app/admin/users/$userId"
            params={{ userId: String(user.id) }}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLinkIcon className="size-3.5 shrink-0" />
            Open user details
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
