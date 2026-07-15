"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AssetStatusBadge } from "@/components/Badge";
import { MovementModal } from "@/components/MovementModal";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteAssetById, deleteAssets } from "@/app/(app)/ativos/actions";
import type { Asset } from "@/lib/types";

interface AssetsTableProps {
  rows: Asset[];
  employees: any[];
  locations: any[];
  departments: any[];
  canEdit: boolean;
  canDelete: boolean;
}

export function AssetsTable({
  rows,
  employees,
  locations,
  departments,
  canEdit,
  canDelete,
}: AssetsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(rows.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Tem certeza que deseja excluir os ${selectedIds.length} ativos selecionados?`
      )
    ) {
      return;
    }

    setDeleting(true);
    const res = await deleteAssets(selectedIds);
    setDeleting(false);

    if (res?.error) {
      alert(res.error);
    } else {
      setSelectedIds([]);
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra de ações em lote */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedIds.length}</span> ativos selecionados
          </div>
          {canDelete && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="btn-danger px-3 py-1.5 text-xs font-semibold"
            >
              {deleting ? "Excluindo..." : "🗑️ Excluir Selecionados"}
            </button>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <th className="table-th">Ativo</th>
              <th className="table-th">Categoria</th>
              <th className="table-th">Patrimônio</th>
              <th className="table-th">Nº Série</th>
              <th className="table-th">Responsável</th>
              <th className="table-th">Localização</th>
              <th className="table-th">Status</th>
              <th className="table-th">NF</th>
              <th className="table-th text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((a) => {
              const isSelected = selectedIds.includes(a.id);
              return (
                <tr
                  key={a.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    isSelected ? "bg-brand-50/30 dark:bg-brand-950/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectOne(a.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  <td className="table-td">
                    <Link
                      href={`/ativos/${a.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {a.category_icon} {a.name}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {a.brand} {a.model}
                    </div>
                  </td>
                  <td className="table-td">{a.category_name}</td>
                  <td className="table-td">{a.asset_tag || "—"}</td>
                  <td className="table-td">{a.serial_number || "—"}</td>
                  <td className="table-td">
                    {a.employee_name || (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="table-td">{a.location_name || "—"}</td>
                  <td className="table-td">
                    <AssetStatusBadge status={a.status} />
                  </td>
                  <td className="table-td">
                    {a.nf_doc_id ? (
                      <a
                        href={`/api/documents/${a.nf_doc_id}`}
                        className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
                        title="Baixar Nota Fiscal"
                      >
                        📄 NF
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
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
                      <Link
                        href={`/ativos/${a.id}`}
                        className="btn-ghost px-2 py-1 text-xs"
                      >
                        Ver
                      </Link>
                      {canDelete && (
                        <ConfirmButton
                          action={async () => {
                            await deleteAssetById(a.id);
                            setSelectedIds((prev) =>
                              prev.filter((id) => id !== a.id)
                            );
                          }}
                          className="btn-ghost px-2 py-1 text-xs text-red-600"
                          message={`Deseja excluir "${a.name}"? O ativo sai da lista, mas o histórico é preservado.`}
                        >
                          Excluir
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
