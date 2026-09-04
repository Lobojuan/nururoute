import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, LayoutDashboard, Coins, LifeBuoy, BookOpenCheck, Power, LogOut, ShieldAlert, RotateCcw, Rocket, Landmark, FileSignature } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/admin" as const, label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/pricing" as const, label: "Pricing control", icon: Coins, exact: false },
  { to: "/admin/support" as const, label: "Support centre", icon: LifeBuoy, exact: false },
  { to: "/admin/knowledge" as const, label: "Knowledge base", icon: BookOpenCheck, exact: false },
  { to: "/admin/programme" as const, label: "Pilot programme", icon: Rocket, exact: false },
  { to: "/admin/pilot" as const, label: "Pilot controls", icon: Power, exact: false },
  { to: "/admin/payments" as const, label: "Collections", icon: Landmark, exact: false },
  { to: "/admin/contracts" as const, label: "Contracts", icon: FileSignature, exact: false },
];

export function AdminBanner() {
  return (
    <div role="status" className="border-b border-destructive/40 bg-destructive/10 text-foreground">
      <div className="container-site flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5 text-destructive"><ShieldAlert className="size-3.5" aria-hidden /> Demo admin — simulated data only</span>
        <span className="font-normal text-muted-foreground">Not a production system. No real customers, payments, keys or provider calls.</span>
      </div>
    </div>
  );
}

export function AdminShell({ children, onLeave, onReset }: { children: ReactNode; onLeave: () => void; onReset: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-muted/40" aria-label="Demo admin area">
      <AdminBanner />
      <header className="border-b border-border bg-card">
        <div className="container-site flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" aria-hidden /> Public site</Link>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <p className="truncate font-display text-sm font-semibold">NuruRoute <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-destructive">Demo admin</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={onReset} className="text-xs" aria-label="Reset demo"><RotateCcw /><span className="hidden sm:inline">Reset demo</span></Button>
            <Button variant="outline" size="sm" onClick={onLeave} className="text-xs" aria-label="Leave admin"><LogOut /><span className="hidden sm:inline">Leave admin</span></Button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="container-site -mb-px flex gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} aria-current={active ? "page" : undefined} className={cn("inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors", active ? "border-electric text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <n.icon className="size-4" aria-hidden /> {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="container-site py-8">{children}</main>
      <footer className="container-site pb-10 text-xs text-muted-foreground">
        Internal simulation for investor review. Figures on these screens are illustrative and never shown on public pages. A production phase would require official provider credentials, approved commercial terms, secure server-side processing, privacy review and explicit approval.
      </footer>
    </div>
  );
}

export function AdminCard({ title, hint, children, className, action }: { title: string; hint?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function KV({ label, value, strong, tone }: { label: string; value: ReactNode; strong?: boolean; tone?: "good" | "warn" | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular", strong && "font-semibold", tone === "good" && "text-success", tone === "warn" && "text-destructive")}>{value}</span>
    </div>
  );
}
