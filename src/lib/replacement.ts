import type { ReplacementClass } from "./constants";

/** Calcula a data prevista de substituição: data_aquisicao + vida_util_em_anos. */
export function computeReplacementDate(
  acquisitionDate: string | Date | null | undefined,
  usefulLifeYears: number | null | undefined
): Date | null {
  if (!acquisitionDate || !usefulLifeYears) return null;
  const d = typeof acquisitionDate === "string" ? new Date(acquisitionDate) : acquisitionDate;
  if (Number.isNaN(d.getTime())) return null;
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + usefulLifeYears);
  return result;
}

/** Classificação da substituição (SRS 6.9). */
export function classifyReplacement(
  replacementDate: string | Date | null | undefined
): ReplacementClass {
  if (!replacementDate) return "Sem previsão";
  const d = typeof replacementDate === "string" ? new Date(replacementDate) : replacementDate;
  if (Number.isNaN(d.getTime())) return "Sem previsão";

  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Vencido";
  if (diffDays <= 90) return "Urgente";
  if (diffDays <= 180) return "Atenção";
  if (diffDays <= 365) return "Planejado";
  return "Regular";
}

export const REPLACEMENT_COLORS: Record<ReplacementClass, string> = {
  Vencido: "red",
  Urgente: "red",
  Atenção: "amber",
  Planejado: "blue",
  Regular: "green",
  "Sem previsão": "gray",
};
