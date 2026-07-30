import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("opens a detailed event record from every membership row", async () => {
  const detail = await source(
    "app/admin/events/[id]/EventDatasetDetail.tsx",
  );

  assert.match(detail, /className="membership-row-action"/);
  assert.match(detail, /aria-label=\{`View event \$\{memberId\} details`\}/);
  assert.match(
    detail,
    /event\.key === "Enter" \|\|\s+event\.key === " "/,
  );
  assert.match(detail, /<EventRecordModal/);
  assert.match(detail, /FINANCIAL EFFECT/);
  assert.match(detail, /PLAYER DECISION/);
  assert.match(detail, /Engine instructions/);
  assert.match(detail, /aria-modal="true"/);
  assert.match(detail, /keyEvent\.key === "Escape"/);
});

test("provides authored detail records for every Event Set 4 member", async () => {
  const detail = await source(
    "app/admin/events/[id]/EventDatasetDetail.tsx",
  );

  for (let eventId = 76; eventId <= 91; eventId += 1) {
    assert.match(
      detail,
      new RegExp(`\\n  ${eventId}: \\{`),
      `event ${eventId} has authored details`,
    );
  }
});

test("imports both uploaded CSV files as complete event sets", async () => {
  const migration = await source(
    "supabase/migrations/20260730052512_import_kid_event_sets.sql",
  );

  const eventSets = [
    ["events_35_50", 91, "Kid Events · Ages 35–50"],
    ["events_25_40", 90, "Kid Events · Ages 25–40"],
  ];
  for (const [tag, expectedRows, datasetName] of eventSets) {
    const marker = `$${tag}$`;
    const start = migration.indexOf(marker);
    const end = migration.indexOf(marker, start + marker.length);
    assert.ok(start >= 0 && end > start, `${tag} payload is present`);
    const rows = JSON.parse(
      migration.slice(start + marker.length, end),
    );
    assert.equal(rows.length, expectedRows);
    assert.ok(rows.every((row) => Object.keys(row).length === 40));
    assert.match(migration, new RegExp(datasetName.replace("·", "\\·")));
  }

  assert.match(migration, /on conflict \(dataset_id, row_number\) do update/);
  assert.match(migration, /array_agg\(record\.id::integer order by record\.row_number\)/);
});

test("shows real imported rows and edits every source field", async () => {
  const [detail, recordsStore, gateway] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("db/event-records.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
  ]);

  assert.match(detail, /className="membership-row-action imported-event-row"/);
  assert.match(detail, /Open any row as a game-screen sample/);
  assert.match(detail, /Preview · edit available/);
  assert.match(detail, /<ImportedEventRecordModal/);
  assert.match(detail, /useState<"preview" \| "edit">\("preview"\)/);
  assert.match(detail, /SAMPLE GAME SCREEN/);
  assert.match(detail, /Edit event/);
  assert.match(detail, /Back to preview/);
  assert.match(detail, /<EventOutputMetric/);
  assert.match(detail, /eventMoney\(data\["Active Income"\], currencyCode\)/);
  assert.match(detail, /eventMoney\(data\["Liability \(Loan\)"\], currencyCode\)/);
  assert.match(detail, /Save event/);
  assert.match(detail, /editable values/);

  const expectedFields = [
    "Event Remark",
    "Age",
    "Screen Set",
    "Age Set",
    "Event Screen",
    "Title (ENG)",
    "Title （CN）",
    "Title",
    "Type",
    "Subtype",
    "Short Description",
    "Desciption (EN)",
    "Description formula CN",
    "Description",
    "Active Income",
    "Passive Income",
    "Cash Flow",
    "Expense",
    "D.Payment",
    "Asset (Value)",
    "Liability (Loan)",
    "ROI",
    "Happiness Point",
    "Rate Of Change",
    "Rate Of Changes",
    "Change Amount",
    "effected_items",
    "Is Recurring",
    "Event Role",
    "Set Within Age",
    "Remark",
    "downpayment text",
    "Asset text",
    "Liability Text",
    "Active Income Text",
    "Expenses Text",
    "Passive Income Text",
    "Happiness PTS Text",
    "ROItext",
    "Cash flow text",
  ];
  for (const field of expectedFields) {
    assert.ok(detail.includes(`"${field}"`), `${field} is editable`);
  }

  assert.match(recordsStore, /operation: "listEventRecords"/);
  assert.match(recordsStore, /operation: "updateEventRecord"/);
  assert.match(gateway, /sanitizeEventRecordData/);
  assert.match(gateway, /Event fields must match the imported source record/);
});

test("supports isolated Malaysia and China event dataset variants", async () => {
  const [library, detail, store, gateway, migration] = await Promise.all([
    source("app/admin/events/EventDatasets.tsx"),
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("db/datasets.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
    source(
      "supabase/migrations/20260730060144_add_event_country_variants.sql",
    ),
  ]);

  assert.match(library, /Malaysia · MYR · RM/);
  assert.match(library, /China · CNY · RMB/);
  assert.match(library, /createCountryVariant/);
  assert.match(library, /Needs localization/);
  assert.match(detail, /aria-label="Country variants"/);
  assert.match(detail, /Review economic amounts, rules, probabilities/);
  assert.match(detail, /formatEconomicValue/);
  assert.match(store, /operation: "createCountryVariant"/);
  assert.match(gateway, /create_event_country_variant/);
  assert.match(gateway, /Complete country localization before marking/);

  assert.match(migration, /add column country_code text not null default 'MY'/);
  assert.match(migration, /dataset_family_id uuid not null default gen_random_uuid/);
  assert.match(migration, /datasets_family_country_unique/);
  assert.match(
    migration,
    /create or replace function public\.create_event_country_variant/,
  );
  assert.match(migration, /security invoker/);
  assert.match(migration, /'draft'/);
  assert.match(migration, /'needs_review'/);
  assert.match(
    migration,
    /revoke all on function public\.create_event_country_variant\(integer, text\)/,
  );
});
