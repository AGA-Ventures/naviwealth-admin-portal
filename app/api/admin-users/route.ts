import {
  AdminControlError,
  createAdminUser,
  listAdminUsers,
} from "@/db/admin-controls";
import {
  getDatasetRequestUser,
  forbiddenResponse,
  hasRequestPermission,
  unauthorizedResponse,
} from "../datasets/auth";

export async function GET(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "users.manage")) {
    return forbiddenResponse("Superadmin access is required.");
  }

  try {
    return Response.json({ users: await listAdminUsers(user) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "users.manage")) {
    return forbiddenResponse("Superadmin access is required.");
  }

  try {
    const payload = await request.json();
    const createdUser = await createAdminUser(payload, user);
    return Response.json({ user: createdUser }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

function adminErrorResponse(error: unknown) {
  if (error instanceof AdminControlError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "The user request could not be completed." },
    { status: 500 },
  );
}
