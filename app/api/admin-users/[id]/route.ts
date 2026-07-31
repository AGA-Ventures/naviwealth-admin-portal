import {
  AdminControlError,
  updateAdminUser,
} from "@/db/admin-controls";
import {
  getDatasetRequestUser,
  forbiddenResponse,
  hasRequestPermission,
  unauthorizedResponse,
} from "../../datasets/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "users.manage")) {
    return forbiddenResponse("Superadmin access is required.");
  }

  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AdminControlError("Invalid admin user ID.", 400);
    }

    const payload = await request.json();
    return Response.json({
      user: await updateAdminUser(id, payload, user),
    });
  } catch (error) {
    if (error instanceof AdminControlError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "The user request could not be completed." },
      { status: 500 },
    );
  }
}
