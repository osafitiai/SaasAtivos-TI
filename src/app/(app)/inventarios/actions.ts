"use server";

import { revalidatePath } from "next/cache";
import { pool, queryOne, transaction } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function createInventory(formData: FormData): Promise<{ error?: string; id?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };

  const name = str(formData.get("name"));
  if (!name) return { error: "Informe o nome da campanha." };
  const departmentId = str(formData.get("department_id"));
  const locationId = str(formData.get("location_id"));

  try {
    const id = await transaction(async (client) => {
      const inv = await client.query<{ id: string }>(
        `insert into inventories (tenant_id, name, scope_type, scope_ids, status, started_at, created_by_user_id)
         values ($1,$2,$3,$4,'aberto', now(), $5) returning id`,
        [
          user.tenant_id,
          name,
          departmentId ? "department" : locationId ? "location" : "tenant",
          JSON.stringify([departmentId || locationId].filter(Boolean)),
          user.id,
        ]
      );
      const invId = inv.rows[0].id;

      // Gera lista esperada (snapshot) dos ativos no escopo
      const conds = ["tenant_id = $1", "deleted_at is null", "status not in ('Baixado','Descartado','Vendido','Doado')"];
      const params: unknown[] = [user.tenant_id];
      if (departmentId) {
        params.push(departmentId);
        conds.push(`department_id = $${params.length}`);
      }
      if (locationId) {
        params.push(locationId);
        conds.push(`location_id = $${params.length}`);
      }
      await client.query(
        `insert into inventory_items (tenant_id, inventory_id, asset_id, expected_employee_id, expected_location_id)
         select tenant_id, $${params.length + 1}, id, current_employee_id, location_id
           from assets where ${conds.join(" and ")}`,
        [...params, invId]
      );

      await recordAudit({ user, action: "create", entityType: "inventory", entityId: invId, newValues: { name }, client });
      return invId;
    });

    revalidatePath("/inventarios");
    return { id };
  } catch (err: unknown) {
    return { error: "Erro ao criar inventário: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function checkItem(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };

  const itemId = str(formData.get("item_id"));
  const found = str(formData.get("found")) === "true";
  const divergence = str(formData.get("divergence_type"));
  const condition = str(formData.get("physical_condition"));
  const notes = str(formData.get("notes"));

  await pool.query(
    `update inventory_items
        set found = $2, divergence_type = $3, physical_condition = $4, notes = $5,
            checked_by_user_id = $6, checked_at = now()
      where id = $1 and tenant_id = $7`,
    [itemId, found, divergence, condition, notes, user.id, user.tenant_id]
  );

  const item = await queryOne<{ inventory_id: string }>(
    "select inventory_id from inventory_items where id = $1",
    [itemId]
  );
  if (item) revalidatePath(`/inventarios/${item.inventory_id}`);
  return {};
}

export async function finishInventory(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };
  const id = str(formData.get("id"));
  if (!id) return { error: "Inventário inválido." };

  await pool.query(
    "update inventories set status = 'finalizado', finished_at = now() where id = $1 and tenant_id = $2",
    [id, user.tenant_id]
  );
  await recordAudit({ user, action: "finish", entityType: "inventory", entityId: id });
  revalidatePath(`/inventarios/${id}`);
  revalidatePath("/inventarios");
  return {};
}
