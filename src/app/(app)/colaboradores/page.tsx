import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { makeCrudActions } from "@/lib/crud";
import { companyOptions, departmentOptions, branchOptions } from "@/lib/options";
import { canSeeFinancials } from "@/lib/rbac";
import { EMPLOYEE_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { CrudManager, type FieldSpec, type ColumnSpec } from "@/components/CrudManager";

export const dynamic = "force-dynamic";

const crud = makeCrudActions({
  table: "employees",
  entityType: "employee",
  revalidate: "/colaboradores",
  columns: [
    { name: "full_name" },
    { name: "email" },
    { name: "company_id" },
    { name: "department_id" },
    { name: "job_title" },
    { name: "cost_center" },
    { name: "hire_date", type: "date" },
    { name: "termination_date", type: "date" },
    { name: "status" },
    { name: "notes" },
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

export default async function ColaboradoresPage() {
  const user = await requireSession();
  const showMoney = canSeeFinancials(user);
  const [companies, departments, branches] = await Promise.all([
    companyOptions(user.tenant_id),
    departmentOptions(user.tenant_id),
    branchOptions(user.tenant_id),
  ]);

  const rows = await query(
    `select e.*, d.name as department_name, coalesce(c.trade_name,c.legal_name) as company_name,
            (select count(*) from assets a where a.current_employee_id = e.id and a.deleted_at is null)::int as assets_count,
            (select coalesce(sum(a.acquisition_value),0) from assets a where a.current_employee_id = e.id and a.deleted_at is null) as assets_value
       from employees e
       left join departments d on d.id = e.department_id
       left join companies c on c.id = e.company_id
      where e.tenant_id = $1 order by e.full_name`,
    [user.tenant_id]
  );

  const fields: FieldSpec[] = [
    { name: "full_name", label: "Nome completo", type: "text", required: true, colSpan: 2 },
    { name: "email", label: "E-mail corporativo", type: "email" },
    { name: "company_id", label: "Empresa", type: "select", options: companies },
    { name: "department_id", label: "Departamento", type: "select", options: departments },
    { name: "job_title", label: "Cargo", type: "text" },
    { name: "cost_center", label: "Centro de custo", type: "text" },
    { name: "hire_date", label: "Data de admissão", type: "date" },
    { name: "termination_date", label: "Data de desligamento", type: "date" },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: EMPLOYEE_STATUSES.map((v) => ({ value: v, label: v })),
    },
    { name: "notes", label: "Observações", type: "textarea" },
  ];

  const columns: ColumnSpec[] = [
    { key: "full_name", label: "Nome", linkPrefix: "/colaboradores/" },
    { key: "department_name", label: "Departamento" },
    { key: "job_title", label: "Cargo" },
    { key: "email", label: "E-mail" },
    { key: "assets_count", label: "Ativos" },
    ...(showMoney ? [{ key: "assets_value", label: "Valor sob resp.", format: "currency" as const }] : []),
    { key: "status", label: "Status", format: "employeeStatus" },
  ];

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        subtitle="Cadastro de pessoas e ativos sob responsabilidade"
      />
      <CrudManager
        title="colaborador"
        addLabel="Novo colaborador"
        fields={fields}
        rows={rows}
        columns={columns}
        saveAction={saveAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
