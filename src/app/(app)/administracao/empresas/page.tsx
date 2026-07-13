import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { makeCrudActions } from "@/lib/crud";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec } from "@/components/CrudManager";

export const dynamic = "force-dynamic";

const crud = makeCrudActions({
  table: "companies",
  entityType: "company",
  revalidate: "/administracao/empresas",
  columns: [
    { name: "legal_name" },
    { name: "trade_name" },
    { name: "cnpj" },
    { name: "state_registration" },
    { name: "email" },
    { name: "phone" },
    { name: "admin_responsible" },
    { name: "status" },
  ],
});

async function saveAction(fd: FormData) {
  "use server";
  return crud.save(fd);
}
async function deleteAction(fd: FormData) {
  "use server";
  return crud.remove(fd);
}

const fields: FieldSpec[] = [
  { name: "legal_name", label: "Razão social", type: "text", required: true, colSpan: 2 },
  { name: "trade_name", label: "Nome fantasia", type: "text" },
  { name: "cnpj", label: "CNPJ", type: "text", placeholder: "00.000.000/0000-00" },
  { name: "state_registration", label: "Inscrição estadual", type: "text" },
  { name: "admin_responsible", label: "Responsável administrativo", type: "text" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "phone", label: "Telefone", type: "text" },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "active", label: "Ativa" },
      { value: "inactive", label: "Inativa" },
    ],
  },
];

export default async function EmpresasPage() {
  const user = await requireSession();
  const rows = await query(
    `select * from companies where tenant_id = $1 order by legal_name`,
    [user.tenant_id]
  );

  return (
    <div>
      <PageHeader title="Empresas e coligadas" subtitle="Cadastro de empresas do grupo" />
      <CrudManager
        title="empresa"
        addLabel="Nova empresa"
        fields={fields}
        rows={rows}
        columns={[
          { key: "legal_name", label: "Razão social" },
          { key: "trade_name", label: "Nome fantasia" },
          { key: "cnpj", label: "CNPJ" },
          { key: "status", label: "Status", format: "activeBadge" },
        ]}
        saveAction={saveAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
