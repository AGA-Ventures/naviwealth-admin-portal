import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
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
  const [{ id }, user] = await Promise.all([params, getChatGPTUser()]);

  return (
    <StockDatasetDetail
      datasetId={id}
      user={{
        name: user?.displayName ?? "NaviWealth Admin",
        email: user?.email ?? "Local preview",
      }}
    />
  );
}
