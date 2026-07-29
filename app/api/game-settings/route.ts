import {
  AdminControlError,
  getGameSettings,
  updateGameSettings,
} from "@/db/admin-controls";
import {
  getDatasetRequestUser,
  unauthorizedResponse,
} from "../datasets/auth";

export async function GET(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    return Response.json({ settings: await getGameSettings() });
  } catch (error) {
    return settingsErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const payload = await request.json();
    return Response.json({
      settings: await updateGameSettings({
        ...payload,
        updatedBy: user.email ?? user.displayName ?? "NaviWealth Admin",
      }),
    });
  } catch (error) {
    return settingsErrorResponse(error);
  }
}

function settingsErrorResponse(error: unknown) {
  if (error instanceof AdminControlError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "Game settings could not be saved." },
    { status: 500 },
  );
}
