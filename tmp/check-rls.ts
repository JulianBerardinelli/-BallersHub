import postgres from "postgres";

async function run() {
  const sql = postgres("postgresql://postgres:Melapela10ballershub@db.ygansmlplzzwkjdmlqtu.supabase.co:5432/postgres");
  const policies = await sql`
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
  `;
  console.log(JSON.stringify(policies, null, 2));
  process.exit(0);
}
run();
