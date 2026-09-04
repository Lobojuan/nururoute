import { z } from "zod";

// ---------- Money (integer pesewas; GHS 1.00 = 100) ----------
export type Pesewas = number;

export function assertPesewas(value: unknown, label = "amount"): Pesewas {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of pesewas`);
  }
  return value;
}

export function ghsToPesewas(ghs: number): Pesewas {
  return Math.round(ghs * 100);
}

export function formatGhs(pesewas: Pesewas): string {
  const sign = pesewas < 0 ? "-" : "";
  const abs = Math.abs(pesewas);
  const cedis = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}GHS ${cedis.toLocaleString("en-GH")}.${rem.toString().padStart(2, "0")}`;
}

// ---------- Ledger vocabulary ----------
export const LEDGER_ENTRY_TYPES = [
  "top_up",
  "reservation",
  "settlement",
  "release",
  "refund",
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const RESERVATION_STATUSES = ["open", "settled", "released"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface LedgerEntry {
  id: string;
  walletId: string;
  entryType: LedgerEntryType;
  amountPesewas: Pesewas;
  reservationId: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WalletBalance {
  walletId: string;
  currency: "GHS";
  availablePesewas: Pesewas;
  reservedPesewas: Pesewas;
  lifetimeTopUpsPesewas: Pesewas;
  lifetimeSpentPesewas: Pesewas;
}

export interface Reservation {
  id: string;
  walletId: string;
  amountPesewas: Pesewas;
  status: ReservationStatus;
  createdAt: string;
}

// ---------- Error codes ----------
export const ERROR_CODES = [
  "INSUFFICIENT_FUNDS",
  "RESERVATION_NOT_OPEN",
  "SETTLEMENT_EXCEEDS_RESERVATION",
  "INVALID_AMOUNT",
  "WALLET_NOT_FOUND",
  "RESERVATION_NOT_FOUND",
  "LEDGER_IMMUTABLE",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_SIGNATURE",
  "PROVIDER_ERROR",
  "VALIDATION_ERROR",
  "NOT_CONFIGURED",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export class NuruError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message ?? code);
    this.name = "NuruError";
  }
}

export function isNuruError(e: unknown, code?: ErrorCode): e is NuruError {
  return e instanceof NuruError && (code === undefined || e.code === code);
}

// ---------- API schemas ----------
export const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const updateModelPriceSchema = z.object({
  inputPricePer1kPesewas: z.number().int().min(0).max(1_000_000),
  outputPricePer1kPesewas: z.number().int().min(0).max(1_000_000),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const selectSubscriptionPlanSchema = z.object({
  planSlug: z.enum(["free", "starter", "builder", "pro"]),
});

export const simulateTopUpSchema = z.object({
  amountPesewas: z.number().int().min(100).max(1_000_000_00),
  phone: z
    .string()
    .trim()
    .regex(/^(0[235][0-9]{8}|\+?[1-9][0-9]{7,14})$/, "Enter a mobile number like 0241234567")
    .optional(),
});

export const aiRequestSchema = z.object({
  modelId: z.string().min(1),
  prompt: z.string().min(1).max(8000),
  maxOutputTokens: z.number().int().min(1).max(4096).default(256),
});

export const devLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(80).optional(),
});

/** Per-1,000-token prices in integer pesewas. */
export interface ModelPrice {
  inputPricePer1kPesewas: Pesewas;
  outputPricePer1kPesewas: Pesewas;
}

export interface ModelInfo extends ModelPrice {
  id: string;
  displayName: string;
  provider: string;
  maxOutputTokens: number;
  description: string;
}

/** A model as seen by one organisation: effective price + whether it is customised. */
export interface OrgModelInfo extends ModelInfo {
  defaultPrice: ModelPrice;
  customPrice: boolean;
  /** Cost of a typical request (500 input + 500 output tokens) at the effective price. */
  examplePer1kPesewas: Pesewas;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface AiRequestResult {
  requestId: string;
  modelId: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  reservedPesewas: Pesewas;
  actualPesewas: Pesewas;
  releasedPesewas: Pesewas;
  balance: WalletBalance;
}
