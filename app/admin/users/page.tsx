import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { UserControl } from "./UserControl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User Control | NaviWealth",
  description:
    "Manage NaviWealth admin access, roles, invitations, and account status.",
};

export default async function UserControlPage() {
  const user = await requireAdminSession("/admin/users", "users.manage");

  return (
    <UserControl currentUser={user} />
  );
}
