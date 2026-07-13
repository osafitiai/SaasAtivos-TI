import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "db", "migrations");

async function main() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    // Trava de segurança: --reset DROPA todo o schema public (perde TODOS os dados).
    // Exige --force (ou MIGRATE_FORCE=true) quando já houver dados no banco.
    const force = process.argv.includes("--force") || process.env.MIGRATE_FORCE === "true";
    let hasData = false;
    try {
      const check = await pool.query<{ c: string }>(
        `select count(*)::text as c from information_schema.tables
          where table_schema = 'public' and table_name = 'assets'`
      );
      if (Number(check.rows[0]?.c ?? 0) > 0) {
        const assets = await pool.query<{ c: string }>("select count(*)::text as c from assets");
        const users = await pool.query<{ c: string }>("select count(*)::text as c from users");
        hasData = Number(assets.rows[0]?.c ?? 0) > 0 || Number(users.rows[0]?.c ?? 0) > 0;
      }
    } catch {
      hasData = false;
    }

    if (hasData && !force) {
      console.error(
        "\n⛔ O banco já possui dados. O reset APAGARIA todo o schema (ativos, usuários, tudo)." +
          "\n   Se isto é um ambiente de produção, NÃO rode o reset." +
          "\n   Para recriar mesmo assim (ex.: ambiente de teste):" +
          "\n     PowerShell:  $env:MIGRATE_FORCE=\"true\"; $env:SEED_FORCE=\"true\"; npm run db:reset" +
          "\n     Bash:        MIGRATE_FORCE=true SEED_FORCE=true npm run db:reset\n"
      );
      await pool.end();
      process.exit(1);
    }

    console.log("⚠  Resetando schema public...");
    await pool.query("drop schema if exists public cascade; create schema public;");
  }

  await pool.query(`
    create table if not exists _migrations (
      id serial primary key,
      name varchar unique not null,
      applied_at timestamptz not null default now()
    );
  `);

  const applied = new Set(
    (await pool.query<{ name: string }>("select name from _migrations")).rows.map(
      (r) => r.name
    )
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`• ${file} (já aplicada)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`→ Aplicando ${file}...`);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`✓ ${file}`);
    } catch (err) {
      await client.query("rollback");
      console.error(`✗ Falha em ${file}:`, err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log("✓ Migrations concluídas.");
  await pool.end();
}

main();
