export type AdminRole =
  | "superadmin"
  | "admin"
  | "facilitator"
  | "viewer";

export type AdminPermission =
  | "portal.view"
  | "simulation.run"
  | "datasets.reuse"
  | "datasets.edit"
  | "settings.edit"
  | "users.manage"
  | "audit.view";

export type AdminSessionUser = {
  id: number;
  authUserId: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "active";
  permissions: AdminPermission[];
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  facilitator: "Facilitator",
  viewer: "Viewer",
};

export function hasAdminPermission(
  user: AdminSessionUser,
  permission: AdminPermission,
) {
  return user.permissions.includes(permission);
}
