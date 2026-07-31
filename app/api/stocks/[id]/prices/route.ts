import {
  getStockPriceSeries,
  StockPriceStoreError,
  updateStockPriceSeries,
} from "@/db/stock-prices";
import {
  getDatasetRequestUser,
  forbiddenResponse,
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
    const id = await stockId(context);
    return Response.json({ series: await getStockPriceSeries(id, user) });
  } catch (error) {
    return stockPriceErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getDatasetRequestUser(request);
  if (!user) return unauthorizedResponse();
  if (!hasRequestPermission(user, "datasets.edit")) {
    return forbiddenResponse("Administrator edit access is required.");
  }

  try {
    const id = await stockId(context);
    const payload = (await request.json()) as { updates?: unknown };
    return Response.json({
      series: await updateStockPriceSeries(
        id,
        Array.isArray(payload.updates) ? payload.updates : [],
        user,
      ),
    });
  } catch (error) {
    return stockPriceErrorResponse(error);
  }
}

async function stockId(context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1 || id > 8) {
    throw new StockPriceStoreError("Invalid stock ID.", 400);
  }
  return id;
}

function stockPriceErrorResponse(error: unknown) {
  if (error instanceof StockPriceStoreError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "The stock price request could not be completed." },
    { status: 500 },
  );
}
