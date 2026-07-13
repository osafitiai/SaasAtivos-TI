import Link from "next/link";

const ACCENTS: Record<string, string> = {
  blue: "border-l-brand-500",
  green: "border-l-green-500",
  amber: "border-l-amber-500",
  red: "border-l-red-500",
  violet: "border-l-violet-500",
  cyan: "border-l-cyan-500",
  gray: "border-l-slate-400",
};

export function StatCard({
  label,
  value,
  hint,
  accent = "blue",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <div
      className={`card border-l-4 ${ACCENTS[accent] ?? ACCENTS.blue} p-4 transition ${
        href ? "hover:shadow-md" : ""
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
