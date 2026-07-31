import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { StockDatasetDetail } from "./StockDatasetDetail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stock Set Details | NaviWealth",
  description:
    "Inspect stock package membership, price coverage, and reuse history.",
};

export default async function StockDatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([
    params,
    requireAdminSession("/admin/stocks"),
  ]);

  return (
    <StockDatasetDetail
      datasetId={id}
      user={user}
    />
  );
}
