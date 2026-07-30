"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  stockInventory,
  type StockRecord,
} from "../stock-inventory";

type Dataset = {
  id: number;
  name: string;
  kind: "event" | "stock";
  description: string;
  status: "draft" | "ready" | "archived";
  memberIds: number[];
  itemCount: number;
  reuseCount: number;
  validationState: "valid" | "warning";
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DetailProps = {
  datasetId: string;
  user: { name: string; email: string };
};

type StockPricePoint = {
  period: number;
  price: number;
  updatedAt: string;
};

type StockPriceSeries = {
  stockId: number;
  symbol: string;
  displayName: string;
  assetClass: string;
  scenario: string;
  sourceName: string;
  points: StockPricePoint[];
};

export function StockDatasetDetail({ datasetId, user }: DetailProps) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{
    stock: StockRecord;
    slot: number;
  } | null>(null);
  const stockTriggerRef = useRef<HTMLTableRowElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [detailResponse, listResponse] = await Promise.all([
        fetch(`/api/datasets/${datasetId}`, { cache: "no-store" }),
        fetch("/api/datasets", { cache: "no-store" }),
      ]);
      const [detailPayload, listPayload] = await Promise.all([
        detailResponse.json(),
        listResponse.json(),
      ]);
      if (!detailResponse.ok) {
        throw new Error(detailPayload.error ?? "Stock dataset not found.");
      }
      if (!listResponse.ok) {
        throw new Error(listPayload.error ?? "Dataset library unavailable.");
      }
      if (detailPayload.dataset.kind !== "stock") {
        throw new Error("This package is not a stock dataset.");
      }
      setDataset(detailPayload.dataset);
      setDatasets(listPayload.datasets);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Stock dataset not found.",
      );
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const stockCount = datasets.filter((item) => item.kind === "stock").length;
  const eventCount = datasets.filter((item) => item.kind === "event").length;
  const memberStocks = useMemo(
    () =>
      dataset?.memberIds.map((memberId) => resolveStock(memberId)) ?? [],
    [dataset],
  );
  const averageChange =
    memberStocks.length > 0
      ? memberStocks.reduce((total, stock) => total + stockChange(stock), 0) /
        memberStocks.length
      : 0;

  async function runAction(action: "reuse" | "duplicate") {
    if (!dataset) return;
    setBusy(action);
    try {
      const response = await fetch(`/api/datasets/${dataset.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Action failed.");

      if (action === "reuse") {
        setDataset(payload.dataset);
        setToast(`${dataset.name} prepared for the next game.`);
      } else {
        setDatasets((current) => [payload.dataset, ...current]);
        setToast(
          `${payload.dataset.name} created. Open it from Stock Datasets.`,
        );
      }
    } catch (actionError) {
      setToast(
        actionError instanceof Error ? actionError.message : "Action failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function copySymbols() {
    await navigator.clipboard.writeText(
      memberStocks.map((stock) => stock.symbol).join(", "),
    );
    setToast("Instrument symbols copied.");
  }

  function openStockRecord(
    stock: StockRecord,
    slot: number,
    trigger: HTMLTableRowElement,
  ) {
    stockTriggerRef.current = trigger;
    setSelectedStock({ stock, slot });
  }

  function closeStockRecord() {
    setSelectedStock(null);
    window.requestAnimationFrame(() => stockTriggerRef.current?.focus());
  }

  return (
    <div className="admin-app event-detail-page stock-detail-page">
      <aside className="admin-sidebar">
        <a className="brand admin-brand" href="/" aria-label="NaviWealth home">
          <span className="brand-mark" aria-hidden="true">
            <span>N</span>
          </span>
          <span>
            NaviWealth
            <small>ADMIN PORTAL</small>
          </span>
        </a>

        <nav className="admin-nav" aria-label="Admin navigation">
          <p>WORKSPACE</p>
          <a href="/admin">
            <span className="nav-glyph">⌂</span>
            Overview
          </a>
          <a href="/admin/simulator">
            <span className="nav-glyph">▶</span>
            Simulator
          </a>
          <a className="active" href="/admin/stocks">
            <span className="nav-glyph">▦</span>
            Stock datasets
            <em>{stockCount}</em>
          </a>
          <a href="/admin/events">
            <span className="nav-glyph">◈</span>
            Event datasets
            <em>{eventCount}</em>
          </a>
          <p>GAME SYSTEM</p>
          <a href="/admin/users">
            <span className="nav-glyph">◎</span>
            User control
          </a>
          <a href="/admin/game-settings">
            <span className="nav-glyph">⚙</span>
            Game settings
          </a>
        </nav>

        {dataset && (
          <div className="detail-side-card">
            <span>OPEN PACKAGE</span>
            <strong>{dataset.name}</strong>
            <p>{dataset.itemCount} simulated instruments</p>
            <div>
              <i className="status-dot" />
              {dataset.status.toUpperCase()}
            </div>
          </div>
        )}

        <div className="sidebar-user">
          <span className="user-avatar">{initials(user.name)}</span>
          <span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
          <a href="/signout-with-chatgpt?return_to=%2F" aria-label="Sign out">
            ↗
          </a>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true">
              <span>N</span>
            </span>
            <strong>NaviWealth</strong>
          </div>
          <a className="detail-back-link" href="/admin/stocks">
            ← Back to stock datasets
          </a>
          <div className="topbar-status">
            <span className="status-dot" />
            MARKET DATA ONLINE
          </div>
        </header>

        <div className="admin-content">
          {loading ? (
            <DetailSkeleton />
          ) : error || !dataset ? (
            <section className="detail-error-state">
              <span>!</span>
              <h1>Stock set unavailable</h1>
              <p>{error}</p>
              <a href="/admin/stocks">Return to Stock Datasets</a>
            </section>
          ) : (
            <>
              <section className="event-detail-hero">
                <div className="stock-breadcrumb">
                  <a href="/admin">Dataset control</a>
                  <span>/</span>
                  <a href="/admin/stocks">Stocks</a>
                  <span>/</span>
                  <strong>{dataset.name}</strong>
                </div>
                <div className="event-detail-title-row">
                  <span className="dataset-kind-icon stock">ST</span>
                  <div>
                    <div className="event-detail-labels">
                      <p className="eyebrow">STOCK SET #{dataset.id}</p>
                      <span className={`status-label ${dataset.status}`}>
                        <i />
                        {dataset.status}
                      </span>
                    </div>
                    <h1>{dataset.name}</h1>
                    <p>{dataset.description}</p>
                  </div>
                  <div className="event-detail-actions">
                    <button type="button" onClick={() => setEditing(true)}>
                      Configure set
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction("duplicate")}
                      disabled={busy === "duplicate"}
                    >
                      {busy === "duplicate" ? "Duplicating…" : "Duplicate"}
                    </button>
                    <button
                      className="event-primary"
                      type="button"
                      onClick={() => void runAction("reuse")}
                      disabled={busy === "reuse"}
                    >
                      {busy === "reuse" ? "Preparing…" : "Use in game →"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="detail-metric-grid">
                <DetailMetric
                  label="Instruments"
                  value={`${dataset.itemCount}`}
                  meta="unique simulated assets"
                  tone="cyan"
                />
                <DetailMetric
                  label="Price points"
                  value={formatNumber(dataset.itemCount * 360)}
                  meta="360 ticks per instrument"
                  tone="purple"
                />
                <DetailMetric
                  label="Average move"
                  value={`${averageChange >= 0 ? "+" : ""}${averageChange.toFixed(1)}%`}
                  meta="across included sequences"
                  tone={averageChange >= 0 ? "green" : "yellow"}
                />
                <DetailMetric
                  label="Times reused"
                  value={`${dataset.reuseCount}`}
                  meta={
                    dataset.lastUsedAt
                      ? `last ${relativeDate(dataset.lastUsedAt)}`
                      : "not used yet"
                  }
                  tone="yellow"
                />
              </section>

              <section className="event-detail-grid">
                <div className="membership-panel">
                  <div className="stock-section-heading">
                    <div>
                      <p className="eyebrow">PACKAGE MEMBERSHIP</p>
                      <h2>Included instruments</h2>
                      <span>
                        Fixed 60-minute price sequences deployed with this set.
                      </span>
                    </div>
                    <button type="button" onClick={() => void copySymbols()}>
                      Copy symbols
                    </button>
                  </div>
                  <div className="membership-table-wrap">
                    <table className="membership-table stock-membership-table">
                      <thead>
                        <tr>
                          <th>Slot</th>
                          <th>Instrument</th>
                          <th>Asset class</th>
                          <th>Tick coverage</th>
                          <th>Price range</th>
                          <th>Sequence move</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberStocks.map((stock, index) => {
                          const change = stockChange(stock);
                          return (
                            <tr
                              className="membership-row-action stock-membership-row-action"
                              key={`${stock.id}-${index}`}
                              role="button"
                              tabIndex={0}
                              aria-label={`View ${stock.symbol} stock details`}
                              onClick={(event) =>
                                openStockRecord(
                                  stock,
                                  index + 1,
                                  event.currentTarget,
                                )
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  openStockRecord(
                                    stock,
                                    index + 1,
                                    event.currentTarget,
                                  );
                                }
                              }}
                            >
                              <td>
                                <span className="slot-number">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                              </td>
                              <td>
                                <span className="stock-membership-symbol">
                                  <i>{stock.symbol.slice(0, 2)}</i>
                                  <span>
                                    <strong>{stock.symbol}</strong>
                                    <small>{stock.reference}</small>
                                  </span>
                                </span>
                              </td>
                              <td>{stock.assetClass}</td>
                              <td>
                                <span className="stock-tick-coverage">
                                  <strong>{stock.ticks}</strong>
                                  <small>10-second ticks</small>
                                </span>
                              </td>
                              <td>
                                <span className="stock-price-range">
                                  <span>
                                    <strong>{money(stock.firstPrice)}</strong>
                                    <i>→</i>
                                    <strong>{money(stock.lastPrice)}</strong>
                                  </span>
                                  <b>View details</b>
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`stock-sequence-change ${
                                    change >= 0 ? "positive" : "negative"
                                  }`}
                                >
                                  {change >= 0 ? "+" : ""}
                                  {change.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {memberStocks.length === 0 && (
                      <div className="membership-empty">
                        <span>▦</span>
                        <strong>No instruments selected</strong>
                        <p>Configure the set to add simulated market assets.</p>
                      </div>
                    )}
                  </div>
                </div>

                <aside className="event-detail-aside">
                  <section className="detail-check-panel">
                    <div className="stock-section-heading">
                      <div>
                        <p className="eyebrow">READINESS</p>
                        <h2>Package checks</h2>
                      </div>
                      <span
                        className={
                          dataset.itemCount > 0
                            ? "check-score valid"
                            : "check-score"
                        }
                      >
                        {dataset.itemCount > 0 ? "READY" : "DRAFT"}
                      </span>
                    </div>
                    <div className="detail-check-list">
                      <CheckItem
                        valid={Boolean(dataset.name.trim())}
                        title="Package named"
                        copy="A reusable display name is present."
                      />
                      <CheckItem
                        valid={dataset.itemCount > 0}
                        title="Membership populated"
                        copy={`${dataset.itemCount} instruments selected.`}
                      />
                      <CheckItem
                        valid={memberStocks.every((stock) => stock.ticks === 360)}
                        title="Full tick coverage"
                        copy="Every sequence contains 360 price points."
                      />
                      <CheckItem
                        valid={dataset.status === "ready"}
                        title="Ready status"
                        copy="The package can be selected for a game."
                      />
                    </div>
                  </section>

                  <section className="detail-usage-panel">
                    <div className="stock-section-heading">
                      <div>
                        <p className="eyebrow">USAGE</p>
                        <h2>Reuse history</h2>
                      </div>
                    </div>
                    <div className="detail-usage-stat">
                      <strong>{dataset.reuseCount}</strong>
                      <span>game preparations</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Last prepared</dt>
                        <dd>
                          {dataset.lastUsedAt
                            ? relativeDate(dataset.lastUsedAt)
                            : "Never"}
                        </dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>{formatDate(dataset.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatDate(dataset.updatedAt)}</dd>
                      </div>
                    </dl>
                  </section>
                </aside>
              </section>
            </>
          )}
        </div>
      </main>

      {editing && dataset && (
        <StockDetailEditModal
          dataset={dataset}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setDataset(updated);
            setEditing(false);
            setToast(`${updated.name} updated.`);
          }}
        />
      )}

      {selectedStock && dataset && (
        <StockRecordModal
          stock={selectedStock.stock}
          slot={selectedStock.slot}
          datasetName={dataset.name}
          onClose={closeStockRecord}
        />
      )}

      {toast && (
        <div className="admin-toast" role="status">
          <span className="status-dot" />
          {toast}
        </div>
      )}
    </div>
  );
}

function StockRecordModal({
  stock,
  slot,
  datasetName,
  onClose,
}: {
  stock: StockRecord;
  slot: number;
  datasetName: string;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLElement | null>(null);
  const [series, setSeries] = useState<StockPriceSeries | null>(null);
  const [draftValues, setDraftValues] = useState<string[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [seriesError, setSeriesError] = useState("");
  const [savingSeries, setSavingSeries] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/stocks/${stock.id}/prices`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          series?: StockPriceSeries;
          error?: string;
        };
        if (!response.ok || !payload.series) {
          throw new Error(
            payload.error ?? "The stock price sequence could not be loaded.",
          );
        }
        setSeries(payload.series);
        setDraftValues(
          payload.series.points.map((point) => point.price.toFixed(2)),
        );
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setSeriesError(
          loadError instanceof Error
            ? loadError.message
            : "The stock price sequence could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSeries(false);
      });

    return () => controller.abort();
  }, [stock.id]);

  const resolvedPrices = useMemo(
    () =>
      series?.points.map((point, index) => {
        const parsed = Number(draftValues[index]);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : point.price;
      }) ?? [],
    [draftValues, series],
  );
  const summary = summarizePrices(resolvedPrices, stock);
  const change = summary.change;
  const direction = change >= 0 ? "positive" : "negative";
  const invalidRows = draftValues.filter(
    (value) => value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0,
  ).length;
  const dirtyUpdates = useMemo(
    () =>
      series?.points.flatMap((point, index) => {
        const price = Number(draftValues[index]);
        if (
          !Number.isFinite(price) ||
          price < 0 ||
          Math.abs(price - point.price) < 0.005
        ) {
          return [];
        }
        return [{ period: point.period, price }];
      }) ?? [],
    [draftValues, series],
  );

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleModalKeys(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        onClose();
        return;
      }
      if (keyEvent.key !== "Tab" || !modalRef.current) return;

      const controls = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled)",
        ),
      );
      if (controls.length < 2) return;

      const first = controls[0];
      const last = controls[controls.length - 1];
      if (keyEvent.shiftKey && document.activeElement === first) {
        keyEvent.preventDefault();
        last.focus();
      } else if (!keyEvent.shiftKey && document.activeElement === last) {
        keyEvent.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleModalKeys);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleModalKeys);
    };
  }, [onClose]);

  function updateDraftPrice(index: number, value: string) {
    setSaveMessage("");
    setDraftValues((current) =>
      current.map((price, priceIndex) => (priceIndex === index ? value : price)),
    );
  }

  function resetDraftPrices() {
    if (!series) return;
    setDraftValues(series.points.map((point) => point.price.toFixed(2)));
    setSeriesError("");
    setSaveMessage("Unsaved edits cleared.");
  }

  async function savePriceChanges() {
    if (!series || dirtyUpdates.length === 0 || invalidRows > 0) return;
    setSavingSeries(true);
    setSeriesError("");
    setSaveMessage("");
    try {
      const response = await fetch(`/api/stocks/${stock.id}/prices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: dirtyUpdates }),
      });
      const payload = (await response.json()) as {
        series?: StockPriceSeries;
        error?: string;
      };
      if (!response.ok || !payload.series) {
        throw new Error(payload.error ?? "The price changes could not be saved.");
      }
      setSeries(payload.series);
      setDraftValues(
        payload.series.points.map((point) => point.price.toFixed(2)),
      );
      setSaveMessage(
        `${dirtyUpdates.length} price ${
          dirtyUpdates.length === 1 ? "point" : "points"
        } saved.`,
      );
    } catch (saveError) {
      setSeriesError(
        saveError instanceof Error
          ? saveError.message
          : "The price changes could not be saved.",
      );
    } finally {
      setSavingSeries(false);
    }
  }

  return (
    <div
      className="modal-backdrop event-record-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <article
        ref={modalRef}
        className="event-record-modal stock-record-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-record-title"
        aria-describedby="stock-record-summary"
        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <header className="event-record-header stock-record-header">
          <div className="event-record-type stock-record-type">
            <span>{stock.symbol.slice(0, 2)}</span>
          </div>
          <div>
            <p className="event-record-eyebrow stock-record-eyebrow">
              INSTRUMENT {String(slot).padStart(2, "0")} · FIXED PRICE SEQUENCE
            </p>
            <h2 id="stock-record-title">{stock.fullName}</h2>
            <p id="stock-record-summary">{stock.summary}</p>
          </div>
          <button
            autoFocus
            type="button"
            aria-label="Close stock details"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="event-record-body">
          <section className="event-record-meta stock-record-meta">
            <div>
              <span>SYMBOL</span>
              <strong className="stock-tone">{stock.symbol}</strong>
            </div>
            <div>
              <span>ASSET CLASS</span>
              <strong>{stock.assetClass}</strong>
            </div>
            <div>
              <span>REFERENCE</span>
              <strong>{series?.sourceName ?? stock.reference}</strong>
            </div>
            <div>
              <span>PRICE COVERAGE</span>
              <strong>
                {series?.points.length ?? stock.ticks} points · 60 min
              </strong>
            </div>
          </section>

          <section
            className={`event-impact-card stock-record-impact ${direction}`}
          >
            <div>
              <p>SEQUENCE MOVEMENT</p>
              <strong>
                {change >= 0 ? "+" : ""}
                {change.toFixed(1)}%
              </strong>
              <span>
                {money(summary.first)} → {money(summary.last)}
              </span>
            </div>
            <div>
              <p>SIMULATED RANGE</p>
              <strong>
                {money(summary.low)} – {money(summary.high)}
              </strong>
              <span>Low to high across 360 fixed price points</span>
            </div>
          </section>

          <section className="stock-sequence-workspace">
            <div className="stock-sequence-heading">
              <div>
                <p className="eyebrow">RAW PRICE SEQUENCE</p>
                <h3>All 360 editable data points</h3>
                <span>
                  Changes update the line immediately. Save to apply them to
                  every dataset using this instrument.
                </span>
              </div>
              <div className="stock-sequence-actions">
                {dirtyUpdates.length > 0 && (
                  <span>
                    {dirtyUpdates.length} unsaved{" "}
                    {dirtyUpdates.length === 1 ? "change" : "changes"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetDraftPrices}
                  disabled={dirtyUpdates.length === 0 || savingSeries}
                >
                  Reset
                </button>
                <button
                  className="stock-save-prices"
                  type="button"
                  onClick={() => void savePriceChanges()}
                  disabled={
                    dirtyUpdates.length === 0 ||
                    invalidRows > 0 ||
                    savingSeries
                  }
                >
                  {savingSeries
                    ? "Saving…"
                    : `Save ${
                        dirtyUpdates.length > 0 ? dirtyUpdates.length : ""
                      } changes`}
                </button>
              </div>
            </div>

            {loadingSeries && (
              <div className="stock-series-loading" role="status">
                <span />
                Loading all 360 price points…
              </div>
            )}

            {!loadingSeries && series && (
              <>
                <StockPriceChart
                  symbol={series.symbol}
                  prices={resolvedPrices}
                />
                <div className="stock-points-table-wrap">
                  <table className="stock-points-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Game time</th>
                        <th>Saved value</th>
                        <th>Editable price (RM)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.points.map((point, index) => {
                        const parsed = Number(draftValues[index]);
                        const valid =
                          draftValues[index]?.trim() !== "" &&
                          Number.isFinite(parsed) &&
                          parsed >= 0;
                        const changed =
                          valid && Math.abs(parsed - point.price) >= 0.005;
                        return (
                          <tr
                            key={point.period}
                            className={changed ? "edited" : ""}
                          >
                            <td>{String(point.period).padStart(3, "0")}</td>
                            <td>{formatGameTime(point.period)}</td>
                            <td>{money(point.price)}</td>
                            <td>
                              <label>
                                <span className="sr-only">
                                  Price for period {point.period}
                                </span>
                                <span>RM</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="999999999999"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={draftValues[index] ?? ""}
                                  aria-invalid={!valid}
                                  onChange={(event) =>
                                    updateDraftPrice(index, event.target.value)
                                  }
                                />
                              </label>
                            </td>
                            <td>
                              <span
                                className={
                                  !valid
                                    ? "stock-point-invalid"
                                    : changed
                                      ? "stock-point-edited"
                                      : "stock-point-saved"
                                }
                              >
                                {!valid
                                  ? "Check value"
                                  : changed
                                    ? "Edited"
                                    : "Saved"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {seriesError && (
              <p className="stock-series-error" role="alert">
                {seriesError}
              </p>
            )}
            {invalidRows > 0 && (
              <p className="stock-series-error" role="alert">
                Correct {invalidRows} invalid{" "}
                {invalidRows === 1 ? "value" : "values"} before saving.
              </p>
            )}
            {saveMessage && (
              <p className="stock-series-success" role="status">
                <i />
                {saveMessage}
              </p>
            )}
          </section>

          <section className="event-behavior-grid stock-behavior-grid">
            <div>
              <p className="eyebrow">GAMEPLAY PROFILE</p>
              <h3>{stock.riskProfile}</h3>
              <p>{stock.gameplayRole}</p>
              <span
                className={`stock-volatility-badge ${stock.volatility.toLowerCase()}`}
              >
                <i />
                {stock.volatility} volatility
              </span>
            </div>
            <div>
              <p className="eyebrow">SEQUENCE RULES</p>
              <h3>Market engine instructions</h3>
              <ol>
                <li>
                  <span>01</span>
                  Advance to the next fixed price point every 10 seconds.
                </li>
                <li>
                  <span>02</span>
                  Use the same sequence for every player in the game session.
                </li>
                <li>
                  <span>03</span>
                  Reset the instrument to its opening price for a new game.
                </li>
              </ol>
            </div>
          </section>

          <footer className="event-record-footer stock-record-footer">
            <p>
              Included in <strong>{datasetName}</strong>
              <span>
                Simulated instrument inventory · Source ID #{stock.id}
              </span>
            </p>
            <button type="button" onClick={onClose}>
              Close details
            </button>
          </footer>
        </div>
      </article>
    </div>
  );
}

function StockPriceChart({
  symbol,
  prices,
}: {
  symbol: string;
  prices: number[];
}) {
  const width = 920;
  const height = 250;
  const padding = { top: 20, right: 18, bottom: 30, left: 54 };
  const low = prices.length > 0 ? Math.min(...prices) : 0;
  const high = prices.length > 0 ? Math.max(...prices) : 0;
  const range = Math.max(high - low, 1);
  const x = (index: number) =>
    padding.left +
    (index / Math.max(prices.length - 1, 1)) *
      (width - padding.left - padding.right);
  const y = (price: number) =>
    padding.top +
    ((high - price) / range) * (height - padding.top - padding.bottom);
  const path = prices
    .map(
      (price, index) =>
        `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(price).toFixed(2)}`,
    )
    .join(" ");
  const areaPath =
    prices.length > 0
      ? `${path} L ${x(prices.length - 1).toFixed(2)} ${
          height - padding.bottom
        } L ${padding.left} ${height - padding.bottom} Z`
      : "";

  return (
    <figure className="stock-price-chart">
      <figcaption>
        <span>{symbol} · 360-period line</span>
        <span>
          Low {money(low)} · High {money(high)}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${symbol} price line across all 360 periods`}
      >
        <defs>
          <linearGradient id={`stock-area-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d3f3" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#00d3f3" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((position) => {
          const gridY =
            padding.top +
            position * (height - padding.top - padding.bottom);
          const label = high - position * range;
          return (
            <g key={position}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={gridY}
                y2={gridY}
              />
              <text x={padding.left - 10} y={gridY + 3}>
                {compactNumber(label)}
              </text>
            </g>
          );
        })}
        <path className="stock-chart-area" d={areaPath} fill={`url(#stock-area-${symbol})`} />
        <path className="stock-chart-line" d={path} />
        {[1, 90, 180, 270, 360].map((period) => (
          <text
            className="stock-chart-period"
            key={period}
            x={x(period - 1)}
            y={height - 8}
            textAnchor={
              period === 1 ? "start" : period === 360 ? "end" : "middle"
            }
          >
            {period}
          </text>
        ))}
      </svg>
    </figure>
  );
}

function StockDetailEditModal({
  dataset,
  onClose,
  onSaved,
}: {
  dataset: Dataset;
  onClose: () => void;
  onSaved: (dataset: Dataset) => void;
}) {
  const [name, setName] = useState(dataset.name);
  const [description, setDescription] = useState(dataset.description);
  const [status, setStatus] = useState(dataset.status);
  const [selected, setSelected] = useState<number[]>(
    dataset.memberIds.filter((id) => id <= stockInventory.length),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function toggleStock(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((stockId) => stockId !== id)
        : [...current, id],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/datasets/${dataset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          kind: "stock",
          description,
          status,
          memberIds: selected,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Save failed.");
      onSaved(payload.dataset);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dataset-modal stock-dataset-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-detail-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">CONFIGURE STOCK PACKAGE</p>
            <h2 id="stock-detail-edit-title">{dataset.name}</h2>
            <p>Update package details and simulated instrument membership.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-grid">
            <label className="admin-field wide">
              <span>Dataset name</span>
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="admin-field wide">
              <span>Description</span>
              <textarea
                rows={2}
                maxLength={240}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="admin-field wide">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as Dataset["status"])
                }
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <div className="stock-picker-heading">
            <div>
              <strong>Instrument membership</strong>
              <span>All instruments contain 360 gameplay ticks.</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  selected.length === stockInventory.length
                    ? []
                    : stockInventory.map((stock) => stock.id),
                )
              }
            >
              {selected.length === stockInventory.length
                ? "Clear all"
                : "Select all"}
            </button>
          </div>

          <div className="stock-picker">
            {stockInventory.map((stock) => (
              <label
                key={stock.id}
                className={selected.includes(stock.id) ? "selected" : ""}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(stock.id)}
                  onChange={() => toggleStock(stock.id)}
                />
                <span>{stock.symbol.slice(0, 2)}</span>
                <strong>{stock.symbol}</strong>
                <small>{money(stock.firstPrice)} start</small>
              </label>
            ))}
          </div>

          <div className="stock-picker-summary">
            <span>
              <strong>{selected.length}</strong> of 8 instruments selected
            </span>
            <span>
              <strong>{selected.length * 360}</strong> total price points
            </span>
          </div>

          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="admin-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save configuration"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta: string;
  tone: string;
}) {
  return (
    <article className={`detail-metric ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{meta}</span>
    </article>
  );
}

function CheckItem({
  valid,
  title,
  copy,
}: {
  valid: boolean;
  title: string;
  copy: string;
}) {
  return (
    <div className={valid ? "valid" : "warning"}>
      <span>{valid ? "✓" : "!"}</span>
      <p>
        <strong>{title}</strong>
        <small>{copy}</small>
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-skeleton" aria-label="Loading stock set">
      <span />
      <div>
        <span />
        <span />
        <span />
        <span />
      </div>
      <span />
    </div>
  );
}

function resolveStock(id: number): StockRecord {
  return (
    stockInventory.find((stock) => stock.id === id) ?? {
      id,
      symbol: `ASSET-${id}`,
      fullName: `Simulated Asset ${id}`,
      reference: `SRC-${id}`,
      assetClass: "Simulated asset",
      scenario: "Scenario 1",
      ticks: 360,
      firstPrice: 100,
      lastPrice: 100,
      lowPrice: 100,
      highPrice: 100,
      volatility: "Low",
      riskProfile: "Balanced simulation",
      gameplayRole:
        "A neutral fallback sequence used when a source asset is unavailable.",
      summary:
        "A fixed simulated asset sequence included in this reusable stock package.",
      trendPoints: [100, 100],
    }
  );
}

function stockChange(stock: StockRecord) {
  return ((stock.lastPrice - stock.firstPrice) / stock.firstPrice) * 100;
}

function summarizePrices(prices: number[], fallback: StockRecord) {
  if (prices.length === 0) {
    return {
      first: fallback.firstPrice,
      last: fallback.lastPrice,
      low: fallback.lowPrice,
      high: fallback.highPrice,
      change: stockChange(fallback),
    };
  }
  const first = prices[0];
  const last = prices[prices.length - 1];
  return {
    first,
    last,
    low: Math.min(...prices),
    high: Math.max(...prices),
    change: first === 0 ? 0 : ((last - first) / first) * 100,
  };
}

function formatGameTime(period: number) {
  const seconds = (period - 1) * 10;
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(
    2,
    "0",
  )}`;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-MY", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-MY").format(value);
}

function formatDate(value: string) {
  const date = parseDatabaseDate(value);
  if (!date) return "Recently";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function relativeDate(value: string) {
  const date = parseDatabaseDate(value);
  if (!date) return "recently";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function parseDatabaseDate(value: string) {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
