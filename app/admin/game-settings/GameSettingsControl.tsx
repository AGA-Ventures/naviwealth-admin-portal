"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminSessionUser } from "@/app/admin-access";
import { AdminControlSidebar } from "../AdminControlSidebar";

type GameSettings = {
  defaultPlayers: number;
  defaultRounds: number;
  startingBalance: number;
  turnSeconds: number;
  marketVolatility: "low" | "balanced" | "high";
  autoRotateEvents: boolean;
  allowNegativeBalance: boolean;
  enableLoans: boolean;
  requireFacilitator: boolean;
  updatedBy: string;
  updatedAt: string;
};

type GameSettingsControlProps = {
  currentUser: AdminSessionUser;
};

const fallbackSettings: GameSettings = {
  defaultPlayers: 4,
  defaultRounds: 12,
  startingBalance: 25000,
  turnSeconds: 60,
  marketVolatility: "balanced",
  autoRotateEvents: true,
  allowNegativeBalance: false,
  enableLoans: true,
  requireFacilitator: true,
  updatedBy: "System",
  updatedAt: new Date(0).toISOString(),
};

const volatilityCopy = {
  low: {
    label: "Low",
    detail: "Gentle price movement for first-time players.",
  },
  balanced: {
    label: "Balanced",
    detail: "Recommended mix of opportunity and market pressure.",
  },
  high: {
    label: "High",
    detail: "Sharper swings for experienced groups.",
  },
} as const;

export function GameSettingsControl({
  currentUser,
}: GameSettingsControlProps) {
  const [settings, setSettings] = useState<GameSettings>(fallbackSettings);
  const [saved, setSaved] = useState<GameSettings>(fallbackSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/game-settings", {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load game settings.");
        }
        if (!cancelled) {
          setSettings(payload.settings);
          setSaved(payload.settings);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load game settings.",
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
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(saved),
    [saved, settings],
  );

  const projectedMinutes = Math.max(
    1,
    Math.round(
      (settings.defaultPlayers *
        settings.defaultRounds *
        settings.turnSeconds) /
        60,
    ),
  );

  function setNumber(
    key:
      | "defaultPlayers"
      | "defaultRounds"
      | "startingBalance"
      | "turnSeconds",
    value: string,
  ) {
    const number = Number(value);
    setSettings((current) => ({
      ...current,
      [key]: Number.isFinite(number) ? number : 0,
    }));
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/game-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save game settings.");
      }
      setSettings(payload.settings);
      setSaved(payload.settings);
      setToast("Game settings saved for future sessions.");
    } catch (saveError) {
      setToast(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save game settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-app control-page settings-page">
      <AdminControlSidebar
        active="settings"
        user={currentUser}
        footer={{
          eyebrow: "SESSION DEFAULTS",
          title: `${settings.defaultPlayers} players · ${settings.defaultRounds} rounds`,
          detail: `Estimated ${projectedMinutes} minutes per configured game.`,
          status: dirty ? "UNSAVED CHANGES" : "CONFIGURATION SYNCED",
        }}
      />

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true">
              <span>N</span>
            </span>
            <strong>NaviWealth</strong>
          </div>
          <div className="settings-top-context">
            <span>GAME ENGINE</span>
            <strong>Global configuration</strong>
          </div>
          <div className="topbar-status">
            <span className="status-dot" />
            SETTINGS SERVICE ONLINE
          </div>
        </header>

        <div className="admin-content control-content">
          <section className="admin-heading">
            <div>
              <p className="eyebrow">GAME SYSTEM</p>
              <h1>Game settings</h1>
              <p>
                Set the defaults and guardrails every new NaviWealth session
                starts with.
              </p>
            </div>
            <div className="settings-heading-actions">
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={() => setSettings(saved)}
              >
                Reset changes
              </button>
              <button
                className="admin-primary"
                type="button"
                disabled={!dirty || saving || loading}
                onClick={() => void saveSettings()}
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </section>

          <section className="metric-grid">
            <article className="metric-card cyan">
              <div>
                <p>Default players</p>
                <strong>{settings.defaultPlayers}</strong>
                <span>per new session</span>
              </div>
              <span className="metric-symbol">◎</span>
            </article>
            <article className="metric-card purple">
              <div>
                <p>Game rounds</p>
                <strong>{settings.defaultRounds}</strong>
                <span>turns per player</span>
              </div>
              <span className="metric-symbol">↻</span>
            </article>
            <article className="metric-card green">
              <div>
                <p>Starting balance</p>
                <strong>{compactCurrency(settings.startingBalance)}</strong>
                <span>per player portfolio</span>
              </div>
              <span className="metric-symbol">$</span>
            </article>
            <article className="metric-card yellow">
              <div>
                <p>Turn duration</p>
                <strong>{settings.turnSeconds}s</strong>
                <span>decision window</span>
              </div>
              <span className="metric-symbol">◴</span>
            </article>
          </section>

          {loading ? (
            <div className="dataset-panel control-empty settings-loading">
              <span className="control-spinner" />
              <strong>Loading shared configuration…</strong>
            </div>
          ) : error ? (
            <div className="dataset-panel control-empty error settings-loading">
              <span>!</span>
              <strong>{error}</strong>
            </div>
          ) : (
            <section className="settings-layout">
              <div className="settings-main-stack">
                <section className="dataset-panel settings-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">SESSION BLUEPRINT</p>
                      <h2>New game defaults</h2>
                      <p>
                        These values prefill the simulator and future game rooms.
                      </p>
                    </div>
                    <span className="panel-count">GLOBAL</span>
                  </div>
                  <div className="settings-fields">
                    <NumberSetting
                      label="Players"
                      detail="Participants in each standard game."
                      value={settings.defaultPlayers}
                      min={2}
                      max={12}
                      suffix="players"
                      onChange={(value) => setNumber("defaultPlayers", value)}
                    />
                    <NumberSetting
                      label="Rounds"
                      detail="Decision cycles completed by each player."
                      value={settings.defaultRounds}
                      min={4}
                      max={40}
                      suffix="rounds"
                      onChange={(value) => setNumber("defaultRounds", value)}
                    />
                    <NumberSetting
                      label="Starting balance"
                      detail="Initial cash available to each portfolio."
                      value={settings.startingBalance}
                      min={1000}
                      max={1000000}
                      step={1000}
                      prefix="RM"
                      onChange={(value) => setNumber("startingBalance", value)}
                    />
                    <NumberSetting
                      label="Turn timer"
                      detail="Time available before a turn advances."
                      value={settings.turnSeconds}
                      min={15}
                      max={600}
                      suffix="seconds"
                      onChange={(value) => setNumber("turnSeconds", value)}
                    />
                  </div>
                </section>

                <section className="dataset-panel settings-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow purple">MARKET BEHAVIOR</p>
                      <h2>Volatility profile</h2>
                      <p>
                        Choose how dramatically simulated prices respond to play.
                      </p>
                    </div>
                  </div>
                  <div className="volatility-options">
                    {(
                      Object.keys(volatilityCopy) as Array<
                        keyof typeof volatilityCopy
                      >
                    ).map((value) => (
                      <button
                        className={
                          settings.marketVolatility === value ? "active" : ""
                        }
                        key={value}
                        type="button"
                        onClick={() =>
                          setSettings((current) => ({
                            ...current,
                            marketVolatility: value,
                          }))
                        }
                      >
                        <span>
                          <i />
                          {volatilityCopy[value].label}
                        </span>
                        <small>{volatilityCopy[value].detail}</small>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="dataset-panel settings-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow green">GAMEPLAY RULES</p>
                      <h2>Session guardrails</h2>
                      <p>
                        Turn major engine behavior on or off for all new games.
                      </p>
                    </div>
                  </div>
                  <div className="settings-toggles">
                    <ToggleSetting
                      label="Auto-rotate event cards"
                      detail="Advance eligible events without facilitator selection."
                      checked={settings.autoRotateEvents}
                      onChange={(checked) =>
                        setSettings((current) => ({
                          ...current,
                          autoRotateEvents: checked,
                        }))
                      }
                    />
                    <ToggleSetting
                      label="Enable game loans"
                      detail="Allow players to borrow against their portfolio."
                      checked={settings.enableLoans}
                      onChange={(checked) =>
                        setSettings((current) => ({
                          ...current,
                          enableLoans: checked,
                        }))
                      }
                    />
                    <ToggleSetting
                      label="Allow negative balances"
                      detail="Permit cash balances to move below zero during a round."
                      checked={settings.allowNegativeBalance}
                      onChange={(checked) =>
                        setSettings((current) => ({
                          ...current,
                          allowNegativeBalance: checked,
                        }))
                      }
                    />
                    <ToggleSetting
                      label="Require a facilitator"
                      detail="Keep guided controls available in every live session."
                      checked={settings.requireFacilitator}
                      onChange={(checked) =>
                        setSettings((current) => ({
                          ...current,
                          requireFacilitator: checked,
                        }))
                      }
                    />
                  </div>
                </section>
              </div>

              <aside className="settings-preview-stack">
                <section className="health-card settings-preview">
                  <div className="panel-heading compact">
                    <div>
                      <p className="eyebrow">LIVE PREVIEW</p>
                      <h2>Session blueprint</h2>
                    </div>
                    <span className={dirty ? "draft-state" : "ready-state"}>
                      {dirty ? "Draft" : "Saved"}
                    </span>
                  </div>
                  <div className="session-preview-orbit">
                    <div>
                      <span>{settings.defaultPlayers}</span>
                      <small>PLAYERS</small>
                    </div>
                    <i>×</i>
                    <div>
                      <span>{settings.defaultRounds}</span>
                      <small>ROUNDS</small>
                    </div>
                  </div>
                  <div className="session-preview-list">
                    <p>
                      <span>Estimated duration</span>
                      <strong>{projectedMinutes} min</strong>
                    </p>
                    <p>
                      <span>Total player turns</span>
                      <strong>
                        {settings.defaultPlayers * settings.defaultRounds}
                      </strong>
                    </p>
                    <p>
                      <span>Market pressure</span>
                      <strong>
                        {volatilityCopy[settings.marketVolatility].label}
                      </strong>
                    </p>
                    <p>
                      <span>Facilitator</span>
                      <strong>
                        {settings.requireFacilitator ? "Required" : "Optional"}
                      </strong>
                    </p>
                  </div>
                </section>

                <section className="activity-card settings-audit">
                  <div className="panel-heading compact">
                    <div>
                      <p className="eyebrow">CONFIGURATION LOG</p>
                      <h2>Last saved</h2>
                    </div>
                  </div>
                  <div>
                    <span className="settings-audit-icon">✓</span>
                    <p>
                      <strong>{saved.updatedBy}</strong>
                      <small>{formatTimestamp(saved.updatedAt)}</small>
                    </p>
                  </div>
                </section>
              </aside>
            </section>
          )}
        </div>
      </main>

      {toast ? (
        <div className="admin-toast" role="status">
          <span className="status-dot" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function NumberSetting({
  label,
  detail,
  value,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  onChange,
}: {
  label: string;
  detail: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="number-setting">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="number-setting-input">
        {prefix ? <i>{prefix}</i> : null}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <i>{suffix}</i> : null}
      </span>
    </label>
  );
}

function ToggleSetting({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-setting">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `RM${value / 1_000_000}M`;
  if (value >= 1_000) return `RM${value / 1_000}K`;
  return `RM${value}`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not saved yet";
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
