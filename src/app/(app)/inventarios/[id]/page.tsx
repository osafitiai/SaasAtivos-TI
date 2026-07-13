import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { InventoryItemRow } from "@/components/InventoryItemRow";
import { finishInventory } from "../actions";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

async function finishAction(formData: FormData) {
  "use server";
  await finishInventory(formData);
}

export default async function InventarioDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSession();

  const inv = await queryOne<{ id: string; name: string; status: string; started_at: string; finished_at: string | null }>(
    "select * from inventories where id = $1 and tenant_id = $2",
    [id, user.tenant_id]
  );
  if (!inv) notFound();

  const items = await query(
    `select it.*, a.name as asset_name, a.asset_tag,
            l.name as expected_location_name, e.full_name as expected_employee_name
       from inventory_items it
       join assets a on a.id = it.asset_id
       left join locations l on l.id = it.expected_location_id
       left join employees e on e.id = it.expected_employee_id
      where it.inventory_id = $1
      order by a.name`,
    [id]
  );

  const total = items.length;
  const checked = items.filter((i) => i.checked_at).length;
  const divergences = items.filter((i) => i.divergence_type || i.found === false).length;
  const readOnly = inv.status === "finalizado";

  return (
    <div>
      <PageHeader
        title={inv.name}
        subtitle={`Iniciado em ${formatDateTime(inv.started_at)}`}
        actions={
          <>
            <Link href="/inventarios" className="btn-secondary">← Voltar</Link>
            {!readOnly && (
              <form action={finishAction}>
                <input type="hidden" name="id" value={inv.id} />
                <button className="btn-primary">Finalizar inventário</button>
              </form>
            )}
            {readOnly && <Badge color="green">Finalizado</Badge>}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={total} accent="blue" />
        <StatCard label="Conferidos" value={checked} accent="green" />
        <StatCard label="Pendentes" value={total - checked} accent="amber" />
        <StatCard label="Divergências" value={divergences} accent={divergences > 0 ? "red" : "gray"} />
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="table-th">Ativo</th>
              <th className="table-th">Localização esperada</th>
              <th className="table-th">Responsável esperado</th>
              <th className="table-th">Situação</th>
              {!readOnly && <th className="table-th text-right">Conferência</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((it) => (
              // @ts-expect-error item shape from query
              <InventoryItemRow key={it.id} item={it} readOnly={readOnly} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
