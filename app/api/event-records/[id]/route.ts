import {
  EventRecordStoreError,
  type EventRecordData,
  updateEventRecord,
} from "@/db/event-records";
import {
  getDatasetRequestUser,
  forbiddenResponse,
  hasRequestPermission,
  unauthorizedResponse,
} from "@/app/api/datasets/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "datasets.edit")) {
    return forbiddenResponse("Administrator edit access is required.");
  }

  try {
    const { id: rawId } = await context.params;
    const recordId = positiveId(rawId);
    const payload = (await request.json()) as { data?: EventRecordData };
    const record = await updateEventRecord(
      recordId,
      payload.data ?? {},
      user,
    );
    return Response.json({ record });
  } catch (error) {
    return eventStoreErrorResponse(error);
  }
}

function positiveId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new EventRecordStoreError("Invalid event record ID.", 400);
  }
  return parsed;
}

function eventStoreErrorResponse(error: unknown) {
  if (error instanceof EventRecordStoreError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "The event record could not be updated." },
    { status: 500 },
  );
}
