import { createPgDb } from "@nurunode/database/pg";
import { migrate } from "@nurunode/database";
import { createPaymentAdapter } from "@nurunode/payment-adapters";
import { createProviderAdapter } from "@nurunode/provider-adapters";
import { buildApp } from "./app";
import { loadEnv } from "./env";

const env = loadEnv();
if (!env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required. Start Postgres with `docker compose up -d` and copy .env.example to .env.",
  );
  process.exit(1);
}

const db = createPgDb(env.DATABASE_URL);
const ran = await migrate(db);
if (ran.length) console.log(`Applied migrations: ${ran.join(", ")}`);

const app = buildApp({
  db,
  env,
  paymentAdapter: createPaymentAdapter(env.PAYMENT_ADAPTER, env),
  providerAdapter: createProviderAdapter(env.PROVIDER_ADAPTER),
});

console.log(
  env.PAYMENT_ADAPTER === "momo_sandbox"
    ? "NuruNode API: payments = MTN MoMo SANDBOX (test environment, no real money); AI providers = MOCK."
    : "NuruNode API running in MOCK mode — no live payments, no live AI providers.",
);
await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
