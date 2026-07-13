"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/ativos", label: "Ativos", icon: "💻" },
  { href: "/colaboradores", label: "Colaboradores", icon: "👥" },
  { href: "/movimentacoes", label: "Movimentações", icon: "🔄" },
  { href: "/manutencoes", label: "Manutenções", icon: "🔧" },
  { href: "/inventarios", label: "Inventários", icon: "📋" },
  { href: "/licencas", label: "Licenças", icon: "🔑" },
  { href: "/fornecedores", label: "Fornecedores", icon: "🏭" },
  { href: "/relatorios", label: "Relatórios", icon: "📈" },
  { href: "/aprovacoes", label: "Aprovações", icon: "✅" },
  { href: "/notificacoes", label: "Notificações", icon: "🔔" },
  { href: "/administracao", label: "Administração", icon: "⚙️" },
  { href: "/auditoria", label: "Auditoria", icon: "🛡️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão mobile */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost fixed left-3 top-3 z-40 lg:hidden"
        aria-label="Menu"
      >
        ☰
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            OS
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Ativos OSAFI
            </div>
            <div className="text-[11px] text-slate-400">Gestão patrimonial</div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 4rem)" }}>
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
