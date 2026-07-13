import "server-only";
import type { PoolClient } from "pg";
import { pool } from "./db";

interface NotifyInput {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  severity?: "info" | "warning" | "critical" | "success";
  client?: PoolClient;
}

export async function notifyUser(input: NotifyInput) {
  const sql = `insert into notifications
     (tenant_id, user_id, type, title, message, entity_type, entity_id, severity)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`;
  const params = [
    input.tenantId,
    input.userId,
    input.type,
    input.title,
    input.message ?? null,
    input.entityType ?? null,
    input.entityId ?? null,
    input.severity ?? "info",
  ];
  if (input.client) await input.client.query(sql, params);
  else await pool.query(sql, params);
}

/** Notifica todos os usuários com papéis de TI/admin do tenant. */
export async function notifyItTeam(
  tenantId: string,
  input: Omit<NotifyInput, "tenantId" | "userId">
) {
  const users = await pool.query<{ id: string }>(
    `select id from users where tenant_id = $1 and status = 'active'
       and role in ('admin','gestor_ti','tecnico_ti')`,
    [tenantId]
  );
  for (const u of users.rows) {
    await notifyUser({ ...input, tenantId, userId: u.id });
  }
}
