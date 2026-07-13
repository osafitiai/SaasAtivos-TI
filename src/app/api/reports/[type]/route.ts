import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { canSeeFinancials } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

interface ReportDef {
  title: string;
  sql: string;
  financial?: boolean;
}

const REPL_EXPR = `coalesce(a.replacement_date, case when a.acquisition_date is not null and a.useful_life_years is not null then (a.acquisition_date + (a.useful_life_years||' years')::interval)::date end)`;

const REPORTS: Record<string, ReportDef> = {
  inventario_geral: {
    title: "Inventário Geral",
    sql: `select a.name as "Ativo", c.name as "Categoria", a.asset_tag as "Patrimônio", a.serial_number as "Série",
                 e.full_name as "Responsável", l.name as "Localização", a.status as "Status"
            from assets a left join asset_categories c on c.id=a.category_id
            left join employees e on e.id=a.current_employee_id left join locations l on l.id=a.location_id
           where a.tenant_id=$1 and a.deleted_at is null order by a.name`,
  },
  ativos_por_colaborador: {
    title: "Ativos por Colaborador",
    sql: `select e.full_name as "Colaborador", d.name as "Departamento", a.name as "Ativo", a.asset_tag as "Patrimônio", a.status as "Status"
            from assets a join employees e on e.id=a.current_employee_id
            left join departments d on d.id=e.department_id
           where a.tenant_id=$1 and a.deleted_at is null order by e.full_name, a.name`,
  },
  ativos_por_departamento: {
    title: "Ativos por Departamento",
    sql: `select coalesce(d.name,'Sem departamento') as "Departamento", count(*) as "Qtd Ativos", coalesce(sum(a.acquisition_value),0) as "Valor Total"
            from assets a left join departments d on d.id=a.department_id
           where a.tenant_id=$1 and a.deleted_at is null group by d.name order by 2 desc`,
    financial: true,
  },
  ativos_sem_responsavel: {
    title: "Ativos sem Responsável",
    sql: `select a.name as "Ativo", c.name as "Categoria", a.asset_tag as "Patrimônio", a.status as "Status", l.name as "Localização"
            from assets a left join asset_categories c on c.id=a.category_id left join locations l on l.id=a.location_id
           where a.tenant_id=$1 and a.deleted_at is null and a.current_employee_id is null
             and a.status in ('Em uso','Emprestado') order by a.name`,
  },
  ativos_disponiveis: {
    title: "Ativos Disponíveis",
    sql: `select a.name as "Ativo", c.name as "Categoria", a.asset_tag as "Patrimônio", a.physical_condition as "Condição"
            from assets a left join asset_categories c on c.id=a.category_id
           where a.tenant_id=$1 and a.deleted_at is null and a.status in ('Disponível','Em estoque com a TI') order by a.name`,
  },
  manutencao: {
    title: "Histórico de Manutenção",
    sql: `select a.name as "Ativo", m.type as "Tipo", m.status as "Status", m.opened_at as "Abertura",
                 s.trade_name as "Fornecedor", m.total_cost as "Custo"
            from maintenances m join assets a on a.id=m.asset_id left join suppliers s on s.id=m.supplier_id
           where m.tenant_id=$1 order by m.opened_at desc`,
    financial: true,
  },
  custos_manutencao_ativo: {
    title: "Custos de Manutenção por Ativo",
    sql: `select a.name as "Ativo", a.asset_tag as "Patrimônio", count(m.id) as "Qtd", coalesce(sum(m.total_cost),0) as "Custo Total"
            from assets a join maintenances m on m.asset_id=a.id and m.status='Concluída'
           where a.tenant_id=$1 group by a.id, a.name, a.asset_tag order by 4 desc`,
    financial: true,
  },
  garantias_vencer: {
    title: "Garantias a Vencer",
    sql: `select a.name as "Ativo", a.asset_tag as "Patrimônio", a.warranty_end_date as "Fim da Garantia"
            from assets a where a.tenant_id=$1 and a.deleted_at is null and a.warranty_end_date is not null
              and a.warranty_end_date >= current_date and a.warranty_end_date <= current_date + 180
           order by a.warranty_end_date`,
  },
  substituicoes_previstas: {
    title: "Substituições Previstas",
    sql: `select a.name as "Ativo", c.name as "Categoria", a.acquisition_date as "Aquisição",
                 a.useful_life_years as "Vida Útil", ${REPL_EXPR} as "Prev. Substituição"
            from assets a left join asset_categories c on c.id=a.category_id
           where a.tenant_id=$1 and a.deleted_at is null and ${REPL_EXPR} is not null
             and a.status not in ('Baixado','Descartado','Vendido','Doado')
           order by ${REPL_EXPR}`,
  },
  ativos_baixados: {
    title: "Ativos Baixados",
    sql: `select a.name as "Ativo", a.asset_tag as "Patrimônio", a.status as "Status", a.updated_at as "Data"
            from assets a where a.tenant_id=$1 and a.status in ('Baixado','Descartado','Vendido','Doado','Perdido','Furtado') order by a.updated_at desc`,
  },
  licencas: {
    title: "Licenças de Software",
    sql: `select l.name as "Licença", l.vendor as "Fabricante", l.quantity_purchased as "Adquiridas",
                 l.quantity_used as "Em uso", l.expires_at as "Expiração", l.recurring_cost as "Custo"
            from software_licenses l where l.tenant_id=$1 order by l.name`,
    financial: true,
  },
  movimentacoes: {
    title: "Histórico de Movimentações",
    sql: `select a.name as "Ativo", m.movement_type as "Tipo", m.occurred_at as "Data",
                 fe.full_name as "De", te.full_name as "Para", m.to_status as "Novo Status"
            from asset_movements m join assets a on a.id=m.asset_id
            left join employees fe on fe.id=m.from_employee_id left join employees te on te.id=m.to_employee_id
           where m.tenant_id=$1 order by m.occurred_at desc`,
  },
  patrimonio_centro_custo: {
    title: "Valor Patrimonial por Centro de Custo",
    sql: `select coalesce(d.cost_center,'Sem CC') as "Centro de Custo", count(*) as "Qtd", coalesce(sum(a.acquisition_value),0) as "Valor Total"
            from assets a left join departments d on d.id=a.department_id
           where a.tenant_id=$1 and a.deleted_at is null group by d.cost_center order by 3 desc`,
    financial: true,
  },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const def = REPORTS[type];
  if (!def) return NextResponse.json({ error: "Relatório desconhecido." }, { status: 404 });
  if (def.financial && !canSeeFinancials(user)) {
    return NextResponse.json({ error: "Sem permissão para dados financeiros." }, { status: 403 });
  }

  const format = new URL(request.url).searchParams.get("format") || "xlsx";
  const rows = await query<Record<string, unknown>>(def.sql, [user.tenant_id]);

  await recordAudit({ user, action: "export", entityType: "report", newValues: { report: type, count: rows.length } });

  if (format === "csv") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}.csv"`,
      },
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.title.slice(0, 30));
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}.xlsx"`,
    },
  });
}
