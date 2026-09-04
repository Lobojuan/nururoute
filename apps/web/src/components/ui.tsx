"use client";

import type { ReactNode } from "react";
import { formatGhs } from "@nurunode/shared";

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Money({ pesewas, size = "md" }: { pesewas: number; size?: "sm" | "md" | "lg" | "xl" }) {
  const s = formatGhs(pesewas);
  const [cur, ...rest] = s.split(" ");
  return (
    <span className={`money money-${size}`}>
      <span className="money-cur">{cur}</span> {rest.join(" ")}
    </span>
  );
}

export type Tone = "navy" | "blue" | "cyan" | "gold" | "green" | "red" | "grey";

export function Pill({ tone = "grey", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Alert({ tone = "blue", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role="status" className={`alert alert-${tone}`}>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ""}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {body && <p className="muted">{body}</p>}
      {action}
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-label="Loading" />;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
