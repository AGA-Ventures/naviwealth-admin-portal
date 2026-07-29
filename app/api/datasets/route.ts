import {
  createDataset,
  DATASET_LIMIT,
  DatasetStoreError,
  listDatasets,
} from "@/db/datasets";
import { getDatasetRequestUser, unauthorizedResponse } from "./auth";

export async function GET(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const datasets = await listDatasets();
    return Response.json({ datasets, limit: DATASET_LIMIT });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const payload = await request.json();
    const dataset = await createDataset(payload);
    return Response.json({ dataset }, { status: 201 });
  } catch (error) {
    return storeErrorResponse(error);
  }
}

function storeErrorResponse(error: unknown) {
  if (error instanceof DatasetStoreError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "Dataset storage is temporarily unavailable." },
    { status: 500 },
  );
}
