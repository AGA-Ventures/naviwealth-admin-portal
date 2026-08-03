import { requestAccessToken } from "@/app/admin-session";
import {
  AdminAuthError,
  changeAdminPassword,
} from "@/db/admin-auth";

export async function POST(request: Request) {
  const accessToken = requestAccessToken(request);
  if (!accessToken) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    const currentPassword =
      typeof payload.currentPassword === "string"
        ? payload.currentPassword
        : "";
    const newPassword =
      typeof payload.newPassword === "string" ? payload.newPassword : "";

    await changeAdminPassword(accessToken, currentPassword, newPassword);
    return Response.json({ updated: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "The password could not be updated." },
      { status: 500 },
    );
  }
}
