import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ImportWizard } from "@/components/ImportWizard";

export const dynamic = "force-dynamic";

export default async function ImportacaoPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Importação da planilha"
        subtitle="Assistente para importar a planilha OSAFI (colaboradores, ativos e manutenções)"
      />
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-300 flex flex-col gap-3">
        <div>
          <strong>Como funciona:</strong> selecione o arquivo <code>.xlsx</code> da planilha de ativos. O sistema lê as colunas de dados, detecta duplicidades e mostra uma pré-visualização antes de confirmar. Registros já existentes (mesmo número de série/patrimônio) não são duplicados.
        </div>
        <div>
          <a
            href="/planilha_exemplo.xlsx"
            download="planilha_exemplo.xlsx"
            className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline dark:text-blue-400"
          >
            📥 Baixar Planilha de Exemplo (.xlsx)
          </a>
        </div>
      </div>
      <ImportWizard />
    </div>
  );
}
