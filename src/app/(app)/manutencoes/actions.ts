"use server";

import { revalidatePath } from "next/cache";
import { queryOne, transaction } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { notifyItTeam } from "@/lib/notifications";

function num(v: FormDataEntryValue | null): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

// Percentual configurável do valor de aquisição que dispara alerta de custo
const COST_ALERT_THRESHOLD = 0.5;

export async function saveMaintenance(formData: FormData): Promise<{ error?: string; id?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };

  const id = str(formData.get("id"));
  const assetId = str(formData.get("asset_id"));
  const type = str(formData.get("type"));
  const status = str(formData.get("status")) ?? "Aberta";
  if (!assetId) return { error: "Selecione o ativo." };
  if (!type) return { error: "Informe o tipo de manutenção." };

  const partsCost = num(formData.get("parts_cost"));
  const serviceCost = num(formData.get("service_cost"));
  const totalCost = partsCost + serviceCost;

  const data: Record<string, unknown> = {
    asset_id: assetId,
    supplier_id: str(formData.get("supplier_id")),
    protocol: str(formData.get("protocol")),
    type,
    status,
    problem_description: str(formData.get("problem_description")),
    diagnosis: str(formData.get("diagnosis")),
    solution: str(formData.get("solution")),
    parts_cost: partsCost,
    service_cost: serviceCost,
    total_cost: totalCost,
    expected_at: str(formData.get("expected_at")),
    completed_at: status === "Concluída" ? new Date().toISOString() : str(formData.get("completed_at")),
    notes: str(formData.get("notes")),
  };

  try {
    let maintenanceId = id;
    await transaction(async (client) => {
      if (id) {
        const before = await queryOne(
          "select * from maintenances where id = $1 and tenant_id = $2",
          [id, user.tenant_id]
        );
        if (!before) throw new Error("Manutenção não encontrada.");
        const keys = Object.keys(data);
        const sets = keys.map((k, i) => `${k} = $${i + 3}`);
        await client.query(
          `update maintenances set ${sets.join(", ")} where id = $1 and tenant_id = $2`,
          [id, user.tenant_id, ...keys.map((k) => data[k])]
        );
        await recordAudit({ user, action: "update", entityType: "maintenance", entityId: id, oldValues: before, newValues: data, client });
      } else {
        const keys = Object.keys(data);
        const cols = ["tenant_id", "requested_by_user_id", "opened_at", ...keys];
        const values = [user.tenant_id, user.id, new Date().toISOString(), ...keys.map((k) => data[k])];
        const ph = cols.map((_, i) => `$${i + 1}`);
        const inserted = await queryOne<{ id: string }>(
          `insert into maintenances (${cols.join(", ")}) values (${ph.join(", ")}) returning id`,
          values
        );
        maintenanceId = inserted?.id ?? null;
        await recordAudit({ user, action: "create", entityType: "maintenance", entityId: maintenanceId, newValues: data, client });
      }

      // Ao abrir (não concluída/cancelada), coloca o ativo em manutenção
      if (["Aberta", "Em diagnóstico", "Em execução", "Aguardando peça", "Enviada ao fornecedor"].includes(status)) {
        await client.query(
          "update assets set status = 'Em manutenção' where id = $1 and status not in ('Baixado','Descartado','Vendido','Doado')",
          [assetId]
        );
      }
      // Ao concluir, devolve ativo para disponível
      if (status === "Concluída") {
        const destino = str(formData.get("asset_status_after")) ?? "Disponível";
        await client.query(
          "update assets set status = $2 where id = $1 and status = 'Em manutenção'",
          [assetId, destino]
        );
      }
    });

    // Alerta de custo acumulado > limite do valor de aquisição
    if (status === "Concluída") {
      const acc = await queryOne<{ total: string }>(
        "select coalesce(sum(total_cost),0) as total from maintenances where asset_id = $1 and status = 'Concluída'",
        [assetId]
      );
      const asset = await queryOne<{ acquisition_value: string | null; name: string }>(
        "select acquisition_value, name from assets where id = $1",
        [assetId]
      );
      const acqValue = Number(asset?.acquisition_value ?? 0);
      const accumulated = Number(acc?.total ?? 0);
      if (acqValue > 0 && accumulated > acqValue * COST_ALERT_THRESHOLD) {
        await notifyItTeam(user.tenant_id!, {
          type: "asset.maintenance_cost_high",
          title: "Custo de manutenção elevado",
          message: `O ativo "${asset?.name}" acumulou ${(
            (accumulated / acqValue) * 100
          ).toFixed(0)}% do valor de aquisição em manutenções.`,
          entityType: "asset",
          entityId: assetId,
          severity: "warning",
        });
      }
    }

    revalidatePath("/manutencoes");
    revalidatePath(`/ativos/${assetId}`);
    if (maintenanceId) revalidatePath(`/manutencoes/${maintenanceId}`);
    return { id: maintenanceId ?? undefined };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: "Erro ao salvar manutenção: " + msg };
  }
}
