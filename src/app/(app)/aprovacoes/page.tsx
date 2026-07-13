import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { WriteOffModal } from "@/components/WriteOffModal";
import { formatBRL, formatDateTime } from "@/lib/format";
import { decideWriteOff } from "./actions";

export const dynamic = "force-dynamic";

async function decideAction(formData: FormData) {
  "use server";
  await decideWriteOff(formData);
}

const STATUS_COLOR: Record<string, string> = {
  solicitada: "amber",
  aprovada: "green",
  rejeitada: "red",
};

export default async function AprovacoesPage() {
  const user = await requireSession();
  const canApprove = can(user, "writeoff.approve");
  const canRequest = can(user, "writeoff.request");

  const rows = await query<{
    id: string;
    asset_id: string;
    asset_name: string;
    reason: string;
    status: string;
    destination: string | null;
    residual_value: string | null;
    requested_by_name: string | null;
    requested_at: string;
  }>(
    `select w.*, a.name as asset_name, u.name as requested_by_name
       from asset_write_offs w
       join assets a on a.id = w.asset_id
       left join users u on u.id = w.requested_by_user_id
      where w.tenant_id = $1 order by w.requested_at desc limit 200`,
    [user.tenant_id]
  );

  const assets = await query<{ id: string; name: string; asset_tag: string | null }>(
    `select id, name, asset_tag from assets
      where tenant_id = $1 and deleted_at is null
        and status not in ('Baixado','Descartado','Vendido','Doado')
      order by name`,
    [user.tenant_id]
  );
  const assetOptions = assets.map((a) => ({
    value: a.id,
    label: a.asset_tag ? `${a.name} (${a.asset_tag})` : a.name,
  }));

  return (
    <div>
      <PageHeader
        title="Aprovações"
        subtitle="Solicitações de baixa patrimonial"
        actions={canRequest && <WriteOffModal assets={assetOptions} />}
      />

      {rows.length === 0 ? (
        <EmptyState icon="✅" title="Nenhuma solicitação" description="Solicitações de baixa aparecerão aqui para avaliação." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="table-th">Ativo</th>
                <th className="table-th">Motivo</th>
                <th className="table-th">Destino</th>
                <th className="table-th">Valor residual</th>
                <th className="table-th">Solicitante</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((w) => (
                <tr key={w.id}>
                  <td className="table-td">
                    <Link href={`/ativos/${w.asset_id}`} className="text-brand-600 hover:underline">{w.asset_name}</Link>
                  </td>
                  <td className="table-td">{w.reason}</td>
                  <td className="table-td">{w.destination || "—"}</td>
                  <td className="table-td">{formatBRL(w.residual_value)}</td>
                  <td className="table-td text-xs">
                    {w.requested_by_name}<br />
                    <span className="text-slate-400">{formatDateTime(w.requested_at)}</span>
                  </td>
                  <td className="table-td"><Badge color={STATUS_COLOR[w.status] ?? "gray"}>{w.status}</Badge></td>
                  <td className="table-td text-right">
                    {canApprove && w.status === "solicitada" ? (
                      <div className="flex justify-end gap-1">
                        <form action={decideAction}>
                          <input type="hidden" name="id" value={w.id} />
                          <input type="hidden" name="decision" value="aprovada" />
                          <button className="btn-ghost px-2 py-1 text-xs text-green-600">Aprovar</button>
                        </form>
                        <form action={decideAction}>
                          <input type="hidden" name="id" value={w.id} />
                          <input type="hidden" name="decision" value="rejeitada" />
                          <button className="btn-ghost px-2 py-1 text-xs text-red-600">Rejeitar</button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
