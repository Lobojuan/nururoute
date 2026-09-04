import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ShieldAlert, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminBanner, AdminShell } from "@/components/admin/admin-shell";
import { ADMIN_PASSPHRASE, useAdminStore } from "@/lib/admin-demo";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  head: () => pageMeta("/admin", "Demo admin — NuruRoute simulation", "Internal demo administration area for the NuruRoute investor simulation. Not indexed.", { noindex: true }),
  component: AdminLayout,
});

function AdminLayout() {
  const store = useAdminStore();
  if (!store.state) {
    return (
      <div className="min-h-screen bg-muted/40">
        <AdminBanner />
        <div className="container-site py-16">
          <h1 className="font-display text-2xl font-semibold">Demo admin area</h1>
          <p className="mt-2 text-sm text-muted-foreground" role="status">Loading demo admin…</p>
        </div>
      </div>
    );
  }
  if (!store.state.entered) return <Gate onEnter={store.enter} />;
  return (
    <AdminShell onLeave={store.leave} onReset={store.resetAll}>
      <Outlet />
    </AdminShell>
  );
}

function Gate({ onEnter }: { onEnter: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (pass.trim().toLowerCase() === ADMIN_PASSPHRASE) onEnter();
    else setErr(`Type “${ADMIN_PASSPHRASE}” to enter. This is a simulation gate, not a login.`);
  }
  return (
    <div className="min-h-screen bg-muted/40" aria-label="Demo admin area">
      <AdminBanner />
      <div className="container-site flex justify-center py-16 sm:py-24">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><KeyRound className="size-5" aria-hidden /></span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Demo admin gate</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This gate is a simulation, not authentication. It only unlocks illustrative admin screens in this browser. There are no real user accounts, customer data, payments, secrets or provider connections behind it.
          </p>
          <label htmlFor="admin-pass" className="mt-6 block text-sm font-medium">Demo passphrase</label>
          <input id="admin-pass" value={pass} onChange={(e) => { setPass(e.target.value); setErr(null); }} placeholder={`Type “${ADMIN_PASSPHRASE}”`} autoComplete="off" className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus:ring-1 focus:ring-ring" aria-describedby="admin-pass-hint" />
          <p id="admin-pass-hint" className="mt-1.5 text-xs text-muted-foreground">Shown on purpose — the passphrase is <code className="rounded bg-muted px-1">{ADMIN_PASSPHRASE}</code>.</p>
          {err && <p role="alert" className="mt-3 inline-flex items-start gap-2 text-sm text-destructive"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {err}</p>}
          <Button type="submit" className="mt-5 w-full bg-navy text-navy-foreground hover:bg-navy/90">Enter demo admin</Button>
        </form>
      </div>
    </div>
  );
}
