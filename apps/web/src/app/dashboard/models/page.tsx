"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatGhs, type OrgModelInfo } from "@nurunode/shared";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Alert, Card, Pill, Spinner } from "@/components/ui";

/** 1,000 tokens is roughly 750 English words. */
const WORDS_PER_1K = 750;

export default function ModelsPage() {
  const { org } = useSession();
  const [models, setModels] = useState<OrgModelInfo[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwner = org?.role === "owner";

  useEffect(() => {
    if (!org) return;
    setModels(null);
    api.orgModels(org.id).then((r) => setModels(r.models)).catch((e) => setError(e.message));
  }, [org]);

  if (!org) return null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{org.name}</p>
          <h1>Models &amp; pricing</h1>
        </div>
      </div>

      <Alert tone="blue">
        Prices are per <strong>1,000 tokens</strong> (about {WORDS_PER_1K} words). You are charged
        for the words you send <em>and</em> the words the model writes back. These are test models
        with test prices — no live AI provider is called.
      </Alert>
      {error && <Alert tone="red">{error}</Alert>}

      {!models ? (
        <div className="center">
          <Spinner />
        </div>
      ) : (
        <div className="model-grid">
          {models.map((m) => (
            <Card key={m.id} className="model-card">
              <div className="model-head">
                <div>
                  <h2>{m.displayName}</h2>
                  <code className="muted">{m.id}</code>
                </div>
                {m.customPrice ? <Pill tone="gold">Custom price</Pill> : <Pill tone="grey">Default price</Pill>}
              </div>
              <p className="muted">{m.description}</p>

              <dl className="price-table">
                <div>
                  <dt>You send</dt>
                  <dd>
                    {formatGhs(m.inputPricePer1kPesewas)} <span className="muted">/ 1k tokens</span>
                  </dd>
                </div>
                <div>
                  <dt>Model replies</dt>
                  <dd>
                    {formatGhs(m.outputPricePer1kPesewas)} <span className="muted">/ 1k tokens</span>
                  </dd>
                </div>
                <div className="price-example">
                  <dt>Typical message <span className="muted">(500 tokens in + 500 out)</span></dt>
                  <dd>≈ {formatGhs(m.examplePer1kPesewas)}</dd>
                </div>
              </dl>
              <p className="field-hint">Longest reply: {m.maxOutputTokens.toLocaleString()} tokens.</p>

              {isOwner && editing !== m.id && (
                <div className="row-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing(m.id)}>
                    Edit price for {org.name}
                  </button>
                  {m.customPrice && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        const r = await api.resetPrice(org.id, m.id);
                        setModels(r.models);
                      }}
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              )}
              {isOwner && editing === m.id && (
                <PriceEditor
                  orgId={org.id}
                  model={m}
                  onCancel={() => setEditing(null)}
                  onSaved={(list) => {
                    setModels(list);
                    setEditing(null);
                  }}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceEditor({
  orgId,
  model,
  onCancel,
  onSaved,
}: {
  orgId: string;
  model: OrgModelInfo;
  onCancel: () => void;
  onSaved: (models: OrgModelInfo[]) => void;
}) {
  const [inp, setInp] = useState((model.inputPricePer1kPesewas / 100).toFixed(2));
  const [out, setOut] = useState((model.outputPricePer1kPesewas / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toP = (v: string) => Math.round(Number(v) * 100);
  const preview = Math.ceil((500 * toP(inp)) / 1000) + Math.ceil((500 * toP(out)) / 1000);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api.setPrice(orgId, model.id, {
        inputPricePer1kPesewas: toP(inp),
        outputPricePer1kPesewas: toP(out),
      });
      onSaved(r.models);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form price-editor" onSubmit={save}>
      <div className="form-row">
        <label>
          Input price (GHS / 1k tokens)
          <input type="number" min={0} step="0.01" value={inp} onChange={(e) => setInp(e.target.value)} />
        </label>
        <label>
          Output price (GHS / 1k tokens)
          <input type="number" min={0} step="0.01" value={out} onChange={(e) => setOut(e.target.value)} />
        </label>
      </div>
      <p className="field-hint">
        Typical message would cost ≈ {Number.isFinite(preview) ? formatGhs(preview) : "—"}. Default is{" "}
        {formatGhs(model.defaultPrice.inputPricePer1kPesewas)} in /{" "}
        {formatGhs(model.defaultPrice.outputPricePer1kPesewas)} out.
      </p>
      {err && <Alert tone="red">{err}</Alert>}
      <div className="row-actions">
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? "Saving…" : "Save price"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
