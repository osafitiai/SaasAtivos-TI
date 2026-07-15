import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { canSeeFinancials } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { AssetStatusBadge, EmployeeStatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import type { Employee, Asset, AssetMovement } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ColaboradorDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession();
  const showMoney = canSeeFinancials(user);

  const emp = await queryOne<Employee>(
    `select e.*, d.name as department_name, coalesce(c.trade_name,c.legal_name) as company_name
       from employees e
       left join departments d on d.id = e.department_id
       left join companies c on c.id = e.company_id
      where e.id = $1 and e.tenant_id = $2`,
    [id, user.tenant_id]
  );
  if (!emp) notFound();

  const currentAssets = await query<Asset>(
    `select a.*, cat.name as category_name, cat.icon as category_icon, l.name as location_name
       from assets a
       left join asset_categories cat on cat.id = a.category_id
       left join locations l on l.id = a.location_id
      where a.current_employee_id = $1 and a.deleted_at is null
      order by a.name`,
    [id]
  );

  const history = await query<AssetMovement>(
    `select m.*, a.name as asset_name,
            fe.full_name as from_employee_name, te.full_name as to_employee_name,
            u.name as performed_by_name
       from asset_movements m
       join assets a on a.id = m.asset_id
       left join employees fe on fe.id = m.from_employee_id
       left join employees te on te.id = m.to_employee_id
       left join users u on u.id = m.performed_by_user_id
      where m.from_employee_id = $1 or m.to_employee_id = $1
      order by m.occurred_at desc limit 50`,
    [id]
  );

  const pending = await query<{ id: string; asset_name: string; expected_return_at: string }>(
    `select aa.id, a.name as asset_name, aa.expected_return_at
       from asset_assignments aa join assets a on a.id = aa.asset_id
      where aa.employee_id = $1 and aa.ended_at is null
        and aa.expected_return_at is not null and aa.expected_return_at < now()`,
    [id]
  );

  const totalValue = currentAssets.reduce((s, a) => s + Number(a.acquisition_value || 0), 0);
  const isTerminated = emp.status === "Desligado";

  return (
    <div>
      <PageHeader
        title={emp.full_name}
        subtitle={`${emp.job_title || "—"} · ${emp.department_name || "Sem departamento"}`}
        actions={
          <Link href="/colaboradores" className="btn-secondary">
            ← Voltar
          </Link>
        }
      />

      {isTerminated && currentAssets.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          ⚠️ Colaborador desligado com {currentAssets.length} ativo(s) ainda vinculado(s). Providencie a devolução.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Perfil */}
        <div className="card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {emp.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">{emp.full_name}</div>
              <EmployeeStatusBadge status={emp.status} />
            </div>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="E-mail" value={emp.email} />
            <Row label="Cargo" value={emp.job_title} />
            <Row label="Empresa" value={emp.company_name} />
            <Row label="Departamento" value={emp.department_name} />
            <Row label="Centro de custo" value={emp.cost_center} />
            <Row label="Admissão" value={formatDate(emp.hire_date)} />
            {emp.termination_date && <Row label="Desligamento" value={formatDate(emp.termination_date)} />}
          </dl>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Ativos vinculados" value={currentAssets.length} accent="blue" />
            {showMoney && (
              <StatCard label="Total patrimonial" value={formatBRL(totalValue)} accent="green" />
            )}
            <StatCard
              label="Devoluções pendentes"
              value={pending.length}
              accent={pending.length > 0 ? "red" : "gray"}
            />
          </div>

          {/* Ativos atuais */}
          <div className="card">
            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Equipamentos vinculados
              </h3>
            </div>
            {currentAssets.length === 0 ? (
              <div className="p-4">
                <EmptyState icon="✅" title="Nenhum ativo vinculado" description="Este colaborador não possui equipamentos sob responsabilidade." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="table-th">Ativo</th>
                      <th className="table-th">Categoria</th>
                      <th className="table-th">Patrimônio</th>
                      <th className="table-th">Localização</th>
                      <th className="table-th">Status</th>
                      {showMoney && <th className="table-th">Valor</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentAssets.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="table-td">
                          <Link href={`/ativos/${a.id}`} className="font-medium text-brand-600 hover:underline">
                            {a.category_icon} {a.name}
                          </Link>
                        </td>
                        <td className="table-td">{a.category_name}</td>
                        <td className="table-td">{a.asset_tag || a.serial_number || "—"}</td>
                        <td className="table-td">{a.location_name || "—"}</td>
                        <td className="table-td"><AssetStatusBadge status={a.status} /></td>
                        {showMoney && <td className="table-td">{formatBRL(a.acquisition_value)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Histórico */}
          <div className="card">
            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Histórico de movimentações
              </h3>
            </div>
            {history.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">Sem movimentações registradas.</div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((m) => (
                  <li key={m.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-0.5 text-lg">🔄</span>
                    <div className="flex-1">
                      <div className="text-sm text-slate-700 dark:text-slate-200">
                        <span className="font-medium">{m.movement_type}</span> —{" "}
                        <Link href={`/ativos/${m.asset_id}`} className="text-brand-600 hover:underline">
                          {m.asset_name}
                        </Link>
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(m.occurred_at)} · por {m.performed_by_name || "sistema"}
                        {m.reason ? ` · ${m.reason}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700 dark:text-slate-200">{value || "—"}</dd>
    </div>
  );
}
