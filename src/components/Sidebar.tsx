"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
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
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [ativosOpen, setAtivosOpen] = useState(true);

  const currentGroup = searchParams.get("group") || "";

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
          {NAV.map((item, index) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const element = (
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

            // Renderiza o menu "Ativos" logo após o Dashboard
            if (index === 0) {
              const showAtivosActive = pathname === "/ativos" && !currentGroup;
              return (
                <div key="group-dashboard-ativos" className="space-y-0.5">
                  {element}
                  
                  {/* Item Pai Ativos */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setAtivosOpen(!ativosOpen)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                        showAtivosActive
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Link
                        href="/ativos"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false);
                        }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-base">💻</span>
                        <span>Ativos</span>
                      </Link>
                      <span className="text-[10px] text-slate-400">
                        {ativosOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {ativosOpen && (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-slate-100 pl-2 dark:border-slate-800">
                        {[
                          { group: "computadores", label: "Computadores", icon: "💻" },
                          { group: "monitores", label: "Monitores", icon: "🖥️" },
                          { group: "impressoras", label: "Impressoras", icon: "🖨️" },
                          { group: "perifericos", label: "Periféricos", icon: "🖱️" },
                        ].map((sub) => {
                          const subActive = pathname === "/ativos" && currentGroup === sub.group;
                          return (
                            <Link
                              key={sub.group}
                              href={`/ativos?group=${sub.group}`}
                              onClick={() => setOpen(false)}
                              className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium transition ${
                                subActive
                                  ? "bg-brand-50/70 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <span>{sub.icon}</span>
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return element;
          })}
        </nav>
      </aside>
    </>
  );
}
