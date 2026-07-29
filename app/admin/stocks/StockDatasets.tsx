"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

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
  ticks: number;
  firstPrice: number;
  lastPrice: number;
};

type ModalState =
  | { mode: "create"; dataset: null }
  | { mode: "edit"; dataset: Dataset }
  | null;

const stockInventory: StockRecord[] = [
  { id: 1, symbol: "ETH", reference: "ETH", ticks: 360, firstPrice: 2200, lastPrice: 3688.22 },
  { id: 2, symbol: "AAPL", reference: "AAPL", ticks: 360, firstPrice: 145, lastPrice: 119.52 },
  { id: 3, symbol: "GOLD", reference: "GOLD", ticks: 360, firstPrice: 1434.43, lastPrice: 4513.87 },
  { id: 4, symbol: "NASDAQ", reference: "NASDAQ", ticks: 360, firstPrice: 12000, lastPrice: 13987.45 },
  { id: 5, symbol: "NFT", reference: "NFT", ticks: 360, firstPrice: 500, lastPrice: 1411.08 },
  { id: 6, symbol: "REIT", reference: "REIT", ticks: 360, firstPrice: 280, lastPrice: 306.42 },
  { id: 7, symbol: "SILVER", reference: "SILVER", ticks: 360, firstPrice: 24, lastPrice: 22.81 },
  { id: 8, symbol: "DJI", reference: "DJI", ticks: 360, firstPrice: 28000, lastPrice: 37484.89 },
];

const sparkPatterns = [
  [21, 28, 25, 34, 41, 47, 44, 53, 60, 67, 72, 78],
  [71, 68, 72, 63, 58, 62, 52, 49, 44, 48, 39, 36],
  [19, 26, 31, 29, 40, 46, 52, 58, 66, 72, 83, 92],
  [42, 39, 47, 52, 48, 58, 55, 63, 69, 65, 75, 79],
  [16, 23, 28, 38, 33, 44, 51, 62, 58, 72, 81, 89],
  [38, 43, 39, 48, 52, 50, 59, 57, 63, 68, 65, 71],
  [63, 57, 61, 54, 58, 49, 46, 52, 43, 39, 42, 37],
  [34, 41, 38, 46, 51, 57, 54, 64, 68, 73, 79, 84],
];

export function StockDatasets({
  user,
}: {
  user: { name: string; email: string };
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/datasets", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load stock datasets.");
      }
      setDatasets(payload.datasets);
      setLimit(payload.limit);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load stock datasets.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const stockSets = useMemo(
    () => datasets.filter((dataset) => dataset.kind === "stock"),
    [datasets],
  );

  const visibleStocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return stockInventory;
    return stockInventory.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(normalized) ||
        stock.reference.toLowerCase().includes(normalized),
    );
  }, [query]);

  const totalMemberships = stockSets.reduce(
    (total, dataset) => total + dataset.itemCount,
    0,
  );
  const totalReuses = stockSets.reduce(
    (total, dataset) => total + dataset.reuseCount,
    0,
  );
  const atCapacity = datasets.length >= limit;

  async function runAction(dataset: Dataset, action: "duplicate" | "reuse") {
    setBusy(`${action}-${dataset.id}`);
    try {
      const response = await fetch(`/api/datasets/${dataset.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Action failed.");

      if (action === "duplicate") {
        setDatasets((current) => [payload.dataset, ...current]);
        setToast(`${dataset.name} duplicated as a reusable stock draft.`);
      } else {
        setDatasets((current) =>
          current.map((item) =>
            item.id === payload.dataset.id ? payload.dataset : item,
          ),
        );
        setToast(`${dataset.name} prepared for the next game.`);
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteDataset(dataset: Dataset) {
    const confirmed = window.confirm(
      `Delete “${dataset.name}”? The eight source stock records will remain available.`,
    );
    if (!confirmed) return;

    setBusy(`delete-${dataset.id}`);
    try {
      const response = await fetch(`/api/datasets/${dataset.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
      setDatasets((current) =>
        current.filter((item) => item.id !== dataset.id),
      );
      setToast(`${dataset.name} deleted.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  function datasetSaved(dataset: Dataset, mode: "create" | "edit") {
    setDatasets((current) =>
      mode === "create"
        ? [dataset, ...current]
        : current.map((item) => (item.id === dataset.id ? dataset : item)),
    );
    setModal(null);
    setToast(
      mode === "create"
        ? `${dataset.name} created.`
        : `${dataset.name} updated.`,
    );
  }

  return (
    <div className="admin-app stock-admin-page">
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
            <em>{stockSets.length}</em>
          </a>
          <a href="/admin/events">
            <span className="nav-glyph">◈</span>
            Event datasets
            <em>{datasets.filter((dataset) => dataset.kind === "event").length}</em>
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

        <div className="stock-side-note">
          <span>STOCK CLOCK</span>
          <strong>10 second ticks</strong>
          <p>360 prices cover one 60-minute game.</p>
          <div>
            <i className="status-dot" />
            DATASET HEALTHY
          </div>
        </div>

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
          <label className="global-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search stock inventory…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-status">
            <span className="status-dot" />
            MARKET DATA ONLINE
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-heading">
            <div>
              <div className="stock-breadcrumb">
                <a href="/admin">Dataset control</a>
                <span>/</span>
                <strong>Stocks</strong>
              </div>
              <p className="eyebrow">STOCK CONTENT OPERATIONS</p>
              <h1>Stock datasets</h1>
              <p>
                Build reusable market packages from eight simulated instruments
                and deploy them across any game.
              </p>
            </div>
            <button
              className="admin-primary"
              type="button"
              onClick={() => setModal({ mode: "create", dataset: null })}
              disabled={atCapacity}
            >
              <span aria-hidden="true">＋</span>
              New stock dataset
            </button>
          </section>

          <section className="metric-grid stock-metrics">
            <Metric
              label="Stock datasets"
              value={`${stockSets.length}`}
              meta="reusable packages"
              tone="cyan"
              symbol="▦"
            />
            <Metric
              label="Unique instruments"
              value="8"
              meta="simulated assets"
              tone="purple"
              symbol="⌁"
            />
            <Metric
              label="Price points"
              value="2,880"
              meta="360 ticks per stock"
              tone="green"
              symbol="⌗"
            />
            <Metric
              label="Package reuses"
              value={`${totalReuses}`}
              meta={`${totalMemberships} memberships`}
              tone="yellow"
              symbol="↻"
            />
          </section>

          {loadError && (
            <div className="stock-page-error">
              <span>!</span>
              <p>{loadError}</p>
              <button type="button" onClick={() => void loadDatasets()}>
                Try again
              </button>
            </div>
          )}

          <section className="stock-set-section">
            <div className="stock-section-heading">
              <div>
                <p className="eyebrow">REUSABLE PACKAGES</p>
                <h2>Stock set library</h2>
                <span>
                  Configure membership once and reuse the same package in future
                  games.
                </span>
              </div>
              <span>{stockSets.length} packages</span>
            </div>

            <div className="stock-set-grid">
              {loading
                ? Array.from({ length: 4 }, (_, index) => (
                    <div className="stock-set-card loading" key={index} />
                  ))
                : stockSets.map((dataset) => (
                    <StockSetCard
                      key={dataset.id}
                      dataset={dataset}
                      busy={busy}
                      onEdit={() => setModal({ mode: "edit", dataset })}
                      onReuse={() => void runAction(dataset, "reuse")}
                      onDuplicate={() => void runAction(dataset, "duplicate")}
                      onDelete={() => void deleteDataset(dataset)}
                    />
                  ))}
              {!loading && stockSets.length === 0 && (
                <button
                  className="empty-stock-card"
                  type="button"
                  onClick={() => setModal({ mode: "create", dataset: null })}
                >
                  <span>＋</span>
                  <strong>Create the first stock dataset</strong>
                  <small>Select instruments from the inventory below.</small>
                </button>
              )}
            </div>
          </section>

          <section className="stock-inventory-panel">
            <div className="stock-section-heading inventory-heading">
              <div>
                <p className="eyebrow">SOURCE INVENTORY</p>
                <h2>Simulated instruments</h2>
                <span>
                  Reference prices are fixed gameplay sequences, not a live
                  market feed.
                </span>
              </div>
              <label className="table-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Filter symbols"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>

            <div className="stock-inventory-table-wrap">
              <table className="stock-inventory-table">
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Reference</th>
                    <th>Tick coverage</th>
                    <th>First price</th>
                    <th>Last price</th>
                    <th>Sequence change</th>
                    <th>Trend profile</th>
                    <th>Used in</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStocks.map((stock) => {
                    const change =
                      ((stock.lastPrice - stock.firstPrice) /
                        stock.firstPrice) *
                      100;
                    const packageCount = stockSets.filter((dataset) =>
                      dataset.memberIds.includes(stock.id),
                    ).length;

                    return (
                      <tr key={stock.id}>
                        <td data-label="Instrument">
                          <span className="stock-symbol">
                            <i>{stock.symbol.slice(0, 2)}</i>
                            <strong>{stock.symbol}</strong>
                          </span>
                        </td>
                        <td data-label="Reference">{stock.reference}</td>
                        <td data-label="Tick coverage">
                          <strong>{stock.ticks}</strong>
                          <small>60 minutes</small>
                        </td>
                        <td data-label="First price">
                          {money(stock.firstPrice)}
                        </td>
                        <td data-label="Last price">
                          {money(stock.lastPrice)}
                        </td>
                        <td data-label="Sequence change">
                          <span className={change >= 0 ? "positive" : "negative"}>
                            {change >= 0 ? "+" : ""}
                            {change.toFixed(1)}%
                          </span>
                        </td>
                        <td data-label="Trend profile">
                          <Sparkline
                            values={sparkPatterns[stock.id - 1]}
                            positive={change >= 0}
                          />
                        </td>
                        <td data-label="Used in">
                          <span className="package-usage">
                            {packageCount} set{packageCount === 1 ? "" : "s"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleStocks.length === 0 && (
                <div className="stock-no-results">
                  No instruments match “{query}”.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {modal && (
        <StockSetModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={datasetSaved}
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

function Metric({
  label,
  value,
  meta,
  tone,
  symbol,
}: {
  label: string;
  value: string;
  meta: string;
  tone: string;
  symbol: string;
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{meta}</span>
      </div>
      <span className="metric-symbol" aria-hidden="true">
        {symbol}
      </span>
    </article>
  );
}

function StockSetCard({
  dataset,
  busy,
  onEdit,
  onReuse,
  onDuplicate,
  onDelete,
}: {
  dataset: Dataset;
  busy: string | null;
  onEdit: () => void;
  onReuse: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const members = dataset.memberIds
    .map((id) => stockInventory.find((stock) => stock.id === id)?.symbol)
    .filter(Boolean);

  return (
    <article className="stock-set-card">
      <div className="stock-set-card-top">
        <span className="dataset-kind-icon stock">ST</span>
        <span className={`status-label ${dataset.status}`}>
          <i />
          {dataset.status}
        </span>
        <details className="row-menu">
          <summary aria-label={`More actions for ${dataset.name}`}>•••</summary>
          <div>
            <button type="button" onClick={onDuplicate}>
              Duplicate & reuse
            </button>
            <button className="danger" type="button" onClick={onDelete}>
              Delete dataset
            </button>
          </div>
        </details>
      </div>
      <h3>{dataset.name}</h3>
      <p>{dataset.description}</p>
      <div className="stock-member-list">
        {members.slice(0, 6).map((symbol) => (
          <span key={symbol}>{symbol}</span>
        ))}
        {members.length > 6 && <span>+{members.length - 6}</span>}
        {members.length === 0 && <em>No instruments selected</em>}
      </div>
      <div className="stock-set-stats">
        <span>
          <small>INSTRUMENTS</small>
          <strong>{dataset.itemCount}</strong>
        </span>
        <span>
          <small>REUSED</small>
          <strong>↻ {dataset.reuseCount}</strong>
        </span>
        <span>
          <small>UPDATED</small>
          <strong>{relativeDate(dataset.updatedAt)}</strong>
        </span>
      </div>
      <div className="stock-set-actions">
        <button type="button" onClick={onEdit}>
          Configure
        </button>
        <button
          type="button"
          onClick={onReuse}
          disabled={busy === `reuse-${dataset.id}`}
        >
          {busy === `reuse-${dataset.id}` ? "Preparing…" : "Use in game →"}
        </button>
      </div>
    </article>
  );
}

function StockSetModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: Exclude<ModalState, null>;
  onClose: () => void;
  onSaved: (dataset: Dataset, mode: "create" | "edit") => void;
}) {
  const source = modal.dataset;
  const [name, setName] = useState(source?.name ?? "");
  const [description, setDescription] = useState(source?.description ?? "");
  const [status, setStatus] = useState<Dataset["status"]>(
    source?.status ?? "draft",
  );
  const [selected, setSelected] = useState<number[]>(
    source?.memberIds.filter((id) => id <= stockInventory.length) ?? [],
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
      const response = await fetch(
        modal.mode === "create"
          ? "/api/datasets"
          : `/api/datasets/${source?.id}`,
        {
          method: modal.mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            kind: "stock",
            description,
            status,
            memberIds: selected,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Save failed.");
      onSaved(payload.dataset, modal.mode);
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
        aria-labelledby="stock-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {modal.mode === "create"
                ? "NEW STOCK PACKAGE"
                : "CONFIGURE STOCK PACKAGE"}
            </p>
            <h2 id="stock-modal-title">
              {modal.mode === "create" ? "Create stock dataset" : source?.name}
            </h2>
            <p>
              Select the simulated instruments that this reusable package
              should contain.
            </p>
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
                placeholder="e.g. Stock Set 5"
              />
            </label>
            <label className="admin-field wide">
              <span>Description</span>
              <textarea
                rows={2}
                maxLength={240}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Where should this stock package be used?"
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
              {saving
                ? "Saving…"
                : modal.mode === "create"
                  ? "Create stock dataset"
                  : "Save configuration"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Sparkline({
  values,
  positive,
}: {
  values: number[];
  positive: boolean;
}) {
  return (
    <span className={`stock-sparkline ${positive ? "up" : "down"}`}>
      {values.map((value, index) => (
        <i key={`${value}-${index}`} style={{ height: `${value}%` }} />
      ))}
    </span>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(value);
}

function relativeDate(value: string) {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "Recently";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
