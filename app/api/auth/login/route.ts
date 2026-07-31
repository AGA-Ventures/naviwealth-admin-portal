import { loginAdmin, AdminAuthError } from "@/db/admin-auth";
import {
  appendSessionCookies,
  safeReturnTo,
} from "@/app/admin-session";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      returnTo?: unknown;
    };
    const email = typeof payload.email === "string" ? payload.email : "";
    const password =
      typeof payload.password === "string" ? payload.password : "";
    const session = await loginAdmin(email, password);
    const headers = new Headers({ "cache-control": "no-store" });
    appendSessionCookies(headers, session, request.url);
    return Response.json(
      {
        user: session.user,
        returnTo: safeReturnTo(
          typeof payload.returnTo === "string" ? payload.returnTo : null,
        ),
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "cache-control": "no-store" } },
      );
    }
    return Response.json(
      { error: "The administrator login could not be completed." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
