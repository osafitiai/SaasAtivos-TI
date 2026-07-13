import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { makeCrudActions } from "@/lib/crud";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec } from "@/components/CrudManager";

export const dynamic = "force-dynamic";

const crud = makeCrudActions({
  table: "asset_categories",
  entityType: "asset_category",
  revalidate: "/administracao/categorias",
  columns: [
    { name: "name" },
    { name: "code" },
    { name: "icon" },
    { name: "color" },
    { name: "default_useful_life_years", type: "number" },
    { name: "requires_serial_number", type: "boolean" },
    { name: "requires_asset_tag", type: "boolean" },
    { name: "assignable_to_employee", type: "boolean" },
    { name: "depreciation_rate", type: "number" },
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
  { name: "name", label: "Nome", type: "text", required: true },
  { name: "code", label: "Código", type: "text" },
  { name: "icon", label: "Ícone (emoji)", type: "text", placeholder: "💻" },
  { name: "color", label: "Cor (hex)", type: "text", placeholder: "#2563eb" },
  { name: "default_useful_life_years", label: "Vida útil padrão (anos)", type: "number" },
  { name: "depreciation_rate", label: "Taxa de depreciação (%)", type: "number" },
  { name: "requires_serial_number", label: "Exige número de série", type: "checkbox" },
  { name: "requires_asset_tag", label: "Exige patrimônio", type: "checkbox" },
  { name: "assignable_to_employee", label: "Permite associação a usuário", type: "checkbox" },
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

export default async function CategoriasPage() {
  const user = await requireSession();
  const rows = await query(
    `select c.*, (select count(*) from assets a where a.category_id = c.id and a.deleted_at is null)::int as assets_count
       from asset_categories c where c.tenant_id = $1 order by c.name`,
    [user.tenant_id]
  );

  return (
    <div>
      <PageHeader title="Categorias de ativos" subtitle="Vida útil, ícones e regras por categoria" />
      <CrudManager
        title="categoria"
        addLabel="Nova categoria"
        fields={fields}
        rows={rows}
        columns={[
          { key: "icon", label: "", format: "icon" },
          { key: "name", label: "Categoria" },
          { key: "default_useful_life_years", label: "Vida útil (anos)" },
          { key: "requires_serial_number", label: "Exige série", format: "bool" },
          { key: "assets_count", label: "Ativos" },
        ]}
        saveAction={saveAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
