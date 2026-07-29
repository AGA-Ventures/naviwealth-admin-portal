"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type DatasetKind = "event" | "stock";
type DatasetStatus = "draft" | "ready" | "archived";

type Dataset = {
  id: number;
  name: string;
  kind: DatasetKind;
  description: string;
  status: DatasetStatus;
  memberIds: number[];
  itemCount: number;
  reuseCount: number;
  validationState: "valid" | "warning";
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DatasetFormValue = {
  name: string;
  kind: DatasetKind;
  description: string;
  status: DatasetStatus;
  members: string;
};

type ModalState =
  | { mode: "create"; dataset: null }
  | { mode: "edit"; dataset: Dataset }
  | null;

type AdminPortalProps = {
  user: {
    name: string;
    email: string;
  };
};

const filters = [
  { label: "All datasets", value: "all" },
  { label: "Event sets", value: "event" },
  { label: "Stock sets", value: "stock" },
] as const;

export function AdminPortal({ user }: AdminPortalProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const response = await fetch("/api/datasets", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load datasets.");
      }
      setDatasets(payload.datasets);
      setLimit(payload.limit);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load datasets.",
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

  const visibleDatasets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return datasets.filter((dataset) => {
      const matchesFilter = filter === "all" || dataset.kind === filter;
      const matchesQuery =
        !normalizedQuery ||
        dataset.name.toLowerCase().includes(normalizedQuery) ||
        dataset.description.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [datasets, filter, query]);

  const totals = useMemo(() => {
    return datasets.reduce(
      (summary, dataset) => {
        summary.members += dataset.itemCount;
        summary.reuses += dataset.reuseCount;
        if (dataset.status === "ready") summary.ready += 1;
        if (dataset.validationState === "warning") summary.warnings += 1;
        return summary;
      },
      { members: 0, reuses: 0, ready: 0, warnings: 0 },
    );
  }, [datasets]);

  async function runAction(dataset: Dataset, action: "duplicate" | "reuse") {
    const busyKey = `${action}-${dataset.id}`;
    setBusy(busyKey);
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
        setToast(`${dataset.name} duplicated as a reusable draft.`);
      } else {
        setDatasets((current) =>
          current.map((item) =>
            item.id === payload.dataset.id ? payload.dataset : item,
          ),
        );
        setToast(`${dataset.name} is ready for the next game.`);
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteItem(dataset: Dataset) {
    const confirmed = window.confirm(
      `Delete “${dataset.name}”? This removes the reusable package but does not delete the source stock or event records.`,
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

  function upsertDataset(dataset: Dataset, mode: "create" | "edit") {
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

  const atCapacity = datasets.length >= limit;
  const capacityPercent = Math.min(100, (datasets.length / limit) * 100);

  return (
    <div className="admin-app">
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
          <a className="active" href="/admin">
            <span className="nav-glyph">⌂</span>
            Overview
          </a>
          <a href="/admin/simulator">
            <span className="nav-glyph">▶</span>
            Simulator
          </a>
          <a href="/admin/stocks">
            <span className="nav-glyph">▦</span>
            Stock datasets
            <em>{datasets.filter((dataset) => dataset.kind === "stock").length}</em>
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

        <div className="sidebar-capacity">
          <div>
            <span>DATASET CAPACITY</span>
            <strong>
              {datasets.length} / {limit}
            </strong>
          </div>
          <div className="capacity-track">
            <span style={{ width: `${capacityPercent}%` }} />
          </div>
          <p>{limit - datasets.length} reusable slots available</p>
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
              placeholder="Search datasets…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-status">
            <span className="status-dot" />
            SYSTEM ONLINE
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-heading" id="overview">
            <div>
              <p className="eyebrow">CONTENT OPERATIONS</p>
              <h1>Dataset control</h1>
              <p>
                Create, validate, and reuse every stock and event package from
                one source of truth.
              </p>
            </div>
            <button
              className="admin-primary"
              type="button"
              onClick={() => setModal({ mode: "create", dataset: null })}
              disabled={atCapacity}
              title={
                atCapacity
                  ? `The ${limit}-dataset capacity has been reached`
                  : undefined
              }
            >
              <span aria-hidden="true">＋</span>
              Create dataset
            </button>
          </section>

          <section className="metric-grid" aria-label="Dataset summary">
            <MetricCard
              label="Reusable datasets"
              value={`${datasets.length}`}
              meta={`of ${limit} capacity`}
              tone="cyan"
              symbol="▦"
            />
            <MetricCard
              label="Bundled records"
              value={totals.members.toLocaleString()}
              meta="membership references"
              tone="purple"
              symbol="⌘"
            />
            <MetricCard
              label="Ready to use"
              value={`${totals.ready}`}
              meta={`${datasets.length - totals.ready} need review`}
              tone="green"
              symbol="✓"
            />
            <MetricCard
              label="Total reuses"
              value={`${totals.reuses}`}
              meta="across game sessions"
              tone="yellow"
              symbol="↻"
            />
          </section>

          <section className="portal-grid">
            <div className="dataset-panel" id="datasets">
              <div className="panel-heading">
                <div>
                  <h2>Dataset library</h2>
                  <p>Reusable packages mapped to stock and event records.</p>
                </div>
                <span className="panel-count">
                  {visibleDatasets.length} shown
                </span>
              </div>

              <div className="dataset-toolbar">
                <div className="filter-tabs" role="tablist">
                  {filters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={filter === item.value ? "active" : ""}
                      onClick={() => setFilter(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <label className="table-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    placeholder="Filter library"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>

              {loading ? (
                <DatasetSkeleton />
              ) : loadError ? (
                <div className="empty-state">
                  <span>!</span>
                  <h3>Dataset library unavailable</h3>
                  <p>{loadError}</p>
                  <button type="button" onClick={() => void loadDatasets()}>
                    Try again
                  </button>
                </div>
              ) : visibleDatasets.length === 0 ? (
                <div className="empty-state">
                  <span>⌕</span>
                  <h3>No matching datasets</h3>
                  <p>Try another search or create a new reusable package.</p>
                </div>
              ) : (
                <div className="dataset-table-wrap">
                  <table className="dataset-table">
                    <thead>
                      <tr>
                        <th>Dataset</th>
                        <th>Type</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Reused</th>
                        <th>Updated</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDatasets.map((dataset) => (
                        <DatasetRow
                          key={dataset.id}
                          dataset={dataset}
                          busy={busy}
                          onEdit={() =>
                            setModal({ mode: "edit", dataset })
                          }
                          onDuplicate={() =>
                            void runAction(dataset, "duplicate")
                          }
                          onReuse={() => void runAction(dataset, "reuse")}
                          onDelete={() => void deleteItem(dataset)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <aside className="insights-column">
              <section className="health-card" id="validation">
                <div className="panel-heading compact">
                  <div>
                    <p className="eyebrow">DATA HEALTH</p>
                    <h2>Validation watch</h2>
                  </div>
                  <span className="health-score">
                    {totals.warnings === 0 ? "100" : "92"}
                    <small>/100</small>
                  </span>
                </div>
                <div className="health-bar">
                  <span style={{ width: totals.warnings === 0 ? "100%" : "92%" }} />
                </div>
                <div className="health-list">
                  <HealthItem
                    tone="warning"
                    title="Recurring expense flags"
                    copy="Some imported events still need an is_recurring value."
                  />
                  <HealthItem
                    tone="cyan"
                    title="Event code uniqueness"
                    copy="Four-digit codes are checked before a set is marked ready."
                  />
                  <HealthItem
                    tone="green"
                    title="Stock tick coverage"
                    copy="All full stock sets contain eight simulated instruments."
                  />
                </div>
                <a href="#datasets">Review dataset warnings →</a>
              </section>

              <section className="activity-card" id="activity">
                <div className="panel-heading compact">
                  <div>
                    <p className="eyebrow">RECENT ACTIVITY</p>
                    <h2>Reuse history</h2>
                  </div>
                </div>
                <div className="activity-list">
                  {datasets
                    .filter((dataset) => dataset.lastUsedAt)
                    .slice(0, 3)
                    .map((dataset) => (
                      <div key={dataset.id}>
                        <span className={`activity-icon ${dataset.kind}`}>
                          ↻
                        </span>
                        <p>
                          <strong>{dataset.name}</strong>
                          <span>Prepared for a game</span>
                        </p>
                        <time>{relativeDate(dataset.lastUsedAt)}</time>
                      </div>
                    ))}
                  {datasets.every((dataset) => !dataset.lastUsedAt) && (
                    <div>
                      <span className="activity-icon event">◎</span>
                      <p>
                        <strong>Library imported</strong>
                        <span>Eight reusable sets are ready</span>
                      </p>
                      <time>Today</time>
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>

      {modal && (
        <DatasetModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={upsertDataset}
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

function MetricCard({
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

function DatasetRow({
  dataset,
  busy,
  onEdit,
  onDuplicate,
  onReuse,
  onDelete,
}: {
  dataset: Dataset;
  busy: string | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onReuse: () => void;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td data-label="Dataset">
        <button className="dataset-name-cell" type="button" onClick={onEdit}>
          <span className={`dataset-kind-icon ${dataset.kind}`}>
            {dataset.kind === "event" ? "EV" : "ST"}
          </span>
          <span>
            <strong>{dataset.name}</strong>
            <small>{dataset.description}</small>
          </span>
        </button>
      </td>
      <td data-label="Type">
        <span className={`kind-label ${dataset.kind}`}>
          {dataset.kind === "event" ? "EVENT" : "STOCK"}
        </span>
      </td>
      <td data-label="Items">
        <strong className="item-count">{dataset.itemCount}</strong>
      </td>
      <td data-label="Status">
        <span className={`status-label ${dataset.status}`}>
          <i />
          {dataset.status}
        </span>
      </td>
      <td data-label="Reused">
        <span className="reuse-count">↻ {dataset.reuseCount}</span>
      </td>
      <td data-label="Updated">
        <time className="updated-date">{relativeDate(dataset.updatedAt)}</time>
      </td>
      <td data-label="Actions">
        <details className="row-menu">
          <summary aria-label={`Actions for ${dataset.name}`}>•••</summary>
          <div>
            <button type="button" onClick={onEdit}>
              Edit package
            </button>
            <button
              type="button"
              onClick={onReuse}
              disabled={busy === `reuse-${dataset.id}`}
            >
              {busy === `reuse-${dataset.id}` ? "Preparing…" : "Use in game"}
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              disabled={busy === `duplicate-${dataset.id}`}
            >
              {busy === `duplicate-${dataset.id}`
                ? "Duplicating…"
                : "Duplicate & reuse"}
            </button>
            <button
              className="danger"
              type="button"
              onClick={onDelete}
              disabled={busy === `delete-${dataset.id}`}
            >
              Delete dataset
            </button>
          </div>
        </details>
      </td>
    </tr>
  );
}

function HealthItem({
  tone,
  title,
  copy,
}: {
  tone: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="health-item">
      <span className={tone}>{tone === "warning" ? "!" : "✓"}</span>
      <p>
        <strong>{title}</strong>
        <small>{copy}</small>
      </p>
    </div>
  );
}

function DatasetSkeleton() {
  return (
    <div className="dataset-skeleton" aria-label="Loading datasets">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function DatasetModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: Exclude<ModalState, null>;
  onClose: () => void;
  onSaved: (dataset: Dataset, mode: "create" | "edit") => void;
}) {
  const source = modal.dataset;
  const [value, setValue] = useState<DatasetFormValue>({
    name: source?.name ?? "",
    kind: source?.kind ?? "event",
    description: source?.description ?? "",
    status: source?.status ?? "draft",
    members: source?.memberIds.join(", ") ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const memberIds = value.members
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
        .filter((item) => Number.isInteger(item) && item > 0);
      const response = await fetch(
        modal.mode === "create"
          ? "/api/datasets"
          : `/api/datasets/${source?.id}`,
        {
          method: modal.mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: value.name,
            kind: value.kind,
            description: value.description,
            status: value.status,
            memberIds,
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

  const memberCount = new Set(
    value.members
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
      .filter((item) => Number.isInteger(item) && item > 0),
  ).size;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dataset-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dataset-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {modal.mode === "create" ? "NEW REUSABLE PACKAGE" : "EDIT PACKAGE"}
            </p>
            <h2 id="dataset-modal-title">
              {modal.mode === "create" ? "Create dataset" : source?.name}
            </h2>
            <p>
              Bundle source record IDs once, then reuse the package in any game.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <form onSubmit={save}>
          <div className="modal-grid">
            <label className="admin-field wide">
              <span>Dataset name</span>
              <input
                autoFocus
                required
                maxLength={80}
                value={value.name}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. Event Set 5"
              />
            </label>

            <label className="admin-field">
              <span>Dataset type</span>
              <select
                value={value.kind}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    kind: event.target.value as DatasetKind,
                  }))
                }
              >
                <option value="event">Event package</option>
                <option value="stock">Stock package</option>
              </select>
            </label>

            <label className="admin-field">
              <span>Status</span>
              <select
                value={value.status}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    status: event.target.value as DatasetStatus,
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="admin-field wide">
              <span>Description</span>
              <textarea
                maxLength={240}
                rows={3}
                value={value.description}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe where this dataset should be used."
              />
              <small>{value.description.length} / 240</small>
            </label>

            <label className="admin-field wide">
              <span>
                Bundled record IDs <em>{memberCount} unique members</em>
              </span>
              <textarea
                rows={5}
                value={value.members}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    members: event.target.value,
                  }))
                }
                placeholder="1, 2, 3, 4"
              />
              <small>
                Enter stock or event IDs separated by commas or spaces. Duplicate
                IDs are removed automatically.
              </small>
            </label>
          </div>

          {source && (
            <div className="modal-meta">
              <span>
                Reused <strong>{source.reuseCount}</strong> times
              </span>
              <span>
                Last updated <strong>{relativeDate(source.updatedAt)}</strong>
              </span>
            </div>
          )}

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="admin-primary" type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : modal.mode === "create"
                  ? "Create dataset"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function relativeDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "Recently";
  const difference = Date.now() - date.getTime();
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
