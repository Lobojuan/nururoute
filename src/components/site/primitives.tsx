import type { ReactNode } from "react";
import { Star, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_NOTICE } from "@/lib/demo";

export function Section({
  children,
  className,
  tone = "light",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "muted" | "navy";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-20 lg:py-24",
        tone === "muted" && "bg-muted/60",
        tone === "navy" && "surface-navy",
        className,
      )}
    >
      <div className="container-site">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-[0.22em] text-electric", className)}>
      {children}
    </p>
  );
}

export function SectionHead({
  eyebrow,
  title,
  body,
  align = "left",
  invert,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  body?: ReactNode;
  align?: "left" | "center";
  invert?: boolean;
  /** Use "h1" for the first heading of a page. */
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <Eyebrow className={invert ? "text-cyan" : ""}>{eyebrow}</Eyebrow>}
      <Heading className={cn("mt-3 text-3xl font-semibold sm:text-4xl", invert && "text-navy-foreground")}>
        {title}
      </Heading>
      {body && (
        <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", invert ? "text-navy-foreground/75" : "text-muted-foreground")}>
          {body}
        </p>
      )}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-foreground [.surface-navy_&]:text-gold-bright [.surface-abyss_&]:text-gold-bright [.bg-navy_&]:text-gold-bright [.bg-navy-abyss_&]:text-gold-bright [.bg-navy-deep_&]:text-gold-bright [.text-navy-foreground_&]:text-gold-bright",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-gold" aria-hidden />
      Demo mode
    </span>
  );
}

export function DemoNotice({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-foreground",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold-foreground" aria-hidden />
      <p>
        <strong className="font-semibold">{DEMO_NOTICE}</strong>{" "}
        {children ?? "Figures, providers and balances on this page are simulated for illustration."}
      </p>
    </div>
  );
}

export function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${label}: ${value} out of 5`} title={`${label}: ${value}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn("size-3.5", i < value ? "fill-gold text-gold" : "text-border")}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  invert,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  invert?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", invert ? "border-navy-foreground/10 bg-navy-foreground/5" : "border-border bg-card")}>
      <p className={cn("text-xs font-semibold uppercase tracking-wider", invert ? "text-navy-foreground/60" : "text-muted-foreground")}>{label}</p>
      <p className={cn("mt-2 break-words font-display text-lg font-semibold tabular sm:text-2xl lg:text-3xl", invert && "text-navy-foreground")}>{value}</p>
      {hint && <p className={cn("mt-1 text-xs", invert ? "text-navy-foreground/60" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}

export function Feature({
  icon,
  title,
  body,
  invert,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  invert?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border p-6", invert ? "border-navy-foreground/10 bg-navy-foreground/5" : "border-border bg-card shadow-sm")}>
      <div className={cn("inline-flex size-10 items-center justify-center rounded-xl", invert ? "bg-cyan/20 text-cyan" : "bg-accent text-electric")}>
        {icon}
      </div>
      <h3 className={cn("mt-4 text-lg font-semibold", invert && "text-navy-foreground")}>{title}</h3>
      <p className={cn("mt-2 text-sm leading-relaxed", invert ? "text-navy-foreground/70" : "text-muted-foreground")}>{body}</p>
    </div>
  );
}
