// Listas e parâmetros de referência (administráveis no futuro via lookup_values).

export const ROLES = [
  "superadmin",
  "admin",
  "gestor_ti",
  "tecnico_ti",
  "gestor_departamento",
  "financeiro",
  "auditor",
  "colaborador",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  gestor_ti: "Gestor de TI",
  tecnico_ti: "Técnico de TI",
  gestor_departamento: "Gestor de Departamento",
  financeiro: "Financeiro / Controladoria",
  auditor: "Auditor",
  colaborador: "Colaborador",
};

// Categorias e vida útil padrão (SRS 2.3)
export const DEFAULT_CATEGORIES: {
  name: string;
  code: string;
  icon: string;
  color: string;
  usefulLife: number;
  requiresSerial: boolean;
}[] = [
  { name: "Notebook", code: "NB", icon: "💻", color: "#2563eb", usefulLife: 3, requiresSerial: true },
  { name: "Desktop", code: "DT", icon: "🖥️", color: "#0ea5e9", usefulLife: 5, requiresSerial: true },
  { name: "Servidor", code: "SRV", icon: "🗄️", color: "#7c3aed", usefulLife: 5, requiresSerial: true },
  { name: "Monitor", code: "MON", icon: "🖵", color: "#059669", usefulLife: 5, requiresSerial: false },
  { name: "Periférico", code: "PER", icon: "🖱️", color: "#65a30d", usefulLife: 3, requiresSerial: false },
  { name: "Impressora", code: "IMP", icon: "🖨️", color: "#d97706", usefulLife: 5, requiresSerial: true },
  { name: "Tablet", code: "TAB", icon: "📱", color: "#db2777", usefulLife: 3, requiresSerial: true },
  { name: "Smartphone", code: "SMP", icon: "📲", color: "#e11d48", usefulLife: 2, requiresSerial: true },
  { name: "Switch/Roteador", code: "NET", icon: "🌐", color: "#0891b2", usefulLife: 5, requiresSerial: true },
  { name: "Licença de Software", code: "LIC", icon: "🔑", color: "#9333ea", usefulLife: 3, requiresSerial: false },
  { name: "Nobreak/UPS", code: "UPS", icon: "🔋", color: "#ca8a04", usefulLife: 5, requiresSerial: false },
  { name: "Outros", code: "OUT", icon: "📦", color: "#64748b", usefulLife: 3, requiresSerial: false },
];

// Status do ativo (SRS 6.7) com cores (SRS 35)
export const ASSET_STATUSES: { value: string; color: string }[] = [
  { value: "Disponível", color: "green" },
  { value: "Em uso", color: "blue" },
  { value: "Em estoque com a TI", color: "cyan" },
  { value: "Emprestado", color: "indigo" },
  { value: "Em manutenção", color: "amber" },
  { value: "Aguardando manutenção", color: "amber" },
  { value: "Em garantia", color: "blue" },
  { value: "Reservado", color: "violet" },
  { value: "Em trânsito", color: "sky" },
  { value: "Perdido", color: "red" },
  { value: "Furtado", color: "red" },
  { value: "Danificado", color: "orange" },
  { value: "Baixado", color: "gray" },
  { value: "Descartado", color: "gray" },
  { value: "Vendido", color: "gray" },
  { value: "Doado", color: "gray" },
];

export const ACTIVE_ASSET_STATUSES = [
  "Disponível",
  "Em uso",
  "Em estoque com a TI",
  "Emprestado",
  "Em manutenção",
  "Aguardando manutenção",
  "Em garantia",
  "Reservado",
  "Em trânsito",
];

export const WRITTEN_OFF_STATUSES = [
  "Baixado",
  "Descartado",
  "Vendido",
  "Doado",
  "Perdido",
  "Furtado",
];

export const PHYSICAL_CONDITIONS = [
  "Novo",
  "Excelente",
  "Bom",
  "Regular",
  "Ruim",
  "Irrecuperável",
];

export const EMPLOYEE_STATUSES = [
  "Ativo",
  "Afastado",
  "Férias",
  "Desligado",
  "Terceirizado",
  "Inativo",
];

// Tipos de movimentação (SRS 7.1)
export const MOVEMENT_TYPES = [
  "Entrega",
  "Devolução",
  "Transferência entre colaboradores",
  "Transferência entre departamentos",
  "Transferência entre filiais",
  "Envio para home office",
  "Retorno para a TI",
  "Empréstimo",
  "Reserva",
  "Envio para manutenção",
  "Retorno da manutenção",
  "Baixa",
  "Descarte",
  "Venda",
  "Doação",
  "Ajuste de inventário",
];

// Manutenção (SRS 9)
export const MAINTENANCE_TYPES = [
  "Preventiva",
  "Corretiva",
  "Upgrade",
  "Limpeza",
  "Troca de peça",
  "Garantia",
  "Diagnóstico",
  "Formatação",
  "Reparo externo",
  "Outros",
];

export const MAINTENANCE_STATUSES = [
  "Aberta",
  "Em diagnóstico",
  "Aguardando aprovação",
  "Aguardando peça",
  "Enviada ao fornecedor",
  "Em execução",
  "Concluída",
  "Cancelada",
  "Sem reparo",
  "Aguardando retirada",
];

export const MAINTENANCE_OPEN_STATUSES = MAINTENANCE_STATUSES.filter(
  (s) => s !== "Concluída" && s !== "Cancelada" && s !== "Sem reparo"
);

export const WRITE_OFF_REASONS = [
  "Obsolescência",
  "Dano irreparável",
  "Perda",
  "Furto",
  "Venda",
  "Doação",
  "Descarte ambiental",
  "Substituição",
  "Outro",
];

// Localizações iniciais (SRS 2.3)
export const DEFAULT_LOCATIONS = [
  "Sede - Térreo",
  "Sede - 1º Andar",
  "Sede - 2º Andar",
  "Filial SP",
  "Filial RJ",
  "Filial BH",
  "Home Office",
  "Estoque da TI",
  "Outro",
];

// Departamentos iniciais (SRS 5.5)
export const DEFAULT_DEPARTMENTS = [
  "T.I",
  "Controladoria",
  "Jurídico",
  "RH",
  "Projetos",
  "Financeiro",
  "Marketing",
  "Diretoria",
  "Administrativo",
  "Planejamento",
  "Cobrança",
];

// Classificação de substituição (SRS 6.9)
export type ReplacementClass =
  | "Vencido"
  | "Urgente"
  | "Atenção"
  | "Planejado"
  | "Regular"
  | "Sem previsão";
