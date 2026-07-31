import type { AdminPermission } from "@/app/admin-access";
import {
  getRequestAdminUser,
  requireRequestPermission,
} from "@/app/admin-session";

export async function getDatasetRequestUser(request: Request) {
  return getRequestAdminUser(request);
}

export function hasRequestPermission(
  user: NonNullable<Awaited<ReturnType<typeof getDatasetRequestUser>>>,
  permission: AdminPermission,
) {
  return requireRequestPermission(user, permission);
}

export function unauthorizedResponse() {
  return Response.json(
    { error: "Sign in is required to manage this workspace." },
    { status: 401 },
  );
}

export function forbiddenResponse(message = "You do not have permission for this action.") {
  return Response.json({ error: message }, { status: 403 });
}
