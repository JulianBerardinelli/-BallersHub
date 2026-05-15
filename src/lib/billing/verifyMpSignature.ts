// Mercado Pago webhook signature verification.
//
// MP sends two relevant headers on every webhook:
//   x-signature: ts=...,v1=<hex>
//   x-request-id: <uuid>
//
// And on the URL: ?data.id=<resource id>&type=<resource type>
//
// The signed payload is built as:
//   "id:<resource id>;request-id:<x-request-id>;ts:<ts>;"
//
// We HMAC-SHA256 that with MP_WEBHOOK_SECRET (the dashboard "Secret signature"
// for the webhook URL) and compare against v1.
//
// Reference: https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks#bookmark_signature_validation

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { billingEnv } from "./env";

export type VerifyMpSignatureInput = {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  resourceId: string | null;
};

export function verifyMpSignature(input: VerifyMpSignatureInput): boolean {
  const { signatureHeader, requestIdHeader, resourceId } = input;
  if (!signatureHeader || !requestIdHeader || !resourceId) return false;

  // Header format: `ts=1700000000,v1=<hex>`
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split("=") as [string, string]),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${resourceId};request-id:${requestIdHeader};ts:${ts};`;
  const secret = billingEnv.mpWebhookSecret();
  const expected = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // timingSafeEqual requires equal-length buffers — MP's v1 is 64 hex chars.
  if (expected.length !== v1.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}
