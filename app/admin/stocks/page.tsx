import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { StockDatasets } from "./StockDatasets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stock Datasets | NaviWealth",
  description:
    "Manage NaviWealth stock packages and review the simulated instrument inventory.",
};

export default async function StockDatasetsPage() {
  const user = await requireAdminSession("/admin/stocks");

  return (
    <StockDatasets user={user} />
  );
}
