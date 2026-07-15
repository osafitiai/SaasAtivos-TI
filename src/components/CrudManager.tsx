"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import {
  Badge,
  AssetStatusBadge,
  EmployeeStatusBadge,
  MaintenanceStatusBadge,
} from "./Badge";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { classifyReplacement } from "@/lib/replacement";

export interface FieldOption {
  value: string;
  label: string;
}

export type CellFormat =
  | "text"
  | "currency"
  | "date"
  | "datetime"
  | "bool"
  | "icon"
  | "activeBadge"
  | "userStatus"
  | "assetStatus"
  | "employeeStatus"
  | "maintenanceStatus"
  | "roleLabel"
  | "expiresBadge"
  | "licenseSeats";

export interface ColumnSpec {
  key: string;
  label: string;
  format?: CellFormat;
  linkPrefix?: string; // ex.: "/colaboradores/" — usa row.id
}

export interface FieldSpec {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "date" | "textarea" | "select" | "checkbox";
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
  colSpan?: 1 | 2;
  help?: string;
}

export type CrudRow = Record<string, unknown>;

type ActionResult = { error?: string } | void;

export function CrudManager({
  title,
  fields,
  rows,
  columns,
  saveAction,
  deleteAction,
  addLabel = "Novo",
  canEdit = true,
}: {
  title: string;
  fields: FieldSpec[];
  rows: CrudRow[];
  columns: ColumnSpec[];
  saveAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction?: (formData: FormData) => Promise<ActionResult>;
  addLabel?: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrudRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function openNew() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }
  function openEdit(row: CrudRow) {
    setEditing(row);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await saveAction(formData);
    setPending(false);
    if (res && "error" in res && res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setSuccess("Alterações salvas com sucesso!");
    router.refresh();
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleDelete(id: string) {
    if (!deleteAction) return;
    if (!confirm("Confirma a exclusão deste registro?")) return;
    const fd = new FormData();
    fd.set("id", id);
    const res = await deleteAction(fd);
    if (res && "error" in res && res.error) {
      alert(res.error);
      return;
    }
    setSuccess("Registro excluído com sucesso!");
    router.refresh();
    setTimeout(() => setSuccess(null), 3000);
  }

  function renderCell(row: CrudRow, col: ColumnSpec): React.ReactNode {
    const v = row[col.key];
    const s = v === null || v === undefined || v === "" ? "—" : String(v);

    let content: React.ReactNode;
    switch (col.format) {
      case "currency":
        content = formatBRL(v as string);
        break;
      case "date":
        content = formatDate(v as string);
        break;
      case "datetime":
        content = v ? formatDateTime(v as string) : "—";
        break;
      case "bool":
        content = v ? "Sim" : "Não";
        break;
      case "icon":
        content = <span className="text-lg">{s === "—" ? "📦" : s}</span>;
        break;
      case "activeBadge":
        content = <Badge color={v === "active" ? "green" : "gray"}>{v === "active" ? "Ativo" : "Inativo"}</Badge>;
        break;
      case "userStatus":
        content = <Badge color={v === "active" ? "green" : "red"}>{v === "active" ? "Ativo" : "Bloqueado"}</Badge>;
        break;
      case "assetStatus":
        content = <AssetStatusBadge status={s} />;
        break;
      case "employeeStatus":
        content = <EmployeeStatusBadge status={s} />;
        break;
      case "maintenanceStatus":
        content = <MaintenanceStatusBadge status={s} />;
        break;
      case "roleLabel":
        content = ROLE_LABELS[v as keyof typeof ROLE_LABELS] ?? s;
        break;
      case "licenseSeats":
        content = `${row.quantity_used ?? 0} / ${row.quantity_purchased ?? 0}`;
        break;
      case "expiresBadge": {
        const cls = classifyReplacement(v as string);
        const color = cls === "Vencido" ? "red" : cls === "Urgente" ? "amber" : "green";
        content = <Badge color={color}>{formatDate(v as string)}</Badge>;
        break;
      }
      default:
        content = s;
    }

    if (col.linkPrefix) {
      return (
        <Link href={`${col.linkPrefix}${row.id}`} className="font-medium text-brand-600 hover:underline">
          {content}
        </Link>
      );
    }
    return content;
  }

  return (
    <div>
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700 dark:bg-green-950/20 dark:text-green-300 transition duration-150">
          {success}
        </div>
      )}

      {canEdit && (
        <div className="mb-4 flex justify-end">
          <button className="btn-primary" onClick={openNew}>
            + {addLabel}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="table-th">
                  {c.label}
                </th>
              ))}
              {canEdit && <th className="table-th text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-sm text-slate-400">
                  Nenhum registro cadastrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={String(row.id)} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  {columns.map((c) => (
                    <td key={c.key} className="table-td">
                      {renderCell(row, c)}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="table-td text-right">
                      {columns.find((c) => c.linkPrefix) && (
                        <Link
                          href={`${columns.find((c) => c.linkPrefix)!.linkPrefix}${row.id}`}
                          className="btn-ghost px-2 py-1 text-xs font-semibold text-brand-600 mr-2"
                        >
                          Ver
                        </Link>
                      )}
                      <button className="btn-ghost px-2 py-1" onClick={() => openEdit(row)}>
                        ✏️
                      </button>
                      {deleteAction && (
                        <button
                          className="btn-ghost px-2 py-1 text-red-600"
                          onClick={() => handleDelete(String(row.id))}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Editar ${title}` : `Novo ${title}`}>
        <form action={handleSubmit} className="space-y-4">
          {editing && <input type="hidden" name="id" value={String(editing.id)} />}
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className={f.colSpan === 2 || f.type === "textarea" ? "sm:col-span-2" : ""}>
                {f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      name={f.name}
                      defaultChecked={Boolean(editing?.[f.name])}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <label className="label">
                      {f.label}
                      {f.required && <span className="text-red-500"> *</span>}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea
                        name={f.name}
                        rows={3}
                        required={f.required}
                        defaultValue={(editing?.[f.name] as string) ?? ""}
                        className="input"
                        placeholder={f.placeholder}
                      />
                    ) : f.type === "select" ? (
                      <select
                        name={f.name}
                        required={f.required}
                        defaultValue={(editing?.[f.name] as string) ?? ""}
                        className="input"
                      >
                        <option value="">— selecione —</option>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type}
                        name={f.name}
                        required={f.required}
                        step={f.type === "number" ? "any" : undefined}
                        defaultValue={formatDefault(editing?.[f.name], f.type)}
                        className="input"
                        placeholder={f.placeholder}
                      />
                    )}
                    {f.help && <p className="mt-1 text-xs text-slate-400">{f.help}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function formatDefault(value: unknown, type: string): string {
  if (value === null || value === undefined) return "";
  if (type === "date") {
    const d = new Date(value as string);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "";
  }
  return String(value);
}
