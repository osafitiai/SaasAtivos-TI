import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 40;

const ACTION_COLOR: Record<string, string> = {
  create: "green",
  update: "blue",
  delete: "red",
  move: "violet",
  import: "cyan",
  export: "cyan",
  login: "gray",
  write_off_approve: "amber",
  upload: "blue",
  download: "gray",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const user = await requireSession();

  if (!can(user, "audit.view")) {
    return (
      <div>
        <PageHeader title="Auditoria" />
        <EmptyState icon="🛡️" title="Acesso restrito" description="Você não tem permissão para visualizar a trilha de auditoria." />
      </div>
    );
  }

  const page = Math.max(1, Number(sp.page || 1));
  const entity = sp.entity || "";
  const action = sp.action || "";

  const where = ["al.tenant_id = $1"];
  const params: unknown[] = [user.tenant_id];
  if (entity) {
    params.push(entity);
    where.push(`al.entity_type = $${params.length}`);
  }
  if (action) {
    params.push(action);
    where.push(`al.action = $${params.length}`);
  }
  const whereSql = where.join(" and ");

  const totalRow = await queryOne<{ c: string }>(
    `select count(*)::int as c from audit_logs al where ${whereSql}`,
    params
  );
  const total = Number(totalRow?.c ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = await query<AuditLog>(
    `select al.*, u.name as user_name from audit_logs al
       left join users u on u.id = al.user_id
      where ${whereSql}
      order by al.created_at desc
      limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
    params
  );

  return (
    <div>
      <PageHeader title="Trilha de auditoria" subtitle={`${total} registro(s)`} />

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" method="get">
        <div>
          <label className="label">Entidade</label>
          <select name="entity" defaultValue={entity} className="input">
            <option value="">Todas</option>
            {["asset", "employee", "maintenance", "company", "department", "location", "asset_category", "supplier", "document", "software_license", "inventory"].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ação</label>
          <select name="action" defaultValue={action} className="input">
            <option value="">Todas</option>
            {["create", "update", "delete", "move", "export", "upload", "download", "write_off_approve", "write_off_request"].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon="🛡️" title="Sem registros" description="As ações auditáveis aparecerão aqui." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="table-th">Data/Hora</th>
                <th className="table-th">Usuário</th>
                <th className="table-th">Ação</th>
                <th className="table-th">Entidade</th>
                <th className="table-th">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="table-td whitespace-nowrap text-xs">{formatDateTime(a.created_at)}</td>
                  <td className="table-td text-sm">{a.user_name || "sistema"}</td>
                  <td className="table-td"><Badge color={ACTION_COLOR[a.action] ?? "gray"}>{a.action}</Badge></td>
                  <td className="table-td text-xs">
                    {a.entity_type}
                    {a.entity_id && <span className="text-slate-400"> · {a.entity_id.slice(0, 8)}</span>}
                  </td>
                  <td className="table-td text-xs text-slate-400">{a.ip_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          {page > 1 && <Link href={`/auditoria?entity=${entity}&action=${action}&page=${page - 1}`} className="btn-secondary">← Anterior</Link>}
          {page < pages && <Link href={`/auditoria?entity=${entity}&action=${action}&page=${page + 1}`} className="btn-secondary">Próxima →</Link>}
        </div>
      )}
    </div>
  );
}
