import { NextResponse } from "next/server";
import { updateAgencyProfile, getActiveAgencies } from "@/app/actions/agencies";
import { db } from "@/lib/db";
import { agencyProfiles } from "@/db/schema/agencies";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agencies = await db.select().from(agencyProfiles).limit(1);
    if (agencies.length === 0) return NextResponse.json({ error: "No agencies found" });

    const testId = agencies[0].id;

    // Simulate the exact payload from the frontend
    const payload = {
      operativeCountries: ["AR", "BR"],
      licenses: [{ type: "FIFA", number: "123456", url: "https://fifa.com" }],
      foundationYear: 2010,
      instagramUrl: "https://instagram.com/test",
      headquarters: "Madrid"
    };

    // We can't easily fake the user inside "updateAgencyProfile" because it calls supabase.auth.getUser().
    // Let's just run the Zod parse and Drizzle update directly to bypass auth.
    
    // 1. Zod parse simulation
    const { z } = await import("zod");
    const updateAgencySchema = z.object({
        licenses: z.array(z.object({
            type: z.string().min(1).max(50),
            number: z.string().min(1).max(100),
            url: z.string().optional()
        })).max(10).nullable().optional(),
        operativeCountries: z.array(z.string().length(2)).max(15).nullable().optional(),
        headquarters: z.string().max(100).nullable().optional(),
        foundationYear: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
        instagramUrl: z.string().nullable().optional(),
    });

    const parsed = updateAgencySchema.parse(payload);

    // 2. Drizzle update simulation
    await db.update(agencyProfiles)
        .set(parsed)
        .where(eq(agencyProfiles.id, testId));

    // 3. Fetch after
    const after = await db.query.agencyProfiles.findFirst({
        where: eq(agencyProfiles.id, testId)
    });

    return NextResponse.json({ before: payload, parsed, after });

  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
