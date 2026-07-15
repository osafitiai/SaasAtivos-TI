import type { Role } from "./constants";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_id: string | null;
}

export interface SessionUser {
  id: string;
  tenant_id: string | null;
  name: string;
  email: string;
  role: Role;
  scope_type: string;
  scope_ids: string[];
  employee_id: string | null;
  is_platform_admin: boolean;
}

export interface Company {
  id: string;
  tenant_id: string;
  legal_name: string;
  trade_name: string | null;
  cnpj: string | null;
  state_registration: string | null;
  status: string;
  phone: string | null;
  email: string | null;
  admin_responsible: string | null;
  created_at: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  code: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: string;
  company_name?: string;
}

export interface Department {
  id: string;
  tenant_id: string;
  company_id: string | null;
  name: string;
  code: string | null;
  cost_center: string | null;
  manager_employee_id: string | null;
  status: string;
  company_name?: string;
  manager_name?: string;
  employees_count?: number;
}

export interface Location {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  parent_id: string | null;
  name: string;
  type: string | null;
  full_path: string | null;
  status: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  legal_name: string | null;
  trade_name: string;
  cnpj: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  service_types: string[] | null;
  status: string;
  notes: string | null;
}

export interface AssetCategory {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  icon: string | null;
  color: string | null;
  default_useful_life_years: number | null;
  requires_serial_number: boolean;
  requires_asset_tag: boolean;
  assignable_to_employee: boolean;
  depreciation_type: string | null;
  depreciation_rate: number | null;
  custom_fields_schema: unknown;
  status: string;
  assets_count?: number;
}

export interface Employee {
  id: string;
  tenant_id: string;
  company_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  manager_id: string | null;
  user_id: string | null;
  full_name: string;
  email: string | null;
  registration_number: string | null;
  job_title: string | null;
  employment_type: string | null;
  cost_center: string | null;
  phone: string | null;
  hire_date: string | null;
  termination_date: string | null;
  status: string;
  photo_url: string | null;
  notes: string | null;
  // agregados
  department_name?: string;
  company_name?: string;
  assets_count?: number;
  assets_value?: number;
}

export interface Asset {
  id: string;
  tenant_id: string;
  company_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  category_id: string;
  location_id: string | null;
  current_employee_id: string | null;
  supplier_id: string | null;
  replacement_asset_id: string | null;
  name: string;
  internal_code: string | null;
  asset_tag: string | null;
  serial_number: string | null;
  brand: string | null;
  model: string | null;
  manufacturer: string | null;
  color: string | null;
  description: string | null;
  status: string;
  physical_condition: string | null;
  acquisition_date: string | null;
  acquisition_value: string | null;
  invoice_number: string | null;
  invoice_key: string | null;
  invoice_date: string | null;
  purchase_order: string | null;
  useful_life_years: number | null;
  replacement_date: string | null;
  replacement_status: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  technical_data: Record<string, unknown> | null;
  custom_fields: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // agregados
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  employee_name?: string;
  location_name?: string;
  full_path?: string | null;
  department_name?: string;
  company_name?: string;
  supplier_name?: string;
  nf_doc_id?: string | null;
}

export interface AssetMovement {
  id: string;
  tenant_id: string;
  asset_id: string;
  movement_type: string;
  from_employee_id: string | null;
  to_employee_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  from_status: string | null;
  to_status: string | null;
  performed_by_user_id: string;
  reason: string | null;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
  // agregados
  asset_name?: string;
  from_employee_name?: string;
  to_employee_name?: string;
  from_location_name?: string;
  to_location_name?: string;
  performed_by_name?: string;
}

export interface Maintenance {
  id: string;
  tenant_id: string;
  asset_id: string;
  supplier_id: string | null;
  protocol: string | null;
  type: string;
  status: string;
  problem_description: string | null;
  diagnosis: string | null;
  solution: string | null;
  parts_cost: string | null;
  service_cost: string | null;
  total_cost: string | null;
  opened_at: string;
  expected_at: string | null;
  completed_at: string | null;
  requested_by_user_id: string | null;
  assigned_to_user_id: string | null;
  replacement_asset_id: string | null;
  warranty_service: boolean;
  notes: string | null;
  // agregados
  asset_name?: string;
  asset_tag?: string;
  supplier_name?: string;
}

export interface SoftwareLicense {
  id: string;
  tenant_id: string;
  company_id: string | null;
  name: string;
  vendor: string | null;
  plan: string | null;
  quantity_purchased: number;
  quantity_used: number;
  starts_at: string | null;
  expires_at: string | null;
  billing_cycle: string | null;
  recurring_cost: string | null;
  supplier_id: string | null;
  status: string;
}

export interface NotificationRow {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name?: string;
}

export interface UserRow {
  id: string;
  tenant_id: string | null;
  name: string;
  email: string;
  role: Role;
  scope_type: string;
  scope_ids: string[];
  employee_id: string | null;
  status: string;
  is_platform_admin: boolean;
  last_login_at: string | null;
  created_at: string;
}
