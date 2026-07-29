import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("places the simulator directly below overview in every admin sidebar", async () => {
  const files = [
    "app/admin/AdminPortal.tsx",
    "app/admin/stocks/StockDatasets.tsx",
    "app/admin/events/EventDatasets.tsx",
    "app/admin/events/[id]/EventDatasetDetail.tsx",
  ];

  for (const file of files) {
    const content = await source(file);
    const overview = content.indexOf("Overview");
    const simulator = content.indexOf('href="/admin/simulator"');
    const stocks = content.indexOf('href="/admin/stocks"');

    assert.ok(overview >= 0, `${file} includes Overview`);
    assert.ok(simulator > overview, `${file} places Simulator after Overview`);
    assert.ok(stocks > simulator, `${file} places Simulator before datasets`);
  }
});

test("provides a data-backed simulator with configurable session inputs", async () => {
  const simulator = await source(
    "app/admin/simulator/GameSimulator.tsx",
  );

  assert.match(simulator, /fetch\("\/api\/datasets"/);
  assert.match(simulator, /action: "reuse"/);
  assert.match(simulator, /Stock dataset/);
  assert.match(simulator, /Event dataset/);
  assert.match(simulator, /Starting balance/);
  assert.match(simulator, /Risk profile/);
  assert.match(simulator, /Simulation results/);
});
