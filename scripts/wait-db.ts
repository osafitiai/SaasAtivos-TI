import { pool } from "./db";

async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query("select 1");
      console.log("✓ Banco de dados disponível.");
      await pool.end();
      return;
    } catch {
      console.log(`Aguardando banco de dados... (tentativa ${i}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error("✗ Banco de dados não respondeu a tempo.");
  process.exit(1);
}

waitForDb();
