import { AdminControlError, listAdminAuditLogs } from "@/db/admin-controls";
import {
  forbiddenResponse,
  getDatasetRequestUser,
  hasRequestPermission,
  unauthorizedResponse,
} from "../datasets/auth";

export async function GET(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "audit.view")) {
    return forbiddenResponse("Superadmin audit access is required.");
  }

  try {
    return Response.json({ logs: await listAdminAuditLogs(user) });
  } catch (error) {
    if (error instanceof AdminControlError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "The audit history could not be loaded." },
      { status: 500 },
    );
  }
}
