import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { canSeeFinancials, can } from "@/lib/rbac";
import { employeeOptions, locationOptions, departmentOptions } from "@/lib/options";
import { PageHeader } from "@/components/PageHeader";
import { Tabs } from "@/components/Tabs";
import { AssetStatusBadge, ReplacementBadge, MaintenanceStatusBadge, Badge } from "@/components/Badge";
import { MovementModal } from "@/components/MovementModal";
import { UpdateAssetResponsibleModal } from "@/components/UpdateAssetResponsibleModal";
import { DocumentsPanel, type Doc } from "@/components/DocumentsPanel";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import type { Asset, AssetMovement, Maintenance, AuditLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AtivoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSession();
  const showMoney = canSeeFinancials(user);
  const canEdit = can(user, "assets.edit");

  const asset = await queryOne<Asset>(
    `select a.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
            e.full_name as employee_name, l.name as location_name, l.full_path,
            d.name as department_name, coalesce(co.trade_name,co.legal_name) as company_name,
            s.trade_name as supplier_name
       from assets a
       left join asset_categories c on c.id = a.category_id
       left join employees e on e.id = a.current_employee_id
       left join locations l on l.id = a.location_id
       left join departments d on d.id = a.department_id
       left join companies co on co.id = a.company_id
       left join suppliers s on s.id = a.supplier_id
      where a.id = $1 and a.tenant_id = $2 and a.deleted_at is null`,
    [id, user.tenant_id]
  );
  if (!asset) notFound();

  const [movements, maintenances, docs, audit, employees, locations, departments, costs] =
    await Promise.all([
      query<AssetMovement>(
        `select m.*, fe.full_name as from_employee_name, te.full_name as to_employee_name,
                fl.name as from_location_name, tl.name as to_location_name, u.name as performed_by_name
           from asset_movements m
           left join employees fe on fe.id = m.from_employee_id
           left join employees te on te.id = m.to_employee_id
           left join locations fl on fl.id = m.from_location_id
           left join locations tl on tl.id = m.to_location_id
           left join users u on u.id = m.performed_by_user_id
          where m.asset_id = $1 order by m.occurred_at desc`,
        [id]
      ),
      query<Maintenance>(
        `select mt.*, s.trade_name as supplier_name from maintenances mt
           left join suppliers s on s.id = mt.supplier_id
          where mt.asset_id = $1 order by mt.opened_at desc`,
        [id]
      ),
      query<Doc>(
        `select d.*, u.name as uploaded_by_name from documents d
           left join users u on u.id = d.uploaded_by_user_id
          where d.entity_type = 'asset' and d.entity_id = $1 and d.deleted_at is null
          order by d.created_at desc`,
        [id]
      ),
      query<AuditLog>(
        `select al.*, u.name as user_name from audit_logs al
           left join users u on u.id = al.user_id
          where al.entity_type = 'asset' and al.entity_id = $1
          order by al.created_at desc limit 50`,
        [id]
      ),
      employeeOptions(user.tenant_id),
      locationOptions(user.tenant_id),
      departmentOptions(user.tenant_id),
      queryOne<{ total: string }>(
        `select coalesce(sum(total_cost),0) as total from maintenances
          where asset_id = $1 and status = 'Concluída'`,
        [id]
      ),
    ]);

  const maintTotal = Number(costs?.total ?? 0);
  const acqValue = Number(asset.acquisition_value ?? 0);
  const costRatio = acqValue > 0 ? (maintTotal / acqValue) * 100 : 0;
  const tech = (asset.technical_data ?? {}) as Record<string, string>;

  const invoiceDocs = docs.filter((d) => d.document_type === "nota_fiscal");

  const catLower = (asset.category_name || "").toLowerCase();
  const isNotebook = catLower.includes("notebook");
  const isMonitor = catLower.includes("monitor");
  const isKit = catLower.includes("kit teclado");
  const isHeadset = catLower.includes("headset");

  const resumo = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-5 lg:col-span-2">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Info label="Nome" value={asset.name} />
          <Info label="Categoria" value={`${asset.category_icon ?? ""} ${asset.category_name ?? ""}`} />

          {isNotebook && (
            <>
              <Info label="Número de série" value={asset.serial_number} />
              <Info label="Patrimônio" value={asset.asset_tag} />
              <Info label="Marca / Modelo" value={[asset.brand, asset.model].filter(Boolean).join(" ") || "—"} />
              <Info label="Ano do produto" value={tech.ano_produto} />
            </>
          )}

          {isMonitor && (
            <>
              <Info label="Patrimônio" value={asset.asset_tag} />
              <Info label="Número de série" value={asset.serial_number} />
              <Info label="Marca / Modelo" value={[asset.brand, asset.model].filter(Boolean).join(" ") || "—"} />
              <Info label="Tamanho (polegadas)" value={tech.tamanho_polegadas} />
            </>
          )}

          {isKit && (
            <>
              <Info label="Número de série do teclado" value={tech.numero_serie_teclado} />
              <Info label="Número de série do mouse" value={tech.numero_serie_mouse} />
              <Info label="Marca / Modelo" value={[asset.brand, asset.model].filter(Boolean).join(" ") || "—"} />
              <Info label="Patrimônio" value={asset.asset_tag} />
            </>
          )}

          {isHeadset && (
            <>
              <Info label="Número de série do headset" value={tech.numero_serie_headset} />
              <Info label="Marca / Modelo" value={[asset.brand, asset.model].filter(Boolean).join(" ") || "—"} />
              <Info label="Patrimônio" value={asset.asset_tag} />
            </>
          )}

          {!isNotebook && !isMonitor && !isKit && !isHeadset && (
            <>
              <Info label="Patrimônio" value={asset.asset_tag} />
              <Info label="Número de série" value={asset.serial_number} />
              <Info label="Marca / Modelo" value={[asset.brand, asset.model].filter(Boolean).join(" ") || "—"} />
            </>
          )}

          <Info label="Condição física" value={asset.physical_condition} />
          <Info label="Status" value={<AssetStatusBadge status={asset.status} />} />
          <Info label="Descrição" value={asset.description} span />
        </dl>

        {invoiceDocs.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Notas Fiscais de Compra</h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoiceDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">📎 {d.file_name}</span>
                  <a
                    href={`/api/documents/${d.id}`}
                    download
                    className="btn-ghost px-2 py-1 text-xs font-semibold text-brand-600"
                  >
                    ⬇ Baixar NF
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Vida útil</h3>
          <dl className="space-y-2 text-sm">
            <Info label="Aquisição" value={formatDate(asset.acquisition_date)} />
            <Info label="Vida útil" value={asset.useful_life_years ? `${asset.useful_life_years} anos` : "—"} />
            <Info label="Previsão substituição" value={formatDate(asset.replacement_date)} />
            <div className="flex justify-between">
              <dt className="text-slate-400">Classificação</dt>
              <dd><ReplacementBadge date={asset.replacement_date} /></dd>
            </div>
          </dl>
        </div>
        {showMoney && (
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Financeiro</h3>
            <dl className="space-y-2 text-sm">
              <Info label="Valor de aquisição" value={formatBRL(asset.acquisition_value)} />
              <Info label="Custo de manutenção" value={formatBRL(maintTotal)} />
              <div className="flex justify-between">
                <dt className="text-slate-400">Manut. / Aquisição</dt>
                <dd>
                  <Badge color={costRatio > 50 ? "red" : costRatio > 25 ? "amber" : "green"}>
                    {costRatio.toFixed(1)}%
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );

  const dadosTecnicos = (
    <div className="card p-5">
      {Object.keys(tech).length === 0 ? (
        <p className="text-sm text-slate-400">Sem dados técnicos cadastrados.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(tech).map(([k, v]) => (
            <Info key={k} label={k.replace(/_/g, " ")} value={String(v)} />
          ))}
        </dl>
      )}
    </div>
  );

  const responsavel = (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && (
          <UpdateAssetResponsibleModal
            assetId={asset.id}
            currentEmployeeId={asset.current_employee_id}
            currentLocationId={asset.location_id}
            employees={employees}
            locations={locations}
          />
        )}
      </div>
      <div className="card p-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Info
            label="Responsável atual"
            value={
              asset.current_employee_id ? (
                <Link href={`/colaboradores/${asset.current_employee_id}`} className="text-brand-600 hover:underline">
                  {asset.employee_name}
                </Link>
              ) : "Sem responsável"
            }
          />
          <Info label="Localização" value={asset.full_path || asset.location_name} />
          <Info label="Departamento" value={asset.department_name} />
          <Info label="Empresa" value={asset.company_name} />
          <Info label="Fornecedor" value={asset.supplier_name} />
        </dl>
      </div>
    </div>
  );

  const movimentacoesTab = (
    <div className="card overflow-hidden">
      {movements.length === 0 ? (
        <p className="p-5 text-sm text-slate-400">Sem movimentações registradas.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {movements.map((m) => (
            <li key={m.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-200">{m.movement_type}</span>
                <span className="text-xs text-slate-400">{formatDateTime(m.occurred_at)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {m.from_employee_name && <>De: {m.from_employee_name} </>}
                {m.to_employee_name && <>→ Para: {m.to_employee_name} </>}
                {m.from_status !== m.to_status && <>· {m.from_status} → {m.to_status} </>}
                · por {m.performed_by_name || "sistema"}
                {m.reason ? ` · ${m.reason}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const manutencoesTab = (
    <div className="card overflow-x-auto">
      {maintenances.length === 0 ? (
        <p className="p-5 text-sm text-slate-400">Sem manutenções registradas.</p>
      ) : (
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="table-th">Protocolo</th>
              <th className="table-th">Tipo</th>
              <th className="table-th">Abertura</th>
              <th className="table-th">Fornecedor</th>
              <th className="table-th">Status</th>
              {showMoney && <th className="table-th">Custo</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {maintenances.map((m) => (
              <tr key={m.id}>
                <td className="table-td">
                  <Link href={`/manutencoes/${m.id}`} className="text-brand-600 hover:underline">
                    {m.protocol || m.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="table-td">{m.type}</td>
                <td className="table-td">{formatDate(m.opened_at)}</td>
                <td className="table-td">{m.supplier_name || "—"}</td>
                <td className="table-td"><MaintenanceStatusBadge status={m.status} /></td>
                {showMoney && <td className="table-td">{formatBRL(m.total_cost)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const previousCollaborators = movements.filter((m) => m.to_employee_id);

  const colaboradoresAnterioresTab = (
    <div className="card overflow-x-auto">
      {previousCollaborators.length === 0 ? (
        <p className="p-5 text-sm text-slate-400">Nenhum colaborador anterior registrado.</p>
      ) : (
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="table-th">Colaborador</th>
              <th className="table-th">Data de Associação</th>
              <th className="table-th">Tipo</th>
              <th className="table-th">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {previousCollaborators.map((m) => (
              <tr key={m.id}>
                <td className="table-td font-medium text-slate-900 dark:text-slate-100">
                  {m.to_employee_name}
                </td>
                <td className="table-td text-slate-500">
                  {formatDateTime(m.occurred_at)}
                </td>
                <td className="table-td text-slate-500">
                  {m.movement_type}
                </td>
                <td className="table-td text-slate-500">
                  {m.reason || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const auditoriaTab = (
    <div className="card overflow-hidden">
      {audit.length === 0 ? (
        <p className="p-5 text-sm text-slate-400">Sem registros de auditoria.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {audit.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-slate-700 dark:text-slate-200">
                <Badge color="blue">{a.action}</Badge> por {a.user_name || "sistema"}
              </span>
              <span className="text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title={`${asset.category_icon ?? ""} ${asset.name}`}
        subtitle={`${asset.category_name} · ${asset.asset_tag || asset.serial_number || "sem identificador"}`}
        actions={
          <>
            <Link href="/ativos" className="btn-secondary">← Voltar</Link>
            {canEdit && (
              <>
                <MovementModal assetId={asset.id} employees={employees} locations={locations} departments={departments} />
                <Link href={`/ativos/${asset.id}/editar`} className="btn-secondary">✏️ Editar</Link>
              </>
            )}
          </>
        }
      />

      <Tabs
        tabs={[
          { label: "Resumo", content: resumo },
          { label: "Dados técnicos", content: dadosTecnicos },
          { label: "Responsável e localização", content: responsavel },
          { label: "Colaboradores anteriores", content: colaboradoresAnterioresTab },
          { label: `Movimentações (${movements.length})`, content: movimentacoesTab },
          { label: `Manutenções (${maintenances.length})`, content: manutencoesTab },
          {
            label: `Documentos (${docs.length})`,
            content: <DocumentsPanel entityType="asset" entityId={asset.id} documents={docs} canEdit={canEdit} />,
          },
          { label: "Auditoria", content: auditoriaTab },
        ]}
      />
    </div>
  );
}

function Info({
  label,
  value,
  span,
}: {
  label: string;
  value: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize-first text-slate-700 dark:text-slate-200">
        {value || "—"}
      </dd>
    </div>
  );
}
