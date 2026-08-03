"use client";

import { FormEvent, useState } from "react";
import {
  ADMIN_ROLE_LABELS,
  type AdminPermission,
  type AdminSessionUser,
} from "@/app/admin-access";
import { ADMIN_LOGIN_URL } from "@/app/admin-login";
import { AdminControlSidebar } from "../AdminControlSidebar";

type AccountManagementProps = {
  currentUser: AdminSessionUser;
};

const permissionLabels: Record<AdminPermission, string> = {
  "portal.view": "View admin portal",
  "simulation.run": "Run simulations",
  "datasets.reuse": "Prepare datasets",
  "datasets.edit": "Edit datasets",
  "settings.edit": "Edit game settings",
  "users.manage": "Manage administrators",
  "audit.view": "View audit history",
};

export function AccountManagement({ currentUser }: AccountManagementProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a new password that is different from your current one.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "The password could not be updated.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated. Use the new password the next time you sign in.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The password could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyLoginUrl() {
    try {
      await navigator.clipboard.writeText(ADMIN_LOGIN_URL);
      setMessage("Login link copied.");
      setError("");
    } catch {
      setError("The login link could not be copied.");
    }
  }

  return (
    <div className="admin-app control-page account-page">
      <AdminControlSidebar
        active="account"
        user={currentUser}
        footer={{
          eyebrow: "PERSONAL ACCESS",
          title: ADMIN_ROLE_LABELS[currentUser.role],
          detail: `${currentUser.permissions.length} workspace permissions assigned.`,
          status: "ACCOUNT ACTIVE",
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
          <div className="account-topbar-label">
            <span aria-hidden="true">◎</span>
            PERSONAL LOGIN
          </div>
          <div className="topbar-status">
            <span className="status-dot" />
            SECURE SESSION
          </div>
        </header>

        <div className="admin-content control-content account-content">
          <section className="admin-heading">
            <div>
              <p className="eyebrow">ACCOUNT &amp; SECURITY</p>
              <h1>Personal login</h1>
              <p>
                Review your administrator identity, permissions, and sign-in
                security from one place.
              </p>
            </div>
            <a className="account-signout" href="/api/auth/logout">
              Sign out
              <span aria-hidden="true">↗</span>
            </a>
          </section>

          <section className="account-summary-grid">
            <article className="account-summary-card identity">
              <span className="account-summary-icon">
                {initials(currentUser.name)}
              </span>
              <div>
                <p>Signed in as</p>
                <strong>{currentUser.name}</strong>
                <small>{currentUser.email}</small>
              </div>
            </article>
            <article className="account-summary-card role">
              <span className="account-summary-icon">◆</span>
              <div>
                <p>Access level</p>
                <strong>{ADMIN_ROLE_LABELS[currentUser.role]}</strong>
                <small>Role-based workspace permissions</small>
              </div>
            </article>
            <article className="account-summary-card status">
              <span className="account-summary-icon">✓</span>
              <div>
                <p>Account status</p>
                <strong>Active</strong>
                <small>Session verified by Supabase Auth</small>
              </div>
            </article>
          </section>

          <section className="account-management-grid">
            <div className="dataset-panel account-password-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">LOGIN SECURITY</p>
                  <h2>Change password</h2>
                  <p>
                    Confirm your current password before choosing a new one.
                  </p>
                </div>
                <span className="panel-count">SERVER VERIFIED</span>
              </div>
              <form className="account-password-form" onSubmit={updatePassword}>
                <label className="admin-field">
                  <span>Current password</span>
                  <input
                    required
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Enter your current password"
                  />
                </label>
                <label className="admin-field">
                  <span>New password</span>
                  <input
                    required
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 12 characters"
                  />
                </label>
                <label className="admin-field">
                  <span>Confirm new password</span>
                  <input
                    required
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat the new password"
                  />
                </label>
                <div className="account-form-message" aria-live="polite">
                  {error ? <p className="error">{error}</p> : null}
                  {message ? <p className="success">{message}</p> : null}
                </div>
                <div className="account-form-actions">
                  <p>
                    Use a unique password that you do not use for another
                    service.
                  </p>
                  <button className="admin-primary" type="submit" disabled={busy}>
                    {busy ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </div>

            <aside className="account-side-stack">
              <section className="health-card account-login-card">
                <div className="panel-heading compact">
                  <div>
                    <p className="eyebrow">PORTAL ADDRESS</p>
                    <h2>Login link</h2>
                  </div>
                </div>
                <div className="account-login-link">
                  <span>{ADMIN_LOGIN_URL}</span>
                  <button
                    type="button"
                    onClick={() => void copyLoginUrl()}
                  >
                    Copy
                  </button>
                </div>
                <p>
                  Share this address with administrators only after their
                  account has been created.
                </p>
              </section>

              <section className="activity-card account-permissions-card">
                <div className="panel-heading compact">
                  <div>
                    <p className="eyebrow">YOUR ROLE</p>
                    <h2>Permissions</h2>
                  </div>
                  <span className="panel-count">
                    {currentUser.permissions.length}
                  </span>
                </div>
                <ul>
                  {currentUser.permissions.map((permission) => (
                    <li key={permission}>
                      <span>✓</span>
                      {permissionLabels[permission]}
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </section>
        </div>
      </main>
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
