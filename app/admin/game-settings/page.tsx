import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { GameSettingsControl } from "./GameSettingsControl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game Settings | NaviWealth",
  description:
    "Configure shared NaviWealth game defaults, market behavior, and session rules.",
};

export default async function GameSettingsPage() {
  const user = await getChatGPTUser();

  return (
    <GameSettingsControl
      currentUser={{
        name: user?.displayName ?? "NaviWealth Admin",
        email: user?.email ?? "Local preview",
      }}
    />
  );
}
