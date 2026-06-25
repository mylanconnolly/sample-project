import type { ComponentType } from "react"
import { Link } from "@tanstack/react-router"
import {
  Activity,
  ChevronsUpDown,
  LayoutDashboardIcon,
  ShieldIcon,
  LogOut,
  User,
} from "lucide-react"
import { ThemeSwitch } from "@/components/ThemeSwitch"
import { UserAvatar } from "@/components/UserAvatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  label: string
  name: string | null
  email: string
  hasName: boolean
  isAdmin: boolean
  /** Called when a nav target is chosen, so the mobile drawer can close itself. */
  onNavigate?: () => void
}

/**
 * Left navigation rail for the authenticated app. Sits on the warm `--sidebar`
 * canvas tone (deliberately *not* white — white is reserved for content cards,
 * so the chrome reads as a frame). On desktop it's a fixed full-height rail; on
 * mobile the `/app` layout slides it in as a drawer.
 */
export function AppSidebar({
  label,
  name,
  email,
  hasName,
  isAdmin,
  onNavigate,
}: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-4">
        <Link
          to="/app"
          onClick={onNavigate}
          className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tight"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[color-mix(in_oklch,var(--primary),white_15%)] to-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Activity className="size-4" />
          </span>
          SampleProject
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <SidebarLink
          to="/app"
          exact
          icon={LayoutDashboardIcon}
          onNavigate={onNavigate}
        >
          Dashboard
        </SidebarLink>
        {isAdmin ? (
          <SidebarLink
            to="/app/admin"
            icon={ShieldIcon}
            onNavigate={onNavigate}
          >
            Admin
          </SidebarLink>
        ) : null}
      </nav>

      <div className="space-y-2 border-t border-foreground/10 p-3">
        <div className="flex justify-center">
          <ThemeSwitch />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-auto w-full justify-start gap-2.5 py-1.5 hover:bg-sidebar-accent data-popup-open:bg-sidebar-accent"
              />
            }
          >
            <UserAvatar
              name={name}
              email={email}
              className="size-7 text-[11px]"
            />
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span className="max-w-full truncate text-xs font-medium">
                {label}
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {isAdmin ? "Administrator" : "Member"}
              </span>
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-56"
          >
            <div className="flex items-center gap-2.5 px-1.5 py-1.5">
              <UserAvatar
                name={name}
                email={email}
                className="size-8 text-xs"
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium">{label}</span>
                {hasName ? (
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {email}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {isAdmin ? "Administrator" : "Member"}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link to="/app/me" onClick={onNavigate} />}
            >
              <User className="size-4 text-muted-foreground" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Full-page nav to the server sign-out route, which clears the session. */}
            <DropdownMenuItem render={<a href="/sign-out" />}>
              <LogOut className="size-4 text-muted-foreground" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

interface SidebarLinkProps {
  to: string
  exact?: boolean
  icon: ComponentType<{ className?: string }>
  onNavigate?: () => void
  /** Optional count chip shown on the right; hidden while loading or when zero. */
  count?: number
  children: React.ReactNode
}

/** A nav row: icon + label, with an accent pill and ember icon when active. */
function SidebarLink({
  to,
  exact,
  icon: Icon,
  onNavigate,
  count,
  children,
}: SidebarLinkProps) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: Boolean(exact) }}
      onClick={onNavigate}
      className={cn(
        "group/nav flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
        "aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/nav:text-foreground group-aria-[current=page]/nav:text-primary" />
      <span className="flex-1 truncate">{children}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground group-aria-[current=page]/nav:bg-primary/15 group-aria-[current=page]/nav:text-primary">
          {count}
        </span>
      ) : null}
    </Link>
  )
}
