// Persist a webhook event to `payment_events` with idempotency.
// Returns whether this is the first time we're seeing the event (so callers
// can skip processing on retries).

import "server-only";
import { db } from "@/lib/db";
import { paymentEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type RecordEventInput = {
  processor: "stripe" | "mercado_pago";
  processorEventId: string;
  eventType: string;
  payload: unknown;
  checkoutSessionId?: string | null;
  subscriptionId?: string | null;
};

export type RecordEventResult = {
  /** db row id */
  eventRowId: string;
  /** false when the event was already recorded (replay / retry) */
  isFirst: boolean;
};

export async function recordEvent(
  input: RecordEventInput,
): Promise<RecordEventResult> {
  // Check first to avoid bumping serial ids on duplicates.
  const existing = await db
    .select({ id: paymentEvents.id, processed: paymentEvents.processed })
    .from(paymentEvents)
    .where(
      and(
        eq(paymentEvents.processor, input.processor),
        eq(paymentEvents.processorEventId, input.processorEventId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return { eventRowId: existing[0].id, isFirst: false };
  }

  const [row] = await db
    .insert(paymentEvents)
    .values({
      processor: input.processor,
      processorEventId: input.processorEventId,
      eventType: input.eventType,
      payload: input.payload as object,
      checkoutSessionId: input.checkoutSessionId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      processed: false,
    })
    .returning({ id: paymentEvents.id });

  return { eventRowId: row.id, isFirst: true };
}

export async function markEventProcessed(
  eventRowId: string,
  errorMessage?: string,
): Promise<void> {
  await db
    .update(paymentEvents)
    .set({
      processed: !errorMessage,
      processedAt: new Date(),
      errorMessage: errorMessage ?? null,
    })
    .where(eq(paymentEvents.id, eventRowId));
}
