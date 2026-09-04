import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, X, Send, Sparkles, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMotionPrefs } from "@/lib/motion-prefs";
import {
  CANNOT_VERIFY,
  composeReply,
  detectSensitive,
  KB_STAMP,
  retrieve,
  SAFETY_RULES,
  SEED_ARTICLES,
  type KbHit,
} from "@/lib/admin-kb";

type Msg = {
  from: "bot" | "you";
  text: string;
  /** When the bot is still streaming its reply. */
  streaming?: boolean;
  /** Sources shown only for bot messages. */
  sources?: { title: string; live: boolean }[];
};

const QUICK = [
  "What can you do?",
  "How do I top up?",
  "Is my data safe?",
  "Which AI providers are live?",
  "What is reserve → settle → release?",
  "Is this real money?",
];

/** Streams text word-by-word. Respects reduced motion by revealing instantly. */
function useStreamText(text: string, on: boolean, speedMs = 22) {
  const { reduced } = useMotionPrefs();
  const [shown, setShown] = useState(reduced ? text : "");
  useEffect(() => {
    if (!on) return;
    if (reduced) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const words = text.split(/(\s+)/);
    const id = window.setInterval(() => {
      i += 1;
      setShown(words.slice(0, i).join(""));
      if (i >= words.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, on, reduced, speedMs]);
  return shown;
}

function Thinking() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      <span className="grid size-5 place-items-center rounded-full bg-cyan/15">
        <Sparkles className="size-3 animate-pulse text-cyan" aria-hidden />
      </span>
      <span>Claude is thinking…</span>
    </div>
  );
}

function SourcePills({ sources }: { sources: { title: string; live: boolean }[] | undefined }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            s.live
              ? "bg-electric/10 text-electric-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <ShieldCheck className="size-3" aria-hidden />
          {s.title}
        </span>
      ))}
    </div>
  );
}

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "bot",
      text: "Hi! I'm the NuruRoute assistant. This demo shows how Claude could answer questions from our approved knowledge base — no live AI call is made here.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const lastBotIndex = msgs.reduce<number>((idx, m, i) => (m.from === "bot" ? i : idx), -1);
  const streamingMsg = lastBotIndex >= 0 && msgs[lastBotIndex]?.streaming ? msgs[lastBotIndex] : null;
  const streamedText = useStreamText(streamingMsg?.text ?? "", Boolean(streamingMsg));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, open, streamedText]);

  useEffect(() => {
    if (!streamingMsg) return;
    if (streamedText.length >= streamingMsg.text.length) {
      setMsgs((m) => m.map((x, i) => (i === lastBotIndex ? { ...x, streaming: false } : x)));
    }
  }, [streamedText, streamingMsg, lastBotIndex]);

  function answerQuestion(q: string) {
    const flags = detectSensitive(q);
    if (flags.length > 0) {
      return {
        text: `Please don't share sensitive information like a ${flags.join(", ")} in chat. NuruRoute support will never ask for it.`,
        sources: [],
        sensitive: true,
      };
    }

    const hits = retrieve(q, SEED_ARTICLES, 2);
    if (hits.length === 0) {
      return {
        text: `${CANNOT_VERIFY} A simulated human-support ticket has been queued.`,
        sources: [],
      };
    }

    const text = composeReply("there", hits, "warm");
    return {
      text,
      sources: hits.map((h) => ({ title: h.article.title, live: h.article.live })),
    };
  }

  function ask(q: string) {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { from: "you", text: q }]);
    setInput("");
    setThinking(true);

    window.setTimeout(() => {
      const { text, sources } = answerQuestion(q);
      setThinking(false);
      setMsgs((m) => [...m, { from: "bot", text, sources, streaming: true }]);
    }, 650);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <>
      <Button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="nuru-support"
        className="fixed right-4 bottom-4 z-50 h-12 gap-2 rounded-full bg-navy px-4 text-navy-foreground shadow-lg hover:bg-navy/90 sm:right-6 sm:bottom-6"
      >
        {open ? <X /> : <MessageCircle />}
        <span className="text-sm font-semibold">{open ? "Close" : "Support"}</span>
      </Button>

      <div
        id="nuru-support"
        role="dialog"
        aria-label="Demo support assistant"
        className={cn(
          "fixed right-4 bottom-20 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all sm:right-6 sm:bottom-22",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border bg-navy px-4 py-3 text-navy-foreground">
          <span className="grid size-8 place-items-center rounded-full bg-cyan/20 text-cyan">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">NuruRoute assistant</p>
            <p className="text-[11px] text-navy-foreground/70">
              Powered by Claude · Demo mode · answers stay in this browser
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInfo((s) => !s)}
            className="grid size-7 place-items-center rounded-full text-navy-foreground/70 hover:bg-white/10 hover:text-navy-foreground"
            aria-label="About this assistant"
            aria-pressed={showInfo}
          >
            <Info className="size-4" aria-hidden />
          </button>
        </div>

        {showInfo && (
          <div className="border-b border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
            <p>
              This is a simulated Claude experience. Answers are built from an approved local
              knowledge base — no API call is made and no data leaves your browser. A real
              integration needs an Anthropic API/developer plan, not a Claude Pro chat
              subscription.
            </p>
            <p className="mt-2 font-medium text-foreground">Safety rules in force:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {SAFETY_RULES.slice(0, 3).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-4 text-sm">
          {msgs.map((m, i) => {
            const isStreaming = m.streaming && i === lastBotIndex;
            const displayText = isStreaming ? streamedText : m.text;
            return (
              <div key={i}>
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 leading-relaxed",
                    m.from === "bot"
                      ? "bg-muted text-foreground"
                      : "ml-auto bg-electric text-electric-foreground",
                  )}
                >
                  {displayText}
                  {isStreaming && (
                    <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" />
                  )}
                </div>
                {m.from === "bot" && <SourcePills sources={m.sources} />}
              </div>
            );
          })}
          {thinking && (
            <div className="max-w-[92%] rounded-2xl bg-muted px-3.5 py-2.5">
              <Thinking />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-border/60 bg-card px-4 py-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-electric/50 hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
          <label htmlFor="nuru-support-input" className="sr-only">
            Ask a question
          </label>
          <input
            id="nuru-support-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about wallet, pricing, safety…"
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-electric text-electric-foreground hover:bg-electric/90"
            aria-label="Send"
          >
            <Send />
          </Button>
        </form>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3" aria-hidden />
            {KB_STAMP}
          </p>
          <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">
            Investor Demo · AI simulated
          </span>
        </div>
      </div>
    </>
  );
}
