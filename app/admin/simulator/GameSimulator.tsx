"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AdminSessionUser } from "@/app/admin-access";

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

type RiskProfile = "conservative" | "balanced" | "aggressive";

type SimulatorDefaults = {
  players: number;
  rounds: number;
  startingBalance: number;
  risk: RiskProfile;
};

type SimulationResult = {
  id: string;
  duration: number;
  projectedTurns: number;
  marketVolatility: number;
  eventPressure: number;
  projectedBalance: number;
  completedAt: string;
  timeline: Array<{
    round: string;
    title: string;
    detail: string;
    tone: "cyan" | "purple" | "green" | "yellow";
  }>;
};

type GameSimulatorProps = {
  user: AdminSessionUser;
};

const riskLabels: Record<RiskProfile, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

const fallbackDefaults: SimulatorDefaults = {
  players: 4,
  rounds: 12,
  startingBalance: 25000,
  risk: "balanced",
};

export function GameSimulator({ user }: GameSimulatorProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [stockId, setStockId] = useState<number | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [players, setPlayers] = useState(4);
  const [rounds, setRounds] = useState(12);
  const [startingBalance, setStartingBalance] = useState(25000);
  const [risk, setRisk] = useState<RiskProfile>("balanced");
  const [gameDefaults, setGameDefaults] =
    useState<SimulatorDefaults>(fallbackDefaults);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [datasetResponse, settingsResponse] = await Promise.all([
          fetch("/api/datasets", { cache: "no-store" }),
          fetch("/api/game-settings", { cache: "no-store" }),
        ]);
        const [datasetPayload, settingsPayload] = await Promise.all([
          datasetResponse.json(),
          settingsResponse.json(),
        ]);
        if (!datasetResponse.ok) {
          throw new Error(
            datasetPayload.error ?? "Unable to load simulator datasets.",
          );
        }
        if (cancelled) return;

        const loaded = datasetPayload.datasets as Dataset[];
        setDatasets(loaded);
        setStockId(
          loaded.find(
            (dataset) =>
              dataset.kind === "stock" && dataset.status === "ready",
          )?.id ?? null,
        );

        if (settingsResponse.ok) {
          const defaults: SimulatorDefaults = {
            players: settingsPayload.settings.defaultPlayers,
            rounds: settingsPayload.settings.defaultRounds,
            startingBalance: settingsPayload.settings.startingBalance,
            risk:
              settingsPayload.settings.marketVolatility === "low"
                ? "conservative"
                : settingsPayload.settings.marketVolatility === "high"
                  ? "aggressive"
                  : "balanced",
          };
          setGameDefaults(defaults);
          setPlayers(defaults.players);
          setRounds(defaults.rounds);
          setStartingBalance(defaults.startingBalance);
          setRisk(defaults.risk);
        }
        setEventId(
          loaded.find(
            (dataset) =>
              dataset.kind === "event" && dataset.status === "ready",
          )?.id ?? null,
        );
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load simulator datasets.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const stockSets = useMemo(
    () =>
      datasets.filter(
        (dataset) =>
          dataset.kind === "stock" &&
          dataset.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [datasets, query],
  );
  const eventSets = useMemo(
    () =>
      datasets.filter(
        (dataset) =>
          dataset.kind === "event" &&
          dataset.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [datasets, query],
  );
  const selectedStock = datasets.find((dataset) => dataset.id === stockId);
  const selectedEvent = datasets.find((dataset) => dataset.id === eventId);
  const projectedTurns = players * rounds;
  const ready =
    selectedStock?.status === "ready" &&
    selectedEvent?.status === "ready" &&
    !busy;

  async function runSimulation(event: FormEvent) {
    event.preventDefault();
    if (!selectedStock || !selectedEvent) {
      setMessage("Select one stock set and one event set before starting.");
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const responses = await Promise.all(
        [selectedStock, selectedEvent].map((dataset) =>
          fetch(`/api/datasets/${dataset.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reuse" }),
          }),
        ),
      );
      const payloads = await Promise.all(
        responses.map((response) => response.json()),
      );
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) {
        throw new Error(
          payloads[failedIndex].error ?? "The simulation could not start.",
        );
      }

      setDatasets((current) =>
        current.map((dataset) => {
          const updated = payloads.find(
            (payload) => payload.dataset?.id === dataset.id,
          )?.dataset;
          return updated ?? dataset;
        }),
      );
      setResult(
        createResult({
          stock: selectedStock,
          event: selectedEvent,
          players,
          rounds,
          startingBalance,
          risk,
        }),
      );
      setMessage("Simulation complete. Both datasets were logged as reused.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The simulation could not start.",
      );
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPlayers(gameDefaults.players);
    setRounds(gameDefaults.rounds);
    setStartingBalance(gameDefaults.startingBalance);
    setRisk(gameDefaults.risk);
    setResult(null);
    setMessage("Simulator reset to the saved game settings.");
  }

  return (
    <div className="admin-app simulator-page">
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
          <Link className="active simulator-nav-link" href="/admin/simulator">
            <span className="nav-glyph">▶</span>
            Simulator
          </Link>
          <Link href="/admin/stocks">
            <span className="nav-glyph">▦</span>
            Stock datasets
            <em>{datasets.filter((dataset) => dataset.kind === "stock").length}</em>
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
              Admin management
            </Link>
          ) : null}
          {user.permissions.includes("settings.edit") ? (
            <Link href="/admin/game-settings">
              <span className="nav-glyph">⚙</span>
              Game settings
            </Link>
          ) : null}
        </nav>

        <div className="simulator-side-note">
          <span>SIMULATION ENGINE</span>
          <strong>{ready ? "Ready to run" : "Awaiting setup"}</strong>
          <p>Pair one market package with one event rotation.</p>
          <div>
            <i className="status-dot" />
            {projectedTurns} PROJECTED TURNS
          </div>
        </div>

        <Link
          className="sidebar-user sidebar-user-link"
          href="/admin/account"
          aria-label="Manage personal login"
        >
          <span className="user-avatar">{initials(user.name)}</span>
          <span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
          <span className="sidebar-user-arrow" aria-hidden="true">→</span>
        </Link>
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
              placeholder="Filter simulator datasets…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-status">
            <span className="status-dot" />
            SIMULATOR ONLINE
          </div>
        </header>

        <div className="admin-content simulator-content">
          <section className="admin-heading simulator-heading">
            <div>
              <div className="stock-breadcrumb">
                <Link href="/admin">Dataset control</Link>
                <span>/</span>
                <strong>Simulator</strong>
              </div>
              <p className="eyebrow simulator-eyebrow">GAME OPERATIONS</p>
              <h1>Game simulator</h1>
              <p>
                Pair production datasets, tune the session, and preview game
                pressure before players enter the room.
              </p>
            </div>
            <button
              className="admin-primary simulator-run-button"
              type="submit"
              form="simulator-form"
              disabled={!ready}
            >
              <span aria-hidden="true">{busy ? "◌" : "▶"}</span>
              {busy ? "Running simulation…" : "Run simulation"}
            </button>
          </section>

          <section className="metric-grid simulator-metrics" aria-label="Simulation summary">
            <SimulatorMetric
              label="Source records"
              value={`${(selectedStock?.itemCount ?? 0) + (selectedEvent?.itemCount ?? 0)}`}
              meta="combined dataset members"
              tone="cyan"
              symbol="⌘"
            />
            <SimulatorMetric
              label="Players"
              value={`${players}`}
              meta="active participant seats"
              tone="purple"
              symbol="◎"
            />
            <SimulatorMetric
              label="Rounds"
              value={`${rounds}`}
              meta={`${riskLabels[risk].toLowerCase()} risk profile`}
              tone="green"
              symbol="↻"
            />
            <SimulatorMetric
              label="Projected turns"
              value={`${projectedTurns}`}
              meta="decision points to model"
              tone="yellow"
              symbol="⚡"
            />
          </section>

          {loadError ? (
            <section className="simulator-error" role="alert">
              <span>!</span>
              <div>
                <strong>Simulator data unavailable</strong>
                <p>{loadError}</p>
              </div>
            </section>
          ) : (
            <form
              className="simulator-layout"
              id="simulator-form"
              onSubmit={runSimulation}
            >
              <section className="simulator-panel simulator-setup-panel">
                <div className="simulator-panel-heading">
                  <div>
                    <p className="eyebrow simulator-eyebrow">SESSION INPUTS</p>
                    <h2>Build the simulation</h2>
                    <span>Choose the content packages and operating rules.</span>
                  </div>
                  <button type="button" onClick={reset}>
                    Reset setup
                  </button>
                </div>

                <DatasetSelector
                  title="Stock dataset"
                  note="Select the market instruments available to players."
                  kind="stock"
                  datasets={stockSets}
                  selectedId={stockId}
                  onSelect={setStockId}
                  loading={loading}
                />
                <DatasetSelector
                  title="Event dataset"
                  note="Select the event rotation that shapes each round."
                  kind="event"
                  datasets={eventSets}
                  selectedId={eventId}
                  onSelect={setEventId}
                  loading={loading}
                />

                <fieldset className="simulator-parameters">
                  <legend>Session parameters</legend>
                  <label>
                    <span>Players</span>
                    <select
                      value={players}
                      onChange={(event) => setPlayers(Number(event.target.value))}
                    >
                      {[2, 3, 4, 5, 6, 8].map((value) => (
                        <option key={value} value={value}>
                          {value} players
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Rounds</span>
                    <select
                      value={rounds}
                      onChange={(event) => setRounds(Number(event.target.value))}
                    >
                      {[6, 8, 10, 12, 16, 20].map((value) => (
                        <option key={value} value={value}>
                          {value} rounds
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Starting balance</span>
                    <select
                      value={startingBalance}
                      onChange={(event) =>
                        setStartingBalance(Number(event.target.value))
                      }
                    >
                      {[15000, 25000, 50000, 100000].map((value) => (
                        <option key={value} value={value}>
                          RM {value.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>

                <fieldset className="simulator-risk">
                  <legend>Risk profile</legend>
                  {(Object.keys(riskLabels) as RiskProfile[]).map((profile) => (
                    <button
                      key={profile}
                      type="button"
                      className={risk === profile ? "active" : ""}
                      onClick={() => setRisk(profile)}
                    >
                      <span>{riskLabels[profile]}</span>
                      <small>
                        {profile === "conservative"
                          ? "Softer events"
                          : profile === "balanced"
                            ? "Recommended"
                            : "Higher volatility"}
                      </small>
                    </button>
                  ))}
                </fieldset>
              </section>

              <aside className="simulator-panel simulator-preview-panel">
                <div className="simulator-panel-heading">
                  <div>
                    <p className="eyebrow simulator-eyebrow">RUN READINESS</p>
                    <h2>Session preview</h2>
                    <span>Live checks before the model starts.</span>
                  </div>
                  <span className={`simulator-ready-chip ${ready ? "ready" : ""}`}>
                    {ready ? "READY" : "SETUP"}
                  </span>
                </div>

                <div className="simulator-package-preview">
                  <PackagePreview
                    label="Market package"
                    dataset={selectedStock}
                    tone="cyan"
                    fallback="Choose a stock dataset"
                  />
                  <span className="simulator-join">＋</span>
                  <PackagePreview
                    label="Event rotation"
                    dataset={selectedEvent}
                    tone="purple"
                    fallback="Choose an event dataset"
                  />
                </div>

                <div className="simulator-readiness-list">
                  <ReadinessRow
                    label="Dataset validation"
                    value={
                      selectedStock?.validationState === "valid" &&
                      selectedEvent?.validationState === "valid"
                        ? "Passed"
                        : "Review"
                    }
                    passed={
                      selectedStock?.validationState === "valid" &&
                      selectedEvent?.validationState === "valid"
                    }
                  />
                  <ReadinessRow
                    label="Player seats"
                    value={`${players} configured`}
                    passed={players >= 2}
                  />
                  <ReadinessRow
                    label="Session length"
                    value={`~${Math.max(12, Math.round(projectedTurns * 0.75))} min`}
                    passed
                  />
                  <ReadinessRow
                    label="Content coverage"
                    value={`${selectedEvent?.itemCount ?? 0} events`}
                    passed={(selectedEvent?.itemCount ?? 0) > 0}
                  />
                </div>

                <div className="simulator-pressure">
                  <div>
                    <span>MARKET EXPOSURE</span>
                    <strong>
                      {Math.min(
                        100,
                        (selectedStock?.itemCount ?? 0) * 10 +
                          (risk === "aggressive" ? 15 : 0),
                      )}
                      %
                    </strong>
                  </div>
                  <div className="simulator-track">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          (selectedStock?.itemCount ?? 0) * 10 +
                            (risk === "aggressive" ? 15 : 0),
                        )}%`,
                      }}
                    />
                  </div>
                  <div>
                    <span>EVENT PRESSURE</span>
                    <strong>
                      {Math.min(
                        100,
                        Math.round((selectedEvent?.itemCount ?? 0) * 2.4) +
                          (risk === "aggressive" ? 18 : 0),
                      )}
                      %
                    </strong>
                  </div>
                  <div className="simulator-track purple">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((selectedEvent?.itemCount ?? 0) * 2.4) +
                            (risk === "aggressive" ? 18 : 0),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </aside>
            </form>
          )}

          <SimulationStage
            result={result}
            startingBalance={startingBalance}
            stockName={selectedStock?.name}
            eventName={selectedEvent?.name}
          />
        </div>
      </main>

      {message ? (
        <div className="admin-toast" role="status">
          <span className="status-dot" />
          {message}
        </div>
      ) : null}
    </div>
  );
}

function DatasetSelector({
  title,
  note,
  kind,
  datasets,
  selectedId,
  onSelect,
  loading,
}: {
  title: string;
  note: string;
  kind: DatasetKind;
  datasets: Dataset[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
}) {
  return (
    <fieldset className={`simulator-dataset-group ${kind}`}>
      <legend>{title}</legend>
      <p>{note}</p>
      <div className="simulator-dataset-options">
        {loading
          ? [0, 1, 2, 3].map((item) => (
              <span className="simulator-dataset-skeleton" key={item} />
            ))
          : datasets.map((dataset) => (
              <button
                key={dataset.id}
                type="button"
                className={selectedId === dataset.id ? "selected" : ""}
                onClick={() => onSelect(dataset.id)}
                disabled={dataset.status === "archived"}
                aria-pressed={selectedId === dataset.id}
              >
                <span className={`dataset-kind-icon ${kind}`}>
                  {kind === "stock" ? "ST" : "EV"}
                </span>
                <span>
                  <strong>{dataset.name}</strong>
                  <small>
                    {dataset.itemCount} {kind === "stock" ? "stocks" : "events"}
                  </small>
                </span>
                <i>{selectedId === dataset.id ? "✓" : ""}</i>
              </button>
            ))}
      </div>
    </fieldset>
  );
}

function PackagePreview({
  label,
  dataset,
  tone,
  fallback,
}: {
  label: string;
  dataset?: Dataset;
  tone: "cyan" | "purple";
  fallback: string;
}) {
  return (
    <div className={`simulator-package ${tone}`}>
      <span>{label}</span>
      <strong>{dataset?.name ?? fallback}</strong>
      <small>
        {dataset
          ? `${dataset.itemCount} records · ${dataset.status}`
          : "No package selected"}
      </small>
    </div>
  );
}

function ReadinessRow({
  label,
  value,
  passed,
}: {
  label: string;
  value: string;
  passed: boolean;
}) {
  return (
    <div className="simulator-readiness-row">
      <span className={passed ? "passed" : ""}>{passed ? "✓" : "!"}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function SimulatorMetric({
  label,
  value,
  meta,
  tone,
  symbol,
}: {
  label: string;
  value: string;
  meta: string;
  tone: "cyan" | "purple" | "green" | "yellow";
  symbol: string;
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{meta}</span>
      </div>
      <span className="metric-symbol">{symbol}</span>
    </article>
  );
}

function SimulationStage({
  result,
  startingBalance,
  stockName,
  eventName,
}: {
  result: SimulationResult | null;
  startingBalance: number;
  stockName?: string;
  eventName?: string;
}) {
  return (
    <section className={`simulator-stage ${result ? "complete" : ""}`}>
      <div className="simulator-stage-heading">
        <div>
          <p className="eyebrow simulator-eyebrow">MODEL OUTPUT</p>
          <h2>{result ? "Simulation results" : "Simulation stage"}</h2>
          <span>
            {result
              ? `${stockName} combined with ${eventName}`
              : "Run the configured session to generate a round-by-round preview."}
          </span>
        </div>
        {result ? (
          <span className="simulator-run-id">{result.id}</span>
        ) : (
          <span className="simulator-run-id muted">NOT STARTED</span>
        )}
      </div>

      {result ? (
        <>
          <div className="simulator-result-grid">
            <ResultMetric
              label="Projected balance"
              value={`RM ${result.projectedBalance.toLocaleString()}`}
              detail={`${result.projectedBalance >= startingBalance ? "+" : ""}${Math.round(
                ((result.projectedBalance - startingBalance) / startingBalance) *
                  100,
              )}% from opening`}
              tone="green"
            />
            <ResultMetric
              label="Market volatility"
              value={`${result.marketVolatility}%`}
              detail="across simulated instruments"
              tone="cyan"
            />
            <ResultMetric
              label="Event pressure"
              value={`${result.eventPressure}%`}
              detail="of maximum scenario intensity"
              tone="purple"
            />
            <ResultMetric
              label="Estimated duration"
              value={`${result.duration} min`}
              detail={`${result.projectedTurns} player turns`}
              tone="yellow"
            />
          </div>
          <div className="simulator-timeline">
            {result.timeline.map((item, index) => (
              <article key={`${item.round}-${item.title}`}>
                <div>
                  <span className={item.tone}>{index + 1}</span>
                  {index < result.timeline.length - 1 ? <i /> : null}
                </div>
                <p>{item.round}</p>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
          <p className="simulator-completed-at">
            Completed {result.completedAt}
          </p>
        </>
      ) : (
        <div className="simulator-empty-stage">
          <div className="simulator-orbit" aria-hidden="true">
            <span />
            <span />
            <i>▶</i>
          </div>
          <strong>Ready when your session is</strong>
          <p>
            The simulation will calculate market volatility, event pressure,
            session length, and a representative player outcome.
          </p>
        </div>
      )}
    </section>
  );
}

function ResultMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "purple" | "green" | "yellow";
}) {
  return (
    <article className={`simulator-result-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function createResult({
  stock,
  event,
  players,
  rounds,
  startingBalance,
  risk,
}: {
  stock: Dataset;
  event: Dataset;
  players: number;
  rounds: number;
  startingBalance: number;
  risk: RiskProfile;
}): SimulationResult {
  const riskOffset =
    risk === "aggressive" ? 18 : risk === "conservative" ? -8 : 0;
  const marketVolatility = clamp(stock.itemCount * 9 + riskOffset, 12, 96);
  const eventPressure = clamp(
    Math.round(event.itemCount * 2.6) + riskOffset,
    14,
    98,
  );
  const projectedTurns = players * rounds;
  const movement =
    Math.round(
      startingBalance *
        ((marketVolatility - eventPressure + 24) / 100) *
        (rounds / 36),
    ) || 0;
  const projectedBalance = Math.max(0, startingBalance + movement);
  const stamp = Date.now().toString().slice(-6);

  return {
    id: `SIM-${stamp}`,
    duration: Math.max(12, Math.round(projectedTurns * 0.75)),
    projectedTurns,
    marketVolatility,
    eventPressure,
    projectedBalance,
    completedAt: new Intl.DateTimeFormat("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    }).format(new Date()),
    timeline: [
      {
        round: "OPENING",
        title: "Starting positions assigned",
        detail: `${players} players begin with RM ${startingBalance.toLocaleString()} each.`,
        tone: "cyan",
      },
      {
        round: `ROUND ${Math.max(1, Math.round(rounds * 0.25))}`,
        title: "First market signal",
        detail: `${stock.name} introduces the opening investment decision.`,
        tone: "cyan",
      },
      {
        round: `ROUND ${Math.max(2, Math.round(rounds * 0.45))}`,
        title: "Event pressure increases",
        detail: `${event.name} rotates a cashflow or opportunity event.`,
        tone: "purple",
      },
      {
        round: `ROUND ${Math.max(3, Math.round(rounds * 0.7))}`,
        title: "Portfolio adjustment",
        detail: `${riskLabels[risk]} rules rebalance simulated exposure.`,
        tone: "yellow",
      },
      {
        round: `ROUND ${rounds}`,
        title: "Session closes",
        detail: `Representative balance lands at RM ${projectedBalance.toLocaleString()}.`,
        tone: "green",
      },
    ],
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function initials(name: string) {
  const value = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return value || "NA";
}
