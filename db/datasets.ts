import { env } from "cloudflare:workers";

export const DATASET_LIMIT = 30;

export type DatasetKind = "event" | "stock";
export type DatasetStatus = "draft" | "ready" | "archived";
export type ValidationState = "valid" | "warning";
export type CountryCode = "MY" | "CN";
export type CurrencyCode = "MYR" | "CNY";
export type LocalizationState = "localized" | "needs_review";

export type Dataset = {
  id: number;
  name: string;
  kind: DatasetKind;
  description: string;
  status: DatasetStatus;
  memberIds: number[];
  itemCount: number;
  reuseCount: number;
  validationState: ValidationState;
  countryCode: CountryCode;
  currencyCode: CurrencyCode;
  datasetFamilyId: string;
  localizationState: LocalizationState;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DatasetInput = {
  name: string;
  kind: DatasetKind;
  description?: string;
  status?: DatasetStatus;
  memberIds?: number[];
  countryCode?: CountryCode;
  localizationState?: LocalizationState;
};

type GatewayResponse = {
  dataset?: Dataset;
  datasets?: Dataset[];
  deleted?: boolean;
  error?: string;
};

type RuntimeEnv = {
  SUPABASE_URL?: string;
  NAVIWEALTH_DB_GATEWAY_KEY?: string;
};

export class DatasetStoreError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function listDatasets() {
  const response = await callGateway({ operation: "list" });
  return response.datasets ?? [];
}

export async function getDataset(id: number) {
  const response = await callGateway({ operation: "get", id });
  return requiredDataset(response);
}

export async function createDataset(input: DatasetInput) {
  const response = await callGateway({ operation: "create", input });
  return requiredDataset(response);
}

export async function updateDataset(id: number, input: Partial<DatasetInput>) {
  const response = await callGateway({ operation: "update", id, input });
  return requiredDataset(response);
}

export async function deleteDataset(id: number) {
  const response = await callGateway({ operation: "delete", id });
  if (!response.deleted) {
    throw new DatasetStoreError("The dataset could not be deleted.", 500);
  }
}

export async function duplicateDataset(id: number) {
  const response = await callGateway({ operation: "duplicate", id });
  return requiredDataset(response);
}

export async function reuseDataset(id: number) {
  const response = await callGateway({ operation: "reuse", id });
  return requiredDataset(response);
}

export async function createCountryVariant(
  id: number,
  countryCode: CountryCode,
) {
  const response = await callGateway({
    operation: "createCountryVariant",
    id,
    input: { countryCode },
  });
  return requiredDataset(response);
}

async function callGateway(
  payload: Record<string, unknown>,
): Promise<GatewayResponse> {
  const runtime = env as unknown as RuntimeEnv;
  const supabaseUrl = runtime.SUPABASE_URL?.replace(/\/+$/, "");
  const gatewayKey = runtime.NAVIWEALTH_DB_GATEWAY_KEY;

  if (!supabaseUrl || !gatewayKey) {
    throw new DatasetStoreError(
      "Supabase dataset storage is not configured.",
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `${supabaseUrl}/functions/v1/naviwealth-datasets`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-naviwealth-db-key": gatewayKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    throw new DatasetStoreError(
      "Dataset storage is temporarily unavailable.",
      503,
    );
  }

  const body = (await response.json().catch(() => ({}))) as GatewayResponse;
  if (!response.ok) {
    throw new DatasetStoreError(
      body.error ?? "The dataset request could not be completed.",
      response.status,
    );
  }
  return body;
}

function requiredDataset(response: GatewayResponse) {
  if (!response.dataset) {
    throw new DatasetStoreError("The dataset could not be loaded.", 500);
  }
  return response.dataset;
}
