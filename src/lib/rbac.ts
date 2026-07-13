import type { Role } from "./constants";
import type { SessionUser } from "./types";

// Permissões por recurso/ação. Modelo RBAC simplificado do SRS seção 18.
export type Permission =
  | "assets.view"
  | "assets.edit"
  | "assets.delete"
  | "assets.move"
  | "employees.view"
  | "employees.edit"
  | "maintenance.view"
  | "maintenance.edit"
  | "inventory.view"
  | "inventory.edit"
  | "licenses.view"
  | "licenses.edit"
  | "suppliers.view"
  | "suppliers.edit"
  | "reports.view"
  | "financials.view"
  | "writeoff.request"
  | "writeoff.approve"
  | "admin.manage"
  | "users.manage"
  | "audit.view";

const ALL: Permission[] = [
  "assets.view", "assets.edit", "assets.delete", "assets.move",
  "employees.view", "employees.edit", "maintenance.view", "maintenance.edit",
  "inventory.view", "inventory.edit", "licenses.view", "licenses.edit",
  "suppliers.view", "suppliers.edit", "reports.view", "financials.view",
  "writeoff.request", "writeoff.approve", "admin.manage", "users.manage", "audit.view",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superadmin: ALL,
  admin: ALL,
  gestor_ti: [
    "assets.view", "assets.edit", "assets.delete", "assets.move",
    "employees.view", "employees.edit", "maintenance.view", "maintenance.edit",
    "inventory.view", "inventory.edit", "licenses.view", "licenses.edit",
    "suppliers.view", "suppliers.edit", "reports.view", "financials.view",
    "writeoff.request", "writeoff.approve", "audit.view",
  ],
  tecnico_ti: [
    "assets.view", "assets.edit", "assets.move",
    "employees.view", "maintenance.view", "maintenance.edit",
    "inventory.view", "inventory.edit", "licenses.view",
    "suppliers.view", "reports.view", "writeoff.request",
  ],
  gestor_departamento: [
    "assets.view", "employees.view", "maintenance.view",
    "inventory.view", "reports.view",
  ],
  financeiro: [
    "assets.view", "employees.view", "maintenance.view",
    "reports.view", "financials.view", "writeoff.approve", "licenses.view",
  ],
  auditor: [
    "assets.view", "employees.view", "maintenance.view", "inventory.view",
    "licenses.view", "suppliers.view", "reports.view", "financials.view", "audit.view",
  ],
  colaborador: ["assets.view"],
};

export function can(user: SessionUser | null | undefined, perm: Permission): boolean {
  if (!user) return false;
  if (user.is_platform_admin) return true;
  return ROLE_PERMISSIONS[user.role]?.includes(perm) ?? false;
}

export function assertCan(user: SessionUser | null | undefined, perm: Permission) {
  if (!can(user, perm)) {
    throw new Error("Acesso negado: permissão insuficiente.");
  }
}

/** Perfis que podem ver valores financeiros (SRS regra 16). */
export function canSeeFinancials(user: SessionUser | null | undefined): boolean {
  return can(user, "financials.view");
}
