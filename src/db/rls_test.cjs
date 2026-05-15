const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const sql = postgres(env.DATABASE_URL);

async function run() {
  try {
    const limits = await sql`SELECT get_limits_for_player('6ad2f4c1-1103-4db7-9b04-c946ee708cb2') as limits`;
    console.log("get_limits_for_player:", limits[0]?.limits);

    const maxMedia = await sql`SELECT max_media_allowed('6ad2f4c1-1103-4db7-9b04-c946ee708cb2', 'photo') as max_media`;
    console.log("max_media_allowed:", maxMedia[0]?.max_media);

    const canAdd = await sql`SELECT can_add_media('6e7e7602-f434-4394-bef1-e25001f8fe1a', '6ad2f4c1-1103-4db7-9b04-c946ee708cb2', 'photo') as can_add`;
    console.log("can_add_media:", canAdd[0]?.can_add);

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

run();
