import { ASSET_STATUSES } from "@/lib/constants";
import { classifyReplacement, REPLACEMENT_COLORS } from "@/lib/replacement";

const COLOR_CLASSES: Record<string, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  gray: "bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300",
};

export function Badge({
  color = "gray",
  children,
}: {
  color?: string;
  children: React.ReactNode;
}) {
  return <span className={`badge ${COLOR_CLASSES[color] ?? COLOR_CLASSES.gray}`}>{children}</span>;
}

export function AssetStatusBadge({ status }: { status: string }) {
  const found = ASSET_STATUSES.find((s) => s.value === status);
  return <Badge color={found?.color ?? "gray"}>{status}</Badge>;
}

const MAINTENANCE_COLORS: Record<string, string> = {
  Aberta: "blue",
  "Em diagnóstico": "sky",
  "Aguardando aprovação": "amber",
  "Aguardando peça": "amber",
  "Enviada ao fornecedor": "violet",
  "Em execução": "indigo",
  Concluída: "green",
  Cancelada: "gray",
  "Sem reparo": "red",
  "Aguardando retirada": "cyan",
};

export function MaintenanceStatusBadge({ status }: { status: string }) {
  return <Badge color={MAINTENANCE_COLORS[status] ?? "gray"}>{status}</Badge>;
}

const EMPLOYEE_COLORS: Record<string, string> = {
  Ativo: "green",
  Afastado: "amber",
  Férias: "blue",
  Desligado: "red",
  Terceirizado: "violet",
  Inativo: "gray",
};

export function EmployeeStatusBadge({ status }: { status: string }) {
  return <Badge color={EMPLOYEE_COLORS[status] ?? "gray"}>{status}</Badge>;
}

export function ReplacementBadge({ date }: { date: string | null | undefined }) {
  const cls = classifyReplacement(date);
  return <Badge color={REPLACEMENT_COLORS[cls]}>{cls}</Badge>;
}
