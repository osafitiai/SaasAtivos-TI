"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkItem } from "@/app/(app)/inventarios/actions";
import { Badge } from "./Badge";

interface Item {
  id: string;
  asset_name: string;
  asset_id: string;
  asset_tag: string | null;
  expected_location_name: string | null;
  expected_employee_name: string | null;
  found: boolean | null;
  divergence_type: string | null;
  checked_at: string | null;
}

export function InventoryItemRow({ item, readOnly }: { item: Item; readOnly: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function mark(found: boolean, divergence?: string) {
    setPending(true);
    const fd = new FormData();
    fd.set("item_id", item.id);
    fd.set("found", String(found));
    if (divergence) fd.set("divergence_type", divergence);
    await checkItem(fd);
    setPending(false);
    router.refresh();
  }

  return (
    <tr className={item.checked_at ? "bg-slate-50/50 dark:bg-slate-800/20" : ""}>
      <td className="table-td">
        <div className="font-medium text-slate-700 dark:text-slate-200">{item.asset_name}</div>
        <div className="text-xs text-slate-400">{item.asset_tag || "—"}</div>
      </td>
      <td className="table-td text-xs">{item.expected_location_name || "—"}</td>
      <td className="table-td text-xs">{item.expected_employee_name || "—"}</td>
      <td className="table-td">
        {item.checked_at ? (
          item.found === false ? (
            <Badge color="red">Não localizado</Badge>
          ) : item.divergence_type ? (
            <Badge color="amber">{item.divergence_type}</Badge>
          ) : (
            <Badge color="green">Conferido</Badge>
          )
        ) : (
          <Badge color="gray">Pendente</Badge>
        )}
      </td>
      {!readOnly && (
        <td className="table-td text-right">
          <div className="flex flex-wrap justify-end gap-1">
            <button disabled={pending} onClick={() => mark(true)} className="btn-ghost px-2 py-1 text-xs text-green-600">
              ✓ Localizado
            </button>
            <button disabled={pending} onClick={() => mark(true, "Divergência de localização")} className="btn-ghost px-2 py-1 text-xs text-amber-600">
              ≠ Local
            </button>
            <button disabled={pending} onClick={() => mark(false, "Não localizado")} className="btn-ghost px-2 py-1 text-xs text-red-600">
              ✗ Ausente
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
