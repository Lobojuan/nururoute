/**
 * Knowledge Base simulation for the private /admin demo.
 * Articles live in the browser only. Retrieval is a local keyword match over
 * Approved articles — no AI provider, no network, no customer data leaves the page.
 */

export const KB_STAMP = "Knowledge Base simulation — no customer data sent to an AI provider.";

export const KB_CATEGORIES = [
  "Onboarding",
  "Wallet & top-ups",
  "Pricing & receipts",
  "Models & token limits",
  "Developer / API concepts",
  "Creative studios",
  "Country & payment availability",
  "Account & security",
  "Refunds & escalations",
  "Live vs planned",
] as const;
export type KbCategory = (typeof KB_CATEGORIES)[number];
export type KbStatus = "Approved" | "Draft" | "Planned";

export type KbArticle = {
  id: string;
  category: KbCategory;
  title: string;
  status: KbStatus;
  /** Only Approved + Live articles may be used to state that a feature, provider or payment rail is live. */
  live: boolean;
  lastReviewed: string; // YYYY-MM-DD
  owner: string;
  /** Short customer-safe answer. */
  answer: string;
  keywords: string[];
};

export const SAFETY_RULES = [
  "Never ask for or display a MoMo PIN, OTP, password, card number/CVV, API key or private wallet number.",
  "Never reveal internal prices, cost basis, margins, buffers, backend details or other customers' information.",
  "Never promise a refund, credit or timeline unless an Approved article says so.",
  "Never claim a feature, provider, model or payment rail is live unless the source article is Approved and marked Live.",
  "If no Approved article covers the question, say it cannot be verified and queue a human-support ticket. Never guess.",
];

/** Patterns that indicate sensitive data in a question or draft. */
const SENSITIVE: { label: string; re: RegExp }[] = [
  { label: "MoMo PIN", re: /\b(momo\s*)?pin\b/i },
  { label: "OTP / verification code", re: /\b(otp|one[- ]time (pass)?code|verification code)\b/i },
  { label: "password", re: /\bpassword\b/i },
  { label: "card data", re: /\b(card number|cvv|cvc|expiry)\b|\b(?:\d[ -]?){13,19}\b/i },
  { label: "API key", re: /\b(api[- ]?key|secret key|nn_(test|live)_[a-z0-9]+)\b/i },
  { label: "private wallet number", re: /\bwallet (number|id)\b/i },
];

export function detectSensitive(text: string) {
  return SENSITIVE.filter((s) => s.re.test(text)).map((s) => s.label);
}

const D = "2026-08-28";
export const SEED_ARTICLES: KbArticle[] = [
  { id: "kb-onb-1", category: "Onboarding", title: "How do I get started?", status: "Approved", live: true, lastReviewed: D, owner: "Support lead", keywords: ["start", "sign up", "onboard", "create account", "organisation", "begin"], answer: "Sign in with your email, create an organisation, then add credit to your GHS wallet. Every model and studio draws from that one balance. In this demo the whole flow is simulated." },
  { id: "kb-wal-1", category: "Wallet & top-ups", title: "Why does my top-up show as pending?", status: "Approved", live: true, lastReviewed: D, owner: "Support lead", keywords: ["pending", "top-up", "topup", "top up", "not showing", "approved", "balance"], answer: "A top-up stays pending until the operator confirmation arrives. Nothing is deducted from your mobile money until then. If it does not confirm within 15 minutes it is cancelled automatically and you can try again." },
  { id: "kb-wal-2", category: "Wallet & top-ups", title: "What are available, reserved and spent?", status: "Approved", live: true, lastReviewed: D, owner: "Product", keywords: ["reserved", "hold", "available", "spent", "released", "difference", "balance"], answer: "Available is what you can spend now. Reserved is a temporary hold for the maximum cost of a running job. Spent is the actual cost settled. When a job finishes or fails, the unused part of the hold is released back to Available." },
  { id: "kb-pri-1", category: "Pricing & receipts", title: "How is the price of a job shown?", status: "Approved", live: true, lastReviewed: D, owner: "Product", keywords: ["price", "cost", "estimate", "receipt", "charged", "how much"], answer: "Every job shows an estimated GHS cost before you run it and the actual amount after. You are only charged the actual cost. Prices on the demo site are illustrative." },
  { id: "kb-pri-2", category: "Pricing & receipts", title: "Can I get a receipt or statement?", status: "Draft", live: false, lastReviewed: "2026-08-20", owner: "Finance", keywords: ["receipt", "statement", "invoice", "download"], answer: "A downloadable statement of top-ups and charges is being designed. (Draft — not yet approved for customers.)" },
  { id: "kb-mod-1", category: "Models & token limits", title: "What is the difference between context window and max output tokens?", status: "Approved", live: true, lastReviewed: D, owner: "Developer relations", keywords: ["token", "tokens", "context", "max output", "limit", "1m", "window"], answer: "The context window is the total input plus output a model can consider in one request. Max output tokens is the cap on what it can write back. Each model card lists both, and the reservation is based on the max output you request." },
  { id: "kb-dev-1", category: "Developer / API concepts", title: "How do API keys work?", status: "Approved", live: true, lastReviewed: D, owner: "Developer relations", keywords: ["api", "key", "keys", "rotate", "revoke", "leaked", "shared"], answer: "Keys are scoped to one organisation, shown once at creation and can be revoked at any time under Developers → API keys. If a key may have been exposed, revoke it and create a new one; the old key stops working immediately. Support never needs to see your key." },
  { id: "kb-dev-2", category: "Developer / API concepts", title: "What does reserve → settle → release mean?", status: "Approved", live: true, lastReviewed: D, owner: "Product", keywords: ["reserve", "settle", "release", "failed job", "hold", "refund hold"], answer: "Before a request runs we reserve its maximum possible cost. When it completes we settle the actual cost and release the rest. If the job fails, the whole hold is released — you are not charged for failed jobs." },
  { id: "kb-cre-1", category: "Creative studios", title: "Which creative studios exist?", status: "Approved", live: false, lastReviewed: D, owner: "Product", keywords: ["studio", "image", "video", "voice", "dubbing", "audiobook", "4k"], answer: "The demo shows Image, Video, Voice, Dubbing and Audiobook studios with the estimated cost shown before you generate. Studios are simulated in this demo; 4K output requires provider validation before it can be offered." },
  { id: "kb-cty-1", category: "Country & payment availability", title: "Which countries and payment methods are available?", status: "Approved", live: false, lastReviewed: D, owner: "Support lead", keywords: ["country", "countries", "kenya", "nigeria", "tanzania", "m-pesa", "mpesa", "airtel", "mtn", "telecel", "available", "supported", "wave"], answer: "Ghana is the launch market. Other African countries and their mobile-money operators appear in the demo as illustrative and planned, subject to local validation. No live payment rail is connected in this demo, so we cannot confirm availability for any country yet." },
  { id: "kb-sec-1", category: "Account & security", title: "Will NuruRoute ever ask for my PIN or OTP?", status: "Approved", live: true, lastReviewed: D, owner: "Security", keywords: ["pin", "otp", "password", "security", "scam", "phishing", "ask for"], answer: "No. NuruRoute and its support team never ask for your mobile-money PIN, one-time codes, passwords, card details or API keys. If someone asks for them, do not share and report the message to us." },
  { id: "kb-ref-1", category: "Refunds & escalations", title: "Can unused credit be refunded?", status: "Draft", live: false, lastReviewed: "2026-08-15", owner: "Finance", keywords: ["refund", "money back", "withdraw", "unused credit", "return"], answer: "Refund handling for unused credit is being defined with payment partners and is not approved for customer communication yet. (Draft.)" },
  { id: "kb-ref-2", category: "Refunds & escalations", title: "How do I escalate an issue?", status: "Approved", live: true, lastReviewed: D, owner: "Support lead", keywords: ["escalate", "complaint", "human", "agent", "speak to someone", "urgent"], answer: "Reply to your ticket and ask for a human agent, or say “escalate”. A support person reviews it and responds; we will never ask you for a PIN, OTP or password during that process." },
  { id: "kb-liv-1", category: "Live vs planned", title: "Is anything live today?", status: "Approved", live: true, lastReviewed: D, owner: "Product", keywords: ["live", "real", "planned", "when", "launch", "production", "partner", "openai", "claude", "kimi", "gemini"], answer: "This site is an investor simulation. No real payments, live AI providers or partnerships are in place. Provider names are shown only as illustrative routing targets. Live services will be announced explicitly when approved." },
  { id: "kb-liv-2", category: "Live vs planned", title: "Team wallets and approvals", status: "Planned", live: false, lastReviewed: "2026-08-10", owner: "Product", keywords: ["team", "seats", "approval", "spend policy"], answer: "Team wallets with approvals and spend policies are on the roadmap. (Planned — do not confirm dates.)" },
];

const STOP = new Set(["the", "a", "an", "is", "my", "it", "i", "to", "of", "and", "for", "in", "on", "do", "does", "can", "what", "why", "how", "me", "please", "still", "after", "shows", "show", "not", "with", "be", "are", "was", "has", "have", "you", "your", "this", "that", "from", "or", "at"]);

export type KbHit = { article: KbArticle; score: number; matched: string[] };

/** Local retrieval: keyword/title overlap over Approved articles only. */
export function retrieve(query: string, articles: KbArticle[], limit = 2): KbHit[] {
  const q = query.toLowerCase();
  const terms = q.split(/[^a-z0-9-]+/).filter((t) => t.length > 2 && !STOP.has(t));
  const hits: KbHit[] = [];
  for (const a of articles) {
    if (a.status !== "Approved") continue;
    const matched = new Set<string>();
    let score = 0;
    for (const k of a.keywords) if (q.includes(k.toLowerCase())) { score += 3; matched.add(k); }
    for (const t of terms) {
      if (a.title.toLowerCase().includes(t)) { score += 2; matched.add(t); }
      else if (a.answer.toLowerCase().includes(t)) { score += 1; matched.add(t); }
    }
    if (score >= 3) hits.push({ article: a, score, matched: [...matched] });
  }
  return hits.sort((x, y) => y.score - x.score).slice(0, limit);
}

export function composeReply(firstName: string, hits: KbHit[], tone: "warm" | "concise") {
  const greet = tone === "warm" ? `Hello ${firstName}, thank you for reaching out.` : `Hi ${firstName},`;
  const close = tone === "warm" ? "Reply here if anything is still unclear — we're happy to help." : "Let us know if you need anything else.";
  return `${greet}\n\n${hits.map((h) => h.article.answer).join("\n\n")}\n\n${close}`;
}

export const CANNOT_VERIFY = "I cannot verify an approved answer for this question, so I will not guess. A simulated human-support ticket has been queued for review.";
