import { Pool } from "pg";
import { config } from "dotenv";

config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://osafi:osafi_dev_password@localhost:5433/osafi_ativos";

const isLocal =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
