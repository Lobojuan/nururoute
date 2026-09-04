# NuruNode — Product MVP

NuruNode is a Ghana-first AI access platform. Organisations hold a **GHS wallet**, top it up with mobile money, and spend it on AI requests that are routed through NuruNode's backend. Upstream provider keys never leave NuruNode.

## Scope of this MVP (safe foundation)

**No live money, no live providers.** Every payment and AI call in this repository goes through a *mocked* adapter. All credentials are environment-variable placeholders.

### The single user journey

1. **Sign in** — dev email login (and a Google sign-in button wired to placeholder credentials).
2. **Create an organisation** — the creator becomes `owner`; a GHS wallet is created automatically.
3. **See the wallet** — available balance, reserved (held) amount, and the immutable ledger.
4. **Simulate a top-up** — the Mock MoMo adapter creates a payment intent and fires a signed webhook; the wallet is credited exactly once (duplicate webhooks are ignored).
5. **Select a test model** — from the Mock Provider catalogue (`nuru-test-small`, `nuru-test-large`, `nuru-test-vision`), or one of the African-built models listed as simulated routing targets (`lelapa-inkubalm`, `ghananlp-khaya`, `jacaranda-ulizallama`, `sunbird-sunflower`, `awarri-n-atlas`). All completions are mocked; names belong to their builders and imply no partnership.
6. **Reserve maximum cost** — the API estimates the worst-case cost for the prompt and `max_output_tokens`, and places a reservation *before* any provider call.
7. **Run a mocked AI request** — the Mock Provider returns a deterministic response with token counts.
8. **Settle actual cost** — a settlement entry records what was really used.
9. **Release unused credit** — the difference between reserved and actual is released in the same transaction.
10. **Be blocked at zero** — when available balance is zero or lower than the maximum estimated cost, the request is rejected with `402 INSUFFICIENT_FUNDS` and no provider call is made.

### Personas

- **Org owner** — tops up, runs requests, sees the ledger.
- **Developer (later)** — will use API keys issued by NuruNode; out of scope for this MVP.

### Explicitly out of scope

- Live MTN MoMo / Vodafone Cash / Paystack integration
- Real OpenAI / Anthropic / Gemini calls
- Multi-currency wallets, invoices, VAT
- Team invitations, roles beyond `owner`/`member`
- Rate limiting, abuse detection, usage analytics dashboards
- Production deployment configuration

### Success criteria

- Automated tests prove: top-up, reserve, settle + release, refund, duplicate webhook idempotency, zero-balance rejection, ledger immutability.
- The whole journey can be exercised locally with `bun run dev` against Docker PostgreSQL.
- No secret in the repository is real.
