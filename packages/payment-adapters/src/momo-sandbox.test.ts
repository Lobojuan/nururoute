import { describe, expect, it } from "vitest";
import { MomoSandboxAdapter, pesewasToMajor, toMsisdn } from "./momo-sandbox";

/** Fake MTN sandbox: records calls, issues a token, accepts requesttopay, reports status. */
function fakeMtn(opts: { status?: "PENDING" | "SUCCESSFUL" | "FAILED"; tokenStatus?: number } = {}) {
  const calls: { method: string; url: string; headers: Record<string, string>; body?: unknown }[] =
    [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = Object.fromEntries(
      Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [
        k.toLowerCase(),
        v,
      ]),
    );
    calls.push({
      method: init?.method ?? "GET",
      url,
      headers,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (url.endsWith("/collection/token/")) {
      if (opts.tokenStatus && opts.tokenStatus !== 200)
        return new Response("nope", { status: opts.tokenStatus });
      return Response.json({ access_token: "tok_123", token_type: "access_token", expires_in: 3600 });
    }
    if (url.endsWith("/collection/v1_0/requesttopay") && init?.method === "POST") {
      return new Response(null, { status: 202 });
    }
    if (url.includes("/collection/v1_0/requesttopay/")) {
      return Response.json({
        amount: "20",
        currency: "EUR",
        financialTransactionId: "ft_1",
        status: opts.status ?? "SUCCESSFUL",
        ...(opts.status === "FAILED" ? { reason: "PAYER_NOT_FOUND" } : {}),
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const baseCfg = {
  subscriptionKey: "sub_key_test",
  apiUser: "11111111-1111-1111-1111-111111111111",
  apiKey: "api_key_test",
  targetEnvironment: "sandbox",
};

describe("MomoSandboxAdapter", () => {
  it("refuses any non-sandbox target environment", () => {
    expect(() => new MomoSandboxAdapter({ ...baseCfg, targetEnvironment: "mtnghana" })).toThrow(
      /sandbox/,
    );
  });

  it("refuses placeholder credentials", () => {
    expect(() => new MomoSandboxAdapter({ ...baseCfg, apiKey: "mock-not-a-real-key" })).toThrow(
      /MTN_MOMO_API_KEY/,
    );
  });

  it("normalises Ghana numbers and formats amounts", () => {
    expect(toMsisdn("024 123 4567")).toBe("233241234567");
    expect(toMsisdn("+233241234567")).toBe("233241234567");
    expect(toMsisdn("46733123453")).toBe("46733123453");
    expect(pesewasToMajor(2000)).toBe("20");
    expect(pesewasToMajor(2550)).toBe("25.50");
  });

  it("creates a request-to-pay with the right headers and body", async () => {
    const mtn = fakeMtn();
    const adapter = new MomoSandboxAdapter({ ...baseCfg, fetch: mtn.fetchImpl });
    const intent = await adapter.createTopUpIntent({
      walletId: "wallet-1",
      amountPesewas: 2000,
      phone: "0241234567",
    });
    expect(intent.provider).toBe("momo_sandbox");
    expect(intent.providerRef).toMatch(/^[0-9a-f-]{36}$/);
    expect(intent.instructions).toContain("SANDBOX");

    const token = mtn.calls[0]!;
    expect(token.url).toContain("/collection/token/");
    expect(token.headers["authorization"]).toMatch(/^Basic /);
    expect(token.headers["ocp-apim-subscription-key"]).toBe("sub_key_test");

    const rtp = mtn.calls[1]!;
    expect(rtp.method).toBe("POST");
    expect(rtp.headers["authorization"]).toBe("Bearer tok_123");
    expect(rtp.headers["x-target-environment"]).toBe("sandbox");
    expect(rtp.headers["x-reference-id"]).toBe(intent.providerRef);
    expect(rtp.body).toMatchObject({
      amount: "20",
      currency: "EUR",
      externalId: "wallet-1",
      payer: { partyIdType: "MSISDN", partyId: "233241234567" },
    });
  });

  it("requires a phone number", async () => {
    const adapter = new MomoSandboxAdapter({ ...baseCfg, fetch: fakeMtn().fetchImpl });
    await expect(adapter.createTopUpIntent({ walletId: "w", amountPesewas: 100 })).rejects.toMatchObject(
      { code: "VALIDATION_ERROR" },
    );
  });

  it("maps provider statuses and reuses the cached token", async () => {
    for (const [remote, local] of [
      ["SUCCESSFUL", "succeeded"],
      ["PENDING", "pending"],
      ["FAILED", "failed"],
    ] as const) {
      const mtn = fakeMtn({ status: remote });
      const adapter = new MomoSandboxAdapter({ ...baseCfg, fetch: mtn.fetchImpl });
      const a = await adapter.getTopUpStatus("ref-1");
      const b = await adapter.getTopUpStatus("ref-1");
      expect(a.status).toBe(local);
      expect(b.status).toBe(local);
      expect(a.amountPesewas).toBe(2000);
      // one token call + two status calls
      expect(mtn.calls.filter((c) => c.url.endsWith("/collection/token/"))).toHaveLength(1);
      if (remote === "FAILED") expect(a.reason).toBe("PAYER_NOT_FOUND");
    }
  });

  it("surfaces credential problems as PROVIDER_ERROR", async () => {
    const adapter = new MomoSandboxAdapter({
      ...baseCfg,
      fetch: fakeMtn({ tokenStatus: 401 }).fetchImpl,
    });
    await expect(adapter.getTopUpStatus("ref")).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });

  it("never accepts unsigned callbacks as proof of payment", () => {
    const adapter = new MomoSandboxAdapter({ ...baseCfg, fetch: fakeMtn().fetchImpl });
    expect(() => adapter.verifyWebhook()).toThrow(/unsigned/);
  });
});
