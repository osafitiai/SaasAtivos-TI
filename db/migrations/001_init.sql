-- ============================================================================
-- Gestão de Ativos OSAFI — Schema inicial (PostgreSQL)
-- Baseado no SRS, seções 21 e 22.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Função utilitária para manter updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Planos e Tenants
-- ----------------------------------------------------------------------------
create table plans (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  max_assets integer,
  max_employees integer,
  price_cents integer default 0,
  created_at timestamptz not null default now()
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  slug varchar unique not null,
  status varchar not null default 'active',
  plan_id uuid references plans(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_tenants_updated before update on tenants
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Empresas / Filiais / Departamentos / Localizações
-- ----------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  legal_name varchar not null,
  trade_name varchar,
  cnpj varchar,
  state_registration varchar,
  status varchar not null default 'active',
  address jsonb,
  phone varchar,
  email varchar,
  logo_url varchar,
  admin_responsible varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_companies_updated before update on companies
  for each row execute function set_updated_at();

create table branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  name varchar not null,
  code varchar,
  address jsonb,
  city varchar,
  state varchar,
  zip_code varchar,
  status varchar not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_branches_updated before update on branches
  for each row execute function set_updated_at();

create table departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  name varchar not null,
  code varchar,
  cost_center varchar,
  manager_employee_id uuid,
  status varchar not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_departments_updated before update on departments
  for each row execute function set_updated_at();

create table locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  parent_id uuid references locations(id) on delete set null,
  name varchar not null,
  type varchar,
  full_path varchar,
  status varchar not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_locations_updated before update on locations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Usuários do sistema (autenticação) e permissões
-- ----------------------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name varchar not null,
  email varchar not null,
  password_hash varchar not null,
  role varchar not null default 'colaborador',
  -- escopo de acesso: 'tenant' | 'company' | 'branch' | 'department' | 'self'
  scope_type varchar not null default 'tenant',
  scope_ids jsonb not null default '[]'::jsonb,
  employee_id uuid,
  status varchar not null default 'active',
  is_platform_admin boolean not null default false,
  session_version integer not null default 1,
  notification_prefs jsonb not null default '{}'::jsonb,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_users_tenant_email on users (tenant_id, lower(email));
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Colaboradores
-- ----------------------------------------------------------------------------
create table employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  manager_id uuid references employees(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  full_name varchar not null,
  email varchar,
  registration_number varchar,
  job_title varchar,
  employment_type varchar,
  cost_center varchar,
  phone varchar,
  hire_date date,
  termination_date date,
  status varchar not null default 'Ativo',
  photo_url varchar,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_employees_updated before update on employees
  for each row execute function set_updated_at();

-- FK tardia de departments.manager e users.employee
alter table departments
  add constraint fk_departments_manager
  foreign key (manager_employee_id) references employees(id) on delete set null;
alter table users
  add constraint fk_users_employee
  foreign key (employee_id) references employees(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Fornecedores
-- ----------------------------------------------------------------------------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  legal_name varchar,
  trade_name varchar not null,
  cnpj varchar,
  contact_name varchar,
  email varchar,
  phone varchar,
  address jsonb,
  service_types jsonb,
  status varchar not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated before update on suppliers
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Categorias de ativos
-- ----------------------------------------------------------------------------
create table asset_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name varchar not null,
  code varchar,
  icon varchar,
  color varchar,
  default_useful_life_years integer,
  requires_serial_number boolean not null default false,
  requires_asset_tag boolean not null default false,
  assignable_to_employee boolean not null default true,
  depreciation_type varchar,
  depreciation_rate numeric(6,2),
  custom_fields_schema jsonb,
  status varchar not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_asset_categories_updated before update on asset_categories
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Ativos
-- ----------------------------------------------------------------------------
create table assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  category_id uuid not null references asset_categories(id),
  location_id uuid references locations(id) on delete set null,
  current_employee_id uuid references employees(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  replacement_asset_id uuid references assets(id) on delete set null,
  name varchar not null,
  internal_code varchar,
  asset_tag varchar,
  serial_number varchar,
  brand varchar,
  model varchar,
  manufacturer varchar,
  color varchar,
  description text,
  status varchar not null default 'Disponível',
  physical_condition varchar,
  acquisition_date date,
  acquisition_value numeric(14,2),
  invoice_number varchar,
  invoice_key varchar,
  invoice_date date,
  purchase_order varchar,
  useful_life_years integer,
  replacement_date date,
  replacement_status varchar,
  warranty_start_date date,
  warranty_end_date date,
  technical_data jsonb,
  custom_fields jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_assets_updated before update on assets
  for each row execute function set_updated_at();

-- Unicidade de série/patrimônio por tenant (quando preenchidos)
create unique index uq_assets_serial on assets (tenant_id, serial_number)
  where serial_number is not null and deleted_at is null;
create unique index uq_assets_tag on assets (tenant_id, asset_tag)
  where asset_tag is not null and deleted_at is null;

-- ----------------------------------------------------------------------------
-- Termos de responsabilidade
-- ----------------------------------------------------------------------------
create table responsibility_terms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  type varchar not null,
  status varchar not null default 'pending',
  document_id uuid,
  content jsonb,
  generated_at timestamptz,
  sent_at timestamptz,
  signed_at timestamptz,
  signature_data jsonb,
  created_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Atribuições (vínculo principal ativo <-> colaborador)
-- ----------------------------------------------------------------------------
create table asset_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  assignment_type varchar not null,
  started_at timestamptz not null default now(),
  expected_return_at timestamptz,
  ended_at timestamptz,
  delivered_by_user_id uuid references users(id) on delete set null,
  returned_to_user_id uuid references users(id) on delete set null,
  condition_at_delivery varchar,
  condition_at_return varchar,
  term_id uuid references responsibility_terms(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
-- Apenas uma atribuição principal aberta por ativo
create unique index uq_assignment_open_per_asset on asset_assignments (asset_id)
  where ended_at is null;

-- ----------------------------------------------------------------------------
-- Movimentações (histórico imutável)
-- ----------------------------------------------------------------------------
create table asset_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  movement_type varchar not null,
  from_employee_id uuid references employees(id) on delete set null,
  to_employee_id uuid references employees(id) on delete set null,
  from_location_id uuid references locations(id) on delete set null,
  to_location_id uuid references locations(id) on delete set null,
  from_department_id uuid references departments(id) on delete set null,
  to_department_id uuid references departments(id) on delete set null,
  from_status varchar,
  to_status varchar,
  performed_by_user_id uuid not null references users(id),
  reason text,
  occurred_at timestamptz not null default now(),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Manutenções
-- ----------------------------------------------------------------------------
create table maintenances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  protocol varchar,
  type varchar not null,
  status varchar not null default 'Aberta',
  problem_description text,
  diagnosis text,
  solution text,
  parts_cost numeric(14,2) default 0,
  service_cost numeric(14,2) default 0,
  total_cost numeric(14,2) default 0,
  opened_at timestamptz not null default now(),
  expected_at timestamptz,
  completed_at timestamptz,
  requested_by_user_id uuid references users(id) on delete set null,
  assigned_to_user_id uuid references users(id) on delete set null,
  replacement_asset_id uuid references assets(id) on delete set null,
  warranty_service boolean default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_maintenances_updated before update on maintenances
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Documentos / Anexos
-- ----------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_type varchar not null,
  entity_id uuid not null,
  document_type varchar not null,
  file_name varchar not null,
  storage_path varchar not null,
  mime_type varchar,
  size_bytes bigint,
  uploaded_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_documents_entity on documents (tenant_id, entity_type, entity_id);

alter table responsibility_terms
  add constraint fk_terms_document foreign key (document_id) references documents(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Inventário físico
-- ----------------------------------------------------------------------------
create table inventories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name varchar not null,
  scope_type varchar,
  scope_ids jsonb,
  status varchar not null default 'aberto',
  started_at timestamptz,
  finished_at timestamptz,
  created_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  inventory_id uuid not null references inventories(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  expected_employee_id uuid references employees(id) on delete set null,
  expected_location_id uuid references locations(id) on delete set null,
  found boolean,
  found_employee_id uuid references employees(id) on delete set null,
  found_location_id uuid references locations(id) on delete set null,
  physical_condition varchar,
  divergence_type varchar,
  notes text,
  checked_by_user_id uuid references users(id) on delete set null,
  checked_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Licenças de software
-- ----------------------------------------------------------------------------
create table software_licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  name varchar not null,
  vendor varchar,
  plan varchar,
  license_key_encrypted text,
  quantity_purchased integer default 0,
  quantity_used integer default 0,
  starts_at date,
  expires_at date,
  billing_cycle varchar,
  recurring_cost numeric(14,2),
  supplier_id uuid references suppliers(id) on delete set null,
  status varchar not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_licenses_updated before update on software_licenses
  for each row execute function set_updated_at();

create table license_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  license_id uuid not null references software_licenses(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  asset_id uuid references assets(id) on delete set null,
  assigned_at timestamptz not null default now(),
  released_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Baixa patrimonial / descarte
-- ----------------------------------------------------------------------------
create table asset_write_offs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  reason varchar not null,
  status varchar not null default 'solicitada',
  report text,
  requested_by_user_id uuid references users(id) on delete set null,
  approved_by_user_id uuid references users(id) on delete set null,
  residual_value numeric(14,2),
  destination varchar,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  notes text
);

-- ----------------------------------------------------------------------------
-- Notificações
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  type varchar not null,
  title varchar not null,
  message text,
  entity_type varchar,
  entity_id uuid,
  severity varchar default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications (tenant_id, user_id, read_at);

-- Controle de última notificação por evento (evita repetição diária)
create table alert_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  alert_key varchar not null,
  entity_id uuid,
  dispatched_at timestamptz not null default now(),
  unique (tenant_id, alert_key, entity_id)
);

-- ----------------------------------------------------------------------------
-- Trilha de auditoria
-- ----------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action varchar not null,
  entity_type varchar not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_entity on audit_logs (tenant_id, entity_type, entity_id);
create index idx_audit_created on audit_logs (tenant_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Listas administráveis (status, condições, tipos etc.)
-- ----------------------------------------------------------------------------
create table lookup_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  kind varchar not null,        -- 'asset_status' | 'physical_condition' | 'movement_type' ...
  value varchar not null,
  label varchar not null,
  color varchar,
  sort_order integer default 0,
  active boolean not null default true,
  unique (tenant_id, kind, value)
);

-- ----------------------------------------------------------------------------
-- Índices de performance (SRS seção 22)
-- ----------------------------------------------------------------------------
create index idx_assets_tenant on assets (tenant_id);
create index idx_assets_company on assets (company_id);
create index idx_assets_branch on assets (branch_id);
create index idx_assets_department on assets (department_id);
create index idx_assets_category on assets (category_id);
create index idx_assets_employee on assets (current_employee_id);
create index idx_assets_location on assets (location_id);
create index idx_assets_status on assets (tenant_id, status);
create index idx_assets_replacement on assets (tenant_id, replacement_date);
create index idx_assets_warranty on assets (tenant_id, warranty_end_date);
create index idx_assets_created on assets (created_at);

create index idx_employees_tenant on employees (tenant_id);
create index idx_employees_department on employees (department_id);
create index idx_employees_status on employees (tenant_id, status);

create index idx_assignments_asset on asset_assignments (asset_id);
create index idx_assignments_employee on asset_assignments (employee_id);
create index idx_movements_asset on asset_movements (asset_id, occurred_at desc);
create index idx_maintenances_asset on maintenances (asset_id);
create index idx_maintenances_status on maintenances (tenant_id, status);
