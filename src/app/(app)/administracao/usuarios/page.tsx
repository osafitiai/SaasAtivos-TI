import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { can } from "@/lib/rbac";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec } from "@/components/CrudManager";
import { EmptyState } from "@/components/EmptyState";
import { saveUser } from "./actions";
import type { UserRow } from "@/lib/types";

export const dynamic = "force-dynamic";

async function saveAction(fd: FormData) {
  "use server";
  return saveUser(fd);
}

export default async function UsuariosPage() {
  const user = await requireSession();
  if (!can(user, "users.manage")) {
    return (
      <div>
        <PageHeader title="Usuários e permissões" />
        <EmptyState icon="🔒" title="Acesso restrito" description="Você não tem permissão para gerenciar usuários." />
      </div>
    );
  }

  const rows = await query<UserRow>(
    "select * from users where tenant_id = $1 order by name",
    [user.tenant_id]
  );

  const fields: FieldSpec[] = [
    { name: "name", label: "Nome", type: "text", required: true },
    { name: "email", label: "E-mail", type: "email", required: true },
    {
      name: "role",
      label: "Perfil (RBAC)",
      type: "select",
      required: true,
      options: ROLES.filter((r) => r !== "superadmin").map((r) => ({ value: r, label: ROLE_LABELS[r] })),
    },
    {
      name: "scope_type",
      label: "Escopo de acesso",
      type: "select",
      options: [
        { value: "tenant", label: "Todo o tenant" },
        { value: "company", label: "Empresas específicas" },
        { value: "branch", label: "Filiais específicas" },
        { value: "department", label: "Apenas seu departamento" },
        { value: "self", label: "Apenas seus ativos" },
      ],
    },
    { name: "password", label: "Senha (deixe vazio para manter)", type: "text", help: "Mínimo 6 caracteres" },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "active", label: "Ativo" },
        { value: "blocked", label: "Bloqueado" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader title="Usuários e permissões" subtitle="Controle de acessos por perfil (RBAC)" />
      <CrudManager
        title="usuário"
        addLabel="Novo usuário"
        fields={fields}
        rows={rows as unknown as Record<string, unknown>[]}
        columns={[
          { key: "name", label: "Nome" },
          { key: "email", label: "E-mail" },
          { key: "role", label: "Perfil", format: "roleLabel" },
          { key: "status", label: "Status", format: "userStatus" },
          { key: "last_login_at", label: "Último acesso", format: "datetime" },
        ]}
        saveAction={saveAction}
      />
    </div>
  );
}
