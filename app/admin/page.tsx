import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { AdminPortal } from "./AdminPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dataset Control | NaviWealth",
  description:
    "Create, validate, and reuse NaviWealth stock and event datasets.",
};

export default async function AdminPage() {
  const user = await getChatGPTUser();

  return (
    <AdminPortal
      user={{
        name: user?.displayName ?? "NaviWealth Admin",
        email: user?.email ?? "Local preview",
      }}
    />
  );
}
