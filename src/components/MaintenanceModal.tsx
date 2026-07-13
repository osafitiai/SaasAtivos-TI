"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { saveMaintenance } from "@/app/(app)/manutencoes/actions";
import type { FieldOption } from "./CrudManager";
import type { Maintenance } from "@/lib/types";
import { MAINTENANCE_TYPES, MAINTENANCE_STATUSES, ASSET_STATUSES } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";

export function MaintenanceModal({
  assets,
  suppliers,
  maintenance,
  fixedAssetId,
  trigger = "+ Nova manutenção",
  triggerClass = "btn-primary",
}: {
  assets?: FieldOption[];
  suppliers: FieldOption[];
  maintenance?: Maintenance;
  fixedAssetId?: string;
  trigger?: string;
  triggerClass?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(maintenance?.status ?? "Aberta");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await saveMaintenance(formData);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={maintenance ? "Editar manutenção" : "Nova manutenção"} wide>
        <form action={handleSubmit} className="space-y-4">
          {maintenance && <input type="hidden" name="id" value={maintenance.id} />}
          {fixedAssetId && <input type="hidden" name="asset_id" value={fixedAssetId} />}
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!fixedAssetId && (
              <div className="sm:col-span-2">
                <label className="label">Ativo *</label>
                <select name="asset_id" required defaultValue={maintenance?.asset_id ?? ""} className="input">
                  <option value="">— selecione —</option>
                  {assets?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Tipo *</label>
              <select name="type" required defaultValue={maintenance?.type ?? ""} className="input">
                <option value="">— selecione —</option>
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status *</label>
              <select
                name="status"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input"
              >
                {MAINTENANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Protocolo</label>
              <input name="protocol" defaultValue={maintenance?.protocol ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Fornecedor</label>
              <select name="supplier_id" defaultValue={maintenance?.supplier_id ?? ""} className="input">
                <option value="">— interno —</option>
                {suppliers.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição do problema</label>
              <textarea name="problem_description" rows={2} defaultValue={maintenance?.problem_description ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Diagnóstico</label>
              <textarea name="diagnosis" rows={2} defaultValue={maintenance?.diagnosis ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Solução</label>
              <textarea name="solution" rows={2} defaultValue={maintenance?.solution ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Custo de peças (BRL)</label>
              <input name="parts_cost" type="number" step="0.01" min="0" defaultValue={maintenance?.parts_cost ?? "0"} className="input" />
            </div>
            <div>
              <label className="label">Custo de serviço (BRL)</label>
              <input name="service_cost" type="number" step="0.01" min="0" defaultValue={maintenance?.service_cost ?? "0"} className="input" />
            </div>
            <div>
              <label className="label">Data prevista</label>
              <input name="expected_at" type="date" defaultValue={toDateInputValue(maintenance?.expected_at)} className="input" />
            </div>
            {status === "Concluída" && (
              <div>
                <label className="label">Status do ativo ao concluir</label>
                <select name="asset_status_after" defaultValue="Disponível" className="input">
                  {ASSET_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.value}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea name="notes" rows={2} defaultValue={maintenance?.notes ?? ""} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
