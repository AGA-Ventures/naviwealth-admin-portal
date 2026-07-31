import { env } from "cloudflare:workers";
import type { AdminSessionUser } from "@/app/admin-access";

export type EventRecordData = Record<string, string>;

export type StoredEventRecord = {
  id: number;
  datasetId: number;
  rowNumber: number;
  sourceFile: string;
  data: EventRecordData;
  createdAt: string;
  updatedAt: string;
};

type GatewayResponse = {
  record?: StoredEventRecord;
  records?: StoredEventRecord[];
  error?: string;
};

type RuntimeEnv = {
  SUPABASE_URL?: string;
  NAVIWEALTH_DB_GATEWAY_KEY?: string;
};

export class EventRecordStoreError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function listEventRecords(
  datasetId: number,
  actor: AdminSessionUser,
) {
  const response = await callGateway({
    operation: "listEventRecords",
    id: datasetId,
  }, actor);
  return response.records ?? [];
}

export async function updateEventRecord(
  recordId: number,
  data: EventRecordData,
  actor: AdminSessionUser,
) {
  const response = await callGateway({
    operation: "updateEventRecord",
    id: recordId,
    input: { data },
  }, actor);
  if (!response.record) {
    throw new EventRecordStoreError(
      "The event record could not be loaded.",
      500,
    );
  }
  return response.record;
}

async function callGateway(
  payload: Record<string, unknown>,
  actor: AdminSessionUser,
): Promise<GatewayResponse> {
  const runtime = env as unknown as RuntimeEnv;
  const supabaseUrl = runtime.SUPABASE_URL?.replace(/\/+$/, "");
  const gatewayKey = runtime.NAVIWEALTH_DB_GATEWAY_KEY;

  if (!supabaseUrl || !gatewayKey) {
    throw new EventRecordStoreError(
      "Supabase event storage is not configured.",
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
        body: JSON.stringify({
          ...payload,
          actorUserId: actor.authUserId,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    throw new EventRecordStoreError(
      "Event storage is temporarily unavailable.",
      503,
    );
  }

  const body = (await response.json().catch(() => ({}))) as GatewayResponse;
  if (!response.ok) {
    throw new EventRecordStoreError(
      body.error ?? "The event request could not be completed.",
      response.status,
    );
  }
  return body;
}
