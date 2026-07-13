import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { makeCrudActions } from "@/lib/crud";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec } from "@/components/CrudManager";

export const dynamic = "force-dynamic";

const crud = makeCrudActions({
  table: "suppliers",
  entityType: "supplier",
  revalidate: "/fornecedores",
  columns: [
    { name: "trade_name" },
    { name: "legal_name" },
    { name: "cnpj" },
    { name: "contact_name" },
    { name: "email" },
    { name: "phone" },
    { name: "service_types", type: "array" },
    { name: "notes" },
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
  { name: "trade_name", label: "Nome fantasia", type: "text", required: true },
  { name: "legal_name", label: "Razão social", type: "text" },
  { name: "cnpj", label: "CNPJ", type: "text" },
  { name: "contact_name", label: "Contato", type: "text" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "phone", label: "Telefone", type: "text" },
  { name: "service_types", label: "Serviços prestados", type: "text", placeholder: "Manutenção, Compra, Garantia", colSpan: 2, help: "Separe por vírgula" },
  { name: "notes", label: "Observações", type: "textarea" },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "active", label: "Ativo" },
      { value: "inactive", label: "Inativo" },
    ],
  },
];

export default async function FornecedoresPage() {
  const user = await requireSession();
  const rows = await query(
    `select * from suppliers where tenant_id = $1 order by trade_name`,
    [user.tenant_id]
  );

  return (
    <div>
      <PageHeader title="Fornecedores" subtitle="Compra, garantia, manutenção e licenças" />
      <CrudManager
        title="fornecedor"
        addLabel="Novo fornecedor"
        fields={fields}
        rows={rows}
        columns={[
          { key: "trade_name", label: "Fornecedor" },
          { key: "cnpj", label: "CNPJ" },
          { key: "contact_name", label: "Contato" },
          { key: "phone", label: "Telefone" },
          { key: "status", label: "Status", format: "activeBadge" },
        ]}
        saveAction={saveAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
