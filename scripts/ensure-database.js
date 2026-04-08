/**
 * Create the database named in DATABASE_URL if it does not exist.
 * Connects via the "postgres" maintenance DB on the same host/port/user.
 * Run: npm run db:createdb
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadDatabaseUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^DATABASE_URL=(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v) return v;
  }
  throw new Error("DATABASE_URL not found in .env.local");
}

function safeIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe database name: ${name}`);
  }
  return name;
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  const u = new URL(databaseUrl);
  const pathPart = (u.pathname || "").replace(/^\//, "");
  const targetDb = pathPart ? decodeURIComponent(pathPart) : "pharmacy_inventory";
  const dbName = safeIdent(targetDb);

  u.pathname = "/postgres";
  const adminUrl = u.toString();

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  const exists = await client.query("select 1 from pg_database where datname = $1", [dbName]);
  if (exists.rows.length > 0) {
    console.log(`Database "${dbName}" already exists.`);
    await client.end();
    return;
  }

  await client.query(`create database ${dbName}`);
  console.log(`Created database "${dbName}".`);
  await client.end();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
