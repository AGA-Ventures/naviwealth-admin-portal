import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { EventDatasets } from "./EventDatasets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Datasets | NaviWealth",
  description:
    "Manage NaviWealth event packages and review the reusable event inventory.",
};

export default async function EventDatasetsPage() {
  const user = await getChatGPTUser();

  return (
    <EventDatasets
      user={{
        name: user?.displayName ?? "NaviWealth Admin",
        email: user?.email ?? "Local preview",
      }}
    />
  );
}
