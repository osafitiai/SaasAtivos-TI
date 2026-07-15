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
  if (tenantId) {
    // Limpeza de categorias sujas criadas por importações anteriores incorretas (nomes de colaboradores)
    await query(
      `delete from asset_categories 
        where tenant_id = $1 
          and lower(name) in (select lower(full_name) from employees where tenant_id = $1)
          and lower(name) not in ('notebook', 'monitor', 'kit teclado e mouse', 'headset')`,
      [tenantId]
    );

    const required = ["Notebook", "Monitor", "Kit teclado e mouse", "Headset"];
    for (const name of required) {
      const ex = await query<{ id: string }>(
        "select id from asset_categories where tenant_id = $1 and lower(name) = lower($2) limit 1",
        [tenantId, name]
      );
      if (ex.length === 0) {
        let icon = "📦";
        if (name === "Notebook") icon = "💻";
        else if (name === "Monitor") icon = "🖥️";
        else if (name === "Kit teclado e mouse") icon = "🖱️";
        else if (name === "Headset") icon = "🎧";

        await query(
          "insert into asset_categories (tenant_id, name, icon, status) values ($1, $2, $3, 'active')",
          [tenantId, name, icon]
        );
      }
    }
  }

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
