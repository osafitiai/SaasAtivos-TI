"use server";

import { revalidatePath } from "next/cache";
import { queryOne, transaction } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { WRITTEN_OFF_STATUSES } from "@/lib/constants";

interface AssetState {
  id: string;
  status: string;
  current_employee_id: string | null;
  location_id: string | null;
  department_id: string | null;
}

// Movimentos que entregam/vinculam o ativo a um colaborador
const ASSIGN_TYPES = new Set([
  "Entrega",
  "Empréstimo",
  "Transferência entre colaboradores",
  "Envio para home office",
  "Reserva",
]);
// Movimentos que devolvem/liberam o ativo
const RELEASE_TYPES = new Set(["Devolução", "Retorno para a TI"]);

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function createMovement(formData: FormData): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };

  const assetId = str(formData.get("asset_id"));
  const type = str(formData.get("movement_type"));
  if (!assetId || !type) return { error: "Ativo e tipo de movimentação são obrigatórios." };

  const toEmployeeId = str(formData.get("to_employee_id"));
  const toLocationId = str(formData.get("to_location_id"));
  const toDepartmentId = str(formData.get("to_department_id"));
  const toStatusInput = str(formData.get("to_status"));
  const reason = str(formData.get("reason"));
  const expectedReturn = str(formData.get("expected_return_at"));
  const condition = str(formData.get("condition"));

  const asset = await queryOne<AssetState>(
    `select id, status, current_employee_id, location_id, department_id
       from assets where id = $1 and tenant_id = $2 and deleted_at is null`,
    [assetId, user.tenant_id]
  );
  if (!asset) return { error: "Ativo não encontrado." };

  // Regra: não permitir entrega/envio de ativo baixado (salvo ajuste de inventário)
  const isWrittenOff = WRITTEN_OFF_STATUSES.includes(asset.status);
  if (
    isWrittenOff &&
    (ASSIGN_TYPES.has(type) || type === "Envio para manutenção")
  ) {
    return { error: "Ativo baixado não pode ser entregue ou enviado para manutenção." };
  }

  // Regra: colaborador desligado não pode receber ativo
  if (ASSIGN_TYPES.has(type) && toEmployeeId) {
    const emp = await queryOne<{ status: string; full_name: string }>(
      "select status, full_name from employees where id = $1 and tenant_id = $2",
      [toEmployeeId, user.tenant_id]
    );
    if (!emp) return { error: "Colaborador destino não encontrado." };
    if (["Desligado", "Inativo"].includes(emp.status)) {
      return { error: `Colaborador ${emp.full_name} está ${emp.status.toLowerCase()} e não pode receber ativos.` };
    }
  }

  // Define novo status conforme o tipo de movimentação
  let newStatus = toStatusInput ?? asset.status;
  if (!toStatusInput) {
    if (type === "Entrega" || type === "Transferência entre colaboradores" || type === "Envio para home office")
      newStatus = "Em uso";
    else if (type === "Empréstimo") newStatus = "Emprestado";
    else if (type === "Reserva") newStatus = "Reservado";
    else if (type === "Devolução" || type === "Retorno para a TI") newStatus = "Em estoque com a TI";
    else if (type === "Envio para manutenção") newStatus = "Em manutenção";
    else if (type === "Retorno da manutenção") newStatus = "Disponível";
    else if (type === "Baixa") newStatus = "Baixado";
    else if (type === "Descarte") newStatus = "Descartado";
    else if (type === "Venda") newStatus = "Vendido";
    else if (type === "Doação") newStatus = "Doado";
    else if (type === "Em trânsito" || type === "Transferência entre filiais") newStatus = "Em trânsito";
  }

  const newEmployeeId = ASSIGN_TYPES.has(type)
    ? toEmployeeId
    : RELEASE_TYPES.has(type)
      ? null
      : asset.current_employee_id;

  const newLocationId = toLocationId ?? asset.location_id;
  const newDepartmentId = toDepartmentId ?? asset.department_id;

  try {
    await transaction(async (client) => {
      // 1. Registra movimentação (histórico imutável)
      await client.query(
        `insert into asset_movements
          (tenant_id, asset_id, movement_type, from_employee_id, to_employee_id,
           from_location_id, to_location_id, from_department_id, to_department_id,
           from_status, to_status, performed_by_user_id, reason, occurred_at, metadata)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now(), $14)`,
        [
          user.tenant_id, assetId, type,
          asset.current_employee_id, newEmployeeId,
          asset.location_id, newLocationId,
          asset.department_id, newDepartmentId,
          asset.status, newStatus,
          user.id, reason,
          JSON.stringify({ expected_return_at: expectedReturn, condition }),
        ]
      );

      // 2. Encerra atribuição aberta anterior, se houver
      if (ASSIGN_TYPES.has(type) || RELEASE_TYPES.has(type) || newEmployeeId !== asset.current_employee_id) {
        await client.query(
          `update asset_assignments set ended_at = now(), returned_to_user_id = $2,
                  condition_at_return = coalesce($3, condition_at_return)
             where asset_id = $1 and ended_at is null`,
          [assetId, user.id, condition]
        );
      }

      // 3. Abre nova atribuição quando vincula a colaborador
      if (ASSIGN_TYPES.has(type) && newEmployeeId) {
        await client.query(
          `insert into asset_assignments
             (tenant_id, asset_id, employee_id, location_id, assignment_type,
              started_at, expected_return_at, delivered_by_user_id, condition_at_delivery, notes)
           values ($1,$2,$3,$4,$5, now(), $6, $7, $8, $9)`,
          [
            user.tenant_id, assetId, newEmployeeId, newLocationId, type,
            expectedReturn, user.id, condition, reason,
          ]
        );
      }

      // 4. Atualiza o cadastro do ativo (estado corrente)
      await client.query(
        `update assets set status = $2, current_employee_id = $3, location_id = $4, department_id = $5
           where id = $1`,
        [assetId, newStatus, newEmployeeId, newLocationId, newDepartmentId]
      );

      await recordAudit({
        user,
        action: "move",
        entityType: "asset",
        entityId: assetId,
        oldValues: { status: asset.status, employee: asset.current_employee_id },
        newValues: { type, status: newStatus, employee: newEmployeeId },
        client,
      });
    });

    // Notifica o usuário do colaborador que recebeu, se houver
    if (ASSIGN_TYPES.has(type) && newEmployeeId) {
      const linkedUser = await queryOne<{ user_id: string }>(
        "select user_id from employees where id = $1 and user_id is not null",
        [newEmployeeId]
      );
      if (linkedUser?.user_id) {
        await notifyUser({
          tenantId: user.tenant_id!,
          userId: linkedUser.user_id,
          type: "asset.assigned",
          title: "Novo ativo atribuído",
          message: `Um ativo foi ${type.toLowerCase()} para você.`,
          entityType: "asset",
          entityId: assetId,
        });
      }
    }

    revalidatePath("/movimentacoes");
    revalidatePath(`/ativos/${assetId}`);
    revalidatePath("/ativos");
    return {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("uq_assignment_open_per_asset"))
      return { error: "O ativo já possui uma atribuição principal aberta." };
    return { error: "Erro ao registrar movimentação: " + msg };
  }
}
