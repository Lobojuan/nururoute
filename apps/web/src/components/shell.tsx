"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/session";
import { Pill, Spinner } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Wallet", icon: "◉" },
  { href: "/dashboard/top-up", label: "Top up", icon: "＋" },
  { href: "/dashboard/models", label: "Models", icon: "◈" },
  { href: "/dashboard/usage", label: "Usage", icon: "≣" },
  { href: "/dashboard/api-keys", label: "API keys", icon: "⚿" },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo ${light ? "logo-light" : ""}`}>
      <span className="logo-mark" aria-hidden />
      <span>Nuru<span className="logo-accent">Node</span></span>
    </span>
  );
}

export function ModeBadge() {
  const { health } = useSession();
  if (!health) return <Pill tone="grey">API offline</Pill>;
  return health.paymentMode === "sandbox" ? (
    <Pill tone="cyan">MTN sandbox · no real money</Pill>
  ) : (
    <Pill tone="gold">Test mode · no real money</Pill>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { ready, user, orgs, org, selectOrg, signOut, error } = useSession();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo light />
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => {
            const active = n.href === "/dashboard" ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`nav-link ${active ? "active" : ""}`}>
                <span className="nav-icon" aria-hidden>
                  {n.icon}
                </span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <ModeBadge />
          {user && <span className="sidebar-user">{user.email}</span>}
          <button className="btn-ghost-light" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-logo">
              <Logo />
            </span>
            {orgs.length > 0 && (
              <label className="org-picker">
                <span className="sr-only">Organisation</span>
                <select value={org?.id ?? ""} onChange={(e) => selectOrg(e.target.value)}>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="topbar-right">
            <ModeBadge />
            <Link href="/onboarding?new=1" className="btn btn-outline btn-sm">
              New org
            </Link>
          </div>
        </header>

        <main className="content">
          {error && <div className="alert alert-red">{error}</div>}
          {!ready ? (
            <div className="center">
              <Spinner />
            </div>
          ) : (
            children
          )}
        </main>

        <nav className="bottom-nav" aria-label="Main mobile">
          {NAV.map((n) => {
            const active = n.href === "/dashboard" ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={active ? "active" : ""}>
                <span aria-hidden>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
