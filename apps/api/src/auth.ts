import { createHmac, timingSafeEqual } from "node:crypto";

/** Minimal HS256 JWT for sessions. No third-party auth library needed for the MVP. */

export interface SessionClaims {
  sub: string; // user id
  email: string;
  exp: number; // unix seconds
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export function signSession(
  claims: Omit<SessionClaims, "exp">,
  secret: string,
  ttlSeconds = 60 * 60 * 12,
): string {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64(
    JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  );
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifySession(token: string | undefined, secret: string): SessionClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
    if (typeof claims.sub !== "string" || typeof claims.exp !== "number") return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}
