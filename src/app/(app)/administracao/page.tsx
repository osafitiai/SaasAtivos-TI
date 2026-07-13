import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const ITEMS = [
  { href: "/administracao/empresas", icon: "🏢", label: "Empresas e coligadas", desc: "Razão social, CNPJ, coligadas" },
  { href: "/administracao/filiais", icon: "🏬", label: "Filiais", desc: "Unidades por empresa" },
  { href: "/administracao/departamentos", icon: "🗂️", label: "Departamentos", desc: "Setores e centros de custo" },
  { href: "/administracao/localizacoes", icon: "📍", label: "Localizações", desc: "Estrutura física hierárquica" },
  { href: "/administracao/categorias", icon: "🏷️", label: "Categorias de ativos", desc: "Vida útil, ícones, regras" },
  { href: "/administracao/usuarios", icon: "👤", label: "Usuários e permissões", desc: "Acessos e perfis (RBAC)" },
  { href: "/administracao/importacao", icon: "📥", label: "Importação da planilha", desc: "Assistente de importação XLSX" },
  { href: "/fornecedores", icon: "🏭", label: "Fornecedores", desc: "Compra, garantia, manutenção" },
];

export default function AdminPage() {
  return (
    <div>
      <PageHeader title="Administração" subtitle="Configuração de cadastros base e acessos" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className="card p-5 transition hover:shadow-md">
            <div className="mb-2 text-3xl">{it.icon}</div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">{it.label}</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{it.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
