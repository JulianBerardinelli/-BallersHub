import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL found.");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL);

  try {
    const filePath = path.join(process.cwd(), "docs/db/client-dashboard-publishing-v2.sql");
    const query = fs.readFileSync(filePath, "utf-8");
    
    console.log("Applying client-dashboard-publishing-v2.sql...");
    
    await sql.unsafe(query);
    
    console.log("Success! View updated.");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await sql.end();
  }
}

main();
