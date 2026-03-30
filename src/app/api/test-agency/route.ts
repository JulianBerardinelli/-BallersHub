import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agencyProfiles } from "@/db/schema/agencies";
import { userProfiles } from "@/db/schema/users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agencies = await db.select().from(agencyProfiles);
    const users = await db.select().from(userProfiles);
    return NextResponse.json({ agencies, users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
