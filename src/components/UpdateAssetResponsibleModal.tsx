"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { updateAssetResponsible } from "@/app/(app)/ativos/[id]/updateResponsible";
import type { FieldOption } from "./CrudManager";

export function UpdateAssetResponsibleModal({
  assetId,
  currentEmployeeId,
  currentLocationId,
  employees,
  locations,
}: {
  assetId: string;
  currentEmployeeId: string | null;
  currentLocationId: string | null;
  employees: FieldOption[];
  locations: FieldOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(currentEmployeeId || "");
  const [locationId, setLocationId] = useState(currentLocationId || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    setError(null);
    const res = await updateAssetResponsible(
      assetId,
      employeeId || null,
      locationId || null
    );
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
      <button type="button" className="btn-secondary text-sm" onClick={() => setOpen(true)}>
        Editar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar responsável e localização">
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="label">Responsável</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="input"
            >
              <option value="">Sem responsável</option>
              {employees.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Localização</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="input"
            >
              <option value="">Sem localização</option>
              {locations.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={pending}
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
