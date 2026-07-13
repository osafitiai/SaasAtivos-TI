import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Singleton do pool para evitar múltiplas conexões durante o hot-reload do Next.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://osafi:osafi_dev_password@localhost:5433/osafi_ativos";

// Habilita SSL automaticamente para bancos gerenciados (ex.: Supabase),
// mantendo conexão sem SSL para o Postgres local de desenvolvimento.
const isLocal =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    max: 10,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

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
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
