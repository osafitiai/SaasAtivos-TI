"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";

export interface Doc {
  id: string;
  file_name: string;
  document_type: string;
  size_bytes: string | number | null;
  uploaded_by_name?: string;
  created_at: string;
  [key: string]: unknown;
}

const DOC_TYPES = [
  "nota_fiscal", "foto", "termo", "garantia", "contrato", "laudo",
  "ordem_servico", "comprovante_entrega", "comprovante_descarte", "boletim_ocorrencia", "manual", "outros",
];

export function DocumentsPanel({
  entityType,
  entityId,
  documents,
  canEdit,
}: {
  entityType: string;
  entityId: string;
  documents: Doc[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(formData: FormData) {
    setUploading(true);
    setError(null);
    formData.set("entity_type", entityType);
    formData.set("entity_id", entityId);
    const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Falha no upload.");
      return;
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este documento?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form
          action={handleUpload}
          className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="label">Tipo de documento</label>
            <select name="document_type" className="input">
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="label">Arquivo</label>
            <input type="file" name="file" required className="input" />
          </div>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? "Enviando..." : "⬆ Enviar"}
          </button>
        </form>
      )}
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="card overflow-x-auto">
        {documents.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">Nenhum documento anexado.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="table-th">Arquivo</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Enviado em</th>
                <th className="table-th text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="table-td">📎 {d.file_name}</td>
                  <td className="table-td">{d.document_type.replace(/_/g, " ")}</td>
                  <td className="table-td">{formatDateTime(d.created_at)}</td>
                  <td className="table-td text-right">
                    <a href={`/api/documents/${d.id}`} className="btn-ghost px-2 py-1 text-xs">⬇ Baixar</a>
                    {canEdit && (
                      <button onClick={() => handleDelete(d.id)} className="btn-ghost px-2 py-1 text-xs text-red-600">
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
