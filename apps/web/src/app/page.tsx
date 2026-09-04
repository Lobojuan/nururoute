"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { API_URL, api, getToken, setToken } from "@/lib/api";
import { Logo } from "@/components/shell";
import { Alert } from "@/components/ui";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await api.devLogin(email, name || undefined);
      setToken(token);
      const me = await api.me();
      router.push(me.organisations.length ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_URL}/auth/google`);
      const body = await res.json();
      setNotice(body.message ?? "Google sign-in is not configured yet.");
    } catch {
      setError(`Cannot reach the NuruNode API at ${API_URL}.`);
    }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <Logo light />
        <h1>AI for builders in Ghana, paid in cedis.</h1>
        <ul className="auth-points">
          <li>
            <strong>One GHS wallet</strong> for every AI model you use.
          </li>
          <li>
            <strong>Know the cost before you run.</strong> We reserve the maximum, charge the actual,
            and return the rest.
          </li>
          <li>
            <strong>Top up with mobile money.</strong> No card required.
          </li>
        </ul>
        <p className="auth-fine">
          This is the test environment. No real money moves and no live AI provider is called.
        </p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-logo-mobile">
            <Logo />
          </div>
          <h2>Sign in</h2>
          <p className="muted">Test sign-in: any email creates an account instantly.</p>
          <form onSubmit={onSubmit} className="form">
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ama@example.com"
              />
            </label>
            <label>
              <span>Name <span className="muted">(optional)</span></span>
              <input
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Ama Mensah"
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Signing in…" : "Continue with email"}
            </button>
          </form>
          <div className="divider">
            <span>or</span>
          </div>
          <button type="button" className="btn btn-outline btn-block" onClick={onGoogle}>
            Continue with Google
          </button>
          {notice && <Alert tone="gold">{notice}</Alert>}
          {error && <Alert tone="red">{error}</Alert>}
        </div>
      </main>
    </div>
  );
}
