import { pageMeta } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowRight, Image as ImageIcon, Film, Mic, Languages, BookOpen, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHead, DemoNotice, DemoBadge, Stars } from "@/components/site/primitives";
import { DemoSafeguards } from "@/components/site/demo-safeguards";
import { cn } from "@/lib/utils";
import { DEMO_NOTICE, formatGhs, useDemo } from "@/lib/demo";
import { byCategory, modelById, type CatalogModel, type Category , usePublishedPrices } from "@/lib/catalog";
import { AgencyCampaign } from "@/components/site/agency-campaign";
import { pilotKillSwitchOn } from "@/lib/pilot-demo";
import { Tilt, TickingMoney } from "@/components/site/motion";
import { KenteDivider } from "@/components/site/kente";
import { CinematicReveal } from "@/components/site/cinematic-reveal";
import { CediFlight } from "@/components/site/cedi";
import { playCoin } from "@/lib/sound";
import { motion, useReducedMotion } from "motion/react";

const TITLE = "Creative studio — NuruRoute";
const DESC = "Generate images, video, voice, dubbing and audiobooks with the estimated GHS cost shown before every job. Simulated studio in demo mode.";

type StudioTab = Exclude<Category, "Chat & Coding">;
const TABS: { id: StudioTab; icon: typeof ImageIcon }[] = [
  { id: "Image", icon: ImageIcon },
  { id: "Video", icon: Film },
  { id: "Voice", icon: Mic },
  { id: "Dubbing", icon: Languages },
  { id: "Audiobooks", icon: BookOpen },
];

export const Route = createFileRoute("/studio")({
  validateSearch: z.object({
    tab: z.enum(["Image", "Video", "Voice", "Dubbing", "Audiobooks"]).optional(),
    model: z.string().optional(),
  }),
  head: () => pageMeta("/studio", TITLE, DESC),
  component: StudioPage,
});

const RATIOS = ["1:1", "4:5", "16:9", "9:16"];
const QUALITY = [
  { id: "preview", label: "Preview", mult: 0.5, note: "Fast, watermarked" },
  { id: "standard", label: "Standard", mult: 1, note: "Full quality" },
  { id: "4k", label: "4K", mult: 2.2, note: "Provider validation required" },
];

/** Cinematic resolution tiers for image and video generation. Video is measured in
 * frame height; images in their base square edge, so each tab has its own ladder. */
const VIDEO_RESOLUTIONS = [
  { id: "720p", label: "720p", short: "HD", mult: 0.6, note: "Social / fast" },
  { id: "1080p", label: "1080p", short: "FHD", mult: 1, note: "Standard cinema" },
  { id: "2k", label: "2K", short: "2K", mult: 1.6, note: "Campaign ready" },
  { id: "4k", label: "4K", short: "4K", mult: 2.4, note: "Provider validation" },
];
const IMAGE_RESOLUTIONS = [
  { id: "1024px", label: "1024px", short: "STD", mult: 1, note: "Web / social" },
  { id: "2k", label: "2K", short: "2K", mult: 1.6, note: "Print ready" },
  { id: "4k", label: "4K", short: "4K", mult: 2.4, note: "Provider validation" },
];
type ResolutionTier = (typeof VIDEO_RESOLUTIONS)[number];
function resolutionsFor(tab: StudioTab): ResolutionTier[] {
  return tab === "Image" ? IMAGE_RESOLUTIONS : VIDEO_RESOLUTIONS;
}
/** First tier the model actually supports (falls back to the standard tier). */
function defaultResolution(tab: StudioTab, model: CatalogModel | undefined): string {
  const ladder = resolutionsFor(tab);
  return ladder.find((t) => model?.resolutions?.includes(t.label))?.id ?? ladder[tab === "Image" ? 0 : 1]!.id;
}

const PLACEHOLDER: Record<StudioTab, string> = {
  Image: "A market scene in Makola at golden hour, kente patterns, editorial photography",
  Video: "Drone shot over Cape Coast castle at sunrise, slow push-in, cinematic",
  Voice: "Akwaaba! Welcome to Sankofa Bank. Press one for balance, two for transfers.",
  Dubbing: "Dub this 2-minute product explainer from English into Twi with subtitles",
  Audiobooks: "Chapter one of 'The Girl Who Spun Gold', warm narrator, gentle pace",
};

function unitsFor(tab: StudioTab, duration: number, chars: number) {
  switch (tab) {
    case "Image": return 1;
    case "Video": return duration;
    case "Dubbing": return Math.max(0.5, duration / 60);
    case "Voice":
    case "Audiobooks": return Math.max(0.1, chars / 1000);
  }
}

function StudioPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const demo = useDemo();
  const tab: StudioTab = search.tab ?? "Image";
  const models = byCategory(tab);
  const pricing = usePublishedPrices();
  const [modelId, setModelId] = useState(search.model && modelById(search.model)?.category === tab ? search.model : (models[0]?.id ?? ""));
  const [prompt, setPrompt] = useState(PLACEHOLDER[tab]);
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState(tab === "Dubbing" ? 120 : 8);
  const [quality, setQuality] = useState("standard");
  const [resolution, setResolution] = useState(() => defaultResolution(tab, byCategory(tab)[0]));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reserved: number; actual: number } | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [flight, setFlight] = useState(0);
  const genRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const list = byCategory(tab);
    const nextId = search.model && modelById(search.model)?.category === tab ? search.model : (list[0]?.id ?? "");
    setModelId(nextId);
    setPrompt(PLACEHOLDER[tab]);
    setDuration(tab === "Dubbing" ? 120 : 8);
    setQuality("standard");
    setResolution(defaultResolution(tab, modelById(nextId)));
    setDone(null);
    setBlocked(false);
  }, [tab, search.model]);

  const model: CatalogModel = modelById(modelId) ?? models[0]!;
  const useRes = tab === "Video" || tab === "Image";
  const q = QUALITY.find((x) => x.id === quality) ?? QUALITY[1]!;
  const ladder = resolutionsFor(tab);
  const r = ladder.find((x) => x.id === resolution) ?? ladder[0]!;
  const activeMult = useRes ? r.mult : q.mult;
  const units = unitsFor(tab, duration, prompt.length);
  const maxCost = useMemo(() => Math.max(1, Math.ceil(model.pesewas * units * activeMult * 1.15)), [model, units, activeMult, pricing.epoch]); // +15% buffer reserved; re-computed when admin publishes prices
  const resBlocked = useRes && !model.resolutions?.includes(r.label);
  const fourKBlocked = (quality === "4k" && !model.fourK) || (useRes && r.label === "4K" && !model.fourK);
  const insufficient = demo.hydrated && demo.available < maxCost;

  function generate() {
    if (insufficient) { setBlocked(true); return; }
    setBusy(true);
    setDone(null);
    setFlight((f) => f + 1);
    playCoin("reserve");
    window.setTimeout(() => {
      const actual = Math.max(1, Math.ceil(model.pesewas * units * activeMult));
      const ok = demo.run(`${tab} · ${model.name} · ${useRes ? r.label : q.label}`, maxCost, actual, { studio: tab, title: prompt.slice(0, 48), model: model.name });
      setBusy(false);
      if (!ok) { setBlocked(true); return; }
      setDone({ reserved: maxCost, actual });
      setRunKey((k) => k + 1);
    }, 1600);
  }

  const showRatio = tab === "Image" || tab === "Video";
  const showDuration = tab === "Video" || tab === "Dubbing";
  const showResolution = tab === "Image" || tab === "Video";
  const showQuality = tab === "Image"; // Image still gets legacy quality too, but resolution is primary
  const showAudioQuality = tab !== "Voice" && tab !== "Audiobooks" && tab !== "Image" && tab !== "Video";

  return (
    <>
      <Section tone="navy" className="surface-abyss relative overflow-hidden pb-8">
        <div className="kente-weave pointer-events-none absolute inset-x-0 top-0 h-40 opacity-30" aria-hidden />
        <div className="relative">
        <SectionHead invert as="h1" eyebrow="Creative studio" title="Make it, see the price first" body="Professional tools for image, video, voice, dubbing and audiobooks. The estimated GHS cost is shown before every generation and only the actual cost is charged." />
        <DemoNotice className="mt-6 max-w-3xl">Generations are simulated placeholders. No media is produced and no provider is called on this site.</DemoNotice>
        <DemoSafeguards compact className="mt-4 max-w-3xl" />

        <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="tablist" aria-label="Studios">
          <div className="flex w-max gap-2 pb-1">
            {TABS.map(({ id, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => navigate({ search: { tab: id } })} className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors", tab === id ? "border-gold bg-gold text-gold-foreground shadow-[0_0_30px_-8px_oklch(0.82_0.15_80/0.8)]" : "border-navy-foreground/20 bg-navy-foreground/5 text-navy-foreground/75 hover:text-navy-foreground")}>
                <Icon className="size-4" aria-hidden /> {id}
              </button>
            ))}
          </div>
        </div>
        </div>
      </Section>
      <KenteDivider />

      <Section tone="muted" className="pt-0 sm:pt-0 lg:pt-0">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium">Model</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {models.map((m) => (
                <button key={m.id} type="button" onClick={() => { setModelId(m.id); setDone(null); if (!m.resolutions?.includes(r.label)) setResolution(defaultResolution(tab, m)); }} aria-pressed={m.id === modelId} className={cn("rounded-xl border p-3 text-left transition-colors", m.id === modelId ? "border-electric bg-accent" : "border-border hover:border-electric/40")}>
                  <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{m.name}</span><Stars value={m.quality} label="Quality" /></span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{formatGhs(m.pesewas)} per {m.unit} · {m.provider}</span>
                </button>
              ))}
            </div>

            <label htmlFor="sprompt" className="mt-5 block text-sm font-medium">{tab === "Voice" || tab === "Audiobooks" ? "Script" : "Prompt"}</label>
            <textarea id="sprompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            {(tab === "Voice" || tab === "Audiobooks") && <p className="mt-1 text-xs text-muted-foreground tabular">{prompt.length.toLocaleString()} characters</p>}

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {showRatio && (
                <fieldset>
                  <legend className="text-sm font-medium">Aspect ratio</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RATIOS.map((r) => <RatioFrame key={r} ratio={r} active={ratio === r} onClick={() => setRatio(r)} />)}
                  </div>
                </fieldset>
              )}
              {showDuration && (
                <div>
                  <label htmlFor="dur" className="flex items-center justify-between text-sm font-medium">Duration <span className="tabular text-muted-foreground">{tab === "Dubbing" ? `${Math.round(duration / 60)} min` : `${duration}s`}</span></label>
                  <input id="dur" type="range" min={tab === "Dubbing" ? 60 : 2} max={tab === "Dubbing" ? 600 : 20} step={tab === "Dubbing" ? 60 : 1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-3 w-full accent-[var(--electric)]" />
                </div>
              )}
              {showResolution && (
                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-medium">Resolution</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ladder.map((rr) => (
                      <ResolutionFrame key={rr.id} res={rr} active={resolution === rr.id} disabled={!model.resolutions?.includes(rr.label)} onClick={() => setResolution(rr.id)} />
                    ))}
                  </div>
                </fieldset>
              )}
              {showAudioQuality && (
                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-medium">Output quality</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {QUALITY.map((qq) => (
                      <button key={qq.id} type="button" onClick={() => setQuality(qq.id)} aria-pressed={quality === qq.id} className={cn("rounded-xl border p-3 text-left", quality === qq.id ? "border-electric bg-accent" : "border-border hover:border-electric/40")}>
                        <span className="block text-sm font-semibold">{qq.label}</span>
                        <span className="block text-[11px] leading-tight text-muted-foreground">{qq.note}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            {resBlocked && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-foreground" aria-hidden /> {r.label} output is not available on {model.name}. Choose {model.resolutions?.join(" / ") ?? "Standard"}.</p>
            )}
            {fourKBlocked && !resBlocked && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-foreground" aria-hidden /> 4K output for {model.name} requires provider validation before it can be offered. Choose a lower resolution, or a model marked 4K-ready.</p>
            )}

            <div className="mt-5 rounded-2xl bg-muted p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="tabular">{formatGhs(model.pesewas)} per {model.unit}{activeMult !== 1 ? ` × ${activeMult}` : ""}{useRes ? ` · ${r.label}` : ""}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Billable units</span><span className="tabular">{units % 1 === 0 ? units : units.toFixed(2)} {model.unit}{units === 1 ? "" : "s"}</span></div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold"><span>Estimated cost (reserved, incl. 15% buffer)</span><TickingMoney pesewas={maxCost} className="tabular" /></div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>Available</span><span className="tabular">{demo.hydrated ? formatGhs(demo.available) : "—"}</span></div>
            </div>

            {(insufficient || blocked) && (
              <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-foreground" aria-hidden />
                <div>
                  <p className="font-semibold">{blocked && pilotKillSwitchOn() ? "Demo runs are paused by the pilot kill-switch" : `Not enough balance to reserve ${formatGhs(maxCost)}`}</p>
                  <p className="mt-0.5 text-muted-foreground">{blocked && pilotKillSwitchOn() ? "The operator has halted all simulated runs. Nothing has been charged." : "Generation is blocked until you top up. Nothing has been charged."}</p>
                  <Button asChild size="sm" className="mt-3 bg-gold text-gold-foreground hover:bg-gold/90"><Link to="/wallet">Top up wallet <ArrowRight /></Link></Button>
                </div>
              </div>
            )}

            <CediFlight fireKey={flight} from={genRef} to={previewRef} />
            <Button ref={genRef} onClick={generate} disabled={busy || insufficient || fourKBlocked || resBlocked || !prompt.trim()} size="lg" className="mt-5 w-full bg-navy text-navy-foreground hover:bg-navy/90">
              {busy ? <><Loader2 className="animate-spin" /> Generating (simulated)…</> : <><Sparkles /> Generate for ≈ {formatGhs(maxCost)}</>}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">{DEMO_NOTICE}</p>
          </div>

          {/* Preview + history */}
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between px-2 pt-1"><p className="text-sm font-semibold">Preview</p><DemoBadge /></div>
              <Tilt max={6} className="mt-3 [perspective:1200px]">
              <motion.div ref={previewRef} layout transition={{ type: "spring", stiffness: 120, damping: 18 }} className={cn("surface-abyss relative grid place-items-center overflow-hidden rounded-2xl border border-gold/30 text-navy-foreground shadow-[0_40px_80px_-40px_oklch(0.82_0.15_80/0.5)]", ratio === "9:16" && showRatio ? "aspect-[9/16] max-h-[26rem] mx-auto" : ratio === "1:1" && showRatio ? "aspect-square" : ratio === "4:5" && showRatio ? "aspect-[4/5] max-h-[26rem] mx-auto" : "aspect-video")}>
                <div className="adinkra-lattice pointer-events-none absolute inset-0 opacity-40" aria-hidden />
                <span className="kente-strip-thin absolute inset-x-0 top-0" aria-hidden />
                {busy && <ScanLine />}
                {busy ? <Loader2 className="relative size-8 animate-spin text-gold" aria-label="Generating" /> : done ? (
                  <>
                    <CinematicReveal kind={tab === "Image" ? "image" : tab === "Video" ? "video" : "audio"} prompt={prompt} reserved={done.reserved} actual={done.actual} runKey={runKey} />
                    <p className="sr-only" role="status">Simulated {tab.toLowerCase()} output. Reserved {formatGhs(done.reserved)}, charged {formatGhs(done.actual)}, released {formatGhs(done.reserved - done.actual)}.</p>
                    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6 }} className={cn("absolute left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-navy/70 px-2.5 py-1 text-[11px] text-navy-foreground/85 backdrop-blur", tab === "Video" ? "bottom-16" : "bottom-3")}><CheckCircle2 className="size-3.5 shrink-0 text-gold" aria-hidden /> Simulated {tab.toLowerCase()} · {prompt.slice(0, 32) || "untitled"}{prompt.length > 32 ? "…" : ""}</motion.p>
                  </>
                ) : (
                  <div className="relative p-6 text-center text-sm text-navy-foreground/70">Your {tab.toLowerCase()} preview appears here.<br />Nothing is charged until you generate.</div>
                )}
              </motion.div>
              </Tilt>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Project history</h2>
              {demo.projects.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No projects yet. Your simulated generations will be listed here with reserved and actual cost.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border text-sm">
                  {demo.projects.slice(0, 8).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0"><p className="truncate font-medium">{p.title || p.studio}</p><p className="text-xs text-muted-foreground">{p.studio} · {p.model}</p></div>
                      <div className="shrink-0 text-right"><p className="font-semibold tabular">{formatGhs(p.actual)}</p><p className="text-[11px] text-muted-foreground tabular">held {formatGhs(p.reserved)}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </Section>
      <AgencyCampaign />
    </>
  );
}

/** Aspect-ratio picker rendered as small 3D frames. */
function RatioFrame({ ratio, active, onClick }: { ratio: string; active: boolean; onClick: () => void }) {
  const [w, h] = ratio.split(":").map(Number) as [number, number];
  const scale = 28 / Math.max(w, h);
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={`Aspect ratio ${ratio}`} className={cn("group flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2 text-xs tabular transition-[border-color,box-shadow,transform] [perspective:400px] hover:-translate-y-0.5", active ? "border-gold bg-gold/10 ring-gold-glow" : "border-border hover:border-gold/50")}>
      <span className={cn("block rounded-[3px] border-2 transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(-18deg)_rotateX(8deg)]", active ? "border-gold bg-gold/30 [transform:rotateY(-18deg)_rotateX(8deg)]" : "border-muted-foreground/50")} style={{ width: w * scale, height: h * scale }} aria-hidden />
      {ratio}
    </button>
  );
}

/** Cinematic resolution picker with a 3D film-frame look. */
function ResolutionFrame({ res, active, disabled, onClick }: { res: ResolutionTier; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} aria-label={`Resolution ${res.label}${disabled ? " unavailable" : ""}`} className={cn("group relative flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2 text-xs tabular transition-[border-color,box-shadow,transform] [perspective:400px] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45", active ? "border-gold bg-gold/10 ring-gold-glow" : "border-border hover:border-gold/50")}>
      <span className={cn("flex items-center justify-center rounded-[3px] border-2 transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(-18deg)_rotateX(8deg)]", active ? "border-gold bg-gold/30 [transform:rotateY(-18deg)_rotateX(8deg)]" : "border-muted-foreground/50")} style={{ width: 34, height: 20 }} aria-hidden>
        <span className={cn("text-[8px] font-bold", active ? "text-gold-foreground" : "text-muted-foreground")}>{res.short}</span>
      </span>
      <span className="flex items-center gap-1">
        {res.label}
        {res.label === "4K" && <span className="rounded bg-gold/20 px-1 py-0 text-[8px] text-gold-foreground">PRO</span>}
      </span>
      {disabled && <span className="absolute inset-0 rounded-xl bg-background/60" aria-hidden />}
    </button>
  );
}

function ScanLine() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-gold/25 to-transparent" initial={{ top: "-20%" }} animate={{ top: "110%" }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />;
}
