/**
 * Provision MTN MoMo *sandbox* API credentials.
 *
 * Usage:
 *   MTN_MOMO_SUBSCRIPTION_KEY=<Collections primary key> bun run momo:provision [callbackHost]
 *
 * 1. Sign up at https://momodeveloper.mtn.com, subscribe to the "Collections" product,
 *    copy the Primary key -> MTN_MOMO_SUBSCRIPTION_KEY.
 * 2. Run this script. It creates a sandbox API user + API key and prints the env lines.
 * 3. Paste them into .env and set PAYMENT_ADAPTER=momo_sandbox.
 *
 * Sandbox only. This never touches a live MTN environment.
 */
import { randomUUID } from "node:crypto";

const base = process.env["MTN_MOMO_BASE_URL"] ?? "https://sandbox.momodeveloper.mtn.com";
const subscriptionKey = process.env["MTN_MOMO_SUBSCRIPTION_KEY"];
const callbackHost = process.argv[2] ?? "localhost";

if (!subscriptionKey || subscriptionKey.startsWith("mock")) {
  console.error("Set MTN_MOMO_SUBSCRIPTION_KEY to your Collections sandbox primary key first.");
  process.exit(1);
}

const apiUser = randomUUID();
const create = await fetch(`${base}/v1_0/apiuser`, {
  method: "POST",
  headers: {
    "x-reference-id": apiUser,
    "ocp-apim-subscription-key": subscriptionKey,
    "content-type": "application/json",
  },
  body: JSON.stringify({ providerCallbackHost: callbackHost }),
});
if (create.status !== 201) {
  console.error(`Creating API user failed: ${create.status} ${await create.text()}`);
  process.exit(1);
}

const keyRes = await fetch(`${base}/v1_0/apiuser/${apiUser}/apikey`, {
  method: "POST",
  headers: { "ocp-apim-subscription-key": subscriptionKey },
});
if (keyRes.status !== 201) {
  console.error(`Creating API key failed: ${keyRes.status} ${await keyRes.text()}`);
  process.exit(1);
}
const { apiKey } = (await keyRes.json()) as { apiKey: string };

console.log("\nAdd these lines to your local .env (never commit them):\n");
console.log("PAYMENT_ADAPTER=momo_sandbox");
console.log("MTN_MOMO_TARGET_ENV=sandbox");
console.log(`MTN_MOMO_API_USER=${apiUser}`);
console.log(`MTN_MOMO_API_KEY=${apiKey}`);
console.log(`MTN_MOMO_CALLBACK_URL=http://${callbackHost}/webhooks/payments/momo  # optional`);
console.log("\nSandbox currency is EUR; amounts mirror the GHS figure. No real money moves.");
