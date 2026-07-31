import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { GameSettingsControl } from "./GameSettingsControl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game Settings | NaviWealth",
  description:
    "Configure shared NaviWealth game defaults, market behavior, and session rules.",
};

export default async function GameSettingsPage() {
  const user = await requireAdminSession(
    "/admin/game-settings",
    "settings.edit",
  );

  return (
    <GameSettingsControl currentUser={user} />
  );
}
