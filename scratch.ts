import { db } from "./src/lib/db";
import { careerItems } from "./src/db/schema";
import { eq, isNotNull } from "drizzle-orm";

async function main() {
  const items = await db.select().from(careerItems).where(isNotNull(careerItems.teamId)).limit(5);
  console.log(items.length, "items with teamId");
  if(items.length > 0) {
     console.log("Found an item:", items[0].teamId, items[0].club);
  }
}
main();
