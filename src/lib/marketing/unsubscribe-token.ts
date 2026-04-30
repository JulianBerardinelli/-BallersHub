import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-signed unsubscribe tokens. We embed the recipient email + an
 * issued-at timestamp into a base64url payload, signed with a secret.
 *
 * Why HMAC and not a DB token:
 * - No DB lookup needed at unsubscribe time (works even if the user
 *   is offline / the row was already deleted).
 * - The link is stateless — fits "List-Unsubscribe-Post: One-Click"
 *   semantics required by Gmail/Outlook for trusted-sender status.
 * - We can rotate the secret to invalidate all outstanding tokens.
 *
 * Token shape: `<base64url(email|issuedAtSeconds)>.<base64url(hmac)>`
 *
 * Tokens never expire on the server side (one-click unsubscribe links
 * sometimes get clicked years later — the user always wins). The
 * `issuedAt` is informational/audit only.
 */

const ENCODING = "utf8";

function getSecret(): string {
  // Fall back to NEXTAUTH_SECRET / SUPABASE_JWT_SECRET if a dedicated
  // marketing secret is not provisioned yet — better than crashing in
  // dev. In production, `MARKETING_UNSUB_SECRET` should be set explicitly.
  const secret =
    process.env.MARKETING_UNSUB_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_JWT_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error(
      "[marketing] MARKETING_UNSUB_SECRET is not set (or too short). " +
        "Set it to a random 32+ char string in your env to sign unsubscribe tokens.",
    );
  }
  return secret;
}

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, ENCODING) : input;
  return buf.toString("base64url");
}

function fromBase64Url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function signPayload(payload: string): string {
  return toBase64Url(createHmac("sha256", getSecret()).update(payload).digest());
}

export function signUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(`${normalized}|${issuedAt}`);
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

export type VerifiedUnsubscribe = {
  email: string;
  issuedAt: Date;
};

/**
 * Verify a token and return the email it was issued for. Throws on any
 * tampering / invalid format. Use timingSafeEqual to avoid leaking
 * signature bytes via timing side-channel.
 */
export function verifyUnsubscribeToken(token: string): VerifiedUnsubscribe {
  const dot = token.lastIndexOf(".");
  if (dot < 0) throw new Error("Token inválido.");

  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  const expectedSig = signPayload(payload);

  const a = fromBase64Url(providedSig);
  const b = fromBase64Url(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Firma inválida.");
  }

  const decoded = fromBase64Url(payload).toString(ENCODING);
  const [email, issuedAtRaw] = decoded.split("|");
  if (!email || !issuedAtRaw) throw new Error("Payload inválido.");

  const issuedAt = new Date(Number(issuedAtRaw) * 1000);
  return { email, issuedAt };
}
