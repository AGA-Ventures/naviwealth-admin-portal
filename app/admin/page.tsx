import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { AdminPortal } from "./AdminPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dataset Control | NaviWealth",
  description:
    "Create, validate, and reuse NaviWealth stock and event datasets.",
};

export default async function AdminPage() {
  const user = await requireAdminSession("/admin");

  return (
    <AdminPortal user={user} />
  );
}
