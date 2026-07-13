import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { canSeeFinancials, can } from "@/lib/rbac";
import { supplierOptions } from "@/lib/options";
import { MAINTENANCE_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { MaintenanceStatusBadge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { MaintenanceModal } from "@/components/MaintenanceModal";
import { formatBRL, formatDate } from "@/lib/format";
import type { Maintenance } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManutencoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const user = await requireSession();
  const showMoney = canSeeFinancials(user);
  const canEdit = can(user, "maintenance.edit");
  const status = sp.status || "";

  const where = ["m.tenant_id = $1"];
  const params: unknown[] = [user.tenant_id];
  if (status) {
    params.push(status);
    where.push(`m.status = $${params.length}`);
  }

  const rows = await query<Maintenance>(
    `select m.*, a.name as asset_name, a.asset_tag, s.trade_name as supplier_name
       from maintenances m
       join assets a on a.id = m.asset_id
       left join suppliers s on s.id = m.supplier_id
      where ${where.join(" and ")}
      order by m.opened_at desc limit 200`,
    params
  );

  const stats = await queryOne<Record<string, string>>(
    `select count(*) filter (where status not in ('Concluída','Cancelada','Sem reparo'))::int as abertas,
            count(*) filter (where status = 'Concluída')::int as concluidas,
            coalesce(sum(total_cost) filter (where status = 'Concluída'),0) as custo_total
       from maintenances where tenant_id = $1`,
    [user.tenant_id]
  );

  const [assets, suppliers] = await Promise.all([
    query<{ id: string; name: string; asset_tag: string | null }>(
      "select id, name, asset_tag from assets where tenant_id = $1 and deleted_at is null order by name",
      [user.tenant_id]
    ),
    supplierOptions(user.tenant_id),
  ]);
  const assetOptions = assets.map((a) => ({
    value: a.id,
    label: a.asset_tag ? `${a.name} (${a.asset_tag})` : a.name,
  }));

  return (
    <div>
      <PageHeader
        title="Manutenções"
        subtitle="Ordens de serviço, custos e SLA"
        actions={canEdit && <MaintenanceModal assets={assetOptions} suppliers={suppliers} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Abertas" value={stats?.abertas ?? "0"} accent="amber" />
        <StatCard label="Concluídas" value={stats?.concluidas ?? "0"} accent="green" />
        {showMoney && <StatCard label="Custo total (concluídas)" value={formatBRL(stats?.custo_total)} accent="violet" />}
      </div>

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" method="get">
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={status} className="input">
            <option value="">Todos</option>
            {MAINTENANCE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon="🔧" title="Nenhuma manutenção" description="Abra uma ordem de manutenção para um ativo." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="table-th">Protocolo</th>
                <th className="table-th">Ativo</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Abertura</th>
                <th className="table-th">Fornecedor</th>
                <th className="table-th">Status</th>
                {showMoney && <th className="table-th">Custo total</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="table-td">
                    <Link href={`/manutencoes/${m.id}`} className="font-medium text-brand-600 hover:underline">
                      {m.protocol || m.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="table-td">
                    <Link href={`/ativos/${m.asset_id}`} className="hover:underline">{m.asset_name}</Link>
                  </td>
                  <td className="table-td">{m.type}</td>
                  <td className="table-td">{formatDate(m.opened_at)}</td>
                  <td className="table-td">{m.supplier_name || "Interno"}</td>
                  <td className="table-td"><MaintenanceStatusBadge status={m.status} /></td>
                  {showMoney && <td className="table-td">{formatBRL(m.total_cost)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
