"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { createInventory } from "@/app/(app)/inventarios/actions";
import type { FieldOption } from "./CrudManager";

export function InventoryCreateModal({
  departments,
  locations,
}: {
  departments: FieldOption[];
  locations: FieldOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await createInventory(formData);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    if (res.id) router.push(`/inventarios/${res.id}`);
    router.refresh();
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nova campanha
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova campanha de inventário">
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="label">Nome da campanha *</label>
            <input name="name" required className="input" placeholder="Inventário 2026 - Sede" />
          </div>
          <p className="text-xs text-slate-400">
            Deixe os filtros vazios para inventariar todos os ativos ativos do tenant.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Departamento</label>
              <select name="department_id" className="input">
                <option value="">Todos</option>
                {departments.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Localização</label>
              <select name="location_id" className="input">
                <option value="">Todas</option>
                {locations.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Gerando..." : "Criar e gerar lista"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
