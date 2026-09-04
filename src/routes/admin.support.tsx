import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, BookOpenCheck, Bot, CheckCircle2, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";
import { ROUTING_NOTE, ROUTING_OPTIONS, SIM_STAMP, useAdminStore, type RoutingTarget, type Ticket } from "@/lib/admin-demo";
import { MODELS, TYPICAL, estimate, unitLabel, usePublishedPrices } from "@/lib/catalog";
import { CANNOT_VERIFY, composeReply, detectSensitive, KB_STAMP, retrieve, SAFETY_RULES, type KbHit } from "@/lib/admin-kb";

export const Route = createFileRoute("/admin/support")({
  component: SupportCentre,
});

const STATUS: Record<Ticket["status"], string> = { open: "bg-destructive/10 text-destructive", waiting: "bg-gold/15 text-gold-foreground", resolved: "bg-success/10 text-success" };

function SupportCentre() {
  const { state, addNote, queueTicket } = useAdminStore();
  const live = usePublishedPrices();
  const [priceQuery, setPriceQuery] = useState("");
  const priceHits = MODELS.filter((m) => !priceQuery.trim() || `${m.name} ${m.provider} ${m.category}`.toLowerCase().includes(priceQuery.toLowerCase())).slice(0, 6);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [target, setTarget] = useState<RoutingTarget>("OpenAI");
  const [tone, setTone] = useState<"warm" | "concise">("warm");
  const [draft, setDraft] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [result, setResult] = useState<{ hits: KbHit[]; queued: "new" | "kept" } | null>(null);
  const [sent, setSent] = useState(false);

  const ticket = state?.tickets.find((t) => t.id === selectedId) ?? state?.tickets[0];
  const ticketKey = ticket?.id ?? "";
  const ticketQuestion = ticket ? `${ticket.subject}. ${ticket.summary}` : "";
  useEffect(() => { setQuestion(ticketQuestion); }, [ticketKey, ticketQuestion]);
  if (!state || !ticket) return null;

  const tk = ticket;
  const questionFlags = detectSensitive(question);
  const draftFlags = detectSensitive(draft);
  const blocked = draftFlags.length > 0;
  const firstName = tk.customer.split(" ")[0] ?? "there";

  function pick(next: Ticket) {
    setSelectedId(next.id);
    setResult(null);
    setDraft("");
    setSent(false);
  }
  function generate() {
    setSent(false);
    const hits = retrieve(question, state!.kb);
    if (hits.length === 0) {
      setDraft(`Hi ${firstName}, thank you for your message. We cannot yet confirm an approved answer to this, so rather than guess we have passed it to a member of our team, who will review it and reply to you here.`);
      if (tk.status === "resolved") {
        queueTicket(`Unverified question: ${question.slice(0, 48)}`, question, tk.customer, tk.org);
        setResult({ hits: [], queued: "new" });
      } else {
        addNote(tk.id, `${CANNOT_VERIFY} Ticket kept open for a human agent.`, "open");
        setResult({ hits: [], queued: "kept" });
      }
      return;
    }
    setDraft(composeReply(firstName, hits, tone));
    setResult({ hits, queued: "kept" });
  }
  function send(resolve: boolean) {
    if (!draft.trim() || blocked) return;
    const src = result?.hits.map((h) => h.article.id).join(", ");
    addNote(tk.id, `Reply sent (simulated, ${target} label${src ? `, sources ${src}` : ", no KB source"}): ${draft.slice(0, 80)}…`, resolve ? "resolved" : "waiting");
    setSent(true);
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Customer support centre</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Simulated tickets with fictional, masked customers. The assistant workbench generates replies locally in this browser.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <AdminCard title="Tickets" hint={`${state.tickets.filter((t) => t.status !== "resolved").length} open or waiting`}>
          <ul className="space-y-1">
            {state.tickets.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => pick(t)} aria-pressed={t.id === tk.id} className={cn("w-full rounded-lg px-3 py-2 text-left transition-colors", t.id === tk.id ? "bg-accent" : "hover:bg-muted")}>
                  <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="tabular">{t.id} · {t.channel}</span><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", STATUS[t.status])}>{t.status}</span></span>
                  <span className="mt-0.5 block text-sm font-medium leading-snug">{t.subject}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.customer} · {t.org}</span>
                </button>
              </li>
            ))}
          </ul>
        </AdminCard>

        <div className="grid gap-4">
          <AdminCard title={`${tk.id} — ${tk.subject}`} hint={`${tk.customer} · ${tk.org} · ${tk.channel} · priority ${tk.priority}`} action={<span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", STATUS[tk.status])}>{tk.status}</span>}>
            <p className="text-sm">{tk.summary}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ledger excerpt (simulated)</h3>
                {tk.ledger.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No wallet movements linked to this tk.</p> : (
                  <ul className="mt-2 divide-y divide-border rounded-xl border border-border text-sm">
                    {tk.ledger.map((l, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-2 px-3 py-1.5"><span><span className="text-xs tabular text-muted-foreground">{l.at}</span> <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">{l.type}</span> <span className="ml-1 text-muted-foreground">{l.note}</span></span><span className="shrink-0 tabular font-medium">{l.amount}</span></li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Internal notes</h3>
                {tk.notes.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No notes yet.</p> : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {tk.notes.map((n, i) => <li key={i} className="rounded-xl bg-muted px-3 py-2"><span className="text-xs text-muted-foreground tabular">{n.at} · {n.by}</span><br />{n.text}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Support-assistant workbench" hint="Private to admin. Answers come only from Approved knowledge-base articles; nothing is sent anywhere." action={<Bot className="size-5 text-electric" aria-hidden />}>
            <label htmlFor="question" className="block text-xs font-medium text-muted-foreground">Customer question (from the ticket — editable)</label>
            <textarea id="question" rows={2} value={question} onChange={(e) => { setQuestion(e.target.value); setResult(null); }} className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
            {questionFlags.length > 0 && <p role="alert" className="mt-1 flex items-center gap-1.5 text-xs text-destructive"><AlertTriangle className="size-3.5" aria-hidden /> Sensitive data mentioned ({questionFlags.join(", ")}). Never request it — advise the customer not to share it.</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <fieldset>
                <legend className="text-xs font-medium text-muted-foreground">Simulated routing target</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ROUTING_OPTIONS.map((o) => (
                    <button key={o} type="button" onClick={() => setTarget(o)} aria-pressed={target === o} className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", target === o ? "border-electric bg-accent" : "border-border hover:border-electric/40")}>{o}</button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{ROUTING_NOTE}</p>
              </fieldset>
              <label className="text-xs font-medium text-muted-foreground">Tone
                <select value={tone} onChange={(e) => setTone(e.target.value as "warm" | "concise")} className="mt-1 block h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"><option value="warm">Warm</option><option value="concise">Concise</option></select>
              </label>
              <Button onClick={generate} disabled={!question.trim()} className="bg-electric text-electric-foreground hover:bg-electric/90"><MessageSquareText /> Draft from knowledge base</Button>
            </div>

            {result && (
              <div className={cn("mt-4 rounded-xl border p-3 text-sm", result.hits.length ? "border-border bg-muted/40" : "border-gold/40 bg-gold/10")}>
                {result.hits.length ? (
                  <>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><BookOpenCheck className="size-3.5" aria-hidden /> Sources used (Approved only)</p>
                    <ul className="mt-2 space-y-1">
                      {result.hits.map((h) => (
                        <li key={h.article.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link to="/admin/knowledge" className="font-medium underline-offset-2 hover:underline">{h.article.title}</Link>
                          <span className="text-xs text-muted-foreground">{h.article.id} · {h.article.category} · reviewed {h.article.lastReviewed}</span>
                          {h.article.live ? <span className="rounded bg-electric/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric">Live</span> : <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Not marked live — do not confirm availability</span>}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-foreground" aria-hidden /><span><strong>Cannot verify.</strong> No Approved article covers this question. The assistant did not guess; {result.queued === "new" ? "a new simulated human-support ticket was queued." : "this ticket stays open for a human agent (noted internally)."}</span></p>
                )}
              </div>
            )}

            <label htmlFor="reply" className="mt-4 block text-xs font-medium text-muted-foreground">Reply draft</label>
            <textarea id="reply" rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Generate a draft or write your own…" className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold-foreground"><ShieldCheck className="size-3.5" aria-hidden /> {SIM_STAMP} {KB_STAMP}{result ? ` Drafted under the “${target}” label.` : ""}</p>
            {blocked && <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive"><AlertTriangle className="size-3.5" aria-hidden /> Sending blocked: the draft mentions {draftFlags.join(", ")}. Remove it before sending.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={!draft.trim() || blocked} onClick={() => send(false)}><Send /> Send (simulated)</Button>
              <Button size="sm" disabled={!draft.trim() || blocked} onClick={() => send(true)} className="bg-navy text-navy-foreground hover:bg-navy/90"><CheckCircle2 /> Send and resolve (simulated)</Button>
              {sent && <span role="status" className="self-center text-sm text-success">Recorded in the demo audit log. No message left this browser.</span>}
            </div>
          </AdminCard>

          <AdminCard title="Customer price lookup" hint={`Quotes come from the published table — ${live.version ? `${live.version}, effective ${live.effectiveDate}` : "catalogue defaults"}. Never quote margins or cost basis.`}>
            <label htmlFor="price-q" className="sr-only">Search models</label>
            <input id="price-q" value={priceQuery} onChange={(e) => setPriceQuery(e.target.value)} placeholder="Search a model to quote its price…" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <ul className="mt-3 divide-y divide-border text-sm">
              {priceHits.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0"><p className="truncate font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.category} · {TYPICAL[m.category].label}</p></div>
                  <div className="shrink-0 text-right tabular"><p className="font-semibold">GHS {(m.pesewas / 100).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{unitLabel[m.unit]}</span></p><p className="text-xs text-muted-foreground">≈ GHS {(estimate(m, TYPICAL[m.category].units) / 100).toFixed(2)} typical</p></div>
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Safety rules" hint="Always in force in this workbench">
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {SAFETY_RULES.map((r) => <li key={r} className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /><span>{r}</span></li>)}
            </ul>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
