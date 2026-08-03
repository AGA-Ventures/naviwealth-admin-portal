import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("uses real Supabase sessions and HTTP-only login cookies", async () => {
  const [login, session, authStore, home] = await Promise.all([
    source("app/api/auth/login/route.ts"),
    source("app/admin-session.ts"),
    source("db/admin-auth.ts"),
    source("app/page.tsx"),
  ]);

  assert.match(login, /loginAdmin/);
  assert.match(authStore, /operation: "loginAdmin"/);
  assert.match(authStore, /operation: "getAdminSession"/);
  assert.match(session, /HttpOnly/);
  assert.match(session, /SameSite=Lax/);
  assert.match(session, /requireAdminSession/);
  assert.match(home, /fetch\("\/api\/auth\/login"/);
  assert.match(home, /window\.location\.assign\(payload\.returnTo \?\? "\/admin"\)/);
  assert.doesNotMatch(home, /router\.(replace|refresh)/);
  assert.doesNotMatch(home, /signin-with-chatgpt/);
});

test("enforces four roles at the API and database gateway", async () => {
  const [access, datasetRoute, userRoute, gateway] = await Promise.all([
    source("app/admin-access.ts"),
    source("app/api/datasets/[id]/route.ts"),
    source("app/api/admin-users/route.ts"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
  ]);

  for (const role of ["superadmin", "admin", "facilitator", "viewer"]) {
    assert.match(access, new RegExp(`\\b${role}\\b`));
    assert.match(gateway, new RegExp(`\\b${role}\\b`));
  }
  assert.match(datasetRoute, /datasets\.edit/);
  assert.match(datasetRoute, /datasets\.reuse/);
  assert.match(userRoute, /users\.manage/);
  assert.match(gateway, /assertOperationPermission/);
  assert.match(gateway, /requireAdminActor/);
});

test("records every privileged change for superadmin review", async () => {
  const [migration, gateway, auditRoute, userControl] = await Promise.all([
    source("supabase/migrations/20260731141044_admin_auth_rbac_audit.sql"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
    source("app/api/audit-logs/route.ts"),
    source("app/admin/users/UserControl.tsx"),
  ]);

  assert.match(migration, /create table if not exists public\.admin_audit_logs/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth_user_id uuid\s+references auth\.users/i);
  assert.match(gateway, /writeAudit/);
  assert.match(gateway, /case "listAuditLogs"/);
  assert.match(gateway, /admin_user\.create/);
  assert.match(gateway, /event_record\.update/);
  assert.match(gateway, /stock_prices\.update/);
  assert.match(auditRoute, /audit\.view/);
  assert.match(userControl, /Action history/);
});

test("only superadmins create login accounts with temporary passwords", async () => {
  const [userControl, gateway] = await Promise.all([
    source("app/admin/users/UserControl.tsx"),
    source("supabase/functions/naviwealth-datasets/index.ts"),
  ]);

  assert.match(userControl, /Temporary password/);
  assert.match(userControl, /minLength=\{12\}/);
  assert.match(userControl, /password: invitePassword/);
  assert.match(userControl, /Copy access details/);
  assert.match(userControl, /Open email draft/);
  assert.match(userControl, /loginUrl: ADMIN_LOGIN_URL/);
  assert.match(gateway, /client\.auth\.admin\.createUser/);
  assert.match(gateway, /email_confirm: true/);
  assert.match(gateway, /Keep at least one active superadmin account/);
});

test("lets every signed-in administrator manage their own login securely", async () => {
  const [account, passwordRoute, session, authStore, gateway] =
    await Promise.all([
      source("app/admin/account/AccountManagement.tsx"),
      source("app/api/auth/password/route.ts"),
      source("app/admin-session.ts"),
      source("db/admin-auth.ts"),
      source("supabase/functions/naviwealth-datasets/index.ts"),
    ]);

  assert.match(account, /fetch\("\/api\/auth\/password"/);
  assert.match(account, /Current password/);
  assert.match(account, /Confirm new password/);
  assert.match(passwordRoute, /requestAccessToken/);
  assert.match(session, /export function requestAccessToken/);
  assert.match(authStore, /operation: "changeAdminPassword"/);
  assert.match(gateway, /current_password: currentPassword/);
  assert.match(gateway, /admin_user\.password\.update/);
  assert.match(gateway, /Authorization: `Bearer \$\{accessToken\}`/);
});

test("keeps user sessions isolated from the service-role database client", async () => {
  const gateway = await source("supabase/functions/naviwealth-datasets/index.ts");

  assert.match(
    gateway,
    /const authClient = createAdminClient\(\);[\s\S]*?authClient\.auth\.signInWithPassword/,
  );
  assert.match(
    gateway,
    /const authClient = createAdminClient\(\);[\s\S]*?authClient\.auth\.refreshSession/,
  );
  assert.match(
    gateway,
    /const authClient = createAdminClient\(\);[\s\S]*?authClient\.auth\.getUser/,
  );
  assert.doesNotMatch(gateway, /client\.auth\.signInWithPassword/);
  assert.doesNotMatch(gateway, /client\.auth\.refreshSession/);
  assert.doesNotMatch(gateway, /client\.auth\.getUser/);
});
