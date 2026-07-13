import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { departmentOptions, locationOptions } from "@/lib/options";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { InventoryCreateModal } from "@/components/InventoryCreateModal";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventariosPage() {
  const user = await requireSession();
  const [departments, locations] = await Promise.all([
    departmentOptions(user.tenant_id),
    locationOptions(user.tenant_id),
  ]);

  const rows = await query<{
    id: string;
    name: string;
    status: string;
    started_at: string;
    total: number;
    checked: number;
    divergences: number;
  }>(
    `select i.id, i.name, i.status, i.started_at,
            count(it.id)::int as total,
            count(it.id) filter (where it.checked_at is not null)::int as checked,
            count(it.id) filter (where it.divergence_type is not null or it.found = false)::int as divergences
       from inventories i
       left join inventory_items it on it.inventory_id = i.id
      where i.tenant_id = $1
      group by i.id order by i.started_at desc`,
    [user.tenant_id]
  );

  return (
    <div>
      <PageHeader
        title="Inventários"
        subtitle="Campanhas de conferência física"
        actions={<InventoryCreateModal departments={departments} locations={locations} />}
      />

      {rows.length === 0 ? (
        <EmptyState icon="📋" title="Nenhuma campanha" description="Crie uma campanha para conferir os ativos fisicamente." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((i) => {
            const pct = i.total > 0 ? Math.round((i.checked / i.total) * 100) : 0;
            return (
              <Link key={i.id} href={`/inventarios/${i.id}`} className="card p-5 transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{i.name}</h3>
                  <Badge color={i.status === "finalizado" ? "green" : "amber"}>{i.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">Iniciado em {formatDateTime(i.started_at)}</p>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{i.checked}/{i.total} conferidos</span>
                  {i.divergences > 0 && <span className="text-red-600">{i.divergences} divergência(s)</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
