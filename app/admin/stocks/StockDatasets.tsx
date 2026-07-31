"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AdminSessionUser } from "@/app/admin-access";
import { stockInventory } from "./stock-inventory";

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

type ModalState =
  | { mode: "create"; dataset: null }
  | { mode: "edit"; dataset: Dataset }
  | null;

export function StockDatasets({
  user,
}: {
  user: AdminSessionUser;
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const canEdit = user.permissions.includes("datasets.edit");
  const canReuse = user.permissions.includes("datasets.reuse");

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
    // Fetching is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <Link className="brand admin-brand" href="/" aria-label="NaviWealth home">
          <span className="brand-mark" aria-hidden="true">
            <span>N</span>
          </span>
          <span>
            NaviWealth
            <small>ADMIN PORTAL</small>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="Admin navigation">
          <p>WORKSPACE</p>
          <Link href="/admin">
            <span className="nav-glyph">⌂</span>
            Overview
          </Link>
          <Link href="/admin/simulator">
            <span className="nav-glyph">▶</span>
            Simulator
          </Link>
          <Link className="active" href="/admin/stocks">
            <span className="nav-glyph">▦</span>
            Stock datasets
            <em>{stockSets.length}</em>
          </Link>
          <Link href="/admin/events">
            <span className="nav-glyph">◈</span>
            Event datasets
            <em>{datasets.filter((dataset) => dataset.kind === "event").length}</em>
          </Link>
          <p>GAME SYSTEM</p>
          {user.permissions.includes("users.manage") ? (
            <Link href="/admin/users">
              <span className="nav-glyph">◎</span>
              User control
            </Link>
          ) : null}
          {user.permissions.includes("settings.edit") ? (
            <Link href="/admin/game-settings">
              <span className="nav-glyph">⚙</span>
              Game settings
            </Link>
          ) : null}
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
          <a href="/api/auth/logout" aria-label="Sign out">
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
                <Link href="/admin">Dataset control</Link>
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
            {canEdit ? <button
              className="admin-primary"
              type="button"
              onClick={() => setModal({ mode: "create", dataset: null })}
              disabled={atCapacity}
            >
              <span aria-hidden="true">＋</span>
              New stock dataset
            </button> : <span className="access-mode-badge">READ-ONLY ACCESS</span>}
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
                      canEdit={canEdit}
                      canReuse={canReuse}
                      onEdit={() => setModal({ mode: "edit", dataset })}
                      onReuse={() => void runAction(dataset, "reuse")}
                      onDuplicate={() => void runAction(dataset, "duplicate")}
                      onDelete={() => void deleteDataset(dataset)}
                    />
                  ))}
              {!loading && stockSets.length === 0 && canEdit && (
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
                            values={stock.trendPoints}
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
  canEdit,
  canReuse,
  onEdit,
  onReuse,
  onDuplicate,
  onDelete,
}: {
  dataset: Dataset;
  busy: string | null;
  canEdit: boolean;
  canReuse: boolean;
  onEdit: () => void;
  onReuse: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const members = dataset.memberIds
    .map((id) => stockInventory.find((stock) => stock.id === id)?.symbol)
    .filter(Boolean);

  return (
    <article className="stock-set-card stock-set-detail-card">
      <Link
        className="stock-card-detail-link"
        href={`/admin/stocks/${dataset.id}`}
        aria-label={`View details for ${dataset.name}`}
      >
        <span className="sr-only">View {dataset.name} details</span>
      </Link>
      <div className="stock-set-card-top">
        <span className="dataset-kind-icon stock">ST</span>
        <span className={`status-label ${dataset.status}`}>
          <i />
          {dataset.status}
        </span>
        {canEdit ? <details className="row-menu">
          <summary aria-label={`More actions for ${dataset.name}`}>•••</summary>
          <div>
            <button type="button" onClick={onDuplicate}>
              Duplicate & reuse
            </button>
            <button className="danger" type="button" onClick={onDelete}>
              Delete dataset
            </button>
          </div>
        </details> : null}
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
        {canEdit ? <button type="button" onClick={onEdit}>Configure</button> : <span>VIEW ONLY</span>}
        {canReuse ? <button
          type="button"
          onClick={onReuse}
          disabled={busy === `reuse-${dataset.id}`}
        >
          {busy === `reuse-${dataset.id}` ? "Preparing…" : "Use in game →"}
        </button> : null}
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
