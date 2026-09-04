export interface ApiEnv {
  NODE_ENV: string;
  API_PORT: number;
  DATABASE_URL: string | undefined;
  SESSION_SECRET: string;
  ALLOW_DEV_LOGIN: boolean;
  WEB_ORIGIN: string;
  PAYMENT_ADAPTER: string;
  PROVIDER_ADAPTER: string;
  MOCK_WEBHOOK_SECRET: string;
  GOOGLE_CLIENT_ID: string | undefined;
  GOOGLE_CLIENT_SECRET: string | undefined;
  /** MTN MoMo sandbox credentials — only read when PAYMENT_ADAPTER=momo_sandbox. */
  MTN_MOMO_SUBSCRIPTION_KEY: string | undefined;
  MTN_MOMO_API_USER: string | undefined;
  MTN_MOMO_API_KEY: string | undefined;
  MTN_MOMO_TARGET_ENV: string;
  MTN_MOMO_BASE_URL: string | undefined;
  MTN_MOMO_CURRENCY: string | undefined;
  MTN_MOMO_CALLBACK_URL: string | undefined;
}

const DEV_SESSION_SECRET = "dev-only-session-secret-change-me-32-chars-min";

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const nodeEnv = source["NODE_ENV"] ?? "development";
  const isProd = nodeEnv === "production";
  const sessionSecret = source["SESSION_SECRET"] ?? (isProd ? "" : DEV_SESSION_SECRET);
  if (sessionSecret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters (production requires an explicit value)",
    );
  }
  const payment = source["PAYMENT_ADAPTER"] ?? "mock";
  const provider = source["PROVIDER_ADAPTER"] ?? "mock";
  if (payment !== "mock" && payment !== "momo_sandbox") {
    throw new Error(
      "PAYMENT_ADAPTER must be 'mock' or 'momo_sandbox' (feature flag). Live payment adapters need explicit approval.",
    );
  }
  const momoTarget = source["MTN_MOMO_TARGET_ENV"] ?? "sandbox";
  if (payment === "momo_sandbox" && momoTarget !== "sandbox") {
    throw new Error("MTN_MOMO_TARGET_ENV must be 'sandbox'. Live MoMo environments are not permitted.");
  }
  if (provider !== "mock") {
    throw new Error("Only PROVIDER_ADAPTER=mock is permitted in this MVP.");
  }
  const allowDevLogin =
    (source["ALLOW_DEV_LOGIN"] ?? (isProd ? "false" : "true")) === "true" && !isProd;
  return {
    NODE_ENV: nodeEnv,
    API_PORT: Number(source["API_PORT"] ?? 4000),
    DATABASE_URL: source["DATABASE_URL"],
    SESSION_SECRET: sessionSecret,
    ALLOW_DEV_LOGIN: allowDevLogin,
    WEB_ORIGIN: source["WEB_ORIGIN"] ?? "http://localhost:3000",
    PAYMENT_ADAPTER: payment,
    PROVIDER_ADAPTER: provider,
    MOCK_WEBHOOK_SECRET: source["MOCK_WEBHOOK_SECRET"] ?? "mock-webhook-secret-not-real",
    GOOGLE_CLIENT_ID: source["GOOGLE_CLIENT_ID"] || undefined,
    GOOGLE_CLIENT_SECRET: source["GOOGLE_CLIENT_SECRET"] || undefined,
    MTN_MOMO_SUBSCRIPTION_KEY: source["MTN_MOMO_SUBSCRIPTION_KEY"] || undefined,
    MTN_MOMO_API_USER: source["MTN_MOMO_API_USER"] || undefined,
    MTN_MOMO_API_KEY: source["MTN_MOMO_API_KEY"] || undefined,
    MTN_MOMO_TARGET_ENV: momoTarget,
    MTN_MOMO_BASE_URL: source["MTN_MOMO_BASE_URL"] || undefined,
    MTN_MOMO_CURRENCY: source["MTN_MOMO_CURRENCY"] || undefined,
    MTN_MOMO_CALLBACK_URL: source["MTN_MOMO_CALLBACK_URL"] || undefined,
  };
}
