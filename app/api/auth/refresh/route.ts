import { refreshAdminSession } from "@/db/admin-auth";
import {
  appendClearedSessionCookies,
  appendSessionCookies,
  requestRefreshToken,
  safeReturnTo,
} from "@/app/admin-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("return_to"));
  const refreshToken = requestRefreshToken(request);
  if (!refreshToken) return redirectToLogin(request, returnTo);

  try {
    const session = await refreshAdminSession(refreshToken);
    const headers = new Headers({ location: returnTo });
    appendSessionCookies(headers, session, request.url);
    return new Response(null, { status: 303, headers });
  } catch {
    return redirectToLogin(request, returnTo);
  }
}

function redirectToLogin(request: Request, returnTo: string) {
  const location = `/?return_to=${encodeURIComponent(returnTo)}&reason=session`;
  const headers = new Headers({ location });
  appendClearedSessionCookies(headers, request.url);
  return new Response(null, { status: 303, headers });
}
