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
  const inventory = await source("app/admin/stocks/stock-inventory.ts");

  for (const name of [
    "Bitcoin",
    "FTSE Bursa Malaysia KLCI",
    "Gold",
    "S&P 500",
    "Bitcoin · Scenario 2",
    "FTSE Bursa Malaysia KLCI · Scenario 2",
    "Gold · Scenario 2",
    "S&P 500 · Scenario 2",
  ]) {
    assert.match(
      inventory,
      new RegExp(
        `fullName: "${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
      ),
    );
  }
});

test("normalizes stock trend bars within the compact sparkline", async () => {
  const [library, styles] = await Promise.all([
    source("app/admin/stocks/StockDatasets.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(library, /const normalizedValues/);
  assert.match(library, /12 \+ \(\(value - minimum\) \/ range\) \* 88/);
  assert.doesNotMatch(library, /height: `\$\{value\}%`/);
  assert.match(styles, /\.stock-sparkline \{[^}]*overflow: hidden;/s);
  assert.match(styles, /\.stock-sparkline i \{[^}]*max-height: 100%;/s);
});

test("shows and edits the complete 360-point sequence with a live line chart", async () => {
  const [detail, store, route, gateway] = await Promise.all([
    source("app/admin/stocks/[id]/StockDatasetDetail.tsx"),
    source("db/stock-prices.ts"),
    source("app/api/stocks/[id]/prices/route.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
  ]);

  assert.match(detail, /All 360 editable data points/);
  assert.match(detail, /<StockPriceChart/);
  assert.match(detail, /aria-label=\{`\$\{symbol\} price line across all 360 periods`\}/);
  assert.match(detail, /series\.points\.map/);
  assert.match(detail, /type="number"/);
  assert.match(detail, /savePriceChanges/);
  assert.match(detail, /method: "PATCH"/);
  assert.match(store, /operation: "getStockPriceSeries"/);
  assert.match(store, /operation: "updateStockPrices"/);
  assert.match(route, /updateStockPriceSeries/);
  assert.match(gateway, /case "getStockPriceSeries"/);
  assert.match(gateway, /case "updateStockPrices"/);
});

test("imports exactly 360 raw prices for each of the eight CSV stocks", async () => {
  const migration = await source(
    "supabase/migrations/20260730051434_import_stock_price_points.sql",
  );
  const arrays = [
    ...migration.matchAll(
      /from unnest\(array\[([^\]]+)\]::numeric\[\]\) with ordinality/g,
    ),
  ];

  assert.equal(arrays.length, 8);
  for (const [, prices] of arrays) {
    assert.equal(prices.split(",").length, 360);
  }
  for (const symbol of [
    "BTC",
    "KLSI",
    "GOLD",
    "SMP500",
    "BTC2",
    "KLSI2",
    "GOLD2",
    "SMP5002",
  ]) {
    assert.match(migration, new RegExp(`'${symbol}'`));
  }
});
