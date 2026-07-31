import { env } from "cloudflare:workers";
import type { AdminSessionUser } from "@/app/admin-access";

export type StockPricePoint = {
  period: number;
  price: number;
  updatedAt: string;
};

export type StockPriceSeries = {
  stockId: number;
  symbol: string;
  displayName: string;
  assetClass: string;
  scenario: string;
  sourceName: string;
  points: StockPricePoint[];
};

export type StockPriceUpdate = {
  period: number;
  price: number;
};

type GatewayResponse = {
  series?: StockPriceSeries;
  error?: string;
};

type RuntimeEnv = {
  SUPABASE_URL?: string;
  NAVIWEALTH_DB_GATEWAY_KEY?: string;
};

export class StockPriceStoreError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function getStockPriceSeries(
  stockId: number,
  actor: AdminSessionUser,
) {
  const response = await callGateway({
    operation: "getStockPriceSeries",
    id: stockId,
  }, actor);
  return requiredSeries(response);
}

export async function updateStockPriceSeries(
  stockId: number,
  updates: StockPriceUpdate[],
  actor: AdminSessionUser,
) {
  const response = await callGateway({
    operation: "updateStockPrices",
    id: stockId,
    input: { updates },
  }, actor);
  return requiredSeries(response);
}

async function callGateway(
  payload: Record<string, unknown>,
  actor: AdminSessionUser,
): Promise<GatewayResponse> {
  const runtime = env as unknown as RuntimeEnv;
  const supabaseUrl = runtime.SUPABASE_URL?.replace(/\/+$/, "");
  const gatewayKey = runtime.NAVIWEALTH_DB_GATEWAY_KEY;

  if (!supabaseUrl || !gatewayKey) {
    throw new StockPriceStoreError(
      "Supabase stock price storage is not configured.",
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
    throw new StockPriceStoreError(
      "Stock price storage is temporarily unavailable.",
      503,
    );
  }

  const body = (await response.json().catch(() => ({}))) as GatewayResponse;
  if (!response.ok) {
    throw new StockPriceStoreError(
      body.error ?? "The stock price request could not be completed.",
      response.status,
    );
  }
  return body;
}

function requiredSeries(response: GatewayResponse) {
  if (!response.series) {
    throw new StockPriceStoreError(
      "The stock price sequence could not be loaded.",
      500,
    );
  }
  return response.series;
}
