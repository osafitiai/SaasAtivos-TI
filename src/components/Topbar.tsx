"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";

export function Topbar({
  user,
  unreadCount,
}: {
  user: SessionUser;
  unreadCount: number;
}) {
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:px-6">
      <div className="pl-10 lg:pl-0">
        <span className="text-sm text-slate-400">Bem-vindo,</span>{" "}
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {user.name.split(" ")[0]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/notificacoes" className="btn-ghost relative" aria-label="Notificações">
          🔔
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <button onClick={toggleTheme} className="btn-ghost" aria-label="Alternar tema">
          {dark ? "☀️" : "🌙"}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-400">{ROLE_LABELS[user.role]}</div>
            </div>
          </button>

          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                  <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {user.email}
                  </div>
                </div>
                <Link
                  href="/configuracoes"
                  className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  ⚙️ Configurações
                </Link>
                <form action="/logout" method="post">
                  <button
                    type="submit"
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    🚪 Sair
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
