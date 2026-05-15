import { db } from "./src/lib/db";
import { agencyProfiles } from "./src/db/schema/agencies";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const agency = await db.query.agencyProfiles.findFirst({
      where: eq(agencyProfiles.slug, "nexions-management"), // dummy slug or try 'nexions'
      with: {
        players: {
          where: (p, { eq }) => eq(p.visibility, "public" as any),
        }
      }
    });
    console.log("Success:", agency?.name || "Not found");
  } catch (err) {
    console.error("DB Query failed:", err);
  }
  process.exit(0);
}
run();
