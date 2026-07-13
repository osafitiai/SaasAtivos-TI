import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { canSeeFinancials, can } from "@/lib/rbac";
import { supplierOptions } from "@/lib/options";
import { PageHeader } from "@/components/PageHeader";
import { MaintenanceStatusBadge } from "@/components/Badge";
import { MaintenanceModal } from "@/components/MaintenanceModal";
import { DocumentsPanel, type Doc } from "@/components/DocumentsPanel";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import type { Maintenance } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManutencaoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSession();
  const showMoney = canSeeFinancials(user);
  const canEdit = can(user, "maintenance.edit");

  const m = await queryOne<Maintenance & { asset_name: string; asset_tag: string | null }>(
    `select mt.*, a.name as asset_name, a.asset_tag, s.trade_name as supplier_name
       from maintenances mt
       join assets a on a.id = mt.asset_id
       left join suppliers s on s.id = mt.supplier_id
      where mt.id = $1 and mt.tenant_id = $2`,
    [id, user.tenant_id]
  );
  if (!m) notFound();

  const [suppliers, docs] = await Promise.all([
    supplierOptions(user.tenant_id),
    query<Doc>(
      `select d.*, u.name as uploaded_by_name from documents d
         left join users u on u.id = d.uploaded_by_user_id
        where d.entity_type = 'maintenance' and d.entity_id = $1 and d.deleted_at is null
        order by d.created_at desc`,
      [id]
    ),
  ]);

  return (
    <div>
      <PageHeader
        title={`Manutenção ${m.protocol || m.id.slice(0, 8)}`}
        subtitle={m.type}
        actions={
          <>
            <Link href="/manutencoes" className="btn-secondary">← Voltar</Link>
            {canEdit && <MaintenanceModal suppliers={suppliers} maintenance={m} fixedAssetId={m.asset_id} trigger="✏️ Editar" triggerClass="btn-secondary" />}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Info label="Ativo" value={<Link href={`/ativos/${m.asset_id}`} className="text-brand-600 hover:underline">{m.asset_name}</Link>} />
            <Info label="Status" value={<MaintenanceStatusBadge status={m.status} />} />
            <Info label="Tipo" value={m.type} />
            <Info label="Fornecedor" value={m.supplier_name || "Interno"} />
            <Info label="Abertura" value={formatDateTime(m.opened_at)} />
            <Info label="Data prevista" value={formatDate(m.expected_at)} />
            <Info label="Conclusão" value={m.completed_at ? formatDateTime(m.completed_at) : "—"} />
            <Info label="Problema" value={m.problem_description} span />
            <Info label="Diagnóstico" value={m.diagnosis} span />
            <Info label="Solução" value={m.solution} span />
          </dl>
        </div>
        {showMoney && (
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Custos</h3>
            <dl className="space-y-2 text-sm">
              <Info label="Peças" value={formatBRL(m.parts_cost)} />
              <Info label="Serviço" value={formatBRL(m.service_cost)} />
              <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                <dt className="font-semibold text-slate-600 dark:text-slate-300">Total</dt>
                <dd className="font-bold text-slate-800 dark:text-slate-100">{formatBRL(m.total_cost)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Documentos</h3>
        <DocumentsPanel entityType="maintenance" entityId={m.id} documents={docs} canEdit={canEdit} />
      </div>
    </div>
  );
}

function Info({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">{value || "—"}</dd>
    </div>
  );
}
