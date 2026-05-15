import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
async function check() {
  try {
    const result = await sql`
      SELECT pg_get_viewdef('career_revision_inbox', true);
    `;
    console.log(result[0]?.pg_get_viewdef);
  } finally {
    process.exit(0);
  }
}
check();
