import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { makeCrudActions } from "@/lib/crud";
import { companyOptions, supplierOptions } from "@/lib/options";
import { canSeeFinancials } from "@/lib/rbac";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec, type ColumnSpec } from "@/components/CrudManager";

export const dynamic = "force-dynamic";

const crud = makeCrudActions({
  table: "software_licenses",
  entityType: "software_license",
  revalidate: "/licencas",
  columns: [
    { name: "name" },
    { name: "vendor" },
    { name: "plan" },
    { name: "company_id" },
    { name: "supplier_id" },
    { name: "quantity_purchased", type: "number" },
    { name: "quantity_used", type: "number" },
    { name: "starts_at", type: "date" },
    { name: "expires_at", type: "date" },
    { name: "billing_cycle" },
    { name: "recurring_cost", type: "number" },
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

export default async function LicencasPage() {
  const user = await requireSession();
  const showMoney = canSeeFinancials(user);
  const [companies, suppliers] = await Promise.all([
    companyOptions(user.tenant_id),
    supplierOptions(user.tenant_id),
  ]);

  const rows = await query(
    `select l.*, coalesce(c.trade_name,c.legal_name) as company_name, s.trade_name as supplier_name
       from software_licenses l
       left join companies c on c.id = l.company_id
       left join suppliers s on s.id = l.supplier_id
      where l.tenant_id = $1 order by l.name`,
    [user.tenant_id]
  );

  const fields: FieldSpec[] = [
    { name: "name", label: "Nome / Produto", type: "text", required: true, colSpan: 2 },
    { name: "vendor", label: "Fabricante", type: "text" },
    { name: "plan", label: "Plano", type: "text" },
    { name: "company_id", label: "Empresa", type: "select", options: companies },
    { name: "supplier_id", label: "Fornecedor", type: "select", options: suppliers },
    { name: "quantity_purchased", label: "Qtd. adquirida", type: "number" },
    { name: "quantity_used", label: "Qtd. em uso", type: "number" },
    { name: "starts_at", label: "Início", type: "date" },
    { name: "expires_at", label: "Expiração", type: "date" },
    {
      name: "billing_cycle",
      label: "Recorrência",
      type: "select",
      options: ["Mensal", "Anual", "Único"].map((v) => ({ value: v, label: v })),
    },
    { name: "recurring_cost", label: "Custo recorrente (BRL)", type: "number" },
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

  const columns: ColumnSpec[] = [
    { key: "name", label: "Licença" },
    { key: "vendor", label: "Fabricante" },
    { key: "quantity_used", label: "Uso / Total", format: "licenseSeats" },
    { key: "expires_at", label: "Expiração", format: "expiresBadge" },
    ...(showMoney ? [{ key: "recurring_cost", label: "Custo", format: "currency" as const }] : []),
  ];

  return (
    <div>
      <PageHeader title="Licenças de software" subtitle="Controle de assinaturas e vencimentos" />
      <CrudManager
        title="licença"
        addLabel="Nova licença"
        fields={fields}
        rows={rows}
        columns={columns}
        saveAction={saveAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
