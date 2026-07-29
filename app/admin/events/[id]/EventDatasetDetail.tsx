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

type DetailProps = {
  datasetId: string;
  user: { name: string; email: string };
};

export function EventDatasetDetail({ datasetId, user }: DetailProps) {
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
        throw new Error(detailPayload.error ?? "Event dataset not found.");
      }
      if (!listResponse.ok) {
        throw new Error(listPayload.error ?? "Dataset library unavailable.");
      }
      if (detailPayload.dataset.kind !== "event") {
        throw new Error("This package is not an event dataset.");
      }
      setDataset(detailPayload.dataset);
      setDatasets(listPayload.datasets);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Event dataset not found.",
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

  const eventCount = datasets.filter(
    (item) => item.kind === "event",
  ).length;
  const stockCount = datasets.filter(
    (item) => item.kind === "stock",
  ).length;

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
          `${payload.dataset.name} created. Open it from Event Datasets.`,
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

  async function copyMembers() {
    if (!dataset) return;
    await navigator.clipboard.writeText(dataset.memberIds.join(", "));
    setToast("Event membership copied.");
  }

  const cycleMinutes = dataset?.itemCount ?? 0;

  return (
    <div className="admin-app event-detail-page">
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
            <em>{stockCount}</em>
          </a>
          <a className="active" href="/admin/events">
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
            <p>{dataset.itemCount} mapped event records</p>
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
          <a className="detail-back-link" href="/admin/events">
            ← Back to event datasets
          </a>
          <div className="topbar-status">
            <span className="status-dot" />
            EVENT ENGINE ONLINE
          </div>
        </header>

        <div className="admin-content">
          {loading ? (
            <DetailSkeleton />
          ) : error || !dataset ? (
            <section className="detail-error-state">
              <span>!</span>
              <h1>Event set unavailable</h1>
              <p>{error}</p>
              <a href="/admin/events">Return to Event Datasets</a>
            </section>
          ) : (
            <>
              <section className="event-detail-hero">
                <div className="stock-breadcrumb">
                  <a href="/admin">Dataset control</a>
                  <span>/</span>
                  <a href="/admin/events">Events</a>
                  <span>/</span>
                  <strong>{dataset.name}</strong>
                </div>
                <div className="event-detail-title-row">
                  <span className="dataset-kind-icon event">EV</span>
                  <div>
                    <div className="event-detail-labels">
                      <p className="eyebrow event-eyebrow">
                        EVENT SET #{dataset.id}
                      </p>
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
                  label="Mapped events"
                  value={`${dataset.itemCount}`}
                  meta="unique membership IDs"
                  tone="purple"
                />
                <DetailMetric
                  label="Rotation windows"
                  value={`${cycleMinutes}m`}
                  meta="60 seconds per slot"
                  tone="cyan"
                />
                <DetailMetric
                  label="Times reused"
                  value={`${dataset.reuseCount}`}
                  meta={
                    dataset.lastUsedAt
                      ? `last ${relativeDate(dataset.lastUsedAt)}`
                      : "not used yet"
                  }
                  tone="green"
                />
                <DetailMetric
                  label="Last updated"
                  value={relativeDate(dataset.updatedAt)}
                  meta={`created ${relativeDate(dataset.createdAt)}`}
                  tone="yellow"
                />
              </section>

              <section className="event-detail-grid">
                <div className="membership-panel">
                  <div className="stock-section-heading">
                    <div>
                      <p className="eyebrow event-eyebrow">ROTATION ORDER</p>
                      <h2>Event set membership</h2>
                      <span>
                        Ordered source IDs used to build the game rotation.
                      </span>
                    </div>
                    <button type="button" onClick={() => void copyMembers()}>
                      Copy IDs
                    </button>
                  </div>
                  <div className="membership-table-wrap">
                    <table className="membership-table">
                      <thead>
                        <tr>
                          <th>Slot</th>
                          <th>Event ID</th>
                          <th>Rotation window</th>
                          <th>Membership</th>
                          <th>Source resolution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataset.memberIds.map((memberId, index) => (
                          <tr key={`${memberId}-${index}`}>
                            <td>
                              <span className="slot-number">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </td>
                            <td>
                              <code>#{memberId}</code>
                            </td>
                            <td>
                              {formatWindow(index * 60, (index + 1) * 60 - 1)}
                            </td>
                            <td>
                              <span className="event-mode actionable">
                                <i />
                                Included
                              </span>
                            </td>
                            <td>
                              <span className="source-resolution">
                                Runtime event library
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {dataset.memberIds.length === 0 && (
                      <div className="membership-empty">
                        <span>◇</span>
                        <strong>No events mapped</strong>
                        <p>Configure the set to add event IDs.</p>
                      </div>
                    )}
                  </div>
                </div>

                <aside className="event-detail-aside">
                  <section className="detail-check-panel">
                    <div className="stock-section-heading">
                      <div>
                        <p className="eyebrow event-eyebrow">READINESS</p>
                        <h2>Package checks</h2>
                      </div>
                      <span
                        className={
                          dataset.itemCount > 0 ? "check-score valid" : "check-score"
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
                        copy={`${dataset.itemCount} unique event IDs mapped.`}
                      />
                      <CheckItem
                        valid={
                          new Set(dataset.memberIds).size ===
                          dataset.memberIds.length
                        }
                        title="No duplicate IDs"
                        copy="Membership order contains unique source IDs."
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
                        <p className="eyebrow event-eyebrow">USAGE</p>
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
        <DetailEditModal
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

function DetailEditModal({
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
  const [members, setMembers] = useState(dataset.memberIds.join(", "));
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
      const response = await fetch(`/api/datasets/${dataset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          kind: "event",
          description,
          status,
          memberIds,
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
        className="dataset-modal event-dataset-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow event-eyebrow">CONFIGURE EVENT PACKAGE</p>
            <h2 id="detail-edit-title">{dataset.name}</h2>
            <p>Update package metadata and ordered event membership.</p>
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
            <label className="admin-field wide">
              <span>
                Bundled event IDs <em>{memberIds.length} unique events</em>
              </span>
              <textarea
                rows={7}
                value={members}
                onChange={(event) => setMembers(event.target.value)}
              />
            </label>
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
              {saving ? "Saving…" : "Save configuration"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-skeleton" aria-label="Loading event set">
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

function formatWindow(startSeconds: number, endSeconds: number) {
  return `${formatClock(startSeconds)}–${formatClock(endSeconds)}`;
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
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
