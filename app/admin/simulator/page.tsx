import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { GameSimulator } from "./GameSimulator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game Simulator | NaviWealth",
  description:
    "Combine stock and event datasets to preview a NaviWealth game session.",
};

export default async function SimulatorPage() {
  const user = await getChatGPTUser();

  return (
    <GameSimulator
      user={{
        name: user?.displayName ?? "NaviWealth Admin",
        email: user?.email ?? "Local preview",
      }}
    />
  );
}
