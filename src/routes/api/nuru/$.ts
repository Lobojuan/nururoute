/**
 * Server-side proxy from the public frontend to the authenticated backend.
 *
 * Why: the authenticated backend only allows the dashboard origin via CORS.
 * Proxying server-to-server lets the public console read organisation data
 * without exposing backend URLs or credentials to the browser. No credentials
 * are added here — the caller's own Bearer session is forwarded as-is.
 * Webhook and OAuth paths are deliberately not proxied.
 */
import { createFileRoute } from "@tanstack/react-router";

const ALLOWED = [/^\/health$/, /^\/auth\/dev-login$/, /^\/me$/, /^\/models$/, /^\/orgs(\/[A-Za-z0-9-]+(\/[a-z-]+(\/[A-Za-z0-9-]+)?)?)?$/];
const BLOCKED = [/^\/webhooks/, /^\/auth\/google/];

async function proxy(request: Request, splat: string) {
  const base = (process.env["NURU_API_URL"] ?? "http://localhost:4000").replace(/\/$/, "");
  const path = "/" + splat.replace(/^\/+/, "");
  if (BLOCKED.some((r) => r.test(path)) || !ALLOWED.some((r) => r.test(path))) {
    return Response.json({ error: "NOT_ALLOWED", message: "Path not proxied" }, { status: 404 });
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.text();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(base + path, { ...init, signal: ctrl.signal });
    clearTimeout(t);
    const body = await res.text();
    return new Response(body, { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    // An unreachable backend is an expected state for the public demo (the console falls
    // back to labelled demo data), so answer with a 200 envelope instead of a 5xx. The
    // client maps `error: "API_OFFLINE"` back into a thrown ConsoleError for callers.
    return Response.json(
      { ok: false, offline: true, error: "API_OFFLINE", message: "Organisation data is currently unavailable. The console will show labelled demo data." },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }
}

export const Route = createFileRoute("/api/nuru/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => proxy(request, params._splat ?? ""),
      POST: ({ request, params }) => proxy(request, params._splat ?? ""),
      DELETE: ({ request, params }) => proxy(request, params._splat ?? ""),
    },
  },
});
