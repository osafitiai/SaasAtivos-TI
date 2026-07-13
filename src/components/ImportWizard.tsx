"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Summary {
  employees: { created: number; skipped: number };
  assets: { created: number; skipped: number; duplicates: string[] };
  maintenances: { created: number; skipped: number };
  errors: string[];
}

export function ImportWizard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Summary | null>(null);
  const [committed, setCommitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(commit: boolean) {
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("commit", String(commit));
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Falha na importação.");
      return;
    }
    setPreview(json.summary);
    if (json.committed) {
      setCommitted(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <label className="label">Arquivo da planilha (.xlsx)</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="input"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setCommitted(false);
          }}
        />
        <div className="mt-4 flex gap-2">
          <button
            className="btn-secondary"
            disabled={!file || loading}
            onClick={() => send(false)}
          >
            {loading ? "Analisando..." : "1. Pré-visualizar"}
          </button>
          <button
            className="btn-primary"
            disabled={!file || loading || !preview || committed}
            onClick={() => send(true)}
          >
            2. Confirmar importação
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {preview && (
        <div className="card p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {committed ? "✅ Importação concluída" : "Pré-visualização (nada foi gravado ainda)"}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PreviewCard title="Colaboradores" created={preview.employees.created} skipped={preview.employees.skipped} />
            <PreviewCard title="Ativos" created={preview.assets.created} skipped={preview.assets.skipped} />
            <PreviewCard title="Manutenções" created={preview.maintenances.created} skipped={preview.maintenances.skipped} />
          </div>

          {preview.assets.duplicates.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase text-slate-500">
                Duplicidades ignoradas ({preview.assets.duplicates.length})
              </h4>
              <ul className="mt-1 max-h-40 overflow-y-auto text-sm text-slate-500 dark:text-slate-400">
                {preview.assets.duplicates.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          )}

          {committed && (
            <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
              Dados importados com sucesso. Consulte os módulos de Ativos e Colaboradores.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewCard({ title, created, skipped }: { title: string; created: number; skipped: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</div>
      <div className="mt-1 text-2xl font-bold text-green-600">{created}</div>
      <div className="text-xs text-slate-400">a criar · {skipped} ignorado(s)</div>
    </div>
  );
}
