import {
  categoryOptions,
  companyOptions,
  branchOptions,
  departmentOptions,
  locationOptions,
  supplierOptions,
  employeeOptions,
} from "./options";

export async function loadAssetFormOptions(tenantId: string | null) {
  const [categories, companies, branches, departments, locations, suppliers, employees] =
    await Promise.all([
      categoryOptions(tenantId),
      companyOptions(tenantId),
      branchOptions(tenantId),
      departmentOptions(tenantId),
      locationOptions(tenantId),
      supplierOptions(tenantId),
      employeeOptions(tenantId, false),
    ]);
  return { categories, companies, branches, departments, locations, suppliers, employees };
}
