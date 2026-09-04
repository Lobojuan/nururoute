/**
 * Simulated NuruRoute model catalogue.
 *
 * All providers, models, quality/speed scores and GHS prices are illustrative
 * demo values for the public experience. They are not partnerships, live
 * integrations or real prices.
 */

import { useEffect, useState } from "react";

export type Category = "Chat & Coding" | "Image" | "Video" | "Voice" | "Dubbing" | "Audiobooks";

export const CATEGORIES: Category[] = ["Chat & Coding", "Image", "Video", "Voice", "Dubbing", "Audiobooks"];

export type Unit = "1K tokens" | "image" | "second" | "minute" | "1K chars";

export type CatalogModel = {
  id: string;
  name: string;
  provider: string;
  category: Category;
  capability: string;
  quality: 1 | 2 | 3 | 4 | 5;
  speed: 1 | 2 | 3 | 4 | 5;
  /** Estimated cost in pesewas per unit (illustrative). */
  pesewas: number;
  unit: Unit;
  tags: string[];
  /** Requires provider validation before 4K output is offered. */
  fourK?: boolean;
  /** Supported output resolutions for image/video models. */
  resolutions?: string[];
  context?: string;
  /** Maximum output tokens the model can emit in one request. Distinct from context window (input + output budget). */
  maxOutputTokens?: number;
  /** Named upstream tool this simulated route would target. Trademarks belong to their owners; no partnership is implied. */
  routesTo?: string;
  /** Model ID in the real NuruNode ledger catalogue. When set, the card can run a real reserve→settle→release request (mock funds). */
  ledgerModelId?: string;
  /** Built by an African team. Names belong to their builders; simulated routing target, no partnership implied. */
  africanBuilt?: { builder: string; country: string; languages: string[] };
};

/** Named upstream coding/chat tools shown as routing targets in the simulation. Not partnerships. */
export const ROUTING_TARGETS = ["OpenAI", "Claude Code", "Codex", "Grok", "Kimi K3", "Gemini", "DeepSeek", "Mistral"] as const;
export const AFRICAN_DISCLAIMER =
  "African-built models are named after their builders' public releases and appear as simulated routing targets wired to a simulated test ledger. No partnership or integration is claimed; completions are mocked and funds are test money.";
export const ROUTING_DISCLAIMER =
  "Third-party names are trademarks of their owners and appear only as simulated routing targets. No partnership, integration or discount is claimed.";

/* ------------------------------------------------------------------ */
/* Pricing defaults — profitable by construction                       */
/* ------------------------------------------------------------------ */
/**
 * Every catalogue price is DERIVED from an illustrative provider cost basis
 * through the same formula the admin pricing centre uses:
 *   customer price = (provider cost × FX + FX/payment/ops buffers) ÷ (1 − target margin)
 * Cost bases are demo assumptions (not vendor quotes) — verify against official
 * rate cards before launch. Target margin is 60% so the blended business clears
 * the ≥60% gross-margin goal after MoMo fees and operations.
 */
export const PRICING_DEFAULTS = { fxRate: 15.5, fxBufferPct: 6, paymentBufferPct: 2.5, opsBufferPct: 4, targetMarginPct: 60 } as const;
/** Illustrative provider cost basis in USD per unit (1K tokens, image, second, minute or 1K chars). */
export const COST_BASIS_USD: Record<string, number> = {
  "route-chat-lite": 0.0006,
  "route-chat-pro": 0.012,
  "route-code": 0.006,
  "route-vision": 0.008,
  "route-openai": 0.012,
  "route-claude-code": 0.015,
  "route-codex": 0.012,
  "route-grok": 0.006,
  "route-kimi": 0.0025,
  "lelapa-inkubalm": 0.001,
  "ghananlp-khaya": 0.002,
  "jacaranda-ulizallama": 0.003,
  "sunbird-sunflower": 0.003,
  "awarri-n-atlas": 0.005,
  "image-sketch": 0.02,
  "image-studio": 0.08,
  "image-edit": 0.04,
  "video-clip": 0.1,
  "video-cinema": 0.4,
  "voice-natural": 0.006,
  "voice-clone": 0.015,
  "dub-express": 0.15,
  "dub-pro": 0.5,
  "book-reader": 0.004,
  "book-cast": 0.01,
};
/** Customer price in pesewas from a USD cost basis using PRICING_DEFAULTS. */
export function priceFromCost(costUsd: number, d = PRICING_DEFAULTS) {
  const costGhs = costUsd * d.fxRate;
  const toServe = costGhs * (1 + (d.fxBufferPct + d.paymentBufferPct + d.opsBufferPct) / 100);
  return Math.max(1, Math.round((toServe / (1 - d.targetMarginPct / 100)) * 100));
}
const P = (id: string) => priceFromCost(COST_BASIS_USD[id] ?? 0);

export const MODELS: CatalogModel[] = [
  // Chat & Coding — priced per 1K output tokens (input shown on detail)
  { id: "route-chat-lite", name: "Route Chat Lite", provider: "Simulated Provider A", category: "Chat & Coding", capability: "Fast everyday chat, summaries, translation", quality: 3, speed: 5, pesewas: P("route-chat-lite"), unit: "1K tokens", tags: ["Twi & English", "Low cost"], context: "128K", maxOutputTokens: 4096 },
  { id: "route-chat-pro", name: "Route Chat Pro", provider: "Simulated Provider B", category: "Chat & Coding", capability: "Reasoning, long documents, structured output", quality: 5, speed: 3, pesewas: P("route-chat-pro"), unit: "1K tokens", tags: ["Reasoning", "JSON mode"], context: "200K", maxOutputTokens: 8192 },
  { id: "route-code", name: "Route Code", provider: "Simulated Provider C", category: "Chat & Coding", capability: "Code generation, refactors, test writing", quality: 4, speed: 4, pesewas: P("route-code"), unit: "1K tokens", tags: ["Tool calling", "Repos"], context: "128K", maxOutputTokens: 4096 },
  { id: "route-vision", name: "Route Vision", provider: "Simulated Provider B", category: "Chat & Coding", capability: "Reads images, receipts and forms", quality: 4, speed: 3, pesewas: P("route-vision"), unit: "1K tokens", tags: ["Multimodal", "OCR"], context: "64K", maxOutputTokens: 4096 },
  { id: "route-openai", name: "Route → OpenAI", provider: "Routing target (simulated)", routesTo: "OpenAI", category: "Chat & Coding", capability: "General chat, agents and coding via GPT-class models", quality: 5, speed: 4, pesewas: P("route-openai"), unit: "1K tokens", tags: ["Agents", "Tool calling"], context: "200K", maxOutputTokens: 4096 },
  { id: "route-claude-code", name: "Route → Claude Code", provider: "Routing target (simulated)", routesTo: "Claude Code", category: "Chat & Coding", capability: "Agentic coding in your terminal, repo-scale refactors", quality: 5, speed: 3, pesewas: P("route-claude-code"), unit: "1K tokens", tags: ["Agentic coding", "CLI"], context: "200K", maxOutputTokens: 8192 },
  { id: "route-codex", name: "Route → Codex", provider: "Routing target (simulated)", routesTo: "Codex", category: "Chat & Coding", capability: "Autonomous software tasks, PRs and reviews", quality: 5, speed: 3, pesewas: P("route-codex"), unit: "1K tokens", tags: ["PR agent", "Sandboxed"], context: "192K", maxOutputTokens: 8192 },
  { id: "route-grok", name: "Route → Grok", provider: "Routing target (simulated)", routesTo: "Grok", category: "Chat & Coding", capability: "Fast reasoning with real-time knowledge", quality: 4, speed: 5, pesewas: P("route-grok"), unit: "1K tokens", tags: ["Reasoning", "Fast"], context: "128K", maxOutputTokens: 4096 },
  { id: "route-kimi", name: "Route → Kimi K3", provider: "Routing target (simulated)", routesTo: "Kimi K3", category: "Chat & Coding", capability: "Long-context coding and analysis at low cost", quality: 4, speed: 4, pesewas: P("route-kimi"), unit: "1K tokens", tags: ["256K context", "Value"], context: "256K", maxOutputTokens: 8192 },
  // African-built models — wired to the real ledger catalogue (mock funds). Prices = platform defaults per 1K output tokens.
  { id: "lelapa-inkubalm", ledgerModelId: "lelapa-inkubalm", name: "InkubaLM", provider: "Lelapa AI · South Africa", africanBuilt: { builder: "Lelapa AI", country: "South Africa", languages: ["isiZulu", "Yoruba", "Hausa", "Swahili", "isiXhosa"] }, category: "Chat & Coding", capability: "Small African language model for chat, translation and classification", quality: 3, speed: 5, pesewas: P("lelapa-inkubalm"), unit: "1K tokens", tags: ["African-built", "5 languages", "Lowest cost"], context: "8K", maxOutputTokens: 2048 },
  { id: "ghananlp-khaya", ledgerModelId: "ghananlp-khaya", name: "Khaya", provider: "GhanaNLP · Ghana", africanBuilt: { builder: "GhanaNLP", country: "Ghana", languages: ["Twi", "Ewe", "Ga", "Dagbani", "Fante"] }, category: "Chat & Coding", capability: "Ghanaian language translation and speech-ready text", quality: 4, speed: 5, pesewas: P("ghananlp-khaya"), unit: "1K tokens", tags: ["African-built", "Ghanaian languages"], context: "8K", maxOutputTokens: 2048 },
  { id: "jacaranda-ulizallama", ledgerModelId: "jacaranda-ulizallama", name: "UlizaLlama", provider: "Jacaranda Health · Kenya", africanBuilt: { builder: "Jacaranda Health", country: "Kenya", languages: ["Swahili", "English"] }, category: "Chat & Coding", capability: "Swahili-tuned Llama for health and public-service assistants", quality: 4, speed: 4, pesewas: P("jacaranda-ulizallama"), unit: "1K tokens", tags: ["African-built", "Swahili", "Health"], context: "32K", maxOutputTokens: 4096 },
  { id: "sunbird-sunflower", ledgerModelId: "sunbird-sunflower", name: "Sunflower", provider: "Sunbird AI · Uganda", africanBuilt: { builder: "Sunbird AI", country: "Uganda", languages: ["Luganda", "Acholi", "Runyankole", "Ateso", "Lugbara"] }, category: "Chat & Coding", capability: "Ugandan languages for chat, translation and civic services", quality: 4, speed: 4, pesewas: P("sunbird-sunflower"), unit: "1K tokens", tags: ["African-built", "Ugandan languages"], context: "32K", maxOutputTokens: 4096 },
  { id: "awarri-n-atlas", ledgerModelId: "awarri-n-atlas", name: "N-ATLaS", provider: "Awarri · Nigeria", africanBuilt: { builder: "Awarri", country: "Nigeria", languages: ["Yoruba", "Igbo", "Hausa", "Nigerian Pidgin", "English"] }, category: "Chat & Coding", capability: "Nigerian multilingual model for chat, summaries and coding help", quality: 4, speed: 3, pesewas: P("awarri-n-atlas"), unit: "1K tokens", tags: ["African-built", "Nigerian languages"], context: "64K", maxOutputTokens: 4096 },
  // Image
  { id: "image-sketch", name: "Image Sketch", provider: "Simulated Provider D", category: "Image", capability: "Quick drafts, thumbnails, social posts", quality: 3, speed: 5, pesewas: P("image-sketch"), unit: "image", tags: ["Draft", "Thumbnail"], resolutions: ["1024px"] },
  { id: "image-studio", name: "Image Studio", provider: "Simulated Provider D", category: "Image", capability: "Product shots, campaign visuals, typography", quality: 5, speed: 3, pesewas: P("image-studio"), unit: "image", tags: ["Text in image", "Product shot"], fourK: true, resolutions: ["1024px", "2K", "4K"] },
  { id: "image-edit", name: "Image Edit", provider: "Simulated Provider E", category: "Image", capability: "Inpainting, background swap, upscaling", quality: 4, speed: 4, pesewas: P("image-edit"), unit: "image", tags: ["Edit", "Upscale"], fourK: true, resolutions: ["1024px", "2K", "4K"] },
  // Video
  { id: "video-clip", name: "Video Clip", provider: "Simulated Provider F", category: "Video", capability: "Short 5–10s clips for ads and reels", quality: 3, speed: 4, pesewas: P("video-clip"), unit: "second", tags: ["9:16", "Short-form"], resolutions: ["720p", "1080p"] },
  { id: "video-cinema", name: "Video Cinema", provider: "Simulated Provider F", category: "Video", capability: "Cinematic 1080p–4K with camera control", quality: 5, speed: 2, pesewas: P("video-cinema"), unit: "second", tags: ["Camera moves", "Cinematic"], fourK: true, resolutions: ["1080p", "2K", "4K"] },
  // Voice
  { id: "voice-natural", name: "Voice Natural", provider: "Simulated Provider G", category: "Voice", capability: "Natural narration, IVR prompts, ads", quality: 4, speed: 5, pesewas: P("voice-natural"), unit: "1K chars", tags: ["Ghanaian English", "Twi"] },
  { id: "voice-clone", name: "Voice Clone", provider: "Simulated Provider G", category: "Voice", capability: "Consent-verified custom voices", quality: 5, speed: 3, pesewas: P("voice-clone"), unit: "1K chars", tags: ["Consent required", "Studio"] },
  // Dubbing
  { id: "dub-express", name: "Dub Express", provider: "Simulated Provider H", category: "Dubbing", capability: "Translate and re-voice short videos", quality: 3, speed: 4, pesewas: P("dub-express"), unit: "minute", tags: ["Subtitles", "Lip-sync lite"] },
  { id: "dub-pro", name: "Dub Pro", provider: "Simulated Provider H", category: "Dubbing", capability: "Multi-speaker dubbing with timing alignment", quality: 5, speed: 2, pesewas: P("dub-pro"), unit: "minute", tags: ["Multi-speaker", "Review pass"] },
  // Audiobooks
  { id: "book-reader", name: "Book Reader", provider: "Simulated Provider G", category: "Audiobooks", capability: "Long-form narration with chapter markers", quality: 4, speed: 4, pesewas: P("book-reader"), unit: "1K chars", tags: ["Chapters", "Pause control"] },
  { id: "book-cast", name: "Book Cast", provider: "Simulated Provider G", category: "Audiobooks", capability: "Multi-voice casts for fiction and learning", quality: 5, speed: 3, pesewas: P("book-cast"), unit: "1K chars", tags: ["Multi-voice", "Emotion tags"] },
];

export function byCategory(cat: Category) {
  return MODELS.filter((m) => m.category === cat);
}

export function modelById(id: string) {
  return MODELS.find((m) => m.id === id);
}

export const unitLabel: Record<Unit, string> = {
  "1K tokens": "per 1,000 tokens",
  image: "per image",
  second: "per second",
  minute: "per minute",
  "1K chars": "per 1,000 characters",
};

/** Rough "typical job" for a category to make prices tangible. */
export const TYPICAL: Record<Category, { label: string; units: number }> = {
  "Chat & Coding": { label: "a 600-word answer", units: 0.8 },
  Image: { label: "one image", units: 1 },
  Video: { label: "an 8-second clip", units: 8 },
  Voice: { label: "a 60-second script", units: 0.9 },
  Dubbing: { label: "a 2-minute video", units: 2 },
  Audiobooks: { label: "a 20-page chapter", units: 30 },
};

export function estimate(m: CatalogModel, units: number) {
  return Math.ceil(m.pesewas * units);
}

/* ------------------------------------------------------------------ */
/* Published prices — single source of truth                          */
/* ------------------------------------------------------------------ */
/**
 * The private admin pricing centre publishes customer prices (GHS only —
 * never cost basis or margins) into this browser-local table. The public
 * catalogue, studios, developer console and support workbench all read the
 * same MODELS array, so applying the table here updates every surface.
 */
export const PUBLISHED_PRICES_KEY = "nururoute-published-prices";
export type PublishedPrices = { version: string; publishedAt: string; effectiveDate: string; prices: Record<string, number>; schema?: number };
/** Published tables from before the cost-basis model are ignored so stale browsers never show loss-making prices. */
export const PUBLISHED_SCHEMA = 2;

const BASE_PESEWAS: Record<string, number> = Object.fromEntries(MODELS.map((m) => [m.id, m.pesewas]));
let published: PublishedPrices | null = null;
let priceEpoch = 0;
const priceListeners = new Set<() => void>();

/** Catalogue base price before any admin publication (used to seed the admin table). */
export function basePesewas(id: string) {
  return BASE_PESEWAS[id] ?? modelById(id)?.pesewas ?? 0;
}

export function publishedPrices() {
  return published;
}

function applyPublished(p: PublishedPrices | null) {
  published = p;
  for (const m of MODELS) {
    const next = p?.prices[m.id];
    m.pesewas = typeof next === "number" && Number.isFinite(next) && next > 0 ? Math.max(1, Math.round(next)) : BASE_PESEWAS[m.id]!;
  }
  priceEpoch++;
  priceListeners.forEach((l) => l());
}

/** Called by the admin pricing centre after a version is published. Browser-only. */
export function setPublishedPrices(p: PublishedPrices | null) {
  try {
    if (p) window.localStorage.setItem(PUBLISHED_PRICES_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(PUBLISHED_PRICES_KEY);
  } catch {
    /* ignore */
  }
  applyPublished(p);
}

let hydratedPrices = false;
function hydratePrices() {
  if (hydratedPrices || typeof window === "undefined") return;
  hydratedPrices = true;
  try {
    const raw = window.localStorage.getItem(PUBLISHED_PRICES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PublishedPrices;
      if (parsed.schema === PUBLISHED_SCHEMA) applyPublished(parsed);
      else window.localStorage.removeItem(PUBLISHED_PRICES_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Subscribe a component to published-price changes. Hydrates after mount so
 * server and first client render agree, then re-renders when admin publishes.
 * Returns the active price version label ("catalogue" until something is published).
 */
export function usePublishedPrices() {
  const [, force] = useState(0);
  useEffect(() => {
    const sync = () => force((n) => n + 1);
    hydratePrices();
    sync();
    priceListeners.add(sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PUBLISHED_PRICES_KEY) return;
      try { applyPublished(e.newValue ? (JSON.parse(e.newValue) as PublishedPrices) : null); } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      priceListeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return { version: published?.version ?? null, effectiveDate: published?.effectiveDate ?? null, epoch: priceEpoch };
}
