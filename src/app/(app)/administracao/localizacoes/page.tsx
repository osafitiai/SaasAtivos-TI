import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { makeCrudActions } from "@/lib/crud";
import { branchOptions } from "@/lib/options";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec } from "@/components/CrudManager";

export const dynamic = "force-dynamic";

const crud = makeCrudActions({
  table: "locations",
  entityType: "location",
  revalidate: "/administracao/localizacoes",
  columns: [
    { name: "name" },
    { name: "type" },
    { name: "branch_id" },
    { name: "full_path" },
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

export default async function LocalizacoesPage() {
  const user = await requireSession();
  const branches = await branchOptions(user.tenant_id);
  const rows = await query(
    `select l.*, b.name as branch_name from locations l
       left join branches b on b.id = l.branch_id
      where l.tenant_id = $1 order by coalesce(l.full_path, l.name)`,
    [user.tenant_id]
  );

  const fields: FieldSpec[] = [
    { name: "name", label: "Nome", type: "text", required: true },
    {
      name: "type",
      label: "Tipo",
      type: "select",
      options: [
        "Prédio", "Andar", "Sala", "Setor", "Rack", "Posição",
        "Home Office", "Estoque da TI", "Manutenção externa", "Outro",
      ].map((v) => ({ value: v, label: v })),
    },
    { name: "branch_id", label: "Filial", type: "select", options: branches },
    { name: "full_path", label: "Caminho completo", type: "text", placeholder: "OSAFI > Sede RJ > 2º andar > Financeiro", colSpan: 2, help: "Estrutura hierárquica textual (opcional)" },
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
      <PageHeader title="Localizações físicas" subtitle="Estrutura hierárquica de locais" />
      <CrudManager
        title="localização"
        addLabel="Nova localização"
        fields={fields}
        rows={rows}
        columns={[
          { key: "name", label: "Nome" },
          { key: "type", label: "Tipo" },
          { key: "branch_name", label: "Filial" },
          { key: "full_path", label: "Caminho" },
        ]}
        saveAction={saveAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
