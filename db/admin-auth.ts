import { env } from "cloudflare:workers";
import type { AdminSessionUser } from "@/app/admin-access";

export type AdminAuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AdminSessionUser;
};

type RuntimeEnv = {
  SUPABASE_URL?: string;
  NAVIWEALTH_DB_GATEWAY_KEY?: string;
};

type GatewayResponse = {
  session?: AdminAuthSession;
  user?: AdminSessionUser;
  error?: string;
};

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function loginAdmin(email: string, password: string) {
  const response = await callAuthGateway({
    operation: "loginAdmin",
    email,
    password,
  });
  if (!response.session) {
    throw new AdminAuthError("The login session could not be created.", 500);
  }
  return response.session;
}

export async function refreshAdminSession(refreshToken: string) {
  const response = await callAuthGateway({
    operation: "refreshAdminSession",
    refreshToken,
  });
  if (!response.session) {
    throw new AdminAuthError("The login session could not be refreshed.", 500);
  }
  return response.session;
}

export async function validateAdminSession(accessToken: string) {
  const response = await callAuthGateway({
    operation: "getAdminSession",
    accessToken,
  });
  if (!response.user) {
    throw new AdminAuthError("Sign in is required.", 401);
  }
  return response.user;
}

async function callAuthGateway(
  payload: Record<string, unknown>,
): Promise<GatewayResponse> {
  const runtime = env as unknown as RuntimeEnv;
  const supabaseUrl = runtime.SUPABASE_URL?.replace(/\/+$/, "");
  const gatewayKey = runtime.NAVIWEALTH_DB_GATEWAY_KEY;
  if (!supabaseUrl || !gatewayKey) {
    throw new AdminAuthError("Administrator login is not configured.", 503);
  }

  let response: Response;
  try {
    response = await fetch(
      `${supabaseUrl}/functions/v1/naviwealth-datasets`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-naviwealth-db-key": gatewayKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    throw new AdminAuthError(
      "Administrator login is temporarily unavailable.",
      503,
    );
  }

  const body = (await response.json().catch(() => ({}))) as GatewayResponse;
  if (!response.ok) {
    throw new AdminAuthError(
      body.error ?? "The administrator request could not be completed.",
      response.status,
    );
  }
  return body;
}
