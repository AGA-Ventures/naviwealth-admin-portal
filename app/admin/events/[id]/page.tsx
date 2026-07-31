import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { EventDatasetDetail } from "./EventDatasetDetail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Set Details | NaviWealth",
  description:
    "Inspect event package membership, rotation order, and reuse history.",
};

export default async function EventDatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([
    params,
    requireAdminSession("/admin/events"),
  ]);

  return (
    <EventDatasetDetail
      datasetId={id}
      user={user}
    />
  );
}
