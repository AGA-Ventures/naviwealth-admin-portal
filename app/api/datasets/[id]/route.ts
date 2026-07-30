import {
  DatasetStoreError,
  createCountryVariant,
  deleteDataset,
  duplicateDataset,
  getDataset,
  reuseDataset,
  updateDataset,
} from "@/db/datasets";
import {
  getDatasetRequestUser,
  unauthorizedResponse,
} from "../auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const id = await datasetId(context);
    const dataset = await getDataset(id);
    return Response.json({ dataset });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const id = await datasetId(context);
    const payload = await request.json();
    const dataset = await updateDataset(id, payload);
    return Response.json({ dataset });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const id = await datasetId(context);
    const payload = (await request.json()) as {
      action?: string;
      countryCode?: "MY" | "CN";
    };
    if (payload.action === "countryVariant") {
      if (payload.countryCode !== "MY" && payload.countryCode !== "CN") {
        throw new DatasetStoreError("Select a supported country.", 400);
      }
      const dataset = await createCountryVariant(id, payload.countryCode);
      return Response.json({ dataset }, { status: 201 });
    }
    if (payload.action === "duplicate") {
      const dataset = await duplicateDataset(id);
      return Response.json({ dataset }, { status: 201 });
    }
    if (payload.action === "reuse") {
      const dataset = await reuseDataset(id);
      return Response.json({ dataset });
    }
    throw new DatasetStoreError("Unsupported dataset action.", 400);
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const id = await datasetId(context);
    await deleteDataset(id);
    return Response.json({ deleted: true });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

async function datasetId(context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new DatasetStoreError("Invalid dataset ID.", 400);
  }
  return id;
}

function storeErrorResponse(error: unknown) {
  if (error instanceof DatasetStoreError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "The dataset request could not be completed." },
    { status: 500 },
  );
}
