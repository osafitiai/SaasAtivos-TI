"use server";

import { revalidatePath } from "next/cache";
import { pool, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { computeReplacementDate, classifyReplacement } from "@/lib/replacement";

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

const TECH_FIELDS = [
  "processador", "memoria_ram", "armazenamento", "tipo_armazenamento", "sistema_operacional",
  "hostname", "mac_ethernet", "mac_wifi", "ip", "imei", "numero_linha", "operadora",
  "tamanho", "resolucao", "portas", "voltagem", "potencia", "capacidade", "estado_bateria",
];

export async function saveAsset(formData: FormData): Promise<{ error?: string; id?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };

  const id = str(formData.get("id"));
  const categoryId = str(formData.get("category_id"));
  const name = str(formData.get("name"));
  if (!name) return { error: "Nome do ativo é obrigatório." };
  if (!categoryId) return { error: "Categoria é obrigatória." };

  // Herda vida útil da categoria quando não informada
  let usefulLife = num(formData.get("useful_life_years"));
  const category = await queryOne<{ default_useful_life_years: number | null }>(
    "select default_useful_life_years from asset_categories where id = $1 and tenant_id = $2",
    [categoryId, user.tenant_id]
  );
  if (usefulLife === null) usefulLife = category?.default_useful_life_years ?? null;

  const acquisitionDate = str(formData.get("acquisition_date"));
  const replacementDate = computeReplacementDate(acquisitionDate, usefulLife);
  const replacementStatus = classifyReplacement(replacementDate);

  const technical: Record<string, string> = {};
  for (const f of TECH_FIELDS) {
    const v = str(formData.get(`tech_${f}`));
    if (v) technical[f] = v;
  }

  const data: Record<string, unknown> = {
    category_id: categoryId,
    company_id: str(formData.get("company_id")),
    branch_id: str(formData.get("branch_id")),
    department_id: str(formData.get("department_id")),
    location_id: str(formData.get("location_id")),
    supplier_id: str(formData.get("supplier_id")),
    name,
    internal_code: str(formData.get("internal_code")),
    asset_tag: str(formData.get("asset_tag")),
    serial_number: str(formData.get("serial_number")),
    brand: str(formData.get("brand")),
    model: str(formData.get("model")),
    manufacturer: str(formData.get("manufacturer")),
    color: str(formData.get("color")),
    description: str(formData.get("description")),
    status: str(formData.get("status")) ?? "Disponível",
    physical_condition: str(formData.get("physical_condition")),
    acquisition_date: acquisitionDate,
    acquisition_value: num(formData.get("acquisition_value")),
    invoice_number: str(formData.get("invoice_number")),
    invoice_key: str(formData.get("invoice_key")),
    invoice_date: str(formData.get("invoice_date")),
    purchase_order: str(formData.get("purchase_order")),
    useful_life_years: usefulLife,
    replacement_date: replacementDate ? replacementDate.toISOString().slice(0, 10) : null,
    replacement_status: replacementStatus,
    warranty_start_date: str(formData.get("warranty_start_date")),
    warranty_end_date: str(formData.get("warranty_end_date")),
    technical_data: Object.keys(technical).length ? JSON.stringify(technical) : null,
    notes: str(formData.get("notes")),
  };

  try {
    if (id) {
      const before = await queryOne(
        "select * from assets where id = $1 and tenant_id = $2 and deleted_at is null",
        [id, user.tenant_id]
      );
      if (!before) return { error: "Ativo não encontrado." };
      const keys = Object.keys(data);
      const sets = keys.map((k, i) => `${k} = $${i + 3}`);
      await pool.query(
        `update assets set ${sets.join(", ")} where id = $1 and tenant_id = $2`,
        [id, user.tenant_id, ...keys.map((k) => data[k])]
      );
      await recordAudit({ user, action: "update", entityType: "asset", entityId: id, oldValues: before, newValues: data });
      revalidatePath("/ativos");
      revalidatePath(`/ativos/${id}`);
      return { id };
    } else {
      const keys = Object.keys(data);
      const cols = ["tenant_id", ...keys];
      const ph = cols.map((_, i) => `$${i + 1}`);
      const inserted = await queryOne<{ id: string }>(
        `insert into assets (${cols.join(", ")}) values (${ph.join(", ")}) returning id`,
        [user.tenant_id, ...keys.map((k) => data[k])]
      );
      await recordAudit({ user, action: "create", entityType: "asset", entityId: inserted?.id, newValues: data });
      revalidatePath("/ativos");
      return { id: inserted?.id };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("uq_assets_serial"))
      return { error: "Já existe um ativo com este número de série no tenant." };
    if (msg.includes("uq_assets_tag"))
      return { error: "Já existe um ativo com este patrimônio no tenant." };
    return { error: "Erro ao salvar: " + msg };
  }
}

export async function deleteAsset(formData: FormData): Promise<{ error?: string }> {
  return deleteAssetInternal(String(formData.get("id")));
}

/** Exclui (baixa lógica) um ativo pelo id. Usado pelo botão de exclusão na lista. */
export async function deleteAssetById(id: string): Promise<void> {
  await deleteAssetInternal(id);
}

async function deleteAssetInternal(id: string): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };
  if (!can(user, "assets.delete")) return { error: "Sem permissão para excluir ativos." };

  const before = await queryOne<{ status: string }>(
    "select * from assets where id = $1 and tenant_id = $2 and deleted_at is null",
    [id, user.tenant_id]
  );
  if (!before) return { error: "Ativo não encontrado." };

  await pool.query("update assets set deleted_at = now() where id = $1 and tenant_id = $2", [
    id,
    user.tenant_id,
  ]);
  await recordAudit({ user, action: "delete", entityType: "asset", entityId: id, oldValues: before });
  revalidatePath("/ativos");
  return {};
}

export async function updateAssetResponsible(
  assetId: string,
  employeeId: string | null,
  locationId: string | null
): Promise<{ error?: string }> {
  const user = await getSession();
  if (!user) return { error: "Não autenticado." };

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
