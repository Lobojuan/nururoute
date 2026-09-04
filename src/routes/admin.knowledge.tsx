import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BookOpenCheck, CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";
import { useAdminStore } from "@/lib/admin-demo";
import { KB_CATEGORIES, KB_STAMP, SAFETY_RULES, type KbArticle, type KbCategory, type KbStatus } from "@/lib/admin-kb";

export const Route = createFileRoute("/admin/knowledge")({
  component: KnowledgeBase,
});

const STATUS_STYLE: Record<KbStatus, string> = { Approved: "bg-success/10 text-success", Draft: "bg-gold/15 text-gold-foreground", Planned: "bg-muted text-muted-foreground" };

function blank(): KbArticle {
  return { id: `kb-${Date.now().toString(36)}`, category: "Onboarding", title: "", status: "Draft", live: false, lastReviewed: new Date().toISOString().slice(0, 10), owner: "Support lead", answer: "", keywords: [] };
}

function KnowledgeBase() {
  const { state, saveArticle } = useAdminStore();
  const [filterStatus, setFilterStatus] = useState<KbStatus | "All">("All");
  const [filterCat, setFilterCat] = useState<KbCategory | "All">("All");
  const [editing, setEditing] = useState<KbArticle | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  if (!state) return null;

  const list = state.kb.filter((a) => (filterStatus === "All" || a.status === filterStatus) && (filterCat === "All" || a.category === filterCat));
  const counts = { Approved: state.kb.filter((a) => a.status === "Approved").length, Draft: state.kb.filter((a) => a.status === "Draft").length, Planned: state.kb.filter((a) => a.status === "Planned").length };

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editing.title.trim() || !editing.answer.trim()) return;
    saveArticle({ ...editing, live: editing.status === "Approved" ? editing.live : false });
    setSaved(editing.title);
    setEditing(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Knowledge base</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Approved customer-safe answers the support workbench may use. Draft and Planned articles are never used in replies.</p>
        </div>
        <Button size="sm" onClick={() => setEditing(blank())} className="bg-electric text-electric-foreground hover:bg-electric/90"><Plus /> New article</Button>
      </div>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold-foreground"><ShieldCheck className="size-3.5" aria-hidden /> {KB_STAMP}</p>
      {saved && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" aria-hidden /> Saved “{saved}” and recorded in the audit log.</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <AdminCard title="Articles" hint={`${counts.Approved} approved · ${counts.Draft} draft · ${counts.Planned} planned`}>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Filter by status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as KbStatus | "All")} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
                {["All", "Approved", "Draft", "Planned"].map((s) => <option key={s}>{s}</option>)}
              </select>
              <select aria-label="Filter by category" value={filterCat} onChange={(e) => setFilterCat(e.target.value as KbCategory | "All")} className="h-9 min-w-0 max-w-full rounded-lg border border-input bg-background px-2 text-sm">
                <option>All</option>
                {KB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {list.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No articles match this filter.</li>}
              {list.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.category} · owner {a.owner} · reviewed {a.lastReviewed}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", STATUS_STYLE[a.status])}>{a.status}</span>
                      {a.live && <span className="rounded bg-electric/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric">Live</span>}
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing({ ...a })}>Edit</Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{a.answer}</p>
                </li>
              ))}
            </ul>
          </AdminCard>
        </div>

        <div className="grid content-start gap-4">
          {editing ? (
            <AdminCard title={state.kb.some((a) => a.id === editing.id) ? "Edit article" : "New article"} hint="Saving writes an audit entry. Only Approved articles can be marked Live.">
              <form onSubmit={submit} className="grid gap-3 text-sm">
                <label className="block"><span className="text-muted-foreground">Title</span><input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
                <label className="block"><span className="text-muted-foreground">Category</span>
                  <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as KbCategory })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2">{KB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="text-muted-foreground">Status</span>
                    <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as KbStatus })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2">{["Approved", "Draft", "Planned"].map((s) => <option key={s}>{s}</option>)}</select>
                  </label>
                  <label className="block"><span className="text-muted-foreground">Last reviewed</span><input type="date" value={editing.lastReviewed} onChange={(e) => setEditing({ ...editing, lastReviewed: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2" /></label>
                </div>
                <label className="block"><span className="text-muted-foreground">Owner</span><input value={editing.owner} onChange={(e) => setEditing({ ...editing, owner: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
                <label className={cn("flex items-center gap-2", editing.status !== "Approved" && "opacity-50")}>
                  <input type="checkbox" checked={editing.live && editing.status === "Approved"} disabled={editing.status !== "Approved"} onChange={(e) => setEditing({ ...editing, live: e.target.checked })} />
                  <span>Marked Live (feature / rail confirmed available)</span>
                </label>
                <label className="block"><span className="text-muted-foreground">Customer-safe answer</span><textarea required rows={5} value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background p-3" /></label>
                <label className="block"><span className="text-muted-foreground">Keywords (comma separated)</span><input value={editing.keywords.join(", ")} onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button type="submit" className="bg-navy text-navy-foreground hover:bg-navy/90">Save article</Button>
                </div>
              </form>
            </AdminCard>
          ) : (
            <AdminCard title="How retrieval works" hint="Simulated, local and deterministic" action={<BookOpenCheck className="size-5 text-electric" aria-hidden />}>
              <p className="text-sm text-muted-foreground">The workbench matches the customer's question against titles and keywords of <strong>Approved</strong> articles only and shows the sources it used. Without a match it declines to answer and queues a simulated human ticket.</p>
            </AdminCard>
          )}
          <AdminCard title="Safety rules" hint="Enforced in the workbench">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {SAFETY_RULES.map((r) => <li key={r} className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /><span>{r}</span></li>)}
            </ul>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
