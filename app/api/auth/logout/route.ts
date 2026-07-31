import { appendClearedSessionCookies } from "@/app/admin-session";

export async function POST(request: Request) {
  const headers = new Headers({ location: "/" });
  appendClearedSessionCookies(headers, request.url);
  return new Response(null, { status: 303, headers });
}

export async function GET(request: Request) {
  return POST(request);
}
