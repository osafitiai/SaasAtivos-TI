import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { makeCrudActions } from "@/lib/crud";
import { companyOptions, employeeOptions } from "@/lib/options";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec } from "@/components/CrudManager";

export const dynamic = "force-dynamic";

const crud = makeCrudActions({
  table: "departments",
  entityType: "department",
  revalidate: "/administracao/departamentos",
  columns: [
    { name: "name" },
    { name: "code" },
    { name: "cost_center" },
    { name: "company_id" },
    { name: "manager_employee_id" },
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

export default async function DepartamentosPage() {
  const user = await requireSession();
  const [companies, employees] = await Promise.all([
    companyOptions(user.tenant_id),
    employeeOptions(user.tenant_id),
  ]);
  const rows = await query(
    `select d.*, coalesce(c.trade_name,c.legal_name) as company_name, e.full_name as manager_name,
            (select count(*) from employees em where em.department_id = d.id)::int as employees_count
       from departments d
       left join companies c on c.id = d.company_id
       left join employees e on e.id = d.manager_employee_id
      where d.tenant_id = $1 order by d.name`,
    [user.tenant_id]
  );

  const fields: FieldSpec[] = [
    { name: "name", label: "Nome", type: "text", required: true },
    { name: "code", label: "Código", type: "text" },
    { name: "cost_center", label: "Centro de custo", type: "text" },
    { name: "company_id", label: "Empresa", type: "select", options: companies },
    { name: "manager_employee_id", label: "Gestor responsável", type: "select", options: employees, colSpan: 2 },
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

  return (
    <div>
      <PageHeader title="Departamentos" subtitle="Setores e centros de custo" />
      <CrudManager
        title="departamento"
        addLabel="Novo departamento"
        fields={fields}
        rows={rows}
        columns={[
          { key: "name", label: "Departamento" },
          { key: "cost_center", label: "Centro de custo" },
          { key: "manager_name", label: "Gestor" },
          { key: "employees_count", label: "Colaboradores" },
        ]}
        saveAction={saveAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
