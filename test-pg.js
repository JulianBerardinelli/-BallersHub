import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    const res = await sql`SELECT 1 as result`;
    console.log("Connected! Result:", res);
  } catch(e) {
    console.error("Connection Error:", e);
  } finally {
    process.exit(0);
  }
}
main();
