import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  AdminPermission,
  AdminSessionUser,
} from "@/app/admin-access";
import { hasAdminPermission } from "@/app/admin-access";
import {
  AdminAuthError,
  type AdminAuthSession,
  validateAdminSession,
} from "@/db/admin-auth";

export const ACCESS_COOKIE = "nw_admin_access";
export const REFRESH_COOKIE = "nw_admin_refresh";

export async function requireAdminSession(
  returnTo: string,
  permission?: AdminPermission,
) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!accessToken) {
    redirect(loginPath(returnTo));
  }

  let user: AdminSessionUser;
  try {
    user = await validateAdminSession(accessToken);
  } catch (error) {
    if (
      error instanceof AdminAuthError &&
      error.status === 401 &&
      refreshToken
    ) {
      redirect(
        `/api/auth/refresh?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`,
      );
    }
    redirect(loginPath(returnTo, "session"));
  }
  if (permission && !hasAdminPermission(user, permission)) {
    redirect("/admin?access=denied");
  }
  return user;
}

export async function getRequestAdminUser(request: Request) {
  const accessToken = readCookie(
    request.headers.get("cookie"),
    ACCESS_COOKIE,
  );
  if (!accessToken) return null;
  try {
    return await validateAdminSession(accessToken);
  } catch {
    return null;
  }
}

export function requireRequestPermission(
  user: AdminSessionUser,
  permission: AdminPermission,
) {
  return hasAdminPermission(user, permission);
}

export function appendSessionCookies(
  headers: Headers,
  session: AdminAuthSession,
  requestUrl: string,
) {
  const secure = new URL(requestUrl).protocol === "https:";
  const accessMaxAge = Math.max(
    60,
    session.expiresAt - Math.floor(Date.now() / 1000),
  );
  headers.append(
    "set-cookie",
    serializeCookie(ACCESS_COOKIE, session.accessToken, accessMaxAge, secure),
  );
  headers.append(
    "set-cookie",
    serializeCookie(
      REFRESH_COOKIE,
      session.refreshToken,
      60 * 60 * 24 * 30,
      secure,
    ),
  );
}

export function appendClearedSessionCookies(
  headers: Headers,
  requestUrl: string,
) {
  const secure = new URL(requestUrl).protocol === "https:";
  headers.append(
    "set-cookie",
    serializeCookie(ACCESS_COOKIE, "", 0, secure),
  );
  headers.append(
    "set-cookie",
    serializeCookie(REFRESH_COOKIE, "", 0, secure),
  );
}

export function requestRefreshToken(request: Request) {
  return readCookie(request.headers.get("cookie"), REFRESH_COOKIE);
}

export function requestAccessToken(request: Request) {
  return readCookie(request.headers.get("cookie"), ACCESS_COOKIE);
}

export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }
  try {
    const url = new URL(value, "https://naviwealth.local");
    if (url.origin !== "https://naviwealth.local") return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}

function loginPath(returnTo: string, reason?: string) {
  const params = new URLSearchParams({
    return_to: safeReturnTo(returnTo),
  });
  if (reason) params.set("reason", reason);
  return `/?${params.toString()}`;
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function serializeCookie(
  name: string,
  value: string,
  maxAge: number,
  secure: boolean,
) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
