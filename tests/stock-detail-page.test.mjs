import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("opens a dedicated detail page from every stock set card", async () => {
  const library = await source("app/admin/stocks/StockDatasets.tsx");

  assert.match(library, /className="stock-card-detail-link"/);
  assert.match(library, /href=\{`\/admin\/stocks\/\$\{dataset\.id\}`\}/);
  assert.match(library, /View details for \$\{dataset\.name\}/);
});

test("stock detail page presents package membership and working controls", async () => {
  const detail = await source(
    "app/admin/stocks/[id]/StockDatasetDetail.tsx",
  );

  assert.match(detail, /STOCK SET #\{dataset\.id\}/);
  assert.match(detail, /Included instruments/);
  assert.match(detail, /Price range/);
  assert.match(detail, /Sequence move/);
  assert.match(detail, /Configure set/);
  assert.match(detail, /runAction\("reuse"\)/);
  assert.match(detail, /runAction\("duplicate"\)/);
  assert.match(detail, /method: "PATCH"/);
  assert.match(detail, /Copy symbols/);
});
