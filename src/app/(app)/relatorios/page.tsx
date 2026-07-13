import { requireSession } from "@/lib/auth";
import { canSeeFinancials } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";

const REPORTS: { type: string; title: string; desc: string; financial?: boolean }[] = [
  { type: "inventario_geral", title: "Inventário geral", desc: "Todos os ativos com responsável e localização" },
  { type: "ativos_por_colaborador", title: "Ativos por colaborador", desc: "Equipamentos sob responsabilidade" },
  { type: "ativos_por_departamento", title: "Ativos por departamento", desc: "Quantidade e valor por setor", financial: true },
  { type: "ativos_sem_responsavel", title: "Ativos sem responsável", desc: "Em uso sem colaborador vinculado" },
  { type: "ativos_disponiveis", title: "Ativos disponíveis", desc: "Prontos para entrega" },
  { type: "manutencao", title: "Histórico de manutenção", desc: "Ordens de serviço e custos", financial: true },
  { type: "custos_manutencao_ativo", title: "Custos de manutenção por ativo", desc: "Custo acumulado", financial: true },
  { type: "garantias_vencer", title: "Garantias a vencer", desc: "Próximos 180 dias" },
  { type: "substituicoes_previstas", title: "Substituições previstas", desc: "Planejamento de troca" },
  { type: "ativos_baixados", title: "Ativos baixados", desc: "Baixas, descartes e perdas" },
  { type: "licencas", title: "Licenças de software", desc: "Assinaturas e vencimentos", financial: true },
  { type: "movimentacoes", title: "Histórico de movimentações", desc: "Entregas, devoluções, transferências" },
  { type: "patrimonio_centro_custo", title: "Patrimônio por centro de custo", desc: "Valor consolidado", financial: true },
];

export default async function RelatoriosPage() {
  const user = await requireSession();
  const showMoney = canSeeFinancials(user);
  const list = REPORTS.filter((r) => !r.financial || showMoney);

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Exportação em XLSX e CSV" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <div key={r.type} className="card flex flex-col p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{r.title}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{r.desc}</p>
            <div className="mt-4 flex gap-2">
              <a href={`/api/reports/${r.type}?format=xlsx`} className="btn-primary flex-1 text-sm">
                ⬇ XLSX
              </a>
              <a href={`/api/reports/${r.type}?format=csv`} className="btn-secondary flex-1 text-sm">
                ⬇ CSV
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
