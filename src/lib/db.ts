import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Singleton do pool, reutilizado entre invocações na mesma instância (inclusive
// serverless na Vercel) e durante o hot-reload do Next em desenvolvimento.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://osafi:osafi_dev_password@localhost:5433/osafi_ativos";

// Habilita SSL automaticamente para bancos gerenciados (ex.: Supabase),
// mantendo conexão sem SSL para o Postgres local de desenvolvimento.
const isLocal =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

function createPool(): Pool {
  const p = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    // Em serverless cada instância mantém seu próprio pool; um pool pequeno
    // evita esgotar as conexões do pooler do Supabase.
    max: isLocal ? 10 : 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
    keepAlive: true,
  });

  // ESSENCIAL: sem este handler, um erro em conexão ociosa (o pooler do Supabase
  // fecha conexões inativas) vira "unhandled error" e derruba o processo,
  // causando "server-side exception" no request seguinte.
  p.on("error", (err) => {
    console.error("[pg pool] erro em conexão ociosa (ignorado):", err.message);
  });

  return p;
}

export const pool = globalForPg.pgPool ?? createPool();
globalForPg.pgPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      // conexão pode já estar inválida; ignora para não mascarar o erro original
    }
    throw err;
  } finally {
    client.release();
  }
}
