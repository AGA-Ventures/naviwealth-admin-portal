import type { Metadata } from "next";
import { requireAdminSession } from "@/app/admin-session";
import { GameSimulator } from "./GameSimulator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game Simulator | NaviWealth",
  description:
    "Combine stock and event datasets to preview a NaviWealth game session.",
};

export default async function SimulatorPage() {
  const user = await requireAdminSession(
    "/admin/simulator",
    "simulation.run",
  );

  return (
    <GameSimulator user={user} />
  );
}
