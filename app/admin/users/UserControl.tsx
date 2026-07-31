"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AdminSessionUser } from "@/app/admin-access";
import { AdminControlSidebar } from "../AdminControlSidebar";

type AdminUserRole = "superadmin" | "admin" | "facilitator" | "viewer";
type AdminUserStatus = "active" | "invited" | "suspended";

type AdminUser = {
  id: number;
  authUserId: string | null;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminAuditLog = {
  id: number;
  actorName: string;
  actorEmail: string;
  actorRole: AdminUserRole;
  action: string;
  resourceType: string;
  resourceId: string | null;
  summary: string;
  createdAt: string;
};

type UserControlProps = {
  currentUser: AdminSessionUser;
};

const roleLabels: Record<AdminUserRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  facilitator: "Facilitator",
  viewer: "Viewer",
};

const statusLabels: Record<AdminUserStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
};

export function UserControl({ currentUser }: UserControlProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | AdminUserStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | "invite" | null>(null);
  const [toast, setToast] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] =
    useState<AdminUserRole>("facilitator");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [usersResponse, auditResponse] = await Promise.all([
          fetch("/api/admin-users", { cache: "no-store" }),
          fetch("/api/audit-logs", { cache: "no-store" }),
        ]);
        const [usersPayload, auditPayload] = await Promise.all([
          usersResponse.json(),
          auditResponse.json(),
        ]);
        if (!usersResponse.ok) {
          throw new Error(usersPayload.error ?? "Unable to load admin users.");
        }
        if (!auditResponse.ok) {
          throw new Error(auditPayload.error ?? "Unable to load audit history.");
        }
        if (!cancelled) {
          setUsers(usersPayload.users);
          setAuditLogs(auditPayload.logs);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load admin users.",
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

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesStatus = filter === "all" || user.status === filter;
      const matchesQuery =
        !needle ||
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.role.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [filter, query, users]);

  const totals = useMemo(
    () => ({
      active: users.filter((user) => user.status === "active").length,
      admins: users.filter(
        (user) => user.role === "superadmin" || user.role === "admin",
      ).length,
      facilitators: users.filter((user) => user.role === "facilitator").length,
      invited: users.filter((user) => user.status === "invited").length,
    }),
    [users],
  );

  async function updateUser(
    user: AdminUser,
    changes: Partial<Pick<AdminUser, "role" | "status">>,
  ) {
    setBusy(user.id);
    try {
      const response = await fetch(`/api/admin-users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update the user.");
      }
      setUsers((current) =>
        current.map((item) =>
          item.id === payload.user.id ? payload.user : item,
        ),
      );
      await refreshAuditLogs();
      setToast(`${payload.user.name} updated.`);
    } catch (updateError) {
      setToast(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update the user.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function inviteUser(event: FormEvent) {
    event.preventDefault();
    setBusy("invite");
    try {
      const response = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          password: invitePassword,
          status: "active",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create the invitation.");
      }
      setUsers((current) => [...current, payload.user]);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteRole("facilitator");
      setInviteOpen(false);
      await refreshAuditLogs();
      setToast(`${payload.user.name} can now sign in.`);
    } catch (inviteError) {
      setToast(
        inviteError instanceof Error
          ? inviteError.message
          : "Unable to create the invitation.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function refreshAuditLogs() {
    const response = await fetch("/api/audit-logs", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to refresh audit history.");
    }
    setAuditLogs(payload.logs);
  }

  return (
    <div className="admin-app control-page">
      <AdminControlSidebar
        active="users"
        user={currentUser}
        footer={{
          eyebrow: "ACCESS CONTROL",
          title: `${totals.active} active users`,
          detail: `${totals.admins} elevated accounts across this workspace.`,
          status: "PERMISSIONS SYNCED",
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
          <label className="global-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search users…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-status">
            <span className="status-dot" />
            ACCESS SERVICE ONLINE
          </div>
        </header>

        <div className="admin-content control-content">
          <section className="admin-heading">
            <div>
              <p className="eyebrow">TEAM &amp; PERMISSIONS</p>
              <h1>User control</h1>
              <p>
                Manage who can operate NaviWealth, what they can change, and
                whether their workspace access is active.
              </p>
            </div>
            <button
              className="admin-primary"
              type="button"
              onClick={() => setInviteOpen(true)}
            >
              <span aria-hidden="true">＋</span>
              Create login
            </button>
          </section>

          <section className="metric-grid">
            <article className="metric-card cyan">
              <div>
                <p>Active users</p>
                <strong>{totals.active}</strong>
                <span>can enter the admin portal</span>
              </div>
              <span className="metric-symbol">◎</span>
            </article>
            <article className="metric-card purple">
              <div>
                <p>Elevated access</p>
                <strong>{totals.admins}</strong>
                <span>superadmins and administrators</span>
              </div>
              <span className="metric-symbol">◆</span>
            </article>
            <article className="metric-card green">
              <div>
                <p>Facilitators</p>
                <strong>{totals.facilitators}</strong>
                <span>ready to run game sessions</span>
              </div>
              <span className="metric-symbol">▶</span>
            </article>
            <article className="metric-card yellow">
              <div>
                <p>Pending invites</p>
                <strong>{totals.invited}</strong>
                <span>awaiting account activation</span>
              </div>
              <span className="metric-symbol">↗</span>
            </article>
          </section>

          <section className="control-grid">
            <div className="dataset-panel control-user-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">WORKSPACE DIRECTORY</p>
                  <h2>Admin users</h2>
                  <p>Roles and access states are saved to the shared database.</p>
                </div>
                <span className="panel-count">{users.length} users</span>
              </div>

              <div className="dataset-toolbar control-toolbar">
                <div className="filter-tabs" aria-label="Filter users">
                  {(["all", "active", "invited", "suspended"] as const).map(
                    (value) => (
                      <button
                        className={filter === value ? "active" : ""}
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                      >
                        {value === "all" ? "All users" : statusLabels[value]}
                      </button>
                    ),
                  )}
                </div>
                <label className="table-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    placeholder="Filter directory"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>

              {loading ? (
                <div className="control-empty">
                  <span className="control-spinner" />
                  <strong>Loading workspace access…</strong>
                </div>
              ) : error ? (
                <div className="control-empty error">
                  <span>!</span>
                  <strong>{error}</strong>
                </div>
              ) : visibleUsers.length === 0 ? (
                <div className="control-empty">
                  <span>◎</span>
                  <strong>No users match this view.</strong>
                </div>
              ) : (
                <div className="control-table-wrap">
                  <table className="control-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last active</th>
                        <th>Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="control-user-cell">
                              <span>{initials(user.name)}</span>
                              <div>
                                <strong>{user.name}</strong>
                                <small>{user.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <select
                              aria-label={`Role for ${user.name}`}
                              value={user.role}
                              disabled={busy === user.id}
                              onChange={(event) =>
                                void updateUser(user, {
                                  role: event.target.value as AdminUserRole,
                                })
                              }
                            >
                              {Object.entries(roleLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>
                          <td>
                            <span className={`user-status ${user.status}`}>
                              <i />
                              {statusLabels[user.status]}
                            </span>
                          </td>
                          <td>
                            <span className="control-date">
                              {relativeDate(user.lastActiveAt)}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`access-action ${
                                user.status === "active" ? "suspend" : "enable"
                              }`}
                              type="button"
                              disabled={
                                busy === user.id ||
                                user.authUserId === currentUser.authUserId
                              }
                              onClick={() =>
                                void updateUser(user, {
                                  status:
                                    user.status === "active"
                                      ? "suspended"
                                      : "active",
                                })
                              }
                              title={
                                user.authUserId === currentUser.authUserId
                                  ? "You cannot suspend your own account."
                                  : undefined
                              }
                            >
                              {busy === user.id
                                ? "Saving…"
                                : user.status === "active"
                                  ? "Suspend"
                                  : "Enable"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <aside className="control-side-stack">
              <section className="health-card">
                <div className="panel-heading compact">
                  <div>
                    <p className="eyebrow">ROLE GUIDE</p>
                    <h2>Permission levels</h2>
                  </div>
                </div>
                <div className="role-guide">
                  <article>
                    <span className="purple">◆</span>
                    <div>
                      <strong>Superadmin</strong>
                      <p>Controls accounts, permissions, settings, and audit history.</p>
                    </div>
                  </article>
                  <article>
                    <span className="purple">◇</span>
                    <div>
                      <strong>Admin</strong>
                      <p>Edits datasets and shared game configuration.</p>
                    </div>
                  </article>
                  <article>
                    <span className="cyan">▶</span>
                    <div>
                      <strong>Facilitator</strong>
                      <p>Run simulations and prepare datasets for sessions.</p>
                    </div>
                  </article>
                  <article>
                    <span className="muted">◌</span>
                    <div>
                      <strong>Viewer</strong>
                      <p>Read-only visibility across the operations workspace.</p>
                    </div>
                  </article>
                </div>
              </section>

              <section className="activity-card">
                <div className="panel-heading compact">
                  <div>
                    <p className="eyebrow">SECURITY</p>
                    <h2>Access health</h2>
                  </div>
                  <strong className="control-health-score">100</strong>
                </div>
                <div className="access-health">
                  <p>
                    <i className="green" />
                    Database access is server protected
                  </p>
                  <p>
                    <i className="green" />
                    Public table access is disabled
                  </p>
                  <p>
                    <i className={totals.invited ? "yellow" : "green"} />
                    {totals.invited
                      ? `${totals.invited} invitation${
                          totals.invited === 1 ? "" : "s"
                        } pending`
                      : "No invitations pending"}
                  </p>
                </div>
              </section>
            </aside>
          </section>

          <section className="dataset-panel audit-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SUPERADMIN AUDIT</p>
                <h2>Action history</h2>
                <p>Every saved change records who made it and what was affected.</p>
              </div>
              <span className="panel-count">{auditLogs.length} recent actions</span>
            </div>
            {loading ? (
              <div className="audit-empty">Loading action history…</div>
            ) : auditLogs.length === 0 ? (
              <div className="audit-empty">No administrative changes recorded yet.</div>
            ) : (
              <div className="audit-list">
                {auditLogs.slice(0, 40).map((log) => (
                  <article key={log.id}>
                    <span className="audit-action-icon">{auditIcon(log.action)}</span>
                    <div className="audit-copy">
                      <strong>{log.summary}</strong>
                      <span>
                        {log.actorName} · {roleLabels[log.actorRole]} · {log.actorEmail}
                      </span>
                    </div>
                    <div className="audit-resource">
                      <span>{resourceLabel(log.resourceType)}</span>
                      <time dateTime={log.createdAt}>{fullDate(log.createdAt)}</time>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {inviteOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setInviteOpen(false);
          }}
        >
          <form className="dataset-modal control-modal" onSubmit={inviteUser}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">WORKSPACE ACCESS</p>
                <h2>Create administrator login</h2>
                <p>Create a verified login and assign its starting permission level.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setInviteOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-grid">
              <label className="admin-field wide">
                <span>Full name</span>
                <input
                  required
                  maxLength={80}
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  placeholder="e.g. Jordan Lee"
                />
              </label>
              <label className="admin-field wide">
                <span>Email address</span>
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="jordan@company.com"
                />
              </label>
              <label className="admin-field wide">
                <span>Starting role</span>
                <select
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as AdminUserRole)
                  }
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <small>
                  Only superadmins can create accounts or change these roles.
                </small>
              </label>
              <label className="admin-field wide">
                <span>Temporary password</span>
                <input
                  required
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={invitePassword}
                  onChange={(event) => setInvitePassword(event.target.value)}
                  placeholder="At least 12 characters"
                />
                <small>Share this securely. The user can sign in immediately.</small>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setInviteOpen(false)}>
                Cancel
              </button>
              <button
                className="admin-primary"
                type="submit"
                disabled={busy === "invite"}
              >
                {busy === "invite" ? "Creating…" : "Create login"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? (
        <div className="admin-toast" role="status">
          <span className="status-dot" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function relativeDate(value: string | null) {
  if (!value) return "Never";
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function resourceLabel(value: string) {
  return value.replaceAll("_", " ").toUpperCase();
}

function auditIcon(action: string) {
  if (action.includes("delete") || action.includes("suspend")) return "−";
  if (action.includes("create") || action.includes("duplicate")) return "+";
  if (action.includes("reuse")) return "↻";
  return "✓";
}
