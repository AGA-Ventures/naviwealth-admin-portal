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
  assert.match(detail, /event\.key === "Enter" \|\| event\.key === " "/);
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
