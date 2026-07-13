"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { requestWriteOff } from "@/app/(app)/aprovacoes/actions";
import type { FieldOption } from "./CrudManager";
import { WRITE_OFF_REASONS } from "@/lib/constants";

export function WriteOffModal({ assets }: { assets: FieldOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await requestWriteOff(formData);
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
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Solicitar baixa
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Solicitar baixa patrimonial">
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="label">Ativo *</label>
            <select name="asset_id" required className="input">
              <option value="">— selecione —</option>
              {assets.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Motivo *</label>
            <select name="reason" required className="input">
              <option value="">— selecione —</option>
              {WRITE_OFF_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Destino</label>
              <input name="destination" className="input" placeholder="Reciclagem, comprador..." />
            </div>
            <div>
              <label className="label">Valor residual (BRL)</label>
              <input name="residual_value" type="number" step="0.01" min="0" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Laudo / justificativa</label>
            <textarea name="report" rows={3} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Enviando..." : "Solicitar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
