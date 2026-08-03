import Link from "next/link";
import type { AdminSessionUser } from "@/app/admin-access";

type AdminControlSidebarProps = {
  active: "users" | "settings" | "account";
  user: AdminSessionUser;
  footer: {
    eyebrow: string;
    title: string;
    detail: string;
    status: string;
  };
};

export function AdminControlSidebar({
  active,
  user,
  footer,
}: AdminControlSidebarProps) {
  return (
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
        <Link href="/admin/stocks">
          <span className="nav-glyph">▦</span>
          Stock datasets
        </Link>
        <Link href="/admin/events">
          <span className="nav-glyph">◈</span>
          Event datasets
        </Link>
        <p>GAME SYSTEM</p>
        {user.permissions.includes("users.manage") ? (
          <Link
            className={active === "users" ? "active" : ""}
            href="/admin/users"
          >
            <span className="nav-glyph">◎</span>
            Admin management
          </Link>
        ) : null}
        {user.permissions.includes("settings.edit") ? (
          <Link
            className={active === "settings" ? "active" : ""}
            href="/admin/game-settings"
          >
            <span className="nav-glyph">⚙</span>
            Game settings
          </Link>
        ) : null}
      </nav>

      <div className="control-sidebar-card">
        <p>{footer.eyebrow}</p>
        <strong>{footer.title}</strong>
        <span>{footer.detail}</span>
        <small>
          <i />
          {footer.status}
        </small>
      </div>

      <Link
        className={`sidebar-user sidebar-user-link ${
          active === "account" ? "active" : ""
        }`}
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
