import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Loader2, Lock, Play, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatGhs, useDemo } from "@/lib/demo";
import { consoleApi, session, ConsoleError, type AiResult, type OrgModel } from "@/lib/console-api";
import { cn } from "@/lib/utils";
import { modelById, usePublishedPrices } from "@/lib/catalog";


type LinkState =
  | { kind: "checking" }
  | { kind: "offline" }
  | { kind: "signed-out" }
  | { kind: "ready"; orgId: string; orgName: string; models: OrgModel[] };

/**
 * Shared link to the real NuruNode ledger through the same-origin proxy.
 * Reads the console session; never writes money logic itself.
 */
export function useLedgerLink() {
  const [state, setState] = useState<LinkState>({ kind: "checking" });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await consoleApi.health();
      } catch {
        if (!cancelled) setState({ kind: "offline" });
        return;
      }
      if (!session.get()) {
        if (!cancelled) setState({ kind: "signed-out" });
        return;
      }
      try {
        const me = await consoleApi.me();
        const org = me.organisations.find((o) => o.id === session.org()) ?? me.organisations[0];
        if (!org) {
          if (!cancelled) setState({ kind: "signed-out" });
          return;
        }
        const { models } = await consoleApi.models(org.id);
        if (!cancelled) setState({ kind: "ready", orgId: org.id, orgName: org.name, models });
      } catch {
        if (!cancelled) setState({ kind: "signed-out" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

const SAMPLE = "Translate to Twi: Good morning, how much is a bag of rice at Makola today?";

/** Inline runner shown on catalogue cards that map to a real ledger model. */
export function LedgerRunner({ ledgerModelId, link }: { ledgerModelId: string; link: LinkState }) {
  usePublishedPrices();
  const demo = useDemo();
  const reduce = useReducedMotion();
  const [prompt, setPrompt] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  if (link.kind === "checking") return <p className="mt-4 text-xs text-muted-foreground">Checking organisation data…</p>;
  if (link.kind === "offline") return <p className="mt-4 text-xs text-muted-foreground">Organisation data is offline. Sign in to the console to run this model on live data.</p>;
  if (link.kind === "signed-out") {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Lock className="size-3.5" aria-hidden />Sign in to the console to run this model with live wallet data.</span>
        <Link to="/console" className="inline-flex items-center gap-1 font-semibold text-electric">Open console <ArrowRight className="size-3" /></Link>
      </div>
    );
  }

  const model = link.models.find((m) => m.id === ledgerModelId);
  if (!model) return <p className="mt-4 text-xs text-muted-foreground">This model is not in your organisation's catalogue yet.</p>;

  const catalogue = modelById(ledgerModelId);
  const maxOutputTokens = catalogue?.maxOutputTokens ?? 4096;

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await consoleApi.aiRequest(link.kind === "ready" ? link.orgId : "", ledgerModelId, prompt, maxOutputTokens);
      setResult(r);
      demo.syncFromWallet(link.kind === "ready" ? link.orgName : "Organisation", r.balance);
    } catch (e) {
      const err = e instanceof ConsoleError ? { code: e.code, message: e.message } : { code: "ERROR", message: "Request failed" };
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const insufficient = error?.code === "INSUFFICIENT_FUNDS";

  return (
    <div className="mt-4 rounded-xl border border-cyan/30 bg-cyan/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-foreground"><Wallet className="size-3.5" aria-hidden />Live wallet · {link.orgName}</span>
        <span className="tabular text-muted-foreground">
          Your price: GHS {(model.inputPricePer1kPesewas / 100).toFixed(2)} in · GHS {(model.outputPricePer1kPesewas / 100).toFixed(2)} out / 1K
          {model.customPrice && <span className="ml-1 rounded bg-gold/20 px-1 font-semibold text-gold-foreground">custom</span>}
        </span>
      </div>
      <label className="mt-2 block">
        <span className="sr-only">Prompt</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-card px-2.5 py-2 text-sm outline-none focus:border-electric"
        />
      </label>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Reserves max cost first · demo funds, no live AI</span>
        <Button size="sm" onClick={run} disabled={busy || !prompt.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Play />} Run on ledger
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {result && (
          <motion.div
            key={result.requestId}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 space-y-2 text-xs"
          >
            <div className="grid grid-cols-3 gap-1.5">
              {[
                ["Reserved", result.reservedPesewas, "text-muted-foreground"],
                ["Settled", result.actualPesewas, "text-foreground"],
                ["Released", result.releasedPesewas, "text-cyan-foreground"],
              ].map(([label, v, color], i) => (
                <motion.div
                  key={label as string}
                  initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: reduce ? 0 : 0.15 * i }}
                  className="rounded-lg bg-card px-2 py-1.5"
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label as string}</p>
                  <p className={cn("font-semibold tabular", color as string)}>{formatGhs(v as number)}</p>
                </motion.div>
              ))}
            </div>
            <p className="rounded-lg bg-card px-2.5 py-2 text-muted-foreground">{result.text}</p>
            <p className="text-muted-foreground">
              {result.inputTokens} in · {result.outputTokens} out · available now <strong className="tabular text-foreground">{formatGhs(result.balance.availablePesewas)}</strong>
            </p>
          </motion.div>
        )}
        {error && (
          <motion.div
            key="err"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn("mt-3 rounded-lg px-2.5 py-2 text-xs", insufficient ? "border border-gold/40 bg-gold/10 text-foreground" : "bg-destructive/10 text-destructive")}
          >
            {insufficient ? (
              <>
                <strong>Not enough balance.</strong> The ledger refused to reserve the maximum cost — nothing was charged.{" "}
                <Link to="/console" className="font-semibold text-electric underline">Top up in the console</Link>
              </>
            ) : (
              error.message
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
