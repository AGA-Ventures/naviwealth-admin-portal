import type { AdminPermission } from "@/app/admin-access";
import {
  AdminControlError,
  type AdminUserRole,
  listRolePermissions,
  updateRolePermissions,
} from "@/db/admin-controls";
import {
  forbiddenResponse,
  getDatasetRequestUser,
  hasRequestPermission,
  unauthorizedResponse,
} from "../datasets/auth";

export async function GET(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "users.manage")) {
    return forbiddenResponse("User management access is required.");
  }

  try {
    return Response.json({
      rolePermissions: await listRolePermissions(user),
    });
  } catch (error) {
    return rolePermissionErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "users.manage")) {
    return forbiddenResponse("User management access is required.");
  }

  try {
    const payload = (await request.json()) as {
      role?: AdminUserRole;
      permissions?: AdminPermission[];
    };
    return Response.json({
      rolePermission: await updateRolePermissions(
        payload.role as AdminUserRole,
        payload.permissions as AdminPermission[],
        user,
      ),
    });
  } catch (error) {
    return rolePermissionErrorResponse(error);
  }
}

function rolePermissionErrorResponse(error: unknown) {
  if (error instanceof AdminControlError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "The role permissions could not be updated." },
    { status: 500 },
  );
}
