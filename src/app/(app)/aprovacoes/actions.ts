"use server";

import { revalidatePath } from "next/cache";
import { queryOne, transaction } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { notifyItTeam } from "@/lib/notifications";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function requestWriteOff(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };
  if (!can(user, "writeoff.request")) return { error: "Sem permissão para solicitar baixa." };

  const assetId = str(formData.get("asset_id"));
  const reason = str(formData.get("reason"));
  if (!assetId || !reason) return { error: "Ativo e motivo são obrigatórios." };

  const asset = await queryOne<{ status: string; name: string }>(
    "select status, name from assets where id = $1 and tenant_id = $2 and deleted_at is null",
    [assetId, user.tenant_id]
  );
  if (!asset) return { error: "Ativo não encontrado." };

  const inserted = await queryOne<{ id: string }>(
    `insert into asset_write_offs
       (tenant_id, asset_id, reason, status, report, requested_by_user_id, destination, residual_value, notes)
     values ($1,$2,$3,'solicitada',$4,$5,$6,$7,$8) returning id`,
    [
      user.tenant_id, assetId, reason,
      str(formData.get("report")), user.id,
      str(formData.get("destination")),
      str(formData.get("residual_value")),
      str(formData.get("notes")),
    ]
  );

  await recordAudit({ user, action: "write_off_request", entityType: "asset", entityId: assetId, newValues: { reason } });
  await notifyItTeam(user.tenant_id!, {
    type: "writeoff.requested",
    title: "Solicitação de baixa aguardando aprovação",
    message: `Baixa solicitada para "${asset.name}" (motivo: ${reason}).`,
    entityType: "asset",
    entityId: assetId,
    severity: "warning",
  });

  revalidatePath("/aprovacoes");
  return {};
}

const REASON_TO_STATUS: Record<string, string> = {
  Venda: "Vendido",
  Doação: "Doado",
  "Descarte ambiental": "Descartado",
  Perda: "Perdido",
  Furto: "Furtado",
};

export async function decideWriteOff(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };
  if (!can(user, "writeoff.approve")) return { error: "Sem permissão para aprovar baixa." };

  const id = str(formData.get("id"));
  const decision = str(formData.get("decision")); // 'aprovada' | 'rejeitada'
  if (!id || !decision) return { error: "Dados incompletos." };

  const wo = await queryOne<{ asset_id: string; reason: string; status: string }>(
    "select asset_id, reason, status from asset_write_offs where id = $1 and tenant_id = $2",
    [id, user.tenant_id]
  );
  if (!wo) return { error: "Solicitação não encontrada." };
  if (wo.status !== "solicitada") return { error: "Solicitação já processada." };

  try {
    await transaction(async (client) => {
      await client.query(
        "update asset_write_offs set status = $2, approved_by_user_id = $3, approved_at = now() where id = $1",
        [id, decision, user.id]
      );

      if (decision === "aprovada") {
        const newStatus = REASON_TO_STATUS[wo.reason] ?? "Baixado";
        const asset = await queryOne<{ status: string }>(
          "select status from assets where id = $1",
          [wo.asset_id]
        );
        // Registra movimentação de baixa (histórico preservado)
        await client.query(
          `insert into asset_movements
             (tenant_id, asset_id, movement_type, from_status, to_status, performed_by_user_id, reason, occurred_at)
           values ($1,$2,'Baixa',$3,$4,$5,$6, now())`,
          [user.tenant_id, wo.asset_id, asset?.status, newStatus, user.id, wo.reason]
        );
        // Encerra atribuição aberta e bloqueia (status baixado)
        await client.query(
          "update asset_assignments set ended_at = now() where asset_id = $1 and ended_at is null",
          [wo.asset_id]
        );
        await client.query(
          "update assets set status = $2, current_employee_id = null where id = $1",
          [wo.asset_id, newStatus]
        );
      }

      await recordAudit({
        user,
        action: decision === "aprovada" ? "write_off_approve" : "write_off_reject",
        entityType: "asset",
        entityId: wo.asset_id,
        newValues: { decision },
        client,
      });
    });

    revalidatePath("/aprovacoes");
    revalidatePath(`/ativos/${wo.asset_id}`);
    return {};
  } catch (err: unknown) {
    return { error: "Erro: " + (err instanceof Error ? err.message : String(err)) };
  }
}
