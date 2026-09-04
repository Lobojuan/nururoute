import { describe, expect, it } from "vitest";
import { MockProviderAdapter, approxTokens, priceFor } from "./index";

describe("MockProviderAdapter", () => {
  const adapter = new MockProviderAdapter();

  it("lists test models with pesewa pricing", () => {
    const models = adapter.listModels();
    expect(models.map((m) => m.id)).toContain("nuru-test-small");
    for (const m of models) {
      expect(Number.isInteger(m.inputPricePer1kPesewas)).toBe(true);
      expect(Number.isInteger(m.outputPricePer1kPesewas)).toBe(true);
    }
  });

  it("estimates a maximum cost that is never below the actual cost", async () => {
    const req = {
      modelId: "nuru-test-large",
      prompt: "Write a short poem about Accra at night.",
      maxOutputTokens: 200,
    };
    const est = adapter.estimateMaxCost(req);
    const result = await adapter.complete(req);
    const actual = adapter.costOf(req.modelId, result);
    expect(actual).toBeLessThanOrEqual(est.maxCostPesewas);
    expect(result.text).toContain("MOCK");
  });

  it("prices with ceil so tiny requests still cost at least 1 pesewa per component", () => {
    const model = adapter.getModel("nuru-test-small");
    expect(priceFor(model, 1, 1)).toBe(2);
    expect(approxTokens("")).toBe(1);
  });

  it("lists African routing-target models with their own prices, alongside the test models", () => {
    const ids = adapter.listModels().map((m) => m.id);
    for (const id of ["nuru-test-small", "nuru-test-large", "nuru-test-vision", "lelapa-inkubalm", "ghananlp-khaya", "jacaranda-ulizallama", "sunbird-sunflower", "awarri-n-atlas"]) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
    const khaya = adapter.getModel("ghananlp-khaya");
    expect(khaya.inputPricePer1kPesewas).toBe(3);
    expect(khaya.provider).toBe("mock");
  });

  it("throws for unknown models", () => {
    expect(() => adapter.getModel("gpt-real")).toThrow(/Unknown model/);
  });
});
