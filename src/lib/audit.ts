import "server-only";
import { headers } from "next/headers";
import type { PoolClient } from "pg";
import { pool } from "./db";
import type { SessionUser } from "./types";

interface AuditInput {
  user: SessionUser;
  action: string; // 'create' | 'update' | 'delete' | 'move' | 'import' | 'export' | 'login' | 'approve' | 'write_off' ...
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  client?: PoolClient;
}

export async function recordAudit(input: AuditInput) {
  const { user, action, entityType, entityId, oldValues, newValues, client } = input;

  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    ua = h.get("user-agent");
  } catch {
    // fora de request (jobs) — sem cabeçalhos
  }

  const sql = `insert into audit_logs
      (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
  const params = [
    user.tenant_id,
    user.id,
    action,
    entityType,
    entityId ?? null,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    ip,
    ua,
  ];

  if (client) {
    await client.query(sql, params);
  } else {
    await pool.query(sql, params);
  }
}
