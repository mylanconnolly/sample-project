import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { ComponentType } from "react"
import {
  ArrowRight,
  Bot,
  Sparkles,
  Rocket,
  Activity,
  KeyRound,
  ShieldCheck,
  Database,
  Boxes,
  Server,
  Plug,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { IconChip } from "@/components/IconChip"
import { userLabel } from "@/components/UserLabel"
import { meQueryOptions } from "@/lib/ashRpc"

export const Route = createFileRoute("/")({ component: Landing })

interface Feature {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

const pillars: Feature[] = [
  {
    icon: KeyRound,
    title: "Authentication, ready to go",
    description:
      "Invite-only magic-link sign-in built on Ash Authentication, with user roles, activation, and per-user API keys — no password handling to get wrong.",
  },
  {
    icon: Bot,
    title: "Agent memory over MCP",
    description:
      "A durable memory store AI agents can read and write over the Model Context Protocol, with local in-BEAM embeddings powering semantic recall — no external vector service.",
  },
  {
    icon: ShieldCheck,
    title: "Admin & audit, batteries included",
    description:
      "An admin area for users and settings, an append-only access log for who-saw-what, and encrypted-at-rest config for your third-party credentials.",
  },
]

const features: Feature[] = [
  {
    icon: Boxes,
    title: "Ash + Phoenix backend",
    description:
      "Resources, policies, and actions modeled with Ash, served over a typed RPC layer — your domain logic in one place.",
  },
  {
    icon: Server,
    title: "React + TanStack frontend",
    description:
      "A Vite-built React SPA with TanStack Router and Query, plus generated TypeScript types for every RPC call.",
  },
  {
    icon: Plug,
    title: "MCP server",
    description:
      "Expose Ash actions to AI assistants over MCP, authenticated by API key and bounded by the same policies as your UI.",
  },
  {
    icon: Sparkles,
    title: "Local embeddings",
    description:
      "bge-small-en-v1.5 runs in-BEAM via Bumblebee + Nx for semantic search, with a deterministic stub in tests.",
  },
  {
    icon: Database,
    title: "Postgres + pgvector",
    description:
      "AshPostgres with the vector extension, Oban for background jobs, and a clean baseline migration to build on.",
  },
  {
    icon: ShieldCheck,
    title: "Access logging",
    description:
      "Opt-in, append-only audit trail of reads and writes per resource — wire it onto your own resources as you add them.",
  },
]

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Pillars />
        <FeatureGrid />
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a
          href="#top"
          className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tight"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[color-mix(in_oklch,var(--primary),white_15%)] to-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Activity className="size-4" />
          </span>
          SampleProject
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a
            href="#pillars"
            className="transition-colors hover:text-foreground"
          >
            Overview
          </a>
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Stack
          </a>
        </nav>
        <HeaderAuth />
      </div>
    </header>
  )
}

function HeaderAuth() {
  // The home page is public, so this query is allowed to fail (anonymous
  // visitors get a forbidden result and see the signed-out link).
  const { data: user, isPending, isFetched } = useQuery(meQueryOptions())

  // Reserve space only on the very first load, before the query has ever
  // settled. We deliberately gate on `isFetched` rather than bare `isPending`:
  // for a signed-out visitor the `me` query errors with no data, and hovering
  // the sign-in link preloads the `/sign-in` route, whose `beforeLoad`
  // refetches `me`. In TanStack Query v5 refetching a query whose data is
  // undefined flips its status back to `pending`, so a bare `isPending` check
  // would collapse the header to this placeholder on every hover — the link
  // would vanish from under the cursor and flicker, making it unclickable.
  if (isPending && !isFetched) {
    return <div className="h-8 w-20" aria-hidden />
  }

  if (user) {
    return (
      <Link
        to="/app"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "font-mono",
        )}
        title="Go to your dashboard"
      >
        {userLabel(user)}
      </Link>
    )
  }

  // Invite-only app: there's no self-serve registration, so the only signed-out
  // action is signing in (a magic-link request for an already-invited email).
  return (
    <Link to="/sign-in" className={cn(buttonVariants({ size: "sm" }))}>
      Sign in
    </Link>
  )
}

/**
 * Resolves the primary CTA against the viewer's auth state: signed-in visitors
 * are sent into the app, everyone else to sign-in. `ready` is false only on the
 * very first load before `me` settles — gate the button on it to avoid flashing
 * "Sign in" before swapping to "Go to dashboard". Shares the `me` query (and its
 * flicker handling) with `HeaderAuth`.
 */
function useAuthCta() {
  const { data: user, isPending, isFetched } = useQuery(meQueryOptions())
  const signedIn = Boolean(user)
  return {
    ready: !(isPending && !isFetched),
    signedIn,
    to: signedIn ? "/app" : "/sign-in",
    label: signedIn ? "Go to dashboard" : "Sign in",
  } as const
}

/** The hero's primary CTA: filled, with a trailing arrow. */
function HeroPrimaryCta() {
  const cta = useAuthCta()
  if (!cta.ready) return <div className="h-11 w-44" aria-hidden />
  return (
    <Link to={cta.to} className={cn(buttonVariants({ size: "lg" }), "group")}>
      {cta.label}
      <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-foreground/10"
    >
      {/* subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 text-center md:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card px-3 py-1 font-mono text-[11px] font-medium tracking-tight text-muted-foreground ring-1 ring-foreground/5">
          <Sparkles className="size-3.5" />
          An Ash + Phoenix + React starter kit
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl font-heading text-5xl font-semibold tracking-tight text-balance md:text-6xl">
          Start your next app on a solid foundation.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground text-balance">
          SampleProject is a batteries-included boilerplate: authentication,
          an admin area, an audit log, an agent-memory store over MCP, and a
          typed React frontend — wired together and ready to build on.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <HeroPrimaryCta />
          <a
            href="#pillars"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            See what's included
          </a>
        </div>
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          $ mix setup · iex -S mix phx.server · start building
        </p>

        <StackPreview />
      </div>
    </section>
  )
}

function StackPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-4xl">
      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-card text-left shadow-2xl shadow-foreground/5 ring-1 ring-foreground/5">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-foreground/10 bg-muted/40 px-4 py-3">
          <span className="size-3 rounded-full bg-foreground/15" />
          <span className="size-3 rounded-full bg-foreground/15" />
          <span className="size-3 rounded-full bg-foreground/15" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">
            sampleproject ~/app
          </span>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <StatCard icon={KeyRound} label="Auth" value="Magic link" trend="invite-only" />
          <StatCard icon={Bot} label="Memory" value="MCP" trend="+ embeddings" />
          <StatCard icon={ShieldCheck} label="Admin" value="Built in" trend="users · audit" />
        </div>
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          <PreviewPanel title="Backend" icon={Boxes}>
            <PreviewRow label="Ash" text="resources, policies & actions" />
            <PreviewRow label="Phoenix" text="endpoint, channels & typed RPC" />
            <PreviewRow label="Postgres" text="AshPostgres + pgvector + Oban" />
          </PreviewPanel>
          <PreviewPanel title="Frontend" icon={Server}>
            <PreviewRow label="React" text="Vite SPA shell" />
            <PreviewRow label="TanStack" text="Router + Query" />
            <PreviewRow label="Types" text="generated from your RPC actions" />
          </PreviewPanel>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  trend: string
}) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="font-mono text-[11px] tracking-tight uppercase">
          {label}
        </span>
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="font-mono text-xs text-muted-foreground">{trend}</div>
    </div>
  )
}

function PreviewPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-4" />
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function PreviewRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 truncate">{text}</span>
    </div>
  )
}

function Pillars() {
  return (
    <section id="pillars" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 font-mono text-xs tracking-tight text-muted-foreground">
          // what's included
        </p>
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          The boring parts, already done
        </h2>
        <p className="mt-4 text-muted-foreground">
          The plumbing every app needs — so you can delete what you don't and
          build what you do.
        </p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {pillars.map((p) => (
          <div
            key={p.title}
            className="group rounded-xl border border-foreground/10 bg-card p-6 ring-1 ring-foreground/5 transition-colors hover:border-foreground/20"
          >
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
              <p.icon className="size-5" />
            </span>
            <h3 className="mt-5 font-heading text-lg font-medium">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {p.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeatureGrid() {
  return (
    <section
      id="features"
      className="border-y border-foreground/10 bg-muted/30"
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 font-mono text-xs tracking-tight text-muted-foreground">
            // the stack
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            A modern Elixir + React stack, wired together
          </h2>
          <p className="mt-4 text-muted-foreground">
            Opinionated where it helps, out of your way where it doesn't.
          </p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-card p-6">
              <div className="flex items-center gap-3">
                <IconChip icon={f.icon} />
                <h3 className="font-heading font-medium">{f.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CallToAction() {
  const cta = useAuthCta()
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative">
          <Rocket className="mx-auto size-8 opacity-80" />
          <h2 className="mx-auto mt-5 max-w-xl font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Skip the setup. Start with the app.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-primary-foreground/90">
            {cta.signedIn
              ? "Everything's wired up — head into the app and start building."
              : "Sign in to explore the admin area, API keys, and the agent-memory store."}
          </p>
          {cta.ready ? (
            <Link
              to={cta.to}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "group mt-8 border-transparent bg-background text-foreground hover:bg-background/90",
              )}
            >
              {cta.label}
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <div className="mt-8 h-11" aria-hidden />
          )}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  // Mirror the header: only offer "Sign in" to signed-out visitors. Gate on
  // `isFetched` so a signed-in user never briefly sees the link before the
  // `me` query resolves.
  const { data: user, isFetched } = useQuery(meQueryOptions())

  return (
    <footer className="border-t border-foreground/10">
      {/* A 3-column grid (not justify-between) keeps the copyright centered
          whether or not the "Sign in" link is present. */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-4 px-6 py-8 text-sm text-muted-foreground sm:grid-cols-3">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-[color-mix(in_oklch,var(--primary),white_15%)] to-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Activity className="size-3.5" />
          </span>
          <span className="font-mono font-medium text-foreground">
            SampleProject
          </span>
        </div>
        <p className="text-center">
          © {new Date().getFullYear()} SampleProject. Ash + Phoenix + React, end
          to end.
        </p>
        <div className="flex justify-center sm:justify-end">
          {isFetched && !user ? (
            <Link
              to="/sign-in"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
