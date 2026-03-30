import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const up = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, "86362ab1-d2c6-49e7-812f-780d6d198351"),
        with: { agency: true }
    });

    return NextResponse.json(up);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
