import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { MOVEMENT_TYPES } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { AssetMovement } from "@/lib/types";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const user = await requireSession();
  const page = Math.max(1, Number(sp.page || 1));
  const type = sp.type || "";

  const where = ["m.tenant_id = $1"];
  const params: unknown[] = [user.tenant_id];
  if (type) {
    params.push(type);
    where.push(`m.movement_type = $${params.length}`);
  }
  const whereSql = where.join(" and ");

  const totalRow = await queryOne<{ c: string }>(
    `select count(*)::int as c from asset_movements m where ${whereSql}`,
    params
  );
  const total = Number(totalRow?.c ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = await query<AssetMovement>(
    `select m.*, a.name as asset_name, fe.full_name as from_employee_name,
            te.full_name as to_employee_name, u.name as performed_by_name
       from asset_movements m
       join assets a on a.id = m.asset_id
       left join employees fe on fe.id = m.from_employee_id
       left join employees te on te.id = m.to_employee_id
       left join users u on u.id = m.performed_by_user_id
      where ${whereSql}
      order by m.occurred_at desc
      limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
    params
  );

  return (
    <div>
      <PageHeader title="Movimentações" subtitle={`Histórico de ${total} movimentação(ões)`} />

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" method="get">
        <div>
          <label className="label">Tipo</label>
          <select name="type" defaultValue={type} className="input">
            <option value="">Todos</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon="🔄" title="Nenhuma movimentação" description="As entregas, devoluções e transferências aparecerão aqui." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="table-th">Data/Hora</th>
                <th className="table-th">Ativo</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">De → Para</th>
                <th className="table-th">Status</th>
                <th className="table-th">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="table-td whitespace-nowrap text-xs">{formatDateTime(m.occurred_at)}</td>
                  <td className="table-td">
                    <Link href={`/ativos/${m.asset_id}`} className="text-brand-600 hover:underline">
                      {m.asset_name}
                    </Link>
                  </td>
                  <td className="table-td"><Badge color="blue">{m.movement_type}</Badge></td>
                  <td className="table-td text-xs">
                    {m.from_employee_name || "TI"} → {m.to_employee_name || "TI"}
                  </td>
                  <td className="table-td text-xs">
                    {m.from_status !== m.to_status ? `${m.from_status} → ${m.to_status}` : m.to_status}
                  </td>
                  <td className="table-td text-xs">{m.performed_by_name || "sistema"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          {page > 1 && <Link href={`/movimentacoes?type=${type}&page=${page - 1}`} className="btn-secondary">← Anterior</Link>}
          {page < pages && <Link href={`/movimentacoes?type=${type}&page=${page + 1}`} className="btn-secondary">Próxima →</Link>}
        </div>
      )}
    </div>
  );
}
