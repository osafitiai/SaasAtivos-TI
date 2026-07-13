import { Pool } from "pg";
import { config } from "dotenv";

config();

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://osafi:osafi_dev_password@localhost:5433/osafi_ativos",
});
