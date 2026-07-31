import {
  EventRecordStoreError,
  listEventRecords,
} from "@/db/event-records";
import {
  getDatasetRequestUser,
  unauthorizedResponse,
} from "@/app/api/datasets/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { id: rawId } = await context.params;
    const datasetId = positiveId(rawId);
    const records = await listEventRecords(datasetId, user);
    return Response.json({ records });
  } catch (error) {
    return eventStoreErrorResponse(error);
  }
}

function positiveId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new EventRecordStoreError("Invalid event set ID.", 400);
  }
  return parsed;
}

function eventStoreErrorResponse(error: unknown) {
  if (error instanceof EventRecordStoreError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "The event records could not be loaded." },
    { status: 500 },
  );
}
