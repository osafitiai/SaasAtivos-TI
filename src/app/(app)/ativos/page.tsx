import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { canSeeFinancials, can } from "@/lib/rbac";
import { categoryOptions, employeeOptions, locationOptions, departmentOptions } from "@/lib/options";
import { ASSET_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { AssetStatusBadge, ReplacementBadge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { MovementModal } from "@/components/MovementModal";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteAssetById } from "./actions";
import { formatBRL, formatDate } from "@/lib/format";
import type { Asset } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const REPL_EXPR = `coalesce(a.replacement_date,
  case when a.acquisition_date is not null and a.useful_life_years is not null
       then (a.acquisition_date + (a.useful_life_years || ' years')::interval)::date end)`;

export default async function AtivosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const user = await requireSession();
  const showMoney = canSeeFinancials(user);
  const canEdit = can(user, "assets.edit");
  const canDelete = can(user, "assets.delete");

  const page = Math.max(1, Number(sp.page || 1));
  const q = (sp.q || "").trim();
  const status = sp.status || "";
  const category = sp.category || "";
  const repl = sp.repl || "";

  const where: string[] = ["a.tenant_id = $1", "a.deleted_at is null"];
  const params: unknown[] = [user.tenant_id];

  if (q) {
    params.push(`%${q}%`);
    const i = params.length;
    where.push(`(a.name ilike $${i} or a.serial_number ilike $${i} or a.asset_tag ilike $${i}
      or a.brand ilike $${i} or a.model ilike $${i} or e.full_name ilike $${i}
      or l.name ilike $${i} or a.internal_code ilike $${i})`);
  }
  if (status) {
    params.push(status);
    where.push(`a.status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    where.push(`a.category_id = $${params.length}`);
  }
  if (repl === "vencido") where.push(`${REPL_EXPR} < current_date`);
  if (repl === "urgente")
    where.push(`${REPL_EXPR} >= current_date and ${REPL_EXPR} <= current_date + 90`);

  const whereSql = where.join(" and ");
  const baseFrom = `from assets a
    left join asset_categories c on c.id = a.category_id
    left join employees e on e.id = a.current_employee_id
    left join locations l on l.id = a.location_id
    left join departments d on d.id = a.department_id
    where ${whereSql}`;

  const totalRow = await queryOne<{ c: string }>(`select count(*)::int as c ${baseFrom}`, params);
  const total = Number(totalRow?.c ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = await query<Asset>(
    `select a.*, c.name as category_name, c.icon as category_icon,
            e.full_name as employee_name, l.name as location_name, d.name as department_name
     ${baseFrom}
     order by a.created_at desc
     limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
    params
  );

  const [categories, employees, locations, departments] = await Promise.all([
    categoryOptions(user.tenant_id),
    employeeOptions(user.tenant_id),
    locationOptions(user.tenant_id),
    departmentOptions(user.tenant_id),
  ]);

  const exportQs = new URLSearchParams(
    Object.entries({ q, status, category, repl }).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div>
      <PageHeader
        title="Ativos"
        subtitle={`${total} ativo(s) encontrado(s)`}
        actions={
          <>
            <a href={`/api/export/ativos?${exportQs}`} className="btn-secondary">
              ⬇ Exportar XLSX
            </a>
            {canEdit && (
              <Link href="/ativos/novo" className="btn-primary">
                + Novo ativo
              </Link>
            )}
          </>
        }
      />

      {/* Filtros */}
      <form className="card mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar nome, série, patrimônio, responsável..."
          className="input lg:col-span-2"
        />
        <select name="status" defaultValue={status} className="input">
          <option value="">Todos os status</option>
          {ASSET_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.value}</option>
          ))}
        </select>
        <select name="category" defaultValue={category} className="input">
          <option value="">Todas as categorias</option>
          {categories.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="repl" defaultValue={repl} className="input">
            <option value="">Substituição</option>
            <option value="vencido">Vencida</option>
            <option value="urgente">≤ 90 dias</option>
          </select>
          <button type="submit" className="btn-primary">Filtrar</button>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon="💻"
          title="Nenhum ativo encontrado"
          description="Ajuste os filtros ou cadastre um novo ativo."
          action={canEdit && <Link href="/ativos/novo" className="btn-primary">+ Novo ativo</Link>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="table-th">Ativo</th>
                <th className="table-th">Categoria</th>
                <th className="table-th">Patrimônio</th>
                <th className="table-th">Nº Série</th>
                <th className="table-th">Responsável</th>
                <th className="table-th">Localização</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="table-td">
                    <Link href={`/ativos/${a.id}`} className="font-medium text-brand-600 hover:underline">
                      {a.category_icon} {a.name}
                    </Link>
                    <div className="text-xs text-slate-400">{a.brand} {a.model}</div>
                  </td>
                  <td className="table-td">{a.category_name}</td>
                  <td className="table-td">{a.asset_tag || "—"}</td>
                  <td className="table-td">{a.serial_number || "—"}</td>
                  <td className="table-td">{a.employee_name || <span className="text-slate-400">—</span>}</td>
                  <td className="table-td">{a.location_name || "—"}</td>
                  <td className="table-td"><AssetStatusBadge status={a.status} /></td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <MovementModal
                          assetId={a.id}
                          employees={employees}
                          locations={locations}
                          departments={departments}
                          trigger="Movimentar"
                          triggerClass="btn-ghost px-2 py-1 text-xs"
                        />
                      )}
                      <Link href={`/ativos/${a.id}`} className="btn-ghost px-2 py-1 text-xs">Ver</Link>
                      {canDelete && (
                        <ConfirmButton
                          action={deleteAssetById.bind(null, a.id)}
                          className="btn-ghost px-2 py-1 text-xs text-red-600"
                          message={`Deseja excluir "${a.name}"? O ativo sai da lista, mas o histórico é preservado.`}
                        >
                          Excluir
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-400">
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildHref(sp, page - 1)} className="btn-secondary">← Anterior</Link>
            )}
            {page < pages && (
              <Link href={buildHref(sp, page + 1)} className="btn-secondary">Próxima →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildHref(sp: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
  params.set("page", String(page));
  return `/ativos?${params.toString()}`;
}
