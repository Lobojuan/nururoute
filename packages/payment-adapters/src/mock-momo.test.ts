import { describe, expect, it } from "vitest";
import { MockMomoAdapter, hmacHex } from "./index";

describe("MockMomoAdapter", () => {
  const adapter = new MockMomoAdapter("test-secret");

  it("creates an intent with a provider reference and no real side effects", async () => {
    const intent = await adapter.createTopUpIntent({
      walletId: "w1",
      amountPesewas: 2500,
      phone: "0241234567",
    });
    expect(intent.provider).toBe("mock_momo");
    expect(intent.providerRef).toMatch(/^momo_/);
    expect(intent.instructions).toContain("MOCK");
  });

  it("produces webhooks that verify and parse", async () => {
    const intent = await adapter.createTopUpIntent({ walletId: "w1", amountPesewas: 2500 });
    const hook = adapter.buildWebhook({ ...intent, walletId: "w1" });
    expect(() => adapter.verifyWebhook(hook.rawBody, hook.signature)).not.toThrow();
    const event = adapter.parseWebhook(hook.rawBody);
    expect(event.type).toBe("payment.succeeded");
    expect(event.amountPesewas).toBe(2500);
    expect(event.walletId).toBe("w1");
  });

  it("rejects tampered bodies and wrong secrets", async () => {
    const intent = await adapter.createTopUpIntent({ walletId: "w1", amountPesewas: 2500 });
    const hook = adapter.buildWebhook({ ...intent, walletId: "w1" });
    const tampered = hook.rawBody.replace("2500", "250000");
    expect(() => adapter.verifyWebhook(tampered, hook.signature)).toThrow(/INVALID_SIGNATURE/);
    expect(() => adapter.verifyWebhook(hook.rawBody, hmacHex("other", hook.rawBody))).toThrow(
      /INVALID_SIGNATURE/,
    );
    expect(() => adapter.verifyWebhook(hook.rawBody, undefined)).toThrow(/INVALID_SIGNATURE/);
  });
});
