"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, getToken, saveOrg } from "@/lib/api";
import { Logo } from "@/components/shell";
import { Alert } from "@/components/ui";

function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const isExtra = params.get("new") === "1";
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) router.replace("/");
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const org = await api.createOrg(name.trim());
      saveOrg(org.id);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create organisation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <Logo />
      <h2>{isExtra ? "Create another organisation" : "Set up your organisation"}</h2>
      <p className="muted">
        Every organisation gets its own GHS wallet, usage history, pricing and API keys. You can
        invite teammates later.
      </p>
      <ol className="steps">
        <li className="done">Sign in</li>
        <li className="current">Name your organisation</li>
        <li>Top up your wallet</li>
        <li>Run your first request</li>
      </ol>
      <form onSubmit={submit} className="form">
        <label>
          Organisation name
          <input
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kumasi Fintech Ltd"
            autoFocus
          />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy || name.trim().length < 2}>
          {busy ? "Creating…" : "Create organisation & wallet"}
        </button>
      </form>
      {isExtra && (
        <Link href="/dashboard" className="btn btn-ghost btn-block">
          Back to dashboard
        </Link>
      )}
      {error && <Alert tone="red">{error}</Alert>}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="auth auth-single">
      <main className="auth-main">
        <Suspense fallback={null}>
          <OnboardingForm />
        </Suspense>
      </main>
    </div>
  );
}
