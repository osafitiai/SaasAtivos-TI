import { query } from "./db";
import type { FieldOption } from "@/components/CrudManager";

export async function companyOptions(tenantId: string | null): Promise<FieldOption[]> {
  const rows = await query<{ id: string; name: string }>(
    `select id, coalesce(trade_name, legal_name) as name from companies
      where tenant_id = $1 and status = 'active' order by name`,
    [tenantId]
  );
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function branchOptions(tenantId: string | null): Promise<FieldOption[]> {
  const rows = await query<{ id: string; name: string }>(
    `select id, name from branches where tenant_id = $1 and status = 'active' order by name`,
    [tenantId]
  );
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function departmentOptions(tenantId: string | null): Promise<FieldOption[]> {
  const rows = await query<{ id: string; name: string }>(
    `select id, name from departments where tenant_id = $1 and status = 'active' order by name`,
    [tenantId]
  );
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function locationOptions(tenantId: string | null): Promise<FieldOption[]> {
  const rows = await query<{ id: string; name: string; full_path: string | null }>(
    `select id, name, full_path from locations where tenant_id = $1 and status = 'active' order by coalesce(full_path, name)`,
    [tenantId]
  );
  return rows.map((r) => ({ value: r.id, label: r.full_path || r.name }));
}

export async function categoryOptions(tenantId: string | null): Promise<FieldOption[]> {
  const rows = await query<{ id: string; name: string }>(
    `select id, name from asset_categories where tenant_id = $1 and status = 'active' order by name`,
    [tenantId]
  );
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function supplierOptions(tenantId: string | null): Promise<FieldOption[]> {
  const rows = await query<{ id: string; name: string }>(
    `select id, trade_name as name from suppliers where tenant_id = $1 and status = 'active' order by name`,
    [tenantId]
  );
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function employeeOptions(
  tenantId: string | null,
  onlyActive = true
): Promise<FieldOption[]> {
  const rows = await query<{ id: string; full_name: string; status: string }>(
    `select id, full_name, status from employees where tenant_id = $1
       ${onlyActive ? "and status not in ('Desligado','Inativo')" : ""}
      order by full_name`,
    [tenantId]
  );
  return rows.map((r) => ({ value: r.id, label: r.full_name }));
}
