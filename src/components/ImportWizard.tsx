"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ImportError {
  row: number;
  column: string;
  message: string;
}

interface ImportResponse {
  ok: boolean;
  validCount: number;
  invalidCount: number;
  errors: ImportError[];
  importedCount: number;
  commitExecuted: boolean;
}

export function ImportWizard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [committed, setCommitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(commit: boolean, importValidOnly = false) {
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("commit", String(commit));
    fd.set("import_valid_only", String(importValidOnly));

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const json = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(json.error || "Falha na importação.");
        return;
      }
      setPreview(json);
      if (json.commitExecuted) {
        setCommitted(true);
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError("Erro de rede ao processar importação.");
    }
  }

  const downloadErrorReport = () => {
    if (!preview || !preview.errors.length) return;
    const header = "RELATÓRIO DE ERROS DE IMPORTAÇÃO\n=================================\n\n";
    const content = preview.errors
      .map((e) => `Linha ${e.row} | Coluna: ${e.column} | Erro: ${e.message}`)
      .join("\n");
    const blob = new Blob([header + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio_erros_importacao.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCancel = () => {
    setPreview(null);
    setFile(null);
    setCommitted(false);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <label className="label font-bold text-slate-700 dark:text-slate-200">Arquivo da planilha (.xlsx)</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          className="input mt-1"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setCommitted(false);
          }}
        />
        <div className="mt-4 flex gap-2">
          <button
            className="btn-primary px-6"
            disabled={!file || loading || preview !== null}
            onClick={() => send(false)}
          >
            {loading ? "Validando..." : "Analisar e Validar Planilha"}
          </button>
          {preview && !committed && (
            <button className="btn-secondary" onClick={handleCancel}>
              Cancelar e Limpar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {preview && (
        <div className="card p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 border-b pb-2">
            {committed ? "✅ Importação Concluída" : "Relatório de Análise da Planilha"}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Válidos</div>
              <div className="mt-1 text-3xl font-extrabold text-green-600">{preview.validCount}</div>
              <div className="text-xs text-slate-400 mt-1">prontos para serem importados</div>
            </div>

            <div className="rounded-lg border border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Inválidos</div>
              <div className="mt-1 text-3xl font-extrabold text-red-600">{preview.invalidCount}</div>
              <div className="text-xs text-slate-400 mt-1">linhas contendo algum erro</div>
            </div>
          </div>

          {/* Se houver erros */}
          {preview.errors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider">
                  Erros detectados ({preview.errors.length})
                </h4>
                <button
                  type="button"
                  onClick={downloadErrorReport}
                  className="btn-secondary text-xs px-3 py-1 font-bold"
                >
                  📥 Baixar Relatório de Erros (.txt)
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-red-100 bg-red-50/20 dark:border-red-900/20">
                <table className="min-w-full divide-y divide-red-100 dark:divide-red-900/20 text-sm text-left">
                  <thead className="bg-red-50/50 dark:bg-red-900/10 font-bold text-red-800 dark:text-red-400">
                    <tr>
                      <th className="px-4 py-2">Linha</th>
                      <th className="px-4 py-2">Coluna</th>
                      <th className="px-4 py-2">Descrição do Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50/50 dark:divide-red-900/10 text-slate-700 dark:text-slate-300">
                    {preview.errors.map((e, idx) => (
                      <tr key={idx} className="hover:bg-red-50/10">
                        <td className="px-4 py-2 font-mono font-semibold">{e.row}</td>
                        <td className="px-4 py-2 font-mono">{e.column}</td>
                        <td className="px-4 py-2">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ações pós-validação */}
          {!committed && (
            <div className="flex flex-col sm:flex-row gap-2 border-t pt-4">
              {preview.validCount > 0 && (
                <button
                  type="button"
                  className="btn-primary flex-1 font-bold"
                  onClick={() => send(true, true)}
                >
                  Importar Apenas os Registros Válidos ({preview.validCount})
                </button>
              )}
              <button
                type="button"
                className="btn-secondary flex-1 font-bold"
                onClick={handleCancel}
              >
                Cancelar para Corrigir Toda Planilha
              </button>
            </div>
          )}

          {committed && (
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300 font-medium">
              🎉 Sucesso! Foram importados <strong>{preview.importedCount}</strong> ativos com êxito para o sistema.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
