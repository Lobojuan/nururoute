"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatGhs, type AiRequestResult, type LedgerEntry, type OrgModelInfo } from "@nurunode/shared";
import { ApiError, api, type UsageRequestRow } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Alert, Card, Empty, Pill, Spinner, fmtDate, type Tone } from "@/components/ui";
import { StatusPill, ZeroBalance } from "@/components/wallet-bits";

const ENTRY: Record<LedgerEntry["entryType"], { label: string; tone: Tone; sign: string }> = {
  top_up: { label: "Top-up", tone: "gold", sign: "+" },
  reservation: { label: "Reserved", tone: "cyan", sign: "−" },
  settlement: { label: "Settled", tone: "navy", sign: "" },
  release: { label: "Released", tone: "green", sign: "+" },
  refund: { label: "Refund", tone: "blue", sign: "−" },
};

export default function UsagePage() {
  const { org, wallet, refreshWallet } = useSession();
  const [tab, setTab] = useState<"requests" | "ledger">("requests");
  const [requests, setRequests] = useState<UsageRequestRow[] | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    const [r, l] = await Promise.all([api.requests(org.id), api.ledger(org.id)]);
    setRequests(r.requests);
    setEntries(l.entries);
  }, [org]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (!org) return null;
  const isZero = wallet?.availablePesewas === 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{org.name}</p>
          <h1>Usage</h1>
        </div>
      </div>

      {isZero ? (
        <ZeroBalance />
      ) : (
        <RunRequest
          orgId={org.id}
          onDone={async () => {
            await Promise.all([refreshWallet(), load()]);
          }}
        />
      )}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
          Requests
        </button>
        <button role="tab" aria-selected={tab === "ledger"} className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}>
          Ledger
        </button>
      </div>

      {tab === "requests" && (
        <Card>
          {!requests ? (
            <div className="center"><Spinner /></div>
          ) : requests.length === 0 ? (
            <Empty title="No requests yet" body="Each request shows what was reserved, what it actually cost and what came back." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th className="num">Reserved</th>
                    <th className="num">Charged</th>
                    <th className="num">Returned</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td data-label="When">{fmtDate(r.created_at)}</td>
                      <td data-label="Model">
                        {r.model_id}
                        {r.input_tokens != null && (
                          <span className="muted small"> · {r.input_tokens} in / {r.output_tokens} out</span>
                        )}
                      </td>
                      <td data-label="Status">
                        <StatusPill status={r.status} />
                        {r.status === "rejected" && <span className="muted small"> insufficient balance</span>}
                      </td>
                      <td data-label="Reserved" className="num">{formatGhs(Number(r.reserved_pesewas))}</td>
                      <td data-label="Charged" className="num">
                        {r.actual_pesewas != null ? formatGhs(Number(r.actual_pesewas)) : "—"}
                      </td>
                      <td data-label="Returned" className="num">
                        {r.released_pesewas != null ? formatGhs(Number(r.released_pesewas)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "ledger" && (
        <Card subtitle="Every money movement, newest first. Entries are never edited or deleted.">
          {!entries ? (
            <div className="center"><Spinner /></div>
          ) : entries.length === 0 ? (
            <Empty title="Ledger is empty" />
          ) : (
            <ul className="list">
              {entries.map((e) => {
                const meta = ENTRY[e.entryType];
                return (
                  <li key={e.id}>
                    <div>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                      <span className="muted small"> {fmtDate(e.createdAt)}</span>
                    </div>
                    <strong className={`amt amt-${meta.tone}`}>
                      {meta.sign}
                      {formatGhs(e.amountPesewas)}
                    </strong>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function RunRequest({ orgId, onDone }: { orgId: string; onDone: () => Promise<void> }) {
  const [models, setModels] = useState<OrgModelInfo[]>([]);
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("Write one line about jollof rice.");
  const [maxOut, setMaxOut] = useState(200);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiRequestResult | null>(null);
  const [blocked, setBlocked] = useState<{ required: number; available: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.orgModels(orgId).then((r) => {
      setModels(r.models);
      setModelId((m) => m || r.models[0]?.id || "");
    });
  }, [orgId]);

  const model = models.find((m) => m.id === modelId);
  const estIn = Math.max(1, Math.ceil(prompt.trim().length / 4));
  const estMax = model
    ? Math.ceil((estIn * model.inputPricePer1kPesewas) / 1000) +
      Math.ceil((Math.min(maxOut, model.maxOutputTokens) * model.outputPricePer1kPesewas) / 1000)
    : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setBlocked(null);
    setResult(null);
    try {
      setResult(await api.runRequest(orgId, { modelId, prompt, maxOutputTokens: maxOut }));
      await onDone();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setBlocked({ required: Number(e.body["requiredPesewas"]), available: Number(e.body["availablePesewas"]) });
        await onDone();
      } else setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Run a test request" subtitle="See reserve → settle → release on a real ledger, with a mocked model reply.">
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <label>
            Model
            <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} — ≈{formatGhs(m.examplePer1kPesewas)} / typical message
                </option>
              ))}
            </select>
          </label>
          <label>
            Max reply length (tokens)
            <input type="number" min={1} max={4096} value={maxOut} onChange={(e) => setMaxOut(Number(e.target.value))} />
          </label>
        </div>
        <label>
          Prompt
          <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </label>
        <div className="run-bar">
          <span className="muted">
            Will reserve up to <strong>{formatGhs(estMax)}</strong>
          </span>
          <button className="btn btn-primary" disabled={busy || !modelId || !prompt.trim()}>
            {busy ? "Running…" : "Run request"}
          </button>
        </div>
      </form>

      {blocked && (
        <Alert tone="red">
          <strong>Blocked — not enough balance.</strong> This request needs{" "}
          {formatGhs(blocked.required)} reserved but only {formatGhs(blocked.available)} is available.{" "}
          <Link href="/dashboard/top-up" className="link">
            Top up
          </Link>
        </Alert>
      )}
      {err && <Alert tone="red">{err}</Alert>}
      {result && (
        <div className="result">
          <blockquote>{result.text}</blockquote>
          <div className="result-cost">
            <span>
              <small>Reserved</small>
              {formatGhs(result.reservedPesewas)}
            </span>
            <span>
              <small>Charged</small>
              {formatGhs(result.actualPesewas)}
            </span>
            <span>
              <small>Returned</small>
              {formatGhs(result.releasedPesewas)}
            </span>
            <span>
              <small>Available now</small>
              {formatGhs(result.balance.availablePesewas)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
