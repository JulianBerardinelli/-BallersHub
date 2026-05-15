import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema/index.js";
import { createClient } from "@supabase/supabase-js";

// Initialize Postgres
const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Initialize Supabase Admin for deleting storage files
const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must ensure this exists in .env.local

if (!supabaseServiceRole) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local! Needed for storage deletion.");
  process.exit(1);
}

const supabase = createClient(supabaseAdminUrl, supabaseServiceRole);

async function main() {
  console.log("Analyzing orphaned crests in 'teams' bucket...");

  // 1. Get all active DB URLs
  const allTeams = await db.query.teams.findMany({ columns: { crestUrl: true } });
  const allDivisions = await db.query.divisions.findMany({ columns: { crestUrl: true } });
  
  const validUrlSet = new Set<string>();
  
  const extractKey = (url: string | null) => {
    if (!url) return null;
    const bucketToken = "/storage/v1/object/public/teams/";
    if (url.includes(bucketToken)) {
      return url.split(bucketToken)[1].trim(); // e.g. "team-id/crest.png"
    }
    return null;
  };

  for (const t of allTeams) {
    const key = extractKey(t.crestUrl);
    if (key) validUrlSet.add(key);
  }
  for (const d of allDivisions) {
    const key = extractKey(d.crestUrl);
    if (key) validUrlSet.add(key);
  }

  // 2. Query storage.objects from Postgres directly (super fast)
  // We only look at 'teams' bucket objects.
  const storageObjects = await sql`
    SELECT name 
    FROM storage.objects 
    WHERE bucket_id = 'teams' AND name != '.emptyFolderPlaceholder'
  `;

  const filesToDelete: string[] = [];

  for (const obj of storageObjects) {
    const filePath = obj.name; // e.g. "team-id/crest.png"
    
    // Ignore empty folders natively tracked by Supabase
    if (!filePath || filePath.endsWith('/')) continue; 
    
    if (!validUrlSet.has(filePath)) {
      filesToDelete.push(filePath);
    }
  }

  console.log(`Found ${storageObjects.length} total files in 'teams' bucket.`);
  console.log(`Found ${validUrlSet.size} active referenced files in Database.`);
  
  if (filesToDelete.length === 0) {
    console.log("✅ Bucket is 100% clean. No orphans found.");
    process.exit(0);
  }

  console.log(`🧹 Identified ${filesToDelete.length} orphaned file(s) to remove!`);
  
  // 3. Delete from bucket using Supabase API
  // We chunk them in arrays of 100 just in case
  const chunkSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < filesToDelete.length; i += chunkSize) {
    const chunk = filesToDelete.slice(i, i + chunkSize);
    const { data, error } = await supabase.storage.from("teams").remove(chunk);
    
    if (error) {
      console.error("Error deleting chunk:", error);
    } else {
      deletedCount += data?.length || 0;
      console.log(`Deleted chunk... (${deletedCount}/${filesToDelete.length})`);
    }
  }

  console.log(`✅ Successfully deleted ${deletedCount} orphaned files from Storage.`);
  process.exit(0);
}

main().catch(e => {
  console.error("Execution failed:", e);
  process.exit(1);
});
