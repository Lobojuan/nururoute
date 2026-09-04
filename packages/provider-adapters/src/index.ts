import { NuruError, type ModelInfo, type ModelPrice, type Pesewas } from "@nurunode/shared";

/**
 * ProviderAdapter: how NuruNode's API calls an upstream AI provider.
 * The browser never touches this. Only the mock implementation exists here.
 */

export interface CompletionRequest {
  modelId: string;
  prompt: string;
  maxOutputTokens: number;
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface CostEstimate {
  inputTokens: number;
  maxOutputTokens: number;
  maxCostPesewas: Pesewas;
}

export interface ProviderAdapter {
  readonly provider: string;
  /** Catalog with platform *default* prices. Organisations may override prices. */
  listModels(): ModelInfo[];
  getModel(modelId: string): ModelInfo;
  /** Worst-case cost: all input tokens + the full max_output_tokens budget, at the given price. */
  estimateMaxCost(req: CompletionRequest, price?: ModelPrice): CostEstimate;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  costOf(
    modelId: string,
    usage: { inputTokens: number; outputTokens: number },
    price?: ModelPrice,
  ): Pesewas;
}

/** Cheap deterministic tokeniser: ~1 token per 4 characters, minimum 1. */
export function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

const MOCK_MODELS: ModelInfo[] = [
  {
    id: "nuru-test-small",
    displayName: "Nuru Test Small",
    provider: "mock",
    inputPricePer1kPesewas: 5, // GHS 0.05 per 1k input tokens
    outputPricePer1kPesewas: 15,
    maxOutputTokens: 1024,
    description: "Fast mocked model for testing the wallet flow.",
  },
  {
    id: "nuru-test-large",
    displayName: "Nuru Test Large",
    provider: "mock",
    inputPricePer1kPesewas: 500, // deliberately expensive: GHS 5.00 per 1k input tokens
    outputPricePer1kPesewas: 1500,
    maxOutputTokens: 4096,
    description: "Expensive mocked model - useful for hitting insufficient balance.",
  },
  {
    id: "nuru-test-vision",
    displayName: "Nuru Test Vision",
    provider: "mock",
    inputPricePer1kPesewas: 20,
    outputPricePer1kPesewas: 60,
    maxOutputTokens: 2048,
    description: "Mocked multimodal model (text only in this MVP).",
  },
  // African-built models as *simulated routing targets*. Names belong to their
  // builders; no partnership or integration is implied. Provider stays "mock":
  // completions are simulated, only the ledger accounting is real (mock funds).
  {
    id: "lelapa-inkubalm",
    displayName: "InkubaLM (Lelapa AI)",
    provider: "mock",
    inputPricePer1kPesewas: 2,
    outputPricePer1kPesewas: 6,
    maxOutputTokens: 1024,
    description: "Small African language model: isiZulu, Yoruba, Hausa, Swahili, isiXhosa. Simulated.",
  },
  {
    id: "ghananlp-khaya",
    displayName: "Khaya (GhanaNLP)",
    provider: "mock",
    inputPricePer1kPesewas: 3,
    outputPricePer1kPesewas: 9,
    maxOutputTokens: 1024,
    description: "Ghanaian language translation: Twi, Ewe, Ga, Dagbani, Fante and more. Simulated.",
  },
  {
    id: "jacaranda-ulizallama",
    displayName: "UlizaLlama (Jacaranda Health)",
    provider: "mock",
    inputPricePer1kPesewas: 4,
    outputPricePer1kPesewas: 12,
    maxOutputTokens: 2048,
    description: "Swahili-tuned Llama for health and public-service assistants. Simulated.",
  },
  {
    id: "sunbird-sunflower",
    displayName: "Sunflower (Sunbird AI)",
    provider: "mock",
    inputPricePer1kPesewas: 4,
    outputPricePer1kPesewas: 12,
    maxOutputTokens: 2048,
    description: "Ugandan languages: Luganda, Acholi, Runyankole, Ateso, Lugbara. Simulated.",
  },
  {
    id: "awarri-n-atlas",
    displayName: "N-ATLaS (Awarri)",
    provider: "mock",
    inputPricePer1kPesewas: 6,
    outputPricePer1kPesewas: 18,
    maxOutputTokens: 4096,
    description: "Nigerian multilingual model: Yoruba, Igbo, Hausa, Nigerian Pidgin, English. Simulated.",
  },
];

/** Ceil-based per-token pricing so we never under-charge by rounding. */
export function priceFor(price: ModelPrice, inputTokens: number, outputTokens: number): Pesewas {
  const input = Math.ceil((inputTokens * price.inputPricePer1kPesewas) / 1000);
  const output = Math.ceil((outputTokens * price.outputPricePer1kPesewas) / 1000);
  return input + output;
}

export class MockProviderAdapter implements ProviderAdapter {
  readonly provider = "mock";

  constructor(private readonly opts: { failOnPromptIncluding?: string } = {}) {}

  listModels(): ModelInfo[] {
    return MOCK_MODELS;
  }

  getModel(modelId: string): ModelInfo {
    const m = MOCK_MODELS.find((x) => x.id === modelId);
    if (!m) throw new NuruError("NOT_FOUND", `Unknown model ${modelId}`);
    return m;
  }

  estimateMaxCost(req: CompletionRequest, price?: ModelPrice): CostEstimate {
    const model = this.getModel(req.modelId);
    const inputTokens = approxTokens(req.prompt);
    const maxOutputTokens = Math.min(req.maxOutputTokens, model.maxOutputTokens);
    return {
      inputTokens,
      maxOutputTokens,
      maxCostPesewas: priceFor(price ?? model, inputTokens, maxOutputTokens),
    };
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const model = this.getModel(req.modelId);
    if (this.opts.failOnPromptIncluding && req.prompt.includes(this.opts.failOnPromptIncluding)) {
      throw new NuruError("PROVIDER_ERROR", "mock provider failure");
    }
    const inputTokens = approxTokens(req.prompt);
    const words = req.prompt.trim().split(/\s+/).filter(Boolean);
    const summary = words.slice(0, 12).join(" ");
    const text = `[${model.displayName} · MOCK] You said: "${summary}${words.length > 12 ? "…" : ""}". Akwaaba! This is a simulated response; no upstream provider was called.`;
    // Deterministic output size: roughly half the budget, capped by the text length.
    const outputTokens = Math.min(
      Math.min(req.maxOutputTokens, model.maxOutputTokens),
      approxTokens(text),
    );
    return { text, inputTokens, outputTokens };
  }

  costOf(
    modelId: string,
    usage: { inputTokens: number; outputTokens: number },
    price?: ModelPrice,
  ): Pesewas {
    return priceFor(price ?? this.getModel(modelId), usage.inputTokens, usage.outputTokens);
  }
}

export function createProviderAdapter(kind: string | undefined): ProviderAdapter {
  if (!kind || kind === "mock") return new MockProviderAdapter();
  throw new NuruError(
    "NOT_CONFIGURED",
    `Provider adapter "${kind}" is not available in this MVP. Use PROVIDER_ADAPTER=mock.`,
  );
}
