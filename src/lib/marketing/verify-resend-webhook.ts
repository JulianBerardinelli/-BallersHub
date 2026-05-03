import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a Resend webhook signature.
 *
 * Resend uses the Standard Webhooks spec (Svix-compatible).
 *
 *   signed_payload = `${svix_id}.${svix_timestamp}.${body}`
 *   signature      = base64(HMAC-SHA256(signed_payload, secret_key_bytes))
 *
 *   secret_key_bytes = base64-decode(secret.replace("whsec_", ""))
 *   header           = "Svix-Signature: v1,<base64> v1,<base64> ..."
 *
 * The header may contain multiple signatures (during secret rotation).
 * Any one matching is enough.
 *
 * Throws if signature is invalid or any required header is missing.
 */
export function verifyResendWebhook(opts: {
  body: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  secret: string;
  /** Tolerance in seconds for replay protection. Default 5 minutes. */
  toleranceSec?: number;
}): void {
  const { body, svixId, svixTimestamp, svixSignature, secret, toleranceSec = 300 } = opts;

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing Svix-* headers.");
  }

  // Replay protection
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) throw new Error("Invalid timestamp.");
  const skewSec = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skewSec > toleranceSec) {
    throw new Error("Webhook timestamp out of tolerance.");
  }

  // Decode the secret
  const cleaned = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const secretBytes = Buffer.from(cleaned, "base64");

  // Compute expected signature
  const signedPayload = `${svixId}.${svixTimestamp}.${body}`;
  const expected = createHmac("sha256", secretBytes).update(signedPayload).digest();

  // The header may contain multiple `v1,<base64>` pairs separated by spaces.
  // Any one matching means the payload is authentic.
  const parts = svixSignature.split(" ").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    const provided = Buffer.from(sig, "base64");
    if (provided.length !== expected.length) continue;
    if (timingSafeEqual(provided, expected)) return;
  }

  throw new Error("Invalid signature.");
}
