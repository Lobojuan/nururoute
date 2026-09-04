import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const SAFEGUARDS = [
  "No real payments: mobile-money top-ups are simulated and no money is collected.",
  "No live AI processing: requests are answered by simulated responses.",
  "All prices, balances and conversions are illustrative estimates, not live rates.",
  "Provider and operator names are trademarks of their owners and do not imply partnership or integration.",
  "Ghana is the launch market; other countries are shown as planned and illustrative until locally validated.",
];

export function DemoSafeguards({ compact, className, invert }: { compact?: boolean; className?: string; invert?: boolean }) {
  return (
    <aside
      aria-label="Demo safeguards"
      className={cn(
        "rounded-2xl border p-4 text-sm",
        invert ? "border-navy-foreground/15 bg-navy-foreground/5 text-navy-foreground/80" : "border-gold/40 bg-gold/10 text-foreground",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        <ShieldCheck className="size-4 text-gold-foreground" aria-hidden /> Demo safeguards
      </p>
      {compact ? (
        <p className={cn("mt-2 leading-relaxed", invert ? "text-navy-foreground/70" : "text-muted-foreground")}>
          No real payments. No live AI processing. Prices are illustrative. Provider names do not imply partnership. Ghana is the launch market; other countries are planned.
        </p>
      ) : (
        <ul className={cn("mt-2 grid gap-1.5 leading-relaxed sm:grid-cols-2", invert ? "text-navy-foreground/70" : "text-muted-foreground")}>
          {SAFEGUARDS.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-gold" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
