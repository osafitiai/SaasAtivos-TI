"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

export async function updateAssetResponsible(
  assetId: string,
  employeeId: string | null,
  locationId: string | null
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };
  if (!can(user, "assets.edit")) return { error: "Sem permissão." };

  try {
    await pool.query(
      `update assets set current_employee_id = $1, location_id = $2, updated_at = now()
        where id = $3 and tenant_id = $4`,
      [employeeId, locationId, assetId, user.tenant_id]
    );

    await recordAudit({
      user,
      action: "update",
      entityType: "asset",
      entityId: assetId,
      newValues: { current_employee_id: employeeId, location_id: locationId },
    });

    revalidatePath(`/ativos/${assetId}`);
    return {};
  } catch (err: unknown) {
    return { error: "Erro ao atualizar: " + (err instanceof Error ? err.message : String(err)) };
  }
}
