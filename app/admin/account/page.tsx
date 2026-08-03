import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { AccountManagement } from "./AccountManagement";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Personal Login | NaviWealth",
  description: "Manage your NaviWealth administrator login and password.",
};

export default async function AccountManagementPage() {
  const user = await requireAdminSession("/admin/account");
  return <AccountManagement currentUser={user} />;
}
