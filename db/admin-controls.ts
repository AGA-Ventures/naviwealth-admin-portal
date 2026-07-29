import { env } from "cloudflare:workers";

export type AdminUserRole = "owner" | "admin" | "facilitator" | "viewer";
export type AdminUserStatus = "active" | "invited" | "suspended";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GameSettings = {
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

type AdminUserInput = {
  name: string;
  email: string;
  role: AdminUserRole;
  status?: AdminUserStatus;
};

type GatewayResponse = {
  user?: AdminUser;
  users?: AdminUser[];
  settings?: GameSettings;
  error?: string;
};

type RuntimeEnv = {
  SUPABASE_URL?: string;
  NAVIWEALTH_DB_GATEWAY_KEY?: string;
};

export class AdminControlError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function listAdminUsers() {
  const response = await callGateway({ operation: "listAdminUsers" });
  return response.users ?? [];
}

export async function createAdminUser(input: AdminUserInput) {
  const response = await callGateway({
    operation: "createAdminUser",
    input,
  });
  return requiredUser(response);
}

export async function updateAdminUser(
  id: number,
  input: Partial<AdminUserInput>,
) {
  const response = await callGateway({
    operation: "updateAdminUser",
    id,
    input,
  });
  return requiredUser(response);
}

export async function getGameSettings() {
  const response = await callGateway({ operation: "getGameSettings" });
  if (!response.settings) {
    throw new AdminControlError("Game settings could not be loaded.", 500);
  }
  return response.settings;
}

export async function updateGameSettings(input: Partial<GameSettings>) {
  const response = await callGateway({
    operation: "updateGameSettings",
    input,
  });
  if (!response.settings) {
    throw new AdminControlError("Game settings could not be saved.", 500);
  }
  return response.settings;
}

async function callGateway(
  payload: Record<string, unknown>,
): Promise<GatewayResponse> {
  const runtime = env as unknown as RuntimeEnv;
  const supabaseUrl = runtime.SUPABASE_URL?.replace(/\/+$/, "");
  const gatewayKey = runtime.NAVIWEALTH_DB_GATEWAY_KEY;

  if (!supabaseUrl || !gatewayKey) {
    throw new AdminControlError(
      "Supabase admin storage is not configured.",
      503,
    );
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
    throw new AdminControlError(
      "Admin storage is temporarily unavailable.",
      503,
    );
  }

  const body = (await response.json().catch(() => ({}))) as GatewayResponse;
  if (!response.ok) {
    throw new AdminControlError(
      body.error ?? "The admin request could not be completed.",
      response.status,
    );
  }
  return body;
}

function requiredUser(response: GatewayResponse) {
  if (!response.user) {
    throw new AdminControlError("The admin user could not be loaded.", 500);
  }
  return response.user;
}
