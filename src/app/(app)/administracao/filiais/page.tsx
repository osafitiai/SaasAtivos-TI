import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { makeCrudActions } from "@/lib/crud";
import { companyOptions } from "@/lib/options";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec } from "@/components/CrudManager";

export const dynamic = "force-dynamic";

const crud = makeCrudActions({
  table: "branches",
  entityType: "branch",
  revalidate: "/administracao/filiais",
  columns: [
    { name: "company_id" },
    { name: "name" },
    { name: "code" },
    { name: "city" },
    { name: "state" },
    { name: "zip_code" },
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

export default async function FiliaisPage() {
  const user = await requireSession();
  const companies = await companyOptions(user.tenant_id);
  const rows = await query(
    `select b.*, coalesce(c.trade_name,c.legal_name) as company_name
       from branches b left join companies c on c.id = b.company_id
      where b.tenant_id = $1 order by b.name`,
    [user.tenant_id]
  );

  const fields: FieldSpec[] = [
    { name: "company_id", label: "Empresa", type: "select", required: true, options: companies, colSpan: 2 },
    { name: "name", label: "Nome da filial", type: "text", required: true },
    { name: "code", label: "Código", type: "text" },
    { name: "city", label: "Cidade", type: "text" },
    { name: "state", label: "Estado (UF)", type: "text" },
    { name: "zip_code", label: "CEP", type: "text" },
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

  return (
    <div>
      <PageHeader title="Filiais e unidades" subtitle="Unidades vinculadas às empresas" />
      <CrudManager
        title="filial"
        addLabel="Nova filial"
        fields={fields}
        rows={rows}
        columns={[
          { key: "name", label: "Filial" },
          { key: "company_name", label: "Empresa" },
          { key: "city", label: "Cidade" },
          { key: "state", label: "UF" },
        ]}
        saveAction={saveAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
