import {
  createEventRecord,
  EventRecordStoreError,
  type EventRecordData,
  listEventRecords,
} from "@/db/event-records";
import {
  forbiddenResponse,
  getDatasetRequestUser,
  hasRequestPermission,
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

export async function POST(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "datasets.edit")) {
    return forbiddenResponse("Administrator edit access is required.");
  }

  try {
    const { id: rawId } = await context.params;
    const datasetId = positiveId(rawId);
    const payload = (await request.json()) as {
      insertAfterRowNumber?: number;
      data?: EventRecordData;
    };
    const record = await createEventRecord(
      datasetId,
      {
        insertAfterRowNumber: Number(payload.insertAfterRowNumber),
        data: payload.data ?? {},
      },
      user,
    );
    const records = await listEventRecords(datasetId, user);
    return Response.json({ record, records }, { status: 201 });
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
