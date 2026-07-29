"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

type StockRecord = {
  id: number;
  symbol: string;
  reference: string;
  assetClass: string;
  ticks: number;
  firstPrice: number;
  lastPrice: number;
};

type DetailProps = {
  datasetId: string;
  user: { name: string; email: string };
};

const stockInventory: StockRecord[] = [
  {
    id: 1,
    symbol: "ETH",
    reference: "ETH",
    assetClass: "Digital asset",
    ticks: 360,
    firstPrice: 2200,
    lastPrice: 3688.22,
  },
  {
    id: 2,
    symbol: "AAPL",
    reference: "AAPL",
    assetClass: "US equity",
    ticks: 360,
    firstPrice: 145,
    lastPrice: 119.52,
  },
  {
    id: 3,
    symbol: "GOLD",
    reference: "GOLD",
    assetClass: "Commodity",
    ticks: 360,
    firstPrice: 1434.43,
    lastPrice: 4513.87,
  },
  {
    id: 4,
    symbol: "NASDAQ",
    reference: "NASDAQ",
    assetClass: "Market index",
    ticks: 360,
    firstPrice: 12000,
    lastPrice: 13987.45,
  },
  {
    id: 5,
    symbol: "NFT",
    reference: "NFT",
    assetClass: "Digital collectible",
    ticks: 360,
    firstPrice: 500,
    lastPrice: 1411.08,
  },
  {
    id: 6,
    symbol: "REIT",
    reference: "REIT",
    assetClass: "Property trust",
    ticks: 360,
    firstPrice: 280,
    lastPrice: 306.42,
  },
  {
    id: 7,
    symbol: "SILVER",
    reference: "SILVER",
    assetClass: "Commodity",
    ticks: 360,
    firstPrice: 24,
    lastPrice: 22.81,
  },
  {
    id: 8,
    symbol: "DJI",
    reference: "DJI",
    assetClass: "Market index",
    ticks: 360,
    firstPrice: 28000,
    lastPrice: 37484.89,
  },
];

export function StockDatasetDetail({ datasetId, user }: DetailProps) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
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
                            <tr key={`${stock.id}-${index}`}>
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
                                  <strong>{money(stock.firstPrice)}</strong>
                                  <i>→</i>
                                  <strong>{money(stock.lastPrice)}</strong>
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

      {toast && (
        <div className="admin-toast" role="status">
          <span className="status-dot" />
          {toast}
        </div>
      )}
    </div>
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
      reference: `SRC-${id}`,
      assetClass: "Simulated asset",
      ticks: 360,
      firstPrice: 100,
      lastPrice: 100,
    }
  );
}

function stockChange(stock: StockRecord) {
  return ((stock.lastPrice - stock.firstPrice) / stock.firstPrice) * 100;
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
