import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { canSeeFinancials } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { formatDate } from "@/lib/format";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "";
  const category = url.searchParams.get("category") || "";

  const where: string[] = ["a.tenant_id = $1", "a.deleted_at is null"];
  const params: unknown[] = [user.tenant_id];
  if (q) {
    params.push(`%${q}%`);
    const i = params.length;
    where.push(`(a.name ilike $${i} or a.serial_number ilike $${i} or a.asset_tag ilike $${i} or e.full_name ilike $${i})`);
  }
  if (status) {
    params.push(status);
    where.push(`a.status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    where.push(`a.category_id = $${params.length}`);
  }

  const rows = await query<Record<string, unknown>>(
    `select a.name, c.name as categoria, a.asset_tag as patrimonio, a.serial_number as serie,
            a.brand as marca, a.model as modelo, e.full_name as responsavel,
            l.name as localizacao, d.name as departamento, a.status,
            a.acquisition_date, a.acquisition_value, a.useful_life_years, a.replacement_date,
            a.physical_condition
       from assets a
       left join asset_categories c on c.id = a.category_id
       left join employees e on e.id = a.current_employee_id
       left join locations l on l.id = a.location_id
       left join departments d on d.id = a.department_id
      where ${where.join(" and ")}
      order by a.name`,
    params
  );

  const showMoney = canSeeFinancials(user);
  const data = rows.map((r) => ({
    Nome: r.name,
    Categoria: r.categoria,
    Patrimônio: r.patrimonio,
    "Nº Série": r.serie,
    Marca: r.marca,
    Modelo: r.modelo,
    Responsável: r.responsavel,
    Localização: r.localizacao,
    Departamento: r.departamento,
    Status: r.status,
    "Data Aquisição": formatDate(r.acquisition_date as string),
    ...(showMoney ? { "Valor Aquisição": r.acquisition_value } : {}),
    "Vida Útil (anos)": r.useful_life_years,
    "Prev. Substituição": formatDate(r.replacement_date as string),
    Condição: r.physical_condition,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ativos");
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  await recordAudit({ user, action: "export", entityType: "asset", newValues: { count: rows.length } });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ativos-osafi.xlsx"`,
    },
  });
}
