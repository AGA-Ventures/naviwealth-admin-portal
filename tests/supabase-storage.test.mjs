import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("routes dataset storage through the protected Supabase gateway", async () => {
  const [hostingSource, store, edgeFunction, config] = await Promise.all([
    source(".openai/hosting.json"),
    source("db/datasets.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
    source("supabase/config.toml"),
  ]);
  const hosting = JSON.parse(hostingSource);

  assert.equal(hosting.d1, null);
  assert.match(store, /NAVIWEALTH_DB_GATEWAY_KEY/);
  assert.match(store, /functions\/v1\/naviwealth-datasets/);
  assert.match(edgeFunction, /@supabase\/supabase-js@2\.111\.0/);
  assert.match(edgeFunction, /x-naviwealth-db-key/);
  assert.match(edgeFunction, /SUPABASE_SECRET_KEYS/);
  assert.match(
    config,
    /\[functions\.naviwealth-datasets\]\s+verify_jwt = false/,
  );
});

test("locks the dataset table and seeds the expected packages", async () => {
  const migration = await source(
    "supabase/migrations/20260729192405_create_datasets.sql",
  );

  assert.match(
    migration,
    /alter table public\.datasets enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.datasets from anon, authenticated/i,
  );
  assert.match(migration, /grant all on table public\.datasets to service_role/i);

  const expectedPackages = [
    "Event Set 1 Edited",
    "Event Set 2",
    "Event Set 3",
    "Event Set 4",
    "Stock Set 1",
    "Stock Set 2",
    "Stock Set 3",
    "Stock Set 4",
  ];
  for (const name of expectedPackages) {
    assert.match(migration, new RegExp(`'${name}'`));
  }
});
