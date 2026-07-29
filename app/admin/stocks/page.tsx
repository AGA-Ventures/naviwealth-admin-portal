import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { StockDatasets } from "./StockDatasets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stock Datasets | NaviWealth",
  description:
    "Manage NaviWealth stock packages and review the simulated instrument inventory.",
};

export default async function StockDatasetsPage() {
  const user = await getChatGPTUser();

  return (
    <StockDatasets
      user={{
        name: user?.displayName ?? "NaviWealth Admin",
        email: user?.email ?? "Local preview",
      }}
    />
  );
}
