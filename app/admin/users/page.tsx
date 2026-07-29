import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { UserControl } from "./UserControl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User Control | NaviWealth",
  description:
    "Manage NaviWealth admin access, roles, invitations, and account status.",
};

export default async function UserControlPage() {
  const user = await getChatGPTUser();

  return (
    <UserControl
      currentUser={{
        name: user?.displayName ?? "NaviWealth Admin",
        email: user?.email ?? "Local preview",
      }}
    />
  );
}
