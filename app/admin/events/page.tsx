import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { EventDatasets } from "./EventDatasets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Datasets | NaviWealth",
  description:
    "Manage NaviWealth event packages and review the reusable event inventory.",
};

export default async function EventDatasetsPage() {
  const user = await requireAdminSession("/admin/events");

  return (
    <EventDatasets user={user} />
  );
}
