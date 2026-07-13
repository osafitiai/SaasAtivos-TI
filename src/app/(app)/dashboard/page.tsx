import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { canSeeFinancials } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { BarChartCard, PieChartCard, LineChartCard } from "@/components/Charts";
import { formatBRL, formatNumber } from "@/lib/format";
import { WRITTEN_OFF_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const REPL_EXPR = `coalesce(a.replacement_date,
  case when a.acquisition_date is not null and a.useful_life_years is not null
       then (a.acquisition_date + (a.useful_life_years || ' years')::interval)::date end)`;

export default async function DashboardPage() {
  const user = await requireSession();
  const t = user.tenant_id;
  const showMoney = canSeeFinancials(user);

  const notWrittenOff = `a.status not in (${WRITTEN_OFF_STATUSES.map((_, i) => `$${i + 2}`).join(",")})`;
  const woParams = WRITTEN_OFF_STATUSES;

  // Indicadores principais
  const kpi = await queryOne<Record<string, string>>(
    `select
       count(*)::int as total,
       count(*) filter (where status = 'Em uso')::int as em_uso,
       count(*) filter (where status = 'Disponível')::int as disponiveis,
       count(*) filter (where status = 'Em estoque com a TI')::int as estoque,
       count(*) filter (where status = 'Emprestado')::int as emprestados,
       count(*) filter (where status in ('Em manutenção','Aguardando manutenção'))::int as manutencao,
       count(*) filter (where status = any($2::text[]))::int as baixados,
       count(*) filter (where current_employee_id is null and status in ('Em uso','Emprestado'))::int as sem_responsavel,
       count(*) filter (where location_id is null)::int as sem_localizacao,
       coalesce(sum(acquisition_value),0) as valor_total
     from assets a where tenant_id = $1 and deleted_at is null`,
    [t, WRITTEN_OFF_STATUSES]
  );

  const maintCost = await queryOne<{ total: string }>(
    `select coalesce(sum(total_cost),0) as total from maintenances
      where tenant_id = $1 and status = 'Concluída'`,
    [t]
  );

  const repl = await queryOne<Record<string, string>>(
    `select
       count(*) filter (where ${REPL_EXPR} < current_date)::int as vencida,
       count(*) filter (where ${REPL_EXPR} >= current_date and ${REPL_EXPR} <= current_date + 90)::int as d90,
       count(*) filter (where ${REPL_EXPR} > current_date + 90 and ${REPL_EXPR} <= current_date + 180)::int as d180
     from assets a where tenant_id = $1 and deleted_at is null and ${notWrittenOff}`,
    [t, ...woParams]
  );

  const warranty = await queryOne<{ c: string }>(
    `select count(*)::int as c from assets a
      where tenant_id = $1 and deleted_at is null and warranty_end_date is not null
        and warranty_end_date >= current_date and warranty_end_date <= current_date + 90`,
    [t]
  );

  const pendingReturns = await queryOne<{ c: string }>(
    `select count(distinct employee_id)::int as c from asset_assignments
      where tenant_id = $1 and ended_at is null and expected_return_at is not null
        and expected_return_at < now() and employee_id is not null`,
    [t]
  );

  const licExpiring = await queryOne<{ c: string }>(
    `select count(*)::int as c from software_licenses
      where tenant_id = $1 and expires_at is not null
        and expires_at >= current_date and expires_at <= current_date + 90`,
    [t]
  );

  // Gráficos
  const byCategory = await query<{ name: string; value: number; valor: string }>(
    `select c.name, count(a.id)::int as value, coalesce(sum(a.acquisition_value),0) as valor
       from asset_categories c
       left join assets a on a.category_id = c.id and a.deleted_at is null
      where c.tenant_id = $1
      group by c.name order by value desc`,
    [t]
  );

  const byStatus = await query<{ name: string; value: number }>(
    `select status as name, count(*)::int as value from assets
      where tenant_id = $1 and deleted_at is null group by status order by value desc`,
    [t]
  );

  const byDepartment = await query<{ name: string; value: number }>(
    `select coalesce(d.name,'Sem departamento') as name, count(a.id)::int as value
       from assets a left join departments d on d.id = a.department_id
      where a.tenant_id = $1 and a.deleted_at is null
      group by d.name order by value desc limit 10`,
    [t]
  );

  const byCondition = await query<{ name: string; value: number }>(
    `select coalesce(physical_condition,'Não informado') as name, count(*)::int as value
       from assets where tenant_id = $1 and deleted_at is null
      group by physical_condition order by value desc`,
    [t]
  );

  const acquisitions = await query<{ name: string; value: number }>(
    `select to_char(date_trunc('month', acquisition_date),'MM/YYYY') as name, count(*)::int as value
       from assets where tenant_id = $1 and deleted_at is null and acquisition_date is not null
        and acquisition_date >= current_date - interval '12 months'
      group by date_trunc('month', acquisition_date)
      order by date_trunc('month', acquisition_date)`,
    [t]
  );

  const k = kpi ?? {};

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão executiva dos ativos, custos e alertas"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Total de ativos" value={formatNumber(k.total)} accent="blue" href="/ativos" />
        <StatCard label="Em uso" value={formatNumber(k.em_uso)} accent="blue" href="/ativos?status=Em+uso" />
        <StatCard label="Disponíveis" value={formatNumber(k.disponiveis)} accent="green" href="/ativos?status=Dispon%C3%ADvel" />
        <StatCard label="Estoque da TI" value={formatNumber(k.estoque)} accent="cyan" />
        <StatCard label="Emprestados" value={formatNumber(k.emprestados)} accent="violet" />
        <StatCard label="Em manutenção" value={formatNumber(k.manutencao)} accent="amber" href="/manutencoes" />
        <StatCard label="Baixados" value={formatNumber(k.baixados)} accent="gray" />
        <StatCard label="Sem responsável" value={formatNumber(k.sem_responsavel)} accent="red" />
        <StatCard label="Sem localização" value={formatNumber(k.sem_localizacao)} accent="red" />
        {showMoney && (
          <StatCard label="Valor patrimonial" value={formatBRL(k.valor_total)} accent="green" />
        )}
        {showMoney && (
          <StatCard label="Custo de manutenção" value={formatBRL(maintCost?.total)} accent="amber" />
        )}
      </div>

      {/* Alertas */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Alertas
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <AlertCard label="Substituição vencida" value={repl?.vencida ?? "0"} color="red" href="/ativos?repl=vencido" />
          <AlertCard label="Substituição ≤ 90 dias" value={repl?.d90 ?? "0"} color="amber" href="/ativos?repl=urgente" />
          <AlertCard label="Substituição ≤ 180 dias" value={repl?.d180 ?? "0"} color="blue" />
          <AlertCard label="Garantia vencendo" value={warranty?.c ?? "0"} color="amber" />
          <AlertCard label="Devoluções pendentes" value={pendingReturns?.c ?? "0"} color="red" />
          <AlertCard label="Licenças vencendo" value={licExpiring?.c ?? "0"} color="amber" href="/licencas" />
        </div>
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartBox title="Ativos por categoria">
          <BarChartCard data={byCategory.map((r) => ({ name: r.name, value: r.value }))} />
        </ChartBox>
        <ChartBox title="Ativos por status">
          <PieChartCard data={byStatus} />
        </ChartBox>
        <ChartBox title="Ativos por departamento">
          <BarChartCard data={byDepartment} color="#059669" />
        </ChartBox>
        <ChartBox title="Condição física dos ativos">
          <PieChartCard data={byCondition} />
        </ChartBox>
        {showMoney && (
          <ChartBox title="Valor patrimonial por categoria">
            <BarChartCard
              data={byCategory.map((r) => ({ name: r.name, value: Number(r.valor) }))}
              color="#7c3aed"
            />
          </ChartBox>
        )}
        <ChartBox title="Evolução de aquisições (12 meses)">
          <LineChartCard data={acquisitions} />
        </ChartBox>
      </div>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {children}
    </div>
  );
}

function AlertCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: string | number;
  color: string;
  href?: string;
}) {
  const colors: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900",
  };
  const inner = (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{formatNumber(value)}</div>
      <div className="mt-0.5 text-xs font-medium">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
