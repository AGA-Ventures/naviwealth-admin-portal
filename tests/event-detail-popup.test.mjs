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

test("checks all 15 ages against event pairing rules before game use", async () => {
  const [detail, migration, styles] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("supabase/migrations/20260730052512_import_kid_event_sets.sql"),
    source("app/globals.css"),
  ]);

  assert.match(detail, /const requiredScreenSets = \["1", "2", "3", "4"\]/);
  assert.match(detail, /const expectedAgeCount = 15/);
  assert.match(detail, /const ageSetCoverage = useMemo/);
  assert.match(detail, /function eventAgeSetNumber/);
  assert.match(detail, /title="Age Set composition rules"/);
  assert.match(detail, /function validateEventAgeSet/);
  assert.match(detail, /Cash Flow must be paired with Capital Gain/);
  assert.match(detail, /Capital Gain must be paired with Cash Flow/);
  assert.match(detail, /Market and Expenses must each occupy an Age Set by themselves/);
  assert.match(detail, /className="event-age-set-rule-warning"/);
  assert.match(detail, /Add missing row/);
  assert.match(detail, /Age Set coverage/);
  assert.match(detail, /className="age-coverage-grid"/);
  assert.match(detail, /className="event-age-set-rows"/);
  assert.match(detail, /ageSetRow\.records\.length === 1/);
  assert.match(detail, /single-event/);
  assert.match(styles, /\.event-membership-card-grid\.single-event/);
  assert.match(detail, /ageSetRows: requiredScreenSets\.map/);
  assert.match(detail, /ageSetRow\.records\.length/);
  assert.match(detail, /typeCounts: eventAgeTypeBreakdown\(records\)/);
  assert.match(detail, /className="event-age-type-counts"/);
  assert.match(detail, /Age \$\{age\} event type counts/);
  assert.match(detail, /!ageSetCoverageComplete/);
  assert.match(detail, /Fix age set rules/);
  assert.match(detail, /label="Event status"/);
  assert.match(detail, /label: "Needs review"/);
  assert.match(detail, /meta: `\$\{completeAgeCount\} \/ \$\{expectedAgeCount\} ages complete`/);
  assert.match(detail, /className=\{`status-label \$\{eventStatus\.className\}`\}/);
  assert.match(detail, /title="Final event status"/);
  assert.doesNotMatch(detail, /label="Rotation windows"/);

  const marker = "$events_25_40$";
  const start = migration.indexOf(marker);
  const end = migration.indexOf(marker, start + marker.length);
  const rows = JSON.parse(migration.slice(start + marker.length, end));
  const setsByAge = new Map();
  for (const row of rows) {
    const sets = setsByAge.get(row.Age) ?? new Set();
    sets.add(row["Age Set"].match(/([1-4])$/)?.[1]);
    setsByAge.set(row.Age, sets);
  }

  assert.equal(setsByAge.size, 15);
  assert.equal(
    Array.from(setsByAge.values()).filter((sets) => sets.size === 4).length,
    14,
  );
  assert.deepEqual(Array.from(setsByAge.get("39")).sort(), ["1", "2", "3"]);
  assert.equal(
    rows.filter((row) => row.Age === "25" && row["Age Set"] === "25 - 2")
      .length,
    2,
    "multiple events can share one of the four Age Set rows",
  );
  const age25TypeCounts = Object.fromEntries(
    Object.entries(
      rows
        .filter((row) => row.Age === "25")
        .reduce((counts, row) => {
          counts[row.Type] = (counts[row.Type] ?? 0) + 1;
          return counts;
        }, {}),
    ),
  );
  assert.deepEqual(age25TypeCounts, {
    "Cash Flow": 3,
    "Capital Gain": 1,
    Expenses: 1,
  });

  function validateRows(ageSetRows) {
    const types = (ageSetRows ?? []).map((row) => row.Type);
    const cashFlowCount = types.filter((type) => type === "Cash Flow").length;
    const capitalGainCount = types.filter(
      (type) => type === "Capital Gain",
    ).length;
    return (
      (types.length === 1 &&
        (types[0] === "Market" || types[0] === "Expenses")) ||
      (types.length === 2 && cashFlowCount === 1 && capitalGainCount === 1)
    );
  }

  const age25Sets = new Map();
  for (const row of rows.filter((row) => row.Age === "25")) {
    const setNumber = row["Age Set"].match(/([1-4])$/)?.[1];
    const setRows = age25Sets.get(setNumber) ?? [];
    setRows.push(row);
    age25Sets.set(setNumber, setRows);
  }
  assert.equal(validateRows(age25Sets.get("1")), false);
  assert.equal(validateRows(age25Sets.get("2")), true);
  assert.equal(validateRows(age25Sets.get("3")), true);
  assert.equal(validateRows(age25Sets.get("4")), false);

  let completeAges = 0;
  let incompleteSets = 0;
  let missingSets = 0;
  for (let age = 25; age < 40; age += 1) {
    let ageComplete = true;
    for (let setNumber = 1; setNumber <= 4; setNumber += 1) {
      const ageSetRows = rows.filter(
        (row) =>
          row.Age === String(age) &&
          row["Age Set"].endsWith(`- ${setNumber}`),
      );
      if (ageSetRows.length === 0) missingSets += 1;
      if (!validateRows(ageSetRows)) {
        incompleteSets += 1;
        ageComplete = false;
      }
    }
    if (ageComplete) completeAges += 1;
  }
  assert.equal(completeAges, 5, "only five ages satisfy all four composition rules");
  assert.equal(incompleteSets, 18, "all invalid Age Sets are reported");
  assert.equal(missingSets, 1, "missing rows stay distinct from invalid row mixes");
});

test("shows the audited administrator who last changed the event set", async () => {
  const [detail, gateway] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
  ]);

  assert.match(detail, /lastUpdatedBy\?:/);
  assert.match(detail, /dataset\.lastUpdatedBy\.name/);
  assert.match(detail, /dataset\.lastUpdatedBy\.email/);
  assert.match(detail, /meta=\{lastUpdatedBy\}/);
  assert.match(gateway, /findDatasetLastEditor/);
  assert.match(gateway, /\.from\("admin_audit_logs"\)/);
  assert.match(gateway, /\.contains\("metadata", \{ datasetId \}\)/);
  assert.match(gateway, /actor_name/);
  assert.match(gateway, /actor_email/);
  assert.match(gateway, /lastUpdatedBy/);
});

test("configures the package name and starting age separately", async () => {
  const detail = await source(
    "app/admin/events/[id]/EventDatasetDetail.tsx",
  );

  assert.match(detail, /const initialIdentity = parseEventDatasetIdentity/);
  assert.match(detail, /<span>Package name<\/span>/);
  assert.match(detail, /Starting age/);
  assert.match(detail, /type="number"/);
  assert.match(detail, /min=\{1\}/);
  assert.match(detail, /max=\{100\}/);
  assert.match(detail, /startingAgeNumber \+ expectedAgeCount/);
  assert.match(detail, /Range \$\{startingAgeNumber\}–\$\{endingAge\}/);
  assert.match(detail, /name: formatEventDatasetName\(name, startingAgeNumber\)/);
  assert.match(detail, /function parseEventDatasetIdentity/);
  assert.match(detail, /function formatEventDatasetName/);
  assert.match(detail, /Ages \$\{startingAge\}–\$\{/);
});

test("picks bundled events from searchable rows instead of raw IDs", async () => {
  const [detail, styles] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(detail, /eventRecords=\{eventRecords\}/);
  assert.match(detail, /aria-label="Search event rows"/);
  assert.match(detail, /aria-label="Filter event rows by age"/);
  assert.match(detail, /Select results/);
  assert.match(detail, /Selected only/);
  assert.match(detail, /type="checkbox"/);
  assert.match(detail, /toggleMember\(option\.id, event\.target\.checked\)/);
  assert.match(detail, /Saved membership follows source row order/);
  assert.doesNotMatch(detail, /Bundled event IDs/);
  assert.match(styles, /\.event-member-picker-list/);
  assert.match(styles, /\.event-member-option\.selected/);
});

test("uses a clear rotating chevron for every age dropdown", async () => {
  const [detail, styles] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(detail, /className="event-age-chevron"/);
  assert.match(detail, /<svg viewBox="0 0 20 20"/);
  assert.match(styles, /\.event-age-group > summary::-webkit-details-marker/);
  assert.match(styles, /\.event-age-group\[open\] \.event-age-chevron svg/);
  assert.match(styles, /transform: rotate\(90deg\)/);
});

test("provides an accessible mobile navigation drawer on event details", async () => {
  const [detail, styles] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(detail, /const \[mobileNavOpen, setMobileNavOpen\] = useState\(false\)/);
  assert.match(detail, /id="admin-mobile-navigation"/);
  assert.match(detail, /aria-controls="admin-mobile-navigation"/);
  assert.match(detail, /aria-expanded=\{mobileNavOpen\}/);
  assert.match(detail, /className="admin-sidebar-backdrop"/);
  assert.match(detail, /event\.key !== "Escape"/);
  assert.match(detail, /document\.body\.style\.overflow = "hidden"/);
  assert.match(detail, /mobileNavTriggerRef\.current\?\.focus\(\)/);
  assert.match(styles, /\.admin-sidebar\.mobile-open\s*\{[\s\S]*?transform: translateX\(0\)/);
  assert.match(styles, /\.mobile-nav-toggle\s*\{[\s\S]*?display: inline-flex/);
  assert.match(styles, /\.admin-sidebar-backdrop\s*\{[\s\S]*?backdrop-filter: blur\(4px\)/);
});

test("shows real imported rows and edits every source field", async () => {
  const [detail, recordsStore, gateway, styles] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("db/event-records.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
    source("app/globals.css"),
  ]);

  assert.match(detail, /event-membership-card-grid/);
  assert.match(detail, /const eventAgeGroups = useMemo/);
  assert.match(detail, /className="event-age-group"/);
  assert.match(detail, /useState<Set<string> \| null>\(null\)/);
  assert.match(detail, /expandedAges === null/);
  assert.match(detail, /event\.preventDefault\(\)/);
  assert.match(detail, /if \(next\.has\(age\)\) next\.delete\(age\)/);
  assert.match(detail, /Age unassigned/);
  assert.match(detail, /records\.length\} event/);
  assert.match(detail, /className=\{`event-member-card \$\{eventTone\}`\}/);
  assert.match(detail, /Open game preview/);
  assert.match(detail, /Open any row as a game-screen sample/);
  assert.match(detail, /<ImportedEventRecordModal/);
  assert.match(detail, /useState<"preview" \| "edit">\("preview"\)/);
  assert.match(detail, /SAMPLE GAME SCREEN/);
  assert.match(detail, /className="imported-event-live-preview"/);
  assert.match(detail, /aria-label="Live game-screen preview"/);
  assert.match(detail, /Updates as you edit the fields below/);
  assert.match(detail, /Open full preview/);
  assert.match(detail, /function ImportedEventOutputStage/);
  assert.match(detail, /className="event-output-title-cn"/);
  assert.match(detail, /className="event-output-descriptions"/);
  assert.match(detail, /className="event-output-description-cn"/);
  assert.match(detail, /lang="zh-Hans"/);
  assert.match(detail, /const storyCopyLength/);
  assert.match(detail, /copy-very-dense/);
  assert.match(detail, /copy-dense/);
  assert.match(detail, /copy-compact/);
  assert.match(detail, /function buildGeneratedEventCopy/);
  assert.match(detail, /\[chineseTitle, englishTitle\]\.filter\(Boolean\)\.join\("\\n"\)/);
  assert.match(detail, /\[chineseDescription, englishDescription\][\s\S]*?join\("\\n"\)/);
  assert.match(detail, /const autoGeneratedEventFields/);
  assert.match(detail, /function eventEditorGroups/);
  assert.match(detail, /fields: \["Happiness Point"\]/);
  assert.match(detail, /Market events only apply Happiness Points here/);
  assert.match(styles, /\.event-output-story h2 \.event-output-title-cn/);
  assert.match(styles, /\.event-output-descriptions/);
  assert.match(styles, /container-type: inline-size/);
  assert.match(styles, /\.event-output-story\.copy-dense h2/);
  assert.match(styles, /\.event-output-story\.copy-very-dense \.event-output-code strong/);
  assert.match(detail, /Edit event/);
  assert.match(detail, /Back to preview/);
  assert.doesNotMatch(detail, /TIME REMAINING|event-output-timer|00:41/);
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

test("uses a full-width preview and a simplified event editor", async () => {
  const [detail, styles] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("app/globals.css"),
  ]);
  const fieldGroupSource = detail.slice(
    detail.indexOf("const eventFieldGroups"),
    detail.indexOf("const longEventFields"),
  );
  const financialGroup = fieldGroupSource.slice(
    fieldGroupSource.indexOf('title: "Financial effects"'),
    fieldGroupSource.indexOf('title: "Engine settings"'),
  );
  const engineGroup = fieldGroupSource.slice(
    fieldGroupSource.indexOf('title: "Engine settings"'),
  );

  assert.match(styles, /\.imported-event-live-preview-frame \.event-output-stage \{[\s\S]*?width: 100%/);
  assert.match(detail, /className=\{`event-field-section\$\{/);
  assert.match(detail, /event-identity-section/);
  assert.match(styles, /\.event-identity-section \.event-field-grid/);
  assert.match(detail, /"Title \(ENG\)": "English title"/);
  assert.match(detail, /"Event Screen": "Player side"/);
  assert.doesNotMatch(fieldGroupSource, /title: "Generated display text"/);
  assert.match(detail, /const generatedDisplayFields/);
  assert.doesNotMatch(financialGroup, /Rate Of Change|Change Amount/);
  assert.match(engineGroup, /"Rate Of Change"/);
  assert.match(engineGroup, /"Rate Of Changes"/);
  assert.match(engineGroup, /"Change Amount"/);
});

test("uses a story-only preview for market events", async () => {
  const [detail, styles] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(detail, /const isMarketEvent = eventAgeSetCategory\(data\.Type\) === "market"/);
  assert.match(detail, /isMarketEvent \? " market-event-output"/);
  assert.match(detail, /!isMarketEvent \? \([\s\S]*?className="event-output-code"/);
  assert.match(detail, /!isMarketEvent \? <section className="event-output-data">/);
  assert.match(styles, /\.event-output-stage\.market-event-output/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /\.market-event-output \.event-output-story/);
});

test("adds event rows to empty and incomplete Age Sets", async () => {
  const [detail, route, recordsStore, gateway, migration, startMigration] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("app/api/event-sets/[id]/records/route.ts"),
    source("db/event-records.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
    source("supabase/migrations/20260803111021_create_event_record_row.sql"),
    source("supabase/migrations/20260803114241_allow_event_record_at_start.sql"),
  ]);

  assert.match(detail, /function openNewEventRow/);
  assert.match(detail, /createNewEventRecordData/);
  assert.match(detail, /Add missing row/);
  assert.match(detail, /EMPTY AGE SET/);
  assert.match(detail, /canChooseType/);
  assert.match(detail, /Choose the event type/);
  assert.match(detail, /Market and Expenses stand alone/);
  assert.match(detail, /<AddEventRecordModal/);
  assert.match(detail, /Add \{selectedType\} to Age Set/);
  assert.match(detail, /insertAfterRowNumber: draftRecord\.insertAfterRowNumber/);
  assert.match(detail, /Add event row/);
  assert.match(detail, /later row numbers will move down automatically/);
  assert.match(route, /export async function POST/);
  assert.match(route, /hasRequestPermission\(user, "datasets\.edit"\)/);
  assert.match(route, /createEventRecord/);
  assert.match(recordsStore, /operation: "createEventRecord"/);
  assert.match(gateway, /case "createEventRecord"/);
  assert.match(gateway, /event_record\.create/);
  assert.match(gateway, /create_event_record_row/);
  assert.match(gateway, /targetRecords\.length === 0/);
  assert.match(gateway, /eventRecordComesBefore/);
  assert.match(migration, /create or replace function public\.create_event_record_row/);
  assert.match(migration, /order by row_number desc/);
  assert.match(migration, /set row_number = row_to_shift\.row_number \+ 1/);
  assert.match(migration, /grant execute on function public\.create_event_record_row/);
  assert.match(migration, /to service_role/);
  assert.match(startMigration, /p_insert_after_row_number < 0/);
  assert.match(startMigration, /if p_insert_after_row_number > 0 then/);
  assert.match(startMigration, /to service_role/);
});

test("removes an extra event row and preserves Age Set order", async () => {
  const [detail, route, recordsStore, gateway, migration, styles] = await Promise.all([
    source("app/admin/events/[id]/EventDatasetDetail.tsx"),
    source("app/api/event-records/[id]/route.ts"),
    source("db/event-records.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
    source("supabase/migrations/20260803151547_delete_event_record_row.sql"),
    source("app/globals.css"),
  ]);

  assert.match(detail, /function removeStoredEventRecord/);
  assert.match(detail, /REMOVE EXTRA EVENT/);
  assert.match(detail, /Choose the incorrect row/);
  assert.match(detail, /This cannot be undone/);
  assert.match(detail, /method: "DELETE"/);
  assert.match(detail, /Remaining rows were renumbered/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /hasRequestPermission\(user, "datasets\.edit"\)/);
  assert.match(route, /deleteEventRecord/);
  assert.match(route, /listEventRecords/);
  assert.match(recordsStore, /operation: "deleteEventRecord"/);
  assert.match(gateway, /case "deleteEventRecord"/);
  assert.match(gateway, /event_record\.delete/);
  assert.match(gateway, /delete_event_record_row/);
  assert.match(migration, /create or replace function public\.delete_event_record_row/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /order by row_number asc/);
  assert.match(migration, /set row_number = row_to_shift\.row_number - 1/);
  assert.match(migration, /grant execute on function public\.delete_event_record_row/);
  assert.match(migration, /to service_role/);
  assert.match(styles, /\.event-age-set-removal-options/);
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
  assert.match(detail, /familyVariants=\{familyVariants\}/);
  assert.match(detail, /onCreateCountryVariant=\{createCountryVariant\}/);
  assert.match(detail, /Country variants[\s\S]*Package name[\s\S]*Starting age/);
  const hero = detail.slice(
    detail.indexOf('<section className="event-detail-hero">'),
    detail.indexOf('<section className="country-localization-notice">'),
  );
  assert.doesNotMatch(hero, /aria-label="Country variants"/);
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
