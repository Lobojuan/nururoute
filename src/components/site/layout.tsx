import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Wallet, ArrowUpRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DEMO_NOTICE, formatGhs, useDemo } from "@/lib/demo";
import { useApiStatus } from "@/lib/console-api";
import { DemoBadge } from "./primitives";
import { DemoSafeguards } from "./demo-safeguards";
import { MotionControls } from "@/components/site/motion-controls";
import { PILOT_LABEL } from "@/lib/pilot-demo";
import { SupportWidget } from "./support-widget";
import { TickingMoney } from "./motion";

export type SitePath = "/" | "/models" | "/studio" | "/developers" | "/console" | "/pricing" | "/impact" | "/investors" | "/wallet";

export const NAV: readonly { to: SitePath; label: string }[] = [
  { to: "/models", label: "Models" },
  { to: "/studio", label: "Creative studio" },
  { to: "/developers", label: "Developers" },
  { to: "/console", label: "Console" },
  { to: "/pricing", label: "Pricing" },
  { to: "/impact", label: "Impact" },
  { to: "/investors", label: "Investors" },
];

export function Logo({ invert = false, className }: { invert?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="NuruRoute home">
      <span className="relative grid size-8 place-items-center rounded-lg bg-navy text-navy-foreground shadow-sm">
        <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-electric/60 to-cyan/40" aria-hidden />
        <svg viewBox="0 0 24 24" className="relative size-4.5" fill="none" aria-hidden>
          <path d="M5 18V6l14 12V6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="19" cy="6" r="2" className="fill-gold" />
        </svg>
      </span>
      <span className={cn("font-display text-lg font-semibold tracking-tight", invert ? "text-navy-foreground" : "text-foreground")}>
        Nuru<span className="text-electric">Route</span>
      </span>
    </Link>
  );
}

export function BalancePill({ className }: { className?: string }) {
  const { available, reserved, hydrated, linked } = useDemo();
  return (
    <Link
      to={linked ? "/console" : "/wallet"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-electric/50",
        className,
      )}
      aria-label="Demo wallet balance"
    >
      <Wallet className="size-3.5 text-electric" aria-hidden />
      {hydrated ? <TickingMoney pesewas={available} /> : <span className="tabular">GHS —</span>}
      {hydrated && reserved > 0 && (
        <span className="text-muted-foreground tabular">· {formatGhs(reserved)} held</span>
      )}
      <span className={cn("hidden text-[10px] font-bold uppercase tracking-wider sm:inline", linked ? "text-cyan-foreground" : "text-gold-foreground")}>{linked ? "Live org" : "Demo"}</span>
    </Link>
  );
}

export function DataSourceBadge({ className }: { className?: string }) {
  const status = useApiStatus();
  return (
    <Link
      to="/console"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
        status === "live" && "border-cyan/40 bg-cyan/10 text-cyan-foreground hover:border-cyan",
        status === "simulated" && "border-gold/40 bg-gold/10 text-gold-foreground hover:border-gold",
        status === "checking" && "border-border bg-muted text-muted-foreground",
        className,
      )}
      aria-label={status === "live" ? "Console connected to live API" : status === "simulated" ? "Console using simulated data" : "Checking API connection"}
      title={status === "live" ? "Console is reading live organisation data" : status === "simulated" ? "Console is showing labelled demo data" : "Checking data source…"}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "live" && "animate-pulse bg-cyan",
          status === "simulated" && "bg-gold",
          status === "checking" && "animate-pulse bg-muted-foreground/50",
        )}
        aria-hidden
      />
      {status === "live" ? "Live data" : status === "simulated" ? "Demo data" : "Checking"}
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container-site flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname.startsWith(n.to) && "text-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <DataSourceBadge className="hidden md:inline-flex" />
          <BalancePill className="hidden sm:inline-flex" />
          <Button asChild size="sm" className="hidden bg-electric text-electric-foreground hover:bg-electric/90 md:inline-flex">
            <Link to="/wallet">Try the demo</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm overflow-y-auto">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-2 flex flex-col gap-6">
                <Logo />
                <BalancePill className="self-start" />
                <nav className="flex flex-col" aria-label="Mobile">
                  {([{ to: "/", label: "Home" }, { to: "/wallet", label: "Wallet demo" }, ...NAV] as { to: SitePath; label: string }[]).map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                    >
                      {n.label}
                    </Link>
                  ))}
                </nav>
                <p className="rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-foreground">{DEMO_NOTICE}</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="border-t border-border/60 bg-muted/50 sm:hidden">
        <div className="container-site flex h-9 items-center justify-between">
          <BalancePill className="border-0 bg-transparent px-0 shadow-none" />
          <span className="flex items-center gap-1.5">
            <DataSourceBadge />
            <DemoBadge />
          </span>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="kente-strip" aria-hidden />
      <div className="container-site grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A trusted access, pricing, routing and local-wallet layer for global AI tools — built
            Ghana-first, ready for Africa.
          </p>
          <p className="mt-4 inline-flex rounded-md bg-gold/10 px-2.5 py-1.5 text-xs font-medium text-gold-foreground">
            {DEMO_NOTICE}
          </p>
        </div>
        <FooterCol title="Product" links={[["/models", "Model catalogue"], ["/studio", "Creative studio"], ["/developers", "Developer studio"], ["/console", "Organisation console"], ["/wallet", "Wallet demo"]]} />
        <FooterCol title="Company" links={[["/pricing", "Pricing"], ["/impact", "Impact"], ["/investors", "Investors"]]} />
        <div>
          <h3 className="text-sm font-semibold">Investor simulation</h3>
          <a
            href="https://demo.nururoute.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-electric hover:underline"
          >
            Open investor demo <ArrowUpRight className="size-4" aria-hidden />
          </a>
          <p className="mt-6 text-xs text-muted-foreground">
            No provider partnerships, live integrations, customers or financial results are claimed.
            All pricing is illustrative.
          </p>
        </div>
      </div>
      <div className="container-site grid gap-6 pb-10 lg:grid-cols-[1fr_320px] lg:items-start"><DemoSafeguards /><MotionControls /></div>
      <TestedOnBar />
      <div className="border-t border-border">
        <div className="container-site py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-foreground">Credits</p>
          <p className="mt-2 max-w-3xl text-sm text-foreground">
            NuruRoute is the vision of <strong className="font-semibold">Thomas Baafi</strong> and{" "}
            <strong className="font-semibold">Uffe Jon Carlson</strong> — visionaries on the African AI market space — brought to life
            with the NuruRoute developers.
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-site flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} NuruRoute. Accra, Ghana.</span>
          <span>Public demo experience · simulated wallet and AI activity only.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [SitePath, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-sm text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  // The unlinked /admin demo area renders its own chrome so it is visibly separate from public pages.
  const isAdmin = useRouterState({ select: (s) => s.location.pathname.startsWith("/admin") });
  if (isAdmin) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div role="status" className="border-b border-gold/30 bg-gold/10 text-center text-xs font-medium text-gold-foreground">
        <p className="container-site py-1.5">{PILOT_LABEL}</p>
      </div>
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <SupportWidget />
    </div>
  );
}


/** Public quality bar: what every release of the demo is checked against. */
function TestedOnBar() {
  const items = [
    ["390px", "Phone-first layouts, no horizontal scroll"],
    ["820 · 1280 · 1440", "Tablet, laptop and projector widths"],
    ["Reduced motion", "OS preference respected; presets in the footer"],
    ["Keyboard & screen reader", "Named landmarks, focus rings, live regions"],
    ["Offline-safe demo", "No live money or AI; works without a backend"],
    ["Visual regression", "Every route screenshotted at each width before release"],
  ] as const;
  return (
    <div className="border-t border-border bg-muted/40">
      <div className="container-site py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Tested on · every release</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {items.map(([k, v]) => (
            <li key={k} className="rounded-xl border border-border bg-card px-3 py-2">
              <p className="text-xs font-semibold tabular">{k}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{v}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
