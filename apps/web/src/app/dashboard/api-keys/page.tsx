"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ApiKeySummary } from "@nurunode/shared";
import { API_URL, api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Alert, Card, Empty, Pill, Spinner, fmtDate } from "@/components/ui";

export default function ApiKeysPage() {
  const { org } = useSession();
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<{ name: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setKeys((await api.apiKeys(org.id)).keys);
  }, [org]);
  useEffect(() => {
    setKeys(null);
    load().catch((e) => setErr(e.message));
  }, [load]);

  if (!org) return null;

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.createApiKey(org.id, name.trim());
      setFresh({ name: r.key.name, secret: r.secret });
      setCopied(false);
      setName("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create key");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(k: ApiKeySummary) {
    if (!org || !confirm(`Revoke "${k.name}"? Apps using it will stop working immediately.`)) return;
    await api.revokeApiKey(org.id, k.id);
    await load();
  }

  const active = keys?.filter((k) => !k.revokedAt) ?? [];
  const revoked = keys?.filter((k) => k.revokedAt) ?? [];

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">{org.name}</p>
          <h1>Developer API keys</h1>
        </div>
      </div>

      <Alert tone="blue">
        Keys are scoped to <strong>{org.name}</strong> and spend from its wallet. Your apps call
        NuruNode only — upstream AI-provider keys never leave our servers.
      </Alert>

      <Card title="Create a key">
        <form className="form form-inline" onSubmit={create}>
          <label>
            Key name
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. WhatsApp bot (staging)"
            />
          </label>
          <button className="btn btn-primary" disabled={busy || name.trim().length === 0}>
            {busy ? "Creating…" : "Create key"}
          </button>
        </form>
        {fresh && (
          <div className="secret-box">
            <strong>Copy your key for “{fresh.name}” now — it will not be shown again.</strong>
            <div className="secret-row">
              <code>{fresh.secret}</code>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(fresh.secret).catch(() => {});
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
        {err && <Alert tone="red">{err}</Alert>}
      </Card>

      <Card title="Active keys">
        {!keys ? (
          <div className="center"><Spinner /></div>
        ) : active.length === 0 ? (
          <Empty title="No active keys" body="Create one above to call the API from your own code." />
        ) : (
          <ul className="list">
            {active.map((k) => (
              <li key={k.id}>
                <div>
                  <strong>{k.name}</strong>
                  <div className="muted small">
                    <code>{k.keyPrefix}…</code> · created {fmtDate(k.createdAt)}
                    {k.lastUsedAt ? ` · last used ${fmtDate(k.lastUsedAt)}` : " · never used"}
                  </div>
                </div>
                <div className="list-right">
                  <Pill tone="green">Active</Pill>
                  <button className="btn btn-ghost btn-sm danger" onClick={() => revoke(k)}>
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {revoked.length > 0 && (
          <details className="revoked">
            <summary>{revoked.length} revoked</summary>
            <ul className="list">
              {revoked.map((k) => (
                <li key={k.id}>
                  <div>
                    <strong>{k.name}</strong>
                    <div className="muted small">
                      <code>{k.keyPrefix}…</code> · revoked {fmtDate(k.revokedAt!)}
                    </div>
                  </div>
                  <Pill tone="grey">Revoked</Pill>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <Card title="Quick start" className="card-soft">
        <pre className="code">{`curl -X POST ${API_URL}/orgs/${org.id}/ai/requests \\
  -H "Authorization: Bearer nn_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"modelId":"nuru-test-small","prompt":"Hello Accra","maxOutputTokens":100}'`}</pre>
        <p className="muted small">
          Responses include <code>reservedPesewas</code>, <code>actualPesewas</code>,{" "}
          <code>releasedPesewas</code> and your new balance. A <code>402</code> means the wallet
          needs a top-up.
        </p>
      </Card>
    </div>
  );
}
