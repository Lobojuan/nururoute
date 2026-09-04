import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Wallet,
  KeyRound,
  RefreshCw,
  Plug,
  PlugZap,
  LogOut,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Sparkles,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section, SectionHead, DemoNotice, Stat } from "@/components/site/primitives";
import { DemoSafeguards } from "@/components/site/demo-safeguards";
import { Reveal, Item, motion } from "@/components/site/motion";
import { formatGhs, useDemo } from "@/lib/demo";
import {
  consoleApi,
  session,
  ConsoleError,
  type Me,
  type Org,
  type WalletBalance,
  type LedgerEntry,
  type UsageRequest,
  type ApiKeySummary,
  type OrgModel,
} from "@/lib/console-api";
import { cn } from "@/lib/utils";

const TITLE = "Organisation console — NuruRoute";
const DESC =
  "Manage NuruRoute organisations: wallet balances, ledger, usage, model pricing and API keys. Reads live data when connected; otherwise shows a labelled demo simulation.";

export const Route = createFileRoute("/console")({
  head: () => pageMeta("/console", TITLE, DESC, { card: "summary_large_image", noindex: true }),
  component: ConsolePage,
});

type Mode = "checking" | "live" | "simulated";

// ---------- simulated dataset (used only when the API is unreachable) ----------
const SIM_ORGS: (Org & { wallet: WalletBalance })[] = [
  { id: "sim-accra-agency", name: "Adinkra Creative Agency (Accra)", role: "owner", walletId: "w-sim-1", wallet: { walletId: "w-sim-1", currency: "GHS", availablePesewas: 48_250, reservedPesewas: 1_260, lifetimeTopUpsPesewas: 120_000, lifetimeSpentPesewas: 70_490 } },
  { id: "sim-kumasi-dev", name: "Kumasi Dev Collective", role: "owner", walletId: "w-sim-2", wallet: { walletId: "w-sim-2", currency: "GHS", availablePesewas: 9_800, reservedPesewas: 0, lifetimeTopUpsPesewas: 30_000, lifetimeSpentPesewas: 20_200 } },
  { id: "sim-legon-lab", name: "Legon Research Lab", role: "member", walletId: "w-sim-3", wallet: { walletId: "w-sim-3", currency: "GHS", availablePesewas: 0, reservedPesewas: 0, lifetimeTopUpsPesewas: 5_000, lifetimeSpentPesewas: 5_000 } },
];
const SIM_LEDGER: LedgerEntry[] = [
  { id: "l1", entryType: "top_up", amountPesewas: 20_000, reservationId: null, metadata: { network: "MTN" }, createdAt: new Date(Date.now() - 3.6e6 * 26).toISOString() },
  { id: "l2", entryType: "reserve", amountPesewas: 3_360, reservationId: "r-1", metadata: { model: "video-cinema" }, createdAt: new Date(Date.now() - 3.6e6 * 25).toISOString() },
  { id: "l3", entryType: "settle", amountPesewas: 2_940, reservationId: "r-1", metadata: { model: "video-cinema" }, createdAt: new Date(Date.now() - 3.6e6 * 25 + 60_000).toISOString() },
  { id: "l4", entryType: "release", amountPesewas: 420, reservationId: "r-1", metadata: {}, createdAt: new Date(Date.now() - 3.6e6 * 25 + 61_000).toISOString() },
  { id: "l5", entryType: "reserve", amountPesewas: 1_260, reservationId: "r-2", metadata: { model: "dub-pro" }, createdAt: new Date(Date.now() - 900_000).toISOString() },
];
const SIM_REQUESTS: UsageRequest[] = [
  { id: "q1", model_id: "route-claude-code", status: "settled", input_tokens: 2_100, output_tokens: 1_400, reserved_pesewas: 90, actual_pesewas: 58, released_pesewas: 32, error_code: null, created_at: new Date(Date.now() - 5e6).toISOString() },
  { id: "q2", model_id: "route-kimi", status: "settled", input_tokens: 9_000, output_tokens: 3_000, reserved_pesewas: 60, actual_pesewas: 41, released_pesewas: 19, error_code: null, created_at: new Date(Date.now() - 4e6).toISOString() },
  { id: "q3", model_id: "route-openai", status: "rejected", input_tokens: null, output_tokens: null, reserved_pesewas: 0, actual_pesewas: null, released_pesewas: null, error_code: "INSUFFICIENT_FUNDS", created_at: new Date(Date.now() - 2e6).toISOString() },
];
const SIM_KEYS: ApiKeySummary[] = [
  { id: "k1", name: "CI pipeline", keyPrefix: "nn_test_4f2a", createdAt: new Date(Date.now() - 8.64e7 * 12).toISOString(), lastUsedAt: new Date(Date.now() - 3.6e6).toISOString(), revokedAt: null },
  { id: "k2", name: "Old laptop", keyPrefix: "nn_test_9c1e", createdAt: new Date(Date.now() - 8.64e7 * 40).toISOString(), lastUsedAt: null, revokedAt: new Date(Date.now() - 8.64e7 * 3).toISOString() },
];
const SIM_MODELS: OrgModel[] = [
  { id: "test-small", displayName: "Test Small", inputPricePer1kPesewas: 1, outputPricePer1kPesewas: 2, customPrice: false, examplePer1kPesewas: 2 },
  { id: "test-medium", displayName: "Test Medium", inputPricePer1kPesewas: 4, outputPricePer1kPesewas: 8, customPrice: true, examplePer1kPesewas: 6 },
  { id: "test-large", displayName: "Test Large", inputPricePer1kPesewas: 20, outputPricePer1kPesewas: 60, customPrice: false, examplePer1kPesewas: 40 },
];

function ConsolePage() {
  const demo = useDemo();
  const [mode, setMode] = useState<Mode>("checking");
  const [health, setHealth] = useState<{ paymentAdapter: string; paymentMode: string; providerAdapter: string } | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [requests, setRequests] = useState<UsageRequest[]>([]);
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [models, setModels] = useState<OrgModel[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Probe the API through the same-origin proxy.
  useEffect(() => {
    let cancelled = false;
    consoleApi
      .health()
      .then((h) => {
        if (cancelled) return;
        setHealth(h);
        setMode("live");
      })
      .catch(() => !cancelled && setMode("simulated"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore session when live.
  useEffect(() => {
    if (mode !== "live" || !session.get()) return;
    consoleApi
      .me()
      .then((m) => {
        setMe(m);
        const saved = session.org();
        const pick = m.organisations.find((o) => o.id === saved) ?? m.organisations[0];
        setOrgId(pick?.id ?? null);
      })
      .catch(() => session.set(null));
  }, [mode]);

  const org = useMemo(() => {
    if (mode === "simulated") return SIM_ORGS.find((o) => o.id === orgId) ?? SIM_ORGS[0]!;
    return me?.organisations.find((o) => o.id === orgId) ?? null;
  }, [mode, me, orgId]);

  const loadOrg = useCallback(
    async (id: string) => {
      if (mode === "simulated") {
        const o = SIM_ORGS.find((x) => x.id === id) ?? SIM_ORGS[0]!;
        setWallet(o.wallet);
        setLedger(SIM_LEDGER);
        setRequests(SIM_REQUESTS);
        setKeys(SIM_KEYS);
        setModels(SIM_MODELS);
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const [w, l, r, k, m] = await Promise.all([
          consoleApi.wallet(id),
          consoleApi.ledger(id),
          consoleApi.requests(id),
          consoleApi.apiKeys(id).catch(() => ({ keys: [] as ApiKeySummary[] })),
          consoleApi.models(id).catch(() => ({ models: [] as OrgModel[] })),
        ]);
        setWallet(w);
        setLedger(l.entries);
        setRequests(r.requests);
        setKeys(k.keys);
        setModels(m.models);
        const name = me?.organisations.find((o) => o.id === id)?.name ?? "Organisation";
        demo.syncFromWallet(name, w);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load organisation");
      } finally {
        setBusy(false);
      }
    },
    [mode, me, demo],
  );

  useEffect(() => {
    if (mode === "simulated") {
      setOrgId((id) => id ?? SIM_ORGS[0]!.id);
      void loadOrg(orgId ?? SIM_ORGS[0]!.id);
    } else if (mode === "live" && orgId) {
      session.setOrg(orgId);
      void loadOrg(orgId);
    }
  }, [mode, orgId, loadOrg]);

  const signIn = async (email: string, name: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await consoleApi.devLogin(email, name || undefined);
      session.set(r.token);
      const m = await consoleApi.me();
      setMe(m);
      setOrgId(m.organisations[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof ConsoleError ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    session.set(null);
    session.setOrg(null);
    setMe(null);
    setOrgId(null);
    setWallet(null);
    demo.unlink();
  };

  const createOrg = async (name: string) => {
    if (mode === "simulated") {
      setNotice("Creating organisations needs a live connection. This is the demo console.");
      return;
    }
    setBusy(true);
    try {
      const o = await consoleApi.createOrg(name);
      const m = await consoleApi.me();
      setMe(m);
      setOrgId(o.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create organisation");
    } finally {
      setBusy(false);
    }
  };

  const topUp = async (amount: number) => {
    if (!org) return;
    if (mode === "simulated") {
      setWallet((w) => (w ? { ...w, availablePesewas: w.availablePesewas + amount, lifetimeTopUpsPesewas: w.lifetimeTopUpsPesewas + amount } : w));
      setLedger((l) => [{ id: `sim-${Date.now()}`, entryType: "top_up", amountPesewas: amount, reservationId: null, metadata: { simulated: true }, createdAt: new Date().toISOString() }, ...l]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await consoleApi.simulateTopUp(org.id, amount);
      await loadOrg(org.id);
      setNotice(`Mock top-up of ${formatGhs(amount)} confirmed (simulated payment — no real money).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  };

  const runRequest = async (modelId: string) => {
    if (!org || mode === "simulated") {
      setNotice("Running requests on the live wallet needs a live connection.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await consoleApi.aiRequest(org.id, modelId, "Write a two-line Twi greeting for a Monday morning radio show.", 128);
      setNotice(`Reserved ${formatGhs(r.reservedPesewas)}, settled ${formatGhs(r.actualPesewas)}, released ${formatGhs(r.releasedPesewas)}.`);
      await loadOrg(org.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const [newSecret, setNewSecret] = useState<string | null>(null);
  const createKey = async (name: string) => {
    if (!org) return;
    if (mode === "simulated") {
      setNewSecret("nn_test_simulated_key_not_valid_anywhere");
      setKeys((k) => [{ id: `sim-${Date.now()}`, name, keyPrefix: "nn_test_sim0", createdAt: new Date().toISOString(), lastUsedAt: null, revokedAt: null }, ...k]);
      return;
    }
    setBusy(true);
    try {
      const r = await consoleApi.createApiKey(org.id, name);
      setNewSecret(r.secret);
      await loadOrg(org.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create key");
    } finally {
      setBusy(false);
    }
  };
  const revokeKey = async (id: string) => {
    if (!org) return;
    if (mode === "simulated") {
      setKeys((k) => k.map((x) => (x.id === id ? { ...x, revokedAt: new Date().toISOString() } : x)));
      return;
    }
    setBusy(true);
    try {
      await consoleApi.revokeApiKey(org.id, id);
      await loadOrg(org.id);
    } finally {
      setBusy(false);
    }
  };

  const orgs: Org[] = mode === "simulated" ? SIM_ORGS : (me?.organisations ?? []);
  const needsSignIn = mode === "live" && !me;

  return (
    <>
      <section className="surface-navy relative overflow-hidden">
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="container-site relative py-12 lg:py-16">
          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge mode={mode} />
            {health && mode === "live" && (
              <span className="rounded-full border border-navy-foreground/15 px-2.5 py-1 text-xs text-navy-foreground/70">
                Mock payments · Mock AI provider · No live money
              </span>
            )}
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-tight text-navy-foreground sm:text-4xl lg:text-5xl">
            Organisation console
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy-foreground/75 sm:text-lg">
            The same wallets, ledger, pricing and API keys as the authenticated dashboard. When a live
            connection is available, every number here is the real ledger and the header balance mirrors it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {mode === "simulated" && (
              <button
                type="button"
                onClick={() => {
                  setMode("checking");
                  consoleApi.health().then((h) => (setHealth(h), setMode("live"))).catch(() => setMode("simulated"));
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-electric px-4 py-2 text-sm font-medium text-electric-foreground hover:bg-electric/90"
              >
                <RefreshCw className="size-4" aria-hidden /> Retry live connection
              </button>
            )}
          </div>
        </div>
      </section>

      <Section>
        <DemoSafeguards compact className="mb-6" />
        {mode === "simulated" && (
          <DemoNotice className="mb-6">
            The console is currently showing a <strong>labelled demo simulation</strong> with example organisations.
            Press “Retry live connection” to manage real organisations. No money moves in either mode.
          </DemoNotice>
        )}
        {mode === "checking" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Checking live connection…
          </div>
        )}

        {needsSignIn && <SignIn busy={busy} error={error} onSubmit={signIn} />}

        {mode !== "checking" && !needsSignIn && (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* Org rail */}
            <aside className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Organisations</h2>
                {mode === "live" && me && (
                  <button type="button" onClick={signOut} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <LogOut className="size-3.5" aria-hidden /> {me.user.email.split("@")[0]}
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {orgs.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOrgId(o.id)}
                    className={cn(
                      "flex min-w-[220px] items-center gap-3 rounded-xl border p-3 text-left transition lg:min-w-0",
                      org?.id === o.id ? "border-electric bg-electric/5 shadow-sm" : "border-border bg-card hover:border-electric/40",
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy text-navy-foreground">
                      <Building2 className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{o.name}</span>
                      <span className="block text-xs capitalize text-muted-foreground">{o.role}</span>
                    </span>
                  </button>
                ))}
              </div>
              <NewOrg busy={busy} onCreate={createOrg} />
            </aside>

            {/* Main */}
            <div className="min-w-0 space-y-6">
              {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
              {notice && (
                <p className="flex items-start justify-between gap-3 rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm">
                  <span>{notice}</span>
                  <button type="button" onClick={() => setNotice(null)} className="text-xs text-muted-foreground">
                    Dismiss
                  </button>
                </p>
              )}

              {org && wallet && (
                <Reveal className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Item><Stat label="Available" value={formatGhs(wallet.availablePesewas)} hint="Ready to spend" /></Item>
                  <Item><Stat label="Reserved" value={formatGhs(wallet.reservedPesewas)} hint="Held for in-flight jobs" /></Item>
                  <Item><Stat label="Spent" value={formatGhs(wallet.lifetimeSpentPesewas)} hint="Settled actual cost" /></Item>
                  <Item><Stat label="Topped up" value={formatGhs(wallet.lifetimeTopUpsPesewas)} hint="Lifetime via mobile money" /></Item>
                </Reveal>
              )}

              {org && wallet && wallet.availablePesewas === 0 && (
                <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5">
                  <p className="font-semibold">This organisation's balance is GHS 0.00</p>
                  <p className="mt-1 text-sm text-muted-foreground">Requests are blocked at zero balance. Add a mock top-up below to unlock every model.</p>
                </div>
              )}

              <Tabs defaultValue="wallet">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
                  <TabsTrigger value="wallet" className="gap-1.5"><Wallet className="size-4" aria-hidden /> Wallet</TabsTrigger>
                  <TabsTrigger value="ledger" className="gap-1.5"><ReceiptText className="size-4" aria-hidden /> Ledger</TabsTrigger>
                  <TabsTrigger value="usage" className="gap-1.5"><Sparkles className="size-4" aria-hidden /> Usage</TabsTrigger>
                  <TabsTrigger value="pricing" className="gap-1.5"><Plug className="size-4" aria-hidden /> Pricing</TabsTrigger>
                  <TabsTrigger value="keys" className="gap-1.5"><KeyRound className="size-4" aria-hidden /> API keys</TabsTrigger>
                </TabsList>

                <TabsContent value="wallet" className="mt-4">
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-semibold">Mock mobile-money top-up</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {mode === "live"
                        ? "Runs a simulated top-up through the same reserve-safe path a real payment would follow. Demo mode — no real money."
                        : "Simulated locally in this page. No API, no money."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[500, 2000, 5000, 10000].map((a) => (
                        <Button key={a} variant="outline" disabled={busy} onClick={() => topUp(a)} className="tabular">
                          + {formatGhs(a)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ledger" className="mt-4">
                  <LedgerTable entries={ledger} />
                </TabsContent>

                <TabsContent value="usage" className="mt-4 space-y-4">
                  {mode === "live" && models.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4">
                      <span className="text-sm font-medium">Run a mocked request:</span>
                      {models.map((m) => (
                        <Button key={m.id} size="sm" variant="outline" disabled={busy} onClick={() => runRequest(m.id)}>
                          {m.displayName}
                        </Button>
                      ))}
                    </div>
                  )}
                  <RequestsTable rows={requests} />
                </TabsContent>

                <TabsContent value="pricing" className="mt-4">
                  <PricingTable models={models} />
                </TabsContent>

                <TabsContent value="keys" className="mt-4">
                  <KeysPanel keys={keys} busy={busy} newSecret={newSecret} onDismissSecret={() => setNewSecret(null)} onCreate={createKey} onRevoke={revokeKey} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </Section>

      <Section className="bg-muted/40">
        <SectionHead
          eyebrow="How the sync works"
          title="One ledger, two front doors"
          body="The public site never writes money logic. It reads the same balances the authenticated dashboard reads, using your signed-in session and nothing else."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Public site", "Marketing, studios and demos. Header balance mirrors the linked organisation."],
            ["Secure read bridge", "Your signed-in session is forwarded securely. Payment confirmations and sign-in providers stay on the authenticated dashboard."],
            ["Authenticated ledger", "Reserve → settle → release enforced by the ledger itself. Untouched by this console."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5">
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function ModeBadge({ mode }: { mode: Mode }) {
  if (mode === "live")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan/20 px-2.5 py-1 text-xs font-semibold text-navy-foreground">
        <PlugZap className="size-3.5 text-cyan" aria-hidden /> Live org data · mock money
      </span>
    );
  if (mode === "simulated")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold-foreground">
        <span className="size-1.5 rounded-full bg-gold" aria-hidden /> Demo data · offline
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-foreground/15 px-2.5 py-1 text-xs text-navy-foreground/70">
      <Loader2 className="size-3.5 animate-spin" aria-hidden /> Connecting
    </span>
  );
}

function SignIn({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (email: string, name: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(email.trim(), name.trim());
      }}
      className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="font-display text-xl font-semibold">Sign in to your organisation</h2>
      <p className="mt-1 text-sm text-muted-foreground">Development email sign-in for demo organisations. No password, no real accounts.</p>
      <label className="mt-4 block text-sm font-medium">
        Email
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" />
      </label>
      <label className="mt-3 block text-sm font-medium">
        Name <span className="font-normal text-muted-foreground">(optional)</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ama Mensah" className="mt-1" />
      </label>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || !email} className="mt-4 w-full bg-electric text-electric-foreground hover:bg-electric/90">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Continue"}
      </Button>
    </motion.form>
  );
}

function NewOrg({ busy, onCreate }: { busy: boolean; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length >= 2) {
          onCreate(name.trim());
          setName("");
        }
      }}
      className="flex gap-2"
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New organisation" aria-label="New organisation name" />
      <Button type="submit" size="icon" variant="outline" disabled={busy || name.trim().length < 2} aria-label="Create organisation">
        <Plus className="size-4" />
      </Button>
    </form>
  );
}

const TYPE_STYLE: Record<string, string> = {
  top_up: "bg-cyan/15 text-navy",
  reserve: "bg-gold/15 text-gold-foreground",
  settle: "bg-navy text-navy-foreground",
  release: "bg-electric/10 text-electric",
  refund: "bg-muted text-foreground",
};

function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) return <Empty text="No ledger entries yet. Top up to create the first immutable entry." />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Reservation</th>
            <th className="px-4 py-3">When</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 40).map((e) => (
            <tr key={e.id} className="border-t border-border">
              <td className="px-4 py-2.5">
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", TYPE_STYLE[e.entryType] ?? "bg-muted")}>{e.entryType.replace("_", " ")}</span>
              </td>
              <td className="px-4 py-2.5 tabular">{formatGhs(e.amountPesewas)}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{e.reservationId ? e.reservationId.slice(0, 8) : "—"}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{new Date(e.createdAt).toLocaleString("en-GH")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestsTable({ rows }: { rows: UsageRequest[] }) {
  if (rows.length === 0) return <Empty text="No requests yet. Run a mocked request to see reserve, settle and release." />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Tokens</th>
            <th className="px-4 py-3">Reserved</th>
            <th className="px-4 py-3">Actual</th>
            <th className="px-4 py-3">Released</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-2.5 font-medium">{r.model_id}</td>
              <td className="px-4 py-2.5">
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", r.status === "settled" ? "bg-cyan/15" : r.error_code ? "bg-destructive/10 text-destructive" : "bg-gold/15")}>
                  {r.error_code ?? r.status}
                </span>
              </td>
              <td className="px-4 py-2.5 tabular text-muted-foreground">{r.input_tokens ?? 0} / {r.output_tokens ?? 0}</td>
              <td className="px-4 py-2.5 tabular">{formatGhs(r.reserved_pesewas)}</td>
              <td className="px-4 py-2.5 tabular">{r.actual_pesewas == null ? "—" : formatGhs(r.actual_pesewas)}</td>
              <td className="px-4 py-2.5 tabular">{r.released_pesewas == null ? "—" : formatGhs(r.released_pesewas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PricingTable({ models }: { models: OrgModel[] }) {
  if (models.length === 0) return <Empty text="Model pricing is loaded from the organisation's effective price list." />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">Input / 1K</th>
            <th className="px-4 py-3">Output / 1K</th>
            <th className="px-4 py-3">Typical request</th>
            <th className="px-4 py-3">Source</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id} className="border-t border-border">
              <td className="px-4 py-2.5 font-medium">{m.displayName}</td>
              <td className="px-4 py-2.5 tabular">{formatGhs(m.inputPricePer1kPesewas)}</td>
              <td className="px-4 py-2.5 tabular">{formatGhs(m.outputPricePer1kPesewas)}</td>
              <td className="px-4 py-2.5 tabular">{formatGhs(m.examplePer1kPesewas)}</td>
              <td className="px-4 py-2.5">
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", m.customPrice ? "bg-gold/15 text-gold-foreground" : "bg-muted")}>{m.customPrice ? "Org override" : "Platform default"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 text-xs text-muted-foreground">Owners edit per-organisation prices in the authenticated dashboard. Test prices only.</p>
    </div>
  );
}

function KeysPanel({
  keys,
  busy,
  newSecret,
  onDismissSecret,
  onCreate,
  onRevoke,
}: {
  keys: ApiKeySummary[];
  busy: boolean;
  newSecret: string | null;
  onDismissSecret: () => void;
  onCreate: (name: string) => void;
  onRevoke: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onCreate(name.trim());
            setName("");
          }
        }}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row"
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. CI pipeline" aria-label="API key name" />
        <Button type="submit" disabled={busy || !name.trim()} className="bg-electric text-electric-foreground hover:bg-electric/90">
          <Plus className="size-4" aria-hidden /> Create test key
        </Button>
      </form>
      {newSecret && (
        <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4">
          <p className="text-sm font-semibold">Copy this key now — it is shown once.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-navy px-3 py-2 font-mono text-xs text-navy-foreground">{newSecret}</code>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(newSecret);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Copy className="size-4" aria-hidden /> {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismissSecret}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
      {keys.length === 0 ? (
        <Empty text="No API keys yet. Keys are scoped to this organisation and use the test prefix nn_test_." />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {k.name} <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{k.keyPrefix}…</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(k.createdAt).toLocaleDateString("en-GH")} · {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleString("en-GH")}` : "never used"}
                </p>
              </div>
              {k.revokedAt ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Revoked</span>
              ) : (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onRevoke(k.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="size-4" aria-hidden /> Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
