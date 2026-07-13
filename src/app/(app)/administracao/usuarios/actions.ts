"use server";

import { revalidatePath } from "next/cache";
import { pool, queryOne } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { ROLES } from "@/lib/constants";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function saveUser(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };
  if (!can(user, "users.manage")) return { error: "Sem permissão." };

  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const role = str(formData.get("role"));
  const scopeType = str(formData.get("scope_type")) ?? "tenant";
  const password = str(formData.get("password"));
  const status = str(formData.get("status")) ?? "active";

  if (!name || !email || !role) return { error: "Nome, e-mail e perfil são obrigatórios." };
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { error: "Perfil inválido." };

  try {
    if (id) {
      const sets = ["name=$3", "email=$4", "role=$5", "scope_type=$6", "status=$7"];
      const paramsArr: unknown[] = [id, user.tenant_id, name, email, role, scopeType, status];
      if (password) {
        sets.push(`password_hash=$${paramsArr.length + 1}`);
        paramsArr.push(await hashPassword(password));
      }
      await pool.query(
        `update users set ${sets.join(", ")} where id=$1 and tenant_id=$2`,
        paramsArr
      );
      await recordAudit({ user, action: "update", entityType: "user", entityId: id, newValues: { name, email, role } });
    } else {
      if (!password) return { error: "Informe uma senha inicial." };
      const inserted = await queryOne<{ id: string }>(
        `insert into users (tenant_id, name, email, password_hash, role, scope_type, status)
         values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [user.tenant_id, name, email, await hashPassword(password), role, scopeType, status]
      );
      await recordAudit({ user, action: "create", entityType: "user", entityId: inserted?.id, newValues: { name, email, role } });
    }
    revalidatePath("/administracao/usuarios");
    return {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("uq_users_tenant_email")) return { error: "Já existe um usuário com este e-mail." };
    return { error: "Erro: " + msg };
  }
}

export async function toggleUserStatus(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };
  if (!can(user, "users.manage")) return { error: "Sem permissão." };
  const id = str(formData.get("id"));
  if (id === user.id) return { error: "Você não pode bloquear a si mesmo." };
  await pool.query(
    `update users set status = case when status='active' then 'blocked' else 'active' end,
            session_version = session_version + 1
      where id=$1 and tenant_id=$2`,
    [id, user.tenant_id]
  );
  await recordAudit({ user, action: "update", entityType: "user", entityId: id ?? undefined, newValues: { toggled: true } });
  revalidatePath("/administracao/usuarios");
  return {};
}
