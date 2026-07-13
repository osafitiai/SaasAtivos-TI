"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { createMovement } from "@/app/(app)/movimentacoes/actions";
import type { FieldOption } from "./CrudManager";
import { MOVEMENT_TYPES, ASSET_STATUSES, PHYSICAL_CONDITIONS } from "@/lib/constants";

export function MovementModal({
  assetId,
  employees,
  locations,
  departments,
  trigger = "Movimentar",
  triggerClass = "btn-primary",
}: {
  assetId: string;
  employees: FieldOption[];
  locations: FieldOption[];
  departments: FieldOption[];
  trigger?: string;
  triggerClass?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Entrega");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const needsEmployee = [
    "Entrega", "Empréstimo", "Transferência entre colaboradores", "Envio para home office", "Reserva",
  ].includes(type);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await createMovement(formData);
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
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar movimentação">
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="asset_id" value={assetId} />
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="label">Tipo de movimentação *</label>
            <select
              name="movement_type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {needsEmployee && (
            <div>
              <label className="label">Colaborador destino *</label>
              <select name="to_employee_id" className="input" required={needsEmployee}>
                <option value="">— selecione —</option>
                {employees.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nova localização</label>
              <select name="to_location_id" className="input">
                <option value="">— manter —</option>
                {locations.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Novo departamento</label>
              <select name="to_department_id" className="input">
                <option value="">— manter —</option>
                {departments.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Forçar status (opcional)</label>
              <select name="to_status" className="input">
                <option value="">— automático —</option>
                {ASSET_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Condição na entrega/devolução</label>
              <select name="condition" className="input">
                <option value="">— não informar —</option>
                {PHYSICAL_CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {type === "Empréstimo" && (
              <div className="sm:col-span-2">
                <label className="label">Devolução prevista</label>
                <input name="expected_return_at" type="date" className="input" />
              </div>
            )}
          </div>

          <div>
            <label className="label">Motivo / observações</label>
            <textarea name="reason" rows={2} className="input" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Registrando..." : "Registrar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
