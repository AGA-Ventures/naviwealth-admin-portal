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

type ModalState =
  | { mode: "create"; dataset: null }
  | { mode: "edit"; dataset: Dataset }
  | null;

const eventCategories = [
  {
    key: "capital_gain",
    label: "Capital gain",
    count: 31,
    copy: "Property and leveraged asset opportunities.",
    tone: "purple",
    code: "CG",
  },
  {
    key: "cashflow",
    label: "Cashflow",
    count: 33,
    copy: "Business, franchise, skill, and income events.",
    tone: "cyan",
    code: "CF",
  },
  {
    key: "expenses",
    label: "Expenses",
    count: 19,
    copy: "Lifestyle, protection, emergency, and happiness costs.",
    tone: "yellow",
    code: "EX",
  },
  {
    key: "market",
    label: "Market",
    count: 8,
    copy: "Automatic global financial changes.",
    tone: "green",
    code: "MK",
  },
];

const sampleEvents = [
  {
    code: "7497",
    title: "Real estate investment — 1-bedroom apartment",
    type: "capital_gain",
    side: "A",
    behavior: "Property purchase",
    status: "Actionable",
  },
  {
    code: "3345",
    title: "Financial Protection — Medical Insurance Upgrade",
    type: "expenses",
    side: "ALL",
    behavior: "One-time expense",
    status: "Actionable",
  },
  {
    code: "2906",
    title: "Market Changes — Impact of the Pandemic",
    type: "market",
    side: "ALL",
    behavior: "Automatic effect",
    status: "Automatic",
  },
];

export function EventDatasets({
  user,
}: {
  user: { name: string; email: string };
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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
        throw new Error(payload.error ?? "Unable to load event datasets.");
      }
      setDatasets(payload.datasets);
      setLimit(payload.limit);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load event datasets.",
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

  const eventSets = useMemo(
    () => datasets.filter((dataset) => dataset.kind === "event"),
    [datasets],
  );
  const totalMemberships = eventSets.reduce(
    (total, dataset) => total + dataset.itemCount,
    0,
  );
  const totalReuses = eventSets.reduce(
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
        setToast(`${dataset.name} duplicated as a reusable event draft.`);
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
      `Delete “${dataset.name}”? The source event records will remain available.`,
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
    <div className="admin-app event-admin-page">
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
          <a href="/admin/stocks">
            <span className="nav-glyph">▦</span>
            Stock datasets
            <em>{datasets.filter((dataset) => dataset.kind === "stock").length}</em>
          </a>
          <a className="active" href="/admin/events">
            <span className="nav-glyph">◈</span>
            Event datasets
            <em>{eventSets.length}</em>
          </a>
          <p>GAME SYSTEM</p>
          <a href="/admin#game-library">
            <span className="nav-glyph">◇</span>
            Game library
          </a>
          <a href="/admin#activity">
            <span className="nav-glyph">↻</span>
            Reuse history
          </a>
        </nav>

        <div className="event-side-note">
          <span>EVENT ROTATION</span>
          <strong>60 second windows</strong>
          <p>Side A and Side B rotate eligible events independently.</p>
          <div>
            <i className="status-dot" />
            91 ACTIVE RECORDS
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
          <div className="event-top-context">
            <span>EVENT LIBRARY</span>
            <strong>91 active records</strong>
          </div>
          <div className="topbar-status">
            <span className="status-dot" />
            EVENT ENGINE ONLINE
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-heading">
            <div>
              <div className="stock-breadcrumb">
                <a href="/admin">Dataset control</a>
                <span>/</span>
                <strong>Events</strong>
              </div>
              <p className="eyebrow event-eyebrow">EVENT CONTENT OPERATIONS</p>
              <h1>Event datasets</h1>
              <p>
                Curate reusable opportunity, expense, and market-event packages
                for both sides of every game.
              </p>
            </div>
            <button
              className="admin-primary event-primary"
              type="button"
              onClick={() => setModal({ mode: "create", dataset: null })}
              disabled={atCapacity}
            >
              <span aria-hidden="true">＋</span>
              New event dataset
            </button>
          </section>

          <section className="metric-grid event-metrics">
            <Metric
              label="Event datasets"
              value={`${eventSets.length}`}
              meta="reusable packages"
              tone="purple"
              symbol="◈"
            />
            <Metric
              label="Active events"
              value="91"
              meta="unique four-digit codes"
              tone="cyan"
              symbol="#"
            />
            <Metric
              label="Actionable"
              value="83"
              meta="player decisions"
              tone="green"
              symbol="✓"
            />
            <Metric
              label="Automatic market"
              value="8"
              meta={`${totalReuses} package reuses`}
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

          <section className="stock-set-section event-set-section">
            <div className="stock-section-heading">
              <div>
                <p className="eyebrow event-eyebrow">REUSABLE PACKAGES</p>
                <h2>Event set library</h2>
                <span>
                  Bundle event IDs once and deploy the same rotation in future
                  games.
                </span>
              </div>
              <span>{eventSets.length} packages</span>
            </div>

            <div className="stock-set-grid">
              {loading
                ? Array.from({ length: 4 }, (_, index) => (
                    <div className="stock-set-card loading" key={index} />
                  ))
                : eventSets.map((dataset) => (
                    <EventSetCard
                      key={dataset.id}
                      dataset={dataset}
                      busy={busy}
                      onEdit={() => setModal({ mode: "edit", dataset })}
                      onReuse={() => void runAction(dataset, "reuse")}
                      onDuplicate={() => void runAction(dataset, "duplicate")}
                      onDelete={() => void deleteDataset(dataset)}
                    />
                  ))}
            </div>
          </section>

          <section className="event-insight-grid">
            <div className="event-type-panel">
              <div className="stock-section-heading">
                <div>
                  <p className="eyebrow event-eyebrow">SOURCE INVENTORY</p>
                  <h2>Event type distribution</h2>
                  <span>All active reusable event records by top-level type.</span>
                </div>
                <span>91 events</span>
              </div>
              <div className="event-type-grid">
                {eventCategories.map((category) => (
                  <article key={category.key} className={category.tone}>
                    <span>{category.code}</span>
                    <div>
                      <strong>{category.label}</strong>
                      <p>{category.copy}</p>
                    </div>
                    <em>{category.count}</em>
                    <div className="event-type-track">
                      <i style={{ width: `${(category.count / 91) * 100}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="event-side-panel">
              <div className="stock-section-heading">
                <div>
                  <p className="eyebrow event-eyebrow">SCREEN COVERAGE</p>
                  <h2>Side distribution</h2>
                </div>
              </div>
              <div className="side-bars">
                <SideBar label="Side A" count={31} total={91} tone="purple" />
                <SideBar label="Side B" count={33} total={91} tone="cyan" />
                <SideBar label="All sides" count={27} total={91} tone="green" />
              </div>
              <div className="event-rule-note">
                <span>i</span>
                <p>
                  ALL-side market events dispatch once, preventing duplicate
                  global effects.
                </p>
              </div>
            </aside>
          </section>

          <section className="event-sample-panel">
            <div className="stock-section-heading">
              <div>
                <p className="eyebrow event-eyebrow">REFERENCE RECORDS</p>
                <h2>Event inventory sample</h2>
                <span>
                  Representative property, expense, and automatic market
                  records.
                </span>
              </div>
              <span>{totalMemberships} memberships</span>
            </div>
            <div className="event-sample-table-wrap">
              <table className="event-sample-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Event</th>
                    <th>Type</th>
                    <th>Side</th>
                    <th>Behavior</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleEvents.map((event) => (
                    <tr key={event.code}>
                      <td>
                        <code>{event.code}</code>
                      </td>
                      <td>
                        <strong>{event.title}</strong>
                      </td>
                      <td>
                        <span className={`event-type-label ${event.type}`}>
                          {event.type.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className="event-side-label">{event.side}</span>
                      </td>
                      <td>{event.behavior}</td>
                      <td>
                        <span
                          className={
                            event.status === "Automatic"
                              ? "event-mode automatic"
                              : "event-mode actionable"
                          }
                        >
                          <i />
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {modal && (
        <EventSetModal
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

function EventSetCard({
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
  return (
    <article className="stock-set-card event-set-card">
      <a
        className="event-card-detail-link"
        href={`/admin/events/${dataset.id}`}
        aria-label={`View details for ${dataset.name}`}
      >
        <span className="sr-only">View {dataset.name} details</span>
      </a>
      <div className="stock-set-card-top">
        <span className="dataset-kind-icon event">EV</span>
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
      <div className="event-member-preview">
        <span>
          <strong>{dataset.itemCount}</strong>
          event IDs
        </span>
        <div>
          {dataset.memberIds.slice(0, 5).map((id) => (
            <i key={id}>#{id}</i>
          ))}
          {dataset.itemCount > 5 && <i>+{dataset.itemCount - 5}</i>}
        </div>
      </div>
      <div className="stock-set-stats">
        <span>
          <small>EVENTS</small>
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

function EventSetModal({
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
  const [members, setMembers] = useState(
    source?.memberIds.join(", ") ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const memberIds = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number)
            .filter((value) => Number.isInteger(value) && value > 0),
        ),
      ),
    [members],
  );

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

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
            kind: "event",
            description,
            status,
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

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dataset-modal event-dataset-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow event-eyebrow">
              {modal.mode === "create"
                ? "NEW EVENT PACKAGE"
                : "CONFIGURE EVENT PACKAGE"}
            </p>
            <h2 id="event-modal-title">
              {modal.mode === "create" ? "Create event dataset" : source?.name}
            </h2>
            <p>
              Bundle existing event IDs into a reusable game rotation.
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
                placeholder="e.g. Event Set 5"
              />
            </label>
            <label className="admin-field wide">
              <span>Description</span>
              <textarea
                rows={2}
                maxLength={240}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Where should this event rotation be used?"
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
            <label className="admin-field wide">
              <span>
                Bundled event IDs <em>{memberIds.length} unique events</em>
              </span>
              <textarea
                rows={7}
                value={members}
                onChange={(event) => setMembers(event.target.value)}
                placeholder="1, 2, 3, 4"
              />
              <small>
                Enter event IDs separated by commas or spaces. Duplicate values
                are removed automatically.
              </small>
            </label>
          </div>

          <div className="event-member-tools">
            <button
              type="button"
              onClick={() =>
                setMembers(
                  Array.from({ length: 91 }, (_, index) => index + 1).join(", "),
                )
              }
            >
              Select all 91 events
            </button>
            <button type="button" onClick={() => setMembers("")}>
              Clear membership
            </button>
            <span>
              <strong>{memberIds.length}</strong> selected
            </span>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="admin-primary event-primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : modal.mode === "create"
                  ? "Create event dataset"
                  : "Save configuration"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SideBar({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: string;
}) {
  return (
    <div className={tone}>
      <span>
        <strong>{label}</strong>
        <em>{count} events</em>
      </span>
      <div>
        <i style={{ width: `${(count / total) * 100}%` }} />
      </div>
      <small>{Math.round((count / total) * 100)}%</small>
    </div>
  );
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
