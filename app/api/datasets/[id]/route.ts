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
  forbiddenResponse,
  hasRequestPermission,
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
    const dataset = await getDataset(id, user);
    return Response.json({ dataset });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "datasets.edit")) {
    return forbiddenResponse("Administrator edit access is required.");
  }

  try {
    const id = await datasetId(context);
    const payload = await request.json();
    const dataset = await updateDataset(id, payload, user);
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
      if (!hasRequestPermission(user, "datasets.edit")) {
        return forbiddenResponse("Administrator edit access is required.");
      }
      if (payload.countryCode !== "MY" && payload.countryCode !== "CN") {
        throw new DatasetStoreError("Select a supported country.", 400);
      }
      const dataset = await createCountryVariant(
        id,
        payload.countryCode,
        user,
      );
      return Response.json({ dataset }, { status: 201 });
    }
    if (payload.action === "duplicate") {
      if (!hasRequestPermission(user, "datasets.edit")) {
        return forbiddenResponse("Administrator edit access is required.");
      }
      const dataset = await duplicateDataset(id, user);
      return Response.json({ dataset }, { status: 201 });
    }
    if (payload.action === "reuse") {
      if (!hasRequestPermission(user, "datasets.reuse")) {
        return forbiddenResponse("Facilitator access is required.");
      }
      const dataset = await reuseDataset(id, user);
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
  if (!hasRequestPermission(user, "datasets.edit")) {
    return forbiddenResponse("Administrator edit access is required.");
  }

  try {
    const id = await datasetId(context);
    await deleteDataset(id, user);
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
