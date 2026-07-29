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

test("opens a detailed stock record from every instrument row", async () => {
  const detail = await source(
    "app/admin/stocks/[id]/StockDatasetDetail.tsx",
  );

  assert.match(detail, /className="membership-row-action stock-membership-row-action"/);
  assert.match(detail, /aria-label=\{`View \$\{stock\.symbol\} stock details`\}/);
  assert.match(detail, /event\.key === "Enter"/);
  assert.match(detail, /event\.key === " "/);
  assert.match(detail, /<StockRecordModal/);
  assert.match(detail, /SEQUENCE MOVEMENT/);
  assert.match(detail, /SIMULATED RANGE/);
  assert.match(detail, /GAMEPLAY PROFILE/);
  assert.match(detail, /Market engine instructions/);
  assert.match(detail, /aria-modal="true"/);
  assert.match(detail, /keyEvent\.key === "Escape"/);
});

test("provides authored profiles for all eight simulated instruments", async () => {
  const detail = await source(
    "app/admin/stocks/[id]/StockDatasetDetail.tsx",
  );

  for (const symbol of [
    "Ethereum",
    "Apple Inc.",
    "Gold",
    "NASDAQ Composite",
    "NFT Market Index",
    "Property REIT Index",
    "Silver",
    "Dow Jones Industrial Average",
  ]) {
    assert.match(detail, new RegExp(`fullName: "${symbol.replace(".", "\\.")}"`));
  }
});
