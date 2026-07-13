import "server-only";
import { revalidatePath } from "next/cache";
import { pool, queryOne } from "./db";
import { getSession } from "./auth";
import { recordAudit } from "./audit";

export type ColumnType = "text" | "number" | "boolean" | "date" | "json" | "array";

export interface CrudColumn {
  name: string;
  type?: ColumnType;
}

export interface CrudConfig {
  table: string;
  entityType: string;
  columns: CrudColumn[];
  revalidate?: string;
  softDelete?: boolean;
}

function coerce(value: FormDataEntryValue | null, type: ColumnType, present: boolean) {
  if (type === "boolean") return value === "on" || value === "true";
  if (!present) return null;
  const s = String(value ?? "").trim();
  if (s === "") return null;
  if (type === "number") {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isNaN(Number(s)) ? (Number.isNaN(n) ? null : n) : Number(s);
  }
  if (type === "array") return JSON.stringify(s.split(",").map((v) => v.trim()).filter(Boolean));
  if (type === "json") return s;
  return s;
}

export function makeCrudActions(config: CrudConfig) {
  const { table, entityType, columns, revalidate, softDelete } = config;

  async function save(formData: FormData): Promise<{ error?: string }> {
    const user = await getSession();
    if (!user) return { error: "Não autenticado." };

    const id = formData.get("id") ? String(formData.get("id")) : null;
    const data: Record<string, unknown> = {};

    for (const col of columns) {
      const type = col.type ?? "text";
      const present = formData.has(col.name);
      if (type === "boolean") {
        data[col.name] = coerce(formData.get(col.name), type, present);
      } else if (present) {
        data[col.name] = coerce(formData.get(col.name), type, present);
      }
    }

    try {
      if (id) {
        const before = await queryOne(
          `select * from ${table} where id = $1 and tenant_id = $2`,
          [id, user.tenant_id]
        );
        if (!before) return { error: "Registro não encontrado." };

        const keys = Object.keys(data);
        const sets = keys.map((k, i) => `${k} = $${i + 3}`);
        await pool.query(
          `update ${table} set ${sets.join(", ")} where id = $1 and tenant_id = $2`,
          [id, user.tenant_id, ...keys.map((k) => data[k])]
        );
        await recordAudit({
          user,
          action: "update",
          entityType,
          entityId: id,
          oldValues: before,
          newValues: data,
        });
      } else {
        const keys = Object.keys(data);
        const cols = ["tenant_id", ...keys];
        const placeholders = cols.map((_, i) => `$${i + 1}`);
        const inserted = await queryOne<{ id: string }>(
          `insert into ${table} (${cols.join(", ")}) values (${placeholders.join(", ")}) returning id`,
          [user.tenant_id, ...keys.map((k) => data[k])]
        );
        await recordAudit({
          user,
          action: "create",
          entityType,
          entityId: inserted?.id,
          newValues: data,
        });
      }
      if (revalidate) revalidatePath(revalidate);
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return { error: "Já existe um registro com esse valor único (código/CNPJ/e-mail)." };
      }
      return { error: "Erro ao salvar: " + msg };
    }
  }

  async function remove(formData: FormData): Promise<{ error?: string }> {
    const user = await getSession();
    if (!user) return { error: "Não autenticado." };
    const id = String(formData.get("id"));

    try {
      const before = await queryOne(
        `select * from ${table} where id = $1 and tenant_id = $2`,
        [id, user.tenant_id]
      );
      if (!before) return { error: "Registro não encontrado." };

      if (softDelete) {
        await pool.query(
          `update ${table} set deleted_at = now() where id = $1 and tenant_id = $2`,
          [id, user.tenant_id]
        );
      } else {
        await pool.query(`delete from ${table} where id = $1 and tenant_id = $2`, [
          id,
          user.tenant_id,
        ]);
      }
      await recordAudit({ user, action: "delete", entityType, entityId: id, oldValues: before });
      if (revalidate) revalidatePath(revalidate);
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("foreign key") || msg.includes("violates")) {
        return { error: "Não é possível excluir: existem registros vinculados." };
      }
      return { error: "Erro ao excluir: " + msg };
    }
  }

  return { save, remove };
}
