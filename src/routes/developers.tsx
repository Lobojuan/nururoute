import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ArrowRight, KeyRound, Lock, Play, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section, SectionHead, DemoNotice, DemoBadge, Stat } from "@/components/site/primitives";
import { DemoSafeguards } from "@/components/site/demo-safeguards";
import { cn } from "@/lib/utils";
import { DEMO_NOTICE, formatGhs, useDemo } from "@/lib/demo";
import { byCategory, modelById , usePublishedPrices } from "@/lib/catalog";

const TITLE = "Developer studio — NuruRoute";
const DESC = "Choose a model, see a GHS pricing estimate, inspect a mock request and learn how reserve, settle and release protect your wallet. Demo API-key screen, no credentials.";

export const Route = createFileRoute("/developers")({
  validateSearch: z.object({ model: z.string().optional() }),
  head: () => pageMeta("/developers", TITLE, DESC),
  component: DevelopersPage,
});

const CHAT = byCategory("Chat & Coding");

type Result = { reserved: number; actual: number; released: number; tokensIn: number; tokensOut: number };

function DevelopersPage() {
  const { model: modelParam } = Route.useSearch();
  const demo = useDemo();
  const [modelId, setModelId] = useState(modelParam && modelById(modelParam)?.category === "Chat & Coding" ? modelParam : (CHAT[0]?.id ?? ""));
  const [prompt, setPrompt] = useState("Summarise the key steps to register a small business in Ghana in five bullet points.");
  const [maxOut, setMaxOut] = useState(400);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [blocked, setBlocked] = useState(false);

  const model = modelById(modelId) ?? CHAT[0]!;
  const pricing = usePublishedPrices();
  const modelMaxOut = model.maxOutputTokens ?? 4096;
  const step = modelMaxOut >= 4096 ? 256 : 128;
  const tokensIn = Math.max(1, Math.ceil(prompt.trim().length / 4));
  const inputRate = Math.max(1, Math.round(model.pesewas / 3)); // illustrative input rate
  const maxCost = useMemo(() => Math.ceil((tokensIn / 1000) * inputRate + (maxOut / 1000) * model.pesewas), [tokensIn, inputRate, maxOut, model, pricing.epoch]);
  const insufficient = demo.hydrated && demo.available < maxCost;

  // Clamp the slider to the selected model's real output limit.
  useEffect(() => {
    setMaxOut((v) => Math.min(v, modelMaxOut));
  }, [modelMaxOut]);

  function run() {
    if (insufficient) { setBlocked(true); return; }
    setBlocked(false);
    setBusy(true);
    setResult(null);
    window.setTimeout(() => {
      const tokensOut = Math.min(maxOut, Math.round(maxOut * (0.45 + Math.random() * 0.3)));
      const actual = Math.max(1, Math.ceil((tokensIn / 1000) * inputRate + (tokensOut / 1000) * model.pesewas));
      const ok = demo.run(model.name, maxCost, actual);
      setBusy(false);
      if (!ok) { setBlocked(true); return; }
      setResult({ reserved: maxCost, actual, released: maxCost - actual, tokensIn, tokensOut });
    }, 1400);
  }

  const curl = `curl https://api.nururoute.example/v1/chat \\
  -H "Authorization: Bearer nr_demo_••••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model.id}",
    "max_output_tokens": ${maxOut},
    "messages": [{ "role": "user", "content": "…" }]
  }'`;

  const response = `{
  "id": "req_demo_01",
  "model": "${model.id}",
  "status": "settled",
  "cost": {
    "currency": "GHS",
    "reserved_pesewas": ${result?.reserved ?? maxCost},
    "actual_pesewas": ${result?.actual ?? "…"},
    "released_pesewas": ${result?.released ?? "…"}
  },
  "usage": { "input_tokens": ${tokensIn}, "output_tokens": ${result?.tokensOut ?? "…"} }
}`;

  return (
    <>
      <Section className="pb-8">
        <SectionHead as="h1" eyebrow="Developer studio" title="One key. One wallet. Every model." body="Estimate before you call, reserve the maximum, settle the actual. This studio simulates the full loop against your demo wallet." />
        <DemoNotice className="mt-6 max-w-3xl">Requests here are simulated in the browser. No provider is called and the demo key is not a credential.</DemoNotice>
        <DemoSafeguards compact className="mt-4 max-w-3xl" />
      </Section>

      <Section tone="muted" className="pt-0 sm:pt-0 lg:pt-0">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Composer */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div>
              <p className="text-sm font-medium">Model</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {CHAT.map((m) => (
                  <button key={m.id} type="button" onClick={() => { setModelId(m.id); setResult(null); }} aria-pressed={m.id === modelId} className={cn("rounded-xl border p-3 text-left transition-colors", m.id === modelId ? "border-electric bg-accent" : "border-border hover:border-electric/40")}>
                    <span className="block text-sm font-semibold">{m.name}</span>
                    <span className="block text-xs text-muted-foreground">{formatGhs(m.pesewas)} per 1K output · {m.provider}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <label htmlFor="prompt" className="text-sm font-medium">Prompt</label>
              <textarea id="prompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm font-medium">
                <label htmlFor="maxout">Max output tokens</label>
                <span className="tabular text-muted-foreground" aria-live="polite">{maxOut.toLocaleString()} / {modelMaxOut.toLocaleString()}</span>
              </div>
              <input id="maxout" type="range" min={step} max={modelMaxOut} step={step} value={maxOut} onChange={(e) => setMaxOut(Number(e.target.value))} className="mt-2 w-full accent-[var(--electric)]" />
              <p className="mt-1 text-xs text-muted-foreground">Hard cap for {model.name} is {modelMaxOut.toLocaleString()} tokens. Context window is {model.context ?? "standard"}.</p>
            </div>

            <div className="mt-5 rounded-2xl bg-muted p-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Estimated input</span><span className="tabular">{tokensIn} tokens</span></div>
              <div className="mt-1 flex items-center justify-between"><span className="text-muted-foreground">Max output</span><span className="tabular">{maxOut} tokens</span></div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-semibold"><span>Maximum cost (reserved)</span><span className="tabular">{formatGhs(maxCost)}</span></div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>Available balance</span><span className="tabular">{demo.hydrated ? formatGhs(demo.available) : "—"}</span></div>
            </div>

            {(insufficient || blocked) && (
              <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-foreground" aria-hidden />
                <div>
                  <p className="font-semibold">Insufficient balance — request blocked</p>
                  <p className="mt-0.5 text-muted-foreground">You need at least {formatGhs(maxCost)} available. Top up your demo wallet to continue.</p>
                  <Button asChild size="sm" className="mt-3 bg-gold text-gold-foreground hover:bg-gold/90"><Link to="/wallet">Top up wallet <ArrowRight /></Link></Button>
                </div>
              </div>
            )}

            <Button onClick={run} disabled={busy || insufficient || !prompt.trim()} size="lg" className="mt-5 w-full bg-navy text-navy-foreground hover:bg-navy/90">
              {busy ? <><Loader2 className="animate-spin" /> Reserving {formatGhs(maxCost)} and running…</> : <><Play /> Run mock request</>}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">{DEMO_NOTICE}</p>

            {result && (
              <div role="status" className="mt-5 rounded-2xl border border-success/40 bg-success/5 p-4">
                <p className="inline-flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4 text-success" aria-hidden /> Settled</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {[["Reserved", result.reserved], ["Actual", result.actual], ["Released", result.released]].map(([l, v]) => (
                    <div key={l as string} className="rounded-lg bg-card p-2">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{l as string}</p>
                      <p className="font-semibold tabular">{formatGhs(v as number)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{result.tokensOut} output tokens used of {maxOut}. Available balance is now {formatGhs(demo.available)}.</p>
              </div>
            )}
          </div>

          {/* Code */}
          <div className="flex flex-col gap-6">
            <Tabs defaultValue="request" className="rounded-3xl border border-border bg-navy-deep p-2 text-navy-foreground">
              <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-1">
                <TabsTrigger value="request" className="data-[state=active]:bg-navy-foreground/10 data-[state=active]:text-navy-foreground data-[state=active]:shadow-none text-navy-foreground/60">Request</TabsTrigger>
                <TabsTrigger value="response" className="data-[state=active]:bg-navy-foreground/10 data-[state=active]:text-navy-foreground data-[state=active]:shadow-none text-navy-foreground/60">Response</TabsTrigger>
              </TabsList>
              <TabsContent value="request"><pre className="overflow-x-auto p-4 text-xs leading-relaxed text-cyan"><code>{curl}</code></pre></TabsContent>
              <TabsContent value="response"><pre className="overflow-x-auto p-4 text-xs leading-relaxed text-cyan"><code>{response}</code></pre></TabsContent>
            </Tabs>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Reserve → settle → release</h2>
              <ol className="mt-4 space-y-3 text-sm">
                {[
                  ["Reserve", "Before the provider is called, the maximum cost is held from your available balance. If the hold can't be made, the request is rejected — never queued."],
                  ["Settle", "When the response arrives, the actual token usage is priced and charged as its own ledger entry."],
                  ["Release", "Anything left from the hold is returned immediately. Failed requests release the full amount."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-electric text-xs font-bold text-electric-foreground">{i + 1}</span>
                    <p><strong>{t}.</strong> <span className="text-muted-foreground">{d}</span></p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Section>

      {/* API keys */}
      <Section>
        <SectionHead eyebrow="API keys" title="Keys you control, secrets we never store in plain text" body="A demo of the key screen. Keys are scoped to one organisation, shown once, and revocable." />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <p className="inline-flex items-center gap-2 font-semibold"><KeyRound className="size-4 text-electric" aria-hidden /> Demo organisation keys</p>
              <DemoBadge />
            </div>
            <ul className="divide-y divide-border text-sm">
              {[["Production app", "nr_demo_4f2a••••••••", "Active", "2 hours ago"], ["CI pipeline", "nr_demo_91cd••••••••", "Active", "yesterday"], ["Old laptop", "nr_demo_ab07••••••••", "Revoked", "—"]].map(([n, k, s, u]) => (
                <li key={n} className="grid gap-1 px-5 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
                  <div className="min-w-0"><p className="font-medium">{n}</p><p className="truncate font-mono text-xs text-muted-foreground">{k}</p></div>
                  <span className={cn("w-fit rounded-full px-2 py-0.5 text-xs font-semibold", s === "Active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{s}</span>
                  <span className="text-xs text-muted-foreground">Last used {u}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-4">
              <Button disabled variant="outline" size="sm" title="Disabled in demo mode"><Lock /> Create key (disabled in demo)</Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Stat label="Provider keys" value="Server-side only" hint="Your app never sees an upstream key" />
            <Stat label="Key storage" value="Hashed" hint="Plaintext shown once at creation" />
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHead eyebrow="API contract" title="One request shape, one money loop" body="What every integration agrees to: estimate, reserve, call, settle, release. The contract is the same whether the upstream is a chat, image, video or voice model." />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><p className="font-semibold">Request lifecycle</p><DemoBadge /></div>
            <ol className="divide-y divide-border text-sm">
              {[
                ["POST /v1/estimate", "Returns max cost in pesewas for the model, units and resolution. Never charges."],
                ["POST /v1/requests", "Reserves the estimate on the wallet as an immutable ledger entry, then calls the provider. Rejected instantly when balance < estimate or the kill-switch is on."],
                ["Settle", "Actual usage is priced from the published rate card; the difference between reserve and actual is released back."],
                ["GET /v1/requests/:id", "Reserve, settle and release entries with the provider reference — the audit trail your finance team reads."],
              ].map(([k, v]) => (
                <li key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"><code className="font-mono text-xs text-electric">{k}</code><span className="text-muted-foreground">{v}</span></li>
              ))}
            </ol>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Stat label="Guarantee" value="Never over-spent" hint="Cost is capped at the reservation; you are never billed above the estimate" />
            <Stat label="Idempotency" value="Idempotency-Key" hint="Retries never double-reserve or double-settle" />
            <Stat label="Errors" value="402 · 409 · 429" hint="Insufficient balance · duplicate key · rate limited — all documented" />
          </div>
        </div>
      </Section>
    </>
  );
}
