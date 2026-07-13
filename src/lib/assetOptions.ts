import {
  categoryOptions,
  companyOptions,
  branchOptions,
  departmentOptions,
  locationOptions,
  supplierOptions,
} from "./options";

export async function loadAssetFormOptions(tenantId: string | null) {
  const [categories, companies, branches, departments, locations, suppliers] =
    await Promise.all([
      categoryOptions(tenantId),
      companyOptions(tenantId),
      branchOptions(tenantId),
      departmentOptions(tenantId),
      locationOptions(tenantId),
      supplierOptions(tenantId),
    ]);
  return { categories, companies, branches, departments, locations, suppliers };
}
