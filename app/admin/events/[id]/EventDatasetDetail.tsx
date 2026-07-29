"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

type DetailProps = {
  datasetId: string;
  user: { name: string; email: string };
};

type EventCategory = "capital-gain" | "cashflow" | "expenses" | "market";

type EventRecord = {
  id: number;
  slot: number;
  title: string;
  category: EventCategory;
  categoryLabel: string;
  typeCode: string;
  side: "Side A" | "Side B" | "All sides";
  mode: "Actionable" | "Automatic";
  behavior: string;
  summary: string;
  impact: string;
  impactLabel: string;
  cadence: string;
  decision: string;
  resolution: string[];
  rotationWindow: string;
};

type EventRecordSeed = Omit<
  EventRecord,
  "id" | "slot" | "categoryLabel" | "typeCode" | "rotationWindow"
>;

const eventCategoryMeta: Record<
  EventCategory,
  { label: string; code: string }
> = {
  "capital-gain": { label: "Capital gain", code: "CG" },
  cashflow: { label: "Cashflow", code: "CF" },
  expenses: { label: "Expenses", code: "EX" },
  market: { label: "Market", code: "MK" },
};

const eventRecordSeeds: Record<number, EventRecordSeed> = {
  76: {
    title: "Freelance project bonus",
    category: "cashflow",
    side: "Side A",
    mode: "Actionable",
    behavior: "One-time income",
    summary:
      "A client rewards strong project delivery with an unexpected completion bonus.",
    impact: "+ RM1,200",
    impactLabel: "Cash balance",
    cadence: "Immediate",
    decision: "Accept the payout or reinvest part of it in a new skill.",
    resolution: [
      "Credit the selected player’s cash balance.",
      "The event leaves the rotation after resolution.",
    ],
  },
  77: {
    title: "Starter apartment opportunity",
    category: "capital-gain",
    side: "Side B",
    mode: "Actionable",
    behavior: "Property purchase",
    summary:
      "A compact rental unit becomes available below the simulated market price.",
    impact: "RM18,000",
    impactLabel: "Purchase price",
    cadence: "+ RM650 / round",
    decision: "Purchase the asset or pass it to the next eligible player.",
    resolution: [
      "Deduct the purchase price from cash or available financing.",
      "Add recurring rental income while the property is held.",
    ],
  },
  78: {
    title: "Medical insurance renewal",
    category: "expenses",
    side: "All sides",
    mode: "Actionable",
    behavior: "Protection expense",
    summary:
      "Annual medical cover is due and the player must choose a protection level.",
    impact: "− RM850",
    impactLabel: "One-time expense",
    cadence: "Immediate",
    decision: "Renew full cover or choose the lower-cost basic plan.",
    resolution: [
      "Deduct the selected premium from the player’s cash.",
      "Full cover protects against the next eligible medical expense.",
    ],
  },
  79: {
    title: "Regional market rally",
    category: "market",
    side: "All sides",
    mode: "Automatic",
    behavior: "Portfolio repricing",
    summary:
      "Stronger economic sentiment lifts listed assets across the simulated market.",
    impact: "+ 8%",
    impactLabel: "Eligible holdings",
    cadence: "This round",
    decision: "No player decision is required.",
    resolution: [
      "Increase every eligible stock position by eight percent.",
      "Apply the change before the next player begins a turn.",
    ],
  },
  80: {
    title: "Rental property repair",
    category: "expenses",
    side: "Side A",
    mode: "Actionable",
    behavior: "Asset maintenance",
    summary:
      "A plumbing fault requires immediate repair at one of the player’s properties.",
    impact: "− RM1,500",
    impactLabel: "Repair cost",
    cadence: "Immediate",
    decision: "Pay in cash or use an available emergency facility.",
    resolution: [
      "Deduct the repair cost from the chosen funding source.",
      "The property keeps its current recurring income.",
    ],
  },
  81: {
    title: "Promotion with salary increase",
    category: "cashflow",
    side: "Side B",
    mode: "Actionable",
    behavior: "Recurring income",
    summary:
      "A workplace promotion increases the player’s earned income each round.",
    impact: "+ RM900",
    impactLabel: "Income per round",
    cadence: "Recurring",
    decision: "Accept the role or remain in the current position.",
    resolution: [
      "Increase salary income from the next completed round.",
      "The higher income remains active for the rest of the game.",
    ],
  },
  82: {
    title: "Early-stage equity offer",
    category: "capital-gain",
    side: "Side A",
    mode: "Actionable",
    behavior: "Private investment",
    summary:
      "A local startup opens a small allocation to early individual investors.",
    impact: "RM6,000",
    impactLabel: "Entry investment",
    cadence: "Long term",
    decision: "Invest for growth or keep the funds liquid.",
    resolution: [
      "Create a private-equity asset at the stated entry value.",
      "Its final return is determined by a later market event.",
    ],
  },
  83: {
    title: "Interest rate increase",
    category: "market",
    side: "All sides",
    mode: "Automatic",
    behavior: "Debt repricing",
    summary:
      "The central bank raises rates, increasing the cost of outstanding loans.",
    impact: "+ 1.5%",
    impactLabel: "Loan rate",
    cadence: "Ongoing",
    decision: "No player decision is required.",
    resolution: [
      "Increase the repayment cost of every variable-rate loan.",
      "Keep the adjustment active until another rate event replaces it.",
    ],
  },
  84: {
    title: "Unexpected vehicle maintenance",
    category: "expenses",
    side: "Side B",
    mode: "Actionable",
    behavior: "Lifestyle expense",
    summary:
      "A critical service is needed before the player’s vehicle can be used again.",
    impact: "− RM720",
    impactLabel: "One-time expense",
    cadence: "Immediate",
    decision: "Pay for the repair or use a transport alternative.",
    resolution: [
      "Deduct the chosen transport cost from cash.",
      "The card is resolved immediately after payment.",
    ],
  },
  85: {
    title: "Launch a weekend side hustle",
    category: "cashflow",
    side: "Side A",
    mode: "Actionable",
    behavior: "Business income",
    summary:
      "A small weekend service can be launched with limited startup capital.",
    impact: "+ RM480",
    impactLabel: "Income per round",
    cadence: "Recurring",
    decision: "Fund the startup cost or decline the opportunity.",
    resolution: [
      "Deduct RM1,200 in startup costs when accepted.",
      "Add recurring income beginning with the next round.",
    ],
  },
  86: {
    title: "Quarterly REIT distribution",
    category: "cashflow",
    side: "All sides",
    mode: "Automatic",
    behavior: "Investment income",
    summary:
      "Eligible real-estate trust holdings distribute their quarterly income.",
    impact: "+ 3.2%",
    impactLabel: "REIT holding value",
    cadence: "Immediate",
    decision: "No player decision is required.",
    resolution: [
      "Calculate the distribution from each eligible holding.",
      "Credit proceeds to the owning player’s cash balance.",
    ],
  },
  87: {
    title: "Studio apartment listing",
    category: "capital-gain",
    side: "Side B",
    mode: "Actionable",
    behavior: "Property purchase",
    summary:
      "A centrally located studio offers a moderate yield and accessible entry price.",
    impact: "RM24,000",
    impactLabel: "Purchase price",
    cadence: "+ RM820 / round",
    decision: "Buy, finance, or let the opportunity expire.",
    resolution: [
      "Add the property and any related financing to the portfolio.",
      "Begin rental income after the current round closes.",
    ],
  },
  88: {
    title: "Emergency fund contribution",
    category: "expenses",
    side: "All sides",
    mode: "Actionable",
    behavior: "Financial protection",
    summary:
      "The player can move cash into a protected reserve before future expenses.",
    impact: "RM1,000",
    impactLabel: "Reserve contribution",
    cadence: "Protected balance",
    decision: "Build the reserve or keep the cash available for investing.",
    resolution: [
      "Move the chosen amount from cash into emergency savings.",
      "The reserve can absorb a future eligible expense.",
    ],
  },
  89: {
    title: "Currency strengthens",
    category: "market",
    side: "All sides",
    mode: "Automatic",
    behavior: "Currency adjustment",
    summary:
      "The domestic currency rises, changing the value of foreign investments.",
    impact: "− 4%",
    impactLabel: "Foreign holdings",
    cadence: "This round",
    decision: "No player decision is required.",
    resolution: [
      "Reduce eligible foreign-denominated holdings by four percent.",
      "Apply the adjustment once when this card resolves.",
    ],
  },
  90: {
    title: "Professional certification",
    category: "expenses",
    side: "Side A",
    mode: "Actionable",
    behavior: "Career investment",
    summary:
      "A recognised credential could improve future salary and career options.",
    impact: "− RM2,200",
    impactLabel: "Course fee",
    cadence: "+ RM350 / round",
    decision: "Enroll now or keep the current income profile.",
    resolution: [
      "Deduct the course fee when the player enrolls.",
      "Increase salary income after two completed rounds.",
    ],
  },
  91: {
    title: "Small business partnership",
    category: "capital-gain",
    side: "Side B",
    mode: "Actionable",
    behavior: "Business acquisition",
    summary:
      "A profitable neighborhood business is looking for a minority partner.",
    impact: "RM12,500",
    impactLabel: "Equity contribution",
    cadence: "+ RM1,050 / round",
    decision: "Buy the stake, negotiate financing, or pass.",
    resolution: [
      "Add the business stake to the player’s asset portfolio.",
      "Begin distributions at the end of the next completed round.",
    ],
  },
};

export function EventDatasetDetail({ datasetId, user }: DetailProps) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const eventTriggerRef = useRef<HTMLTableRowElement | null>(null);
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

  function openEventRecord(
    eventRecord: EventRecord,
    trigger: HTMLTableRowElement,
  ) {
    eventTriggerRef.current = trigger;
    setSelectedEvent(eventRecord);
  }

  function closeEventRecord() {
    setSelectedEvent(null);
    window.requestAnimationFrame(() => eventTriggerRef.current?.focus());
  }

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
                          <tr
                            className="membership-row-action"
                            key={`${memberId}-${index}`}
                            role="button"
                            tabIndex={0}
                            aria-label={`View event ${memberId} details`}
                            onClick={(event) =>
                              openEventRecord(
                                resolveEventRecord(memberId, index),
                                event.currentTarget,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openEventRecord(
                                  resolveEventRecord(memberId, index),
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
                              <span className="source-resolution event-row-open">
                                Runtime event library
                                <b>View event</b>
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

      {selectedEvent && dataset && (
        <EventRecordModal
          event={selectedEvent}
          datasetName={dataset.name}
          onClose={closeEventRecord}
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

function EventRecordModal({
  event,
  datasetName,
  onClose,
}: {
  event: EventRecord;
  datasetName: string;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        onClose();
        return;
      }
      if (keyEvent.key !== "Tab" || !modalRef.current) return;

      const controls = Array.from(
        modalRef.current.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
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

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop event-record-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <article
        ref={modalRef}
        className="event-record-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-record-title"
        aria-describedby="event-record-summary"
        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <header className="event-record-header">
          <div className={`event-record-type ${event.category}`}>
            <span>{event.typeCode}</span>
          </div>
          <div>
            <p className={`event-record-eyebrow ${event.category}`}>
              EVENT #{event.id} · SLOT {String(event.slot).padStart(2, "0")}
            </p>
            <h2 id="event-record-title">{event.title}</h2>
            <p id="event-record-summary">{event.summary}</p>
          </div>
          <button
            autoFocus
            type="button"
            aria-label="Close event details"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="event-record-body">
          <section className="event-record-meta">
            <div>
              <span>EVENT TYPE</span>
              <strong className={event.category}>{event.categoryLabel}</strong>
            </div>
            <div>
              <span>ELIGIBLE SIDE</span>
              <strong>{event.side}</strong>
            </div>
            <div>
              <span>MODE</span>
              <strong className={event.mode.toLowerCase()}>
                {event.mode}
              </strong>
            </div>
            <div>
              <span>ROTATION WINDOW</span>
              <strong>{event.rotationWindow}</strong>
            </div>
          </section>

          <section className={`event-impact-card ${event.category}`}>
            <div>
              <p>FINANCIAL EFFECT</p>
              <strong>{event.impact}</strong>
              <span>{event.impactLabel}</span>
            </div>
            <div>
              <p>CADENCE</p>
              <strong>{event.cadence}</strong>
              <span>{event.behavior}</span>
            </div>
          </section>

          <section className="event-behavior-grid">
            <div>
              <p className="eyebrow event-eyebrow">PLAYER DECISION</p>
              <h3>How this event plays</h3>
              <p>{event.decision}</p>
              <span
                className={`event-record-mode ${event.mode.toLowerCase()}`}
              >
                <i />
                {event.mode === "Automatic"
                  ? "Resolves automatically"
                  : "Requires a player choice"}
              </span>
            </div>
            <div>
              <p className="eyebrow event-eyebrow">RESOLUTION</p>
              <h3>Engine instructions</h3>
              <ol>
                {event.resolution.map((step, index) => (
                  <li key={step}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <footer className="event-record-footer">
            <p>
              Included in <strong>{datasetName}</strong>
              <span>Runtime event library · Source ID #{event.id}</span>
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

function resolveEventRecord(memberId: number, index: number): EventRecord {
  const seed = eventRecordSeeds[memberId] ?? fallbackEventRecord(memberId);
  const categoryMeta = eventCategoryMeta[seed.category];
  return {
    id: memberId,
    slot: index + 1,
    ...seed,
    categoryLabel: categoryMeta.label,
    typeCode: categoryMeta.code,
    rotationWindow: formatWindow(index * 60, (index + 1) * 60 - 1),
  };
}

function fallbackEventRecord(memberId: number): EventRecordSeed {
  const variants: EventRecordSeed[] = [
    {
      title: `Investment opportunity ${memberId}`,
      category: "capital-gain",
      side: "Side A",
      mode: "Actionable",
      behavior: "Asset purchase",
      summary:
        "A time-sensitive asset opportunity enters the current game rotation.",
      impact: `RM${(memberId % 20) + 5},000`,
      impactLabel: "Entry value",
      cadence: `+ RM${(memberId % 8) * 100 + 400} / round`,
      decision: "Purchase the asset, arrange financing, or pass.",
      resolution: [
        "Record the chosen funding source and deduct the entry value.",
        "Add the asset and its recurring return to the portfolio.",
      ],
    },
    {
      title: `Income opportunity ${memberId}`,
      category: "cashflow",
      side: "Side B",
      mode: "Actionable",
      behavior: "Recurring income",
      summary:
        "A new income stream becomes available to an eligible player.",
      impact: `+ RM${(memberId % 9) * 100 + 300}`,
      impactLabel: "Income per round",
      cadence: "Recurring",
      decision: "Accept the opportunity or keep the current cash position.",
      resolution: [
        "Apply any setup cost shown by the event.",
        "Credit recurring income from the next completed round.",
      ],
    },
    {
      title: `Lifestyle expense ${memberId}`,
      category: "expenses",
      side: "All sides",
      mode: "Actionable",
      behavior: "One-time expense",
      summary:
        "An unplanned personal expense tests the player’s available liquidity.",
      impact: `− RM${(memberId % 12) * 100 + 500}`,
      impactLabel: "Cash expense",
      cadence: "Immediate",
      decision: "Pay from cash or use an eligible protection balance.",
      resolution: [
        "Deduct the expense from the selected funding source.",
        "Close the event after the balance update is recorded.",
      ],
    },
    {
      title: `Market movement ${memberId}`,
      category: "market",
      side: "All sides",
      mode: "Automatic",
      behavior: "Market adjustment",
      summary:
        "A broad market signal changes eligible portfolio values for this round.",
      impact: `${memberId % 2 ? "+" : "−"} ${(memberId % 7) + 2}%`,
      impactLabel: "Eligible holdings",
      cadence: "This round",
      decision: "No player decision is required.",
      resolution: [
        "Identify every holding covered by the event condition.",
        "Apply the percentage adjustment before the next turn.",
      ],
    },
  ];

  return variants[memberId % variants.length];
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
