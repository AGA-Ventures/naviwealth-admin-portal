import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("routes the game-system sidebar to admin management and game settings", async () => {
  const files = [
    "app/admin/AdminPortal.tsx",
    "app/admin/stocks/StockDatasets.tsx",
    "app/admin/events/EventDatasets.tsx",
    "app/admin/events/[id]/EventDatasetDetail.tsx",
    "app/admin/simulator/GameSimulator.tsx",
    "app/admin/AdminControlSidebar.tsx",
  ];

  for (const file of files) {
    const content = await source(file);
    assert.match(content, /(?:href=)"\/admin\/users"/);
    assert.match(content, /Admin management/);
    assert.match(content, /(?:href=)"\/admin\/game-settings"/);
    assert.match(content, /Game settings/);
    assert.match(content, /(?:href=)"\/admin\/account"/);
  }
});

test("connects both admin-control pages to the protected gateway", async () => {
  const [users, settings, store, gateway] = await Promise.all([
    source("app/admin/users/UserControl.tsx"),
    source("app/admin/game-settings/GameSettingsControl.tsx"),
    source("db/admin-controls.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
  ]);

  assert.match(users, /fetch\("\/api\/admin-users"/);
  assert.match(users, /method: "PATCH"/);
  assert.match(settings, /fetch\("\/api\/game-settings"/);
  assert.match(settings, /method: "PATCH"/);
  assert.match(store, /NAVIWEALTH_DB_GATEWAY_KEY/);
  assert.match(gateway, /case "listAdminUsers"/);
  assert.match(gateway, /case "updateGameSettings"/);
});

test("protects admin users and settings with row-level security", async () => {
  const migration = await source(
    "supabase/migrations/20260729194731_add_admin_controls.sql",
  );

  for (const table of ["admin_users", "game_settings"]) {
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${table} enable row level security`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `revoke all on table public\\.${table} from anon, authenticated`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(`grant all on table public\\.${table} to service_role`, "i"),
    );
  }
});
