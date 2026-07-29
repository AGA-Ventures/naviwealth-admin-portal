import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.111.0";

const DATASET_LIMIT = 30;
const GATEWAY_KEY_HASH =
  "7b6a3142850c187ed9970f175cdc1172e828ac5aa9d36762774efbaa7e41c47c";

type DatasetKind = "event" | "stock";
type DatasetStatus = "draft" | "ready" | "archived";
type DatasetInput = {
  name?: unknown;
  kind?: unknown;
  description?: unknown;
  status?: unknown;
  memberIds?: unknown;
};

type AdminUserRole = "owner" | "admin" | "facilitator" | "viewer";
type AdminUserStatus = "active" | "invited" | "suspended";
type AdminUserInput = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  status?: unknown;
};
type GameSettingsInput = {
  defaultPlayers?: unknown;
  defaultRounds?: unknown;
  startingBalance?: unknown;
  turnSeconds?: unknown;
  marketVolatility?: unknown;
  autoRotateEvents?: unknown;
  allowNegativeBalance?: unknown;
  enableLoans?: unknown;
  requireFacilitator?: unknown;
  updatedBy?: unknown;
};

type DatasetRow = {
  id: number;
  name: string;
  kind: DatasetKind;
  description: string;
  status: DatasetStatus;
  member_ids: number[];
  item_count: number;
  reuse_count: number;
  validation_state: "valid" | "warning";
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
};

type GameSettingsRow = {
  id: number;
  default_players: number;
  default_rounds: number;
  starting_balance: number;
  turn_seconds: number;
  market_volatility: "low" | "balanced" | "high";
  auto_rotate_events: boolean;
  allow_negative_balance: boolean;
  enable_loans: boolean;
  require_facilitator: boolean;
  updated_by: string;
  updated_at: string;
};

type RequestBody = {
  operation?: unknown;
  id?: unknown;
  input?: DatasetInput | AdminUserInput | GameSettingsInput;
};

class GatewayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  if (!(await isAuthorized(request))) {
    return json({ error: "Unauthorized." }, 401);
  }

  try {
    const body = (await request.json()) as RequestBody;
    const client = createAdminClient();

    switch (body.operation) {
      case "list":
        return json({ datasets: await listDatasets(client) });
      case "get":
        return json({
          dataset: mapDataset(await findDataset(client, id(body.id))),
        });
      case "create":
        return json(
          {
            dataset: mapDataset(
              await createDataset(
                client,
                (body.input ?? {}) as DatasetInput,
              ),
            ),
          },
          201,
        );
      case "update":
        return json({
          dataset: mapDataset(
            await updateDataset(
              client,
              id(body.id),
              (body.input ?? {}) as DatasetInput,
            ),
          ),
        });
      case "delete":
        await deleteDataset(client, id(body.id));
        return json({ deleted: true });
      case "duplicate":
        return json(
          {
            dataset: mapDataset(
              await duplicateDataset(client, id(body.id)),
            ),
          },
          201,
        );
      case "reuse":
        return json({
          dataset: mapDataset(await reuseDataset(client, id(body.id))),
        });
      case "listAdminUsers":
        return json({ users: await listAdminUsers(client) });
      case "createAdminUser":
        return json(
          {
            user: mapAdminUser(
              await createAdminUser(
                client,
                (body.input ?? {}) as AdminUserInput,
              ),
            ),
          },
          201,
        );
      case "updateAdminUser":
        return json({
          user: mapAdminUser(
            await updateAdminUser(
              client,
              id(body.id),
              (body.input ?? {}) as AdminUserInput,
            ),
          ),
        });
      case "getGameSettings":
        return json({
          settings: mapGameSettings(await getGameSettings(client)),
        });
      case "updateGameSettings":
        return json({
          settings: mapGameSettings(
            await updateGameSettings(
              client,
              (body.input ?? {}) as GameSettingsInput,
            ),
          ),
        });
      default:
        throw new GatewayError("Unsupported gateway operation.", 400);
    }
  } catch (error) {
    if (error instanceof GatewayError) {
      return json({ error: error.message }, error.status);
    }
    console.error(error);
    return json({ error: "The dataset request could not be completed." }, 500);
  }
});

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey =
    secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !secretKey) {
    throw new GatewayError("Database service is not configured.", 503);
  }

  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function listDatasets(client: SupabaseClient) {
  const { data, error } = await client
    .from("datasets")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw databaseError(error);
  return (data as DatasetRow[]).map(mapDataset);
}

async function findDataset(client: SupabaseClient, datasetId: number) {
  const { data, error } = await client
    .from("datasets")
    .select("*")
    .eq("id", datasetId)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!data) throw new GatewayError("Dataset not found.", 404);
  return data as DatasetRow;
}

async function createDataset(client: SupabaseClient, input: DatasetInput) {
  await assertCapacity(client);
  const members = sanitizeMemberIds(input.memberIds ?? []);
  const { data, error } = await client
    .from("datasets")
    .insert({
      name: cleanName(input.name),
      kind: parseKind(input.kind),
      description: cleanDescription(input.description),
      status: parseStatus(input.status ?? "draft"),
      member_ids: members,
      validation_state: members.length > 0 ? "valid" : "warning",
    })
    .select("*")
    .single();
  if (error) throw databaseError(error);
  return data as DatasetRow;
}

async function updateDataset(
  client: SupabaseClient,
  datasetId: number,
  input: DatasetInput,
) {
  const current = await findDataset(client, datasetId);
  const members =
    input.memberIds === undefined
      ? current.member_ids
      : sanitizeMemberIds(input.memberIds);

  const { data, error } = await client
    .from("datasets")
    .update({
      name: input.name === undefined ? current.name : cleanName(input.name),
      kind: input.kind === undefined ? current.kind : parseKind(input.kind),
      description:
        input.description === undefined
          ? current.description
          : cleanDescription(input.description),
      status:
        input.status === undefined
          ? current.status
          : parseStatus(input.status),
      member_ids: members,
      validation_state: members.length > 0 ? "valid" : "warning",
    })
    .eq("id", datasetId)
    .select("*")
    .single();
  if (error) throw databaseError(error);
  return data as DatasetRow;
}

async function deleteDataset(client: SupabaseClient, datasetId: number) {
  await findDataset(client, datasetId);
  const { error } = await client.from("datasets").delete().eq("id", datasetId);
  if (error) throw databaseError(error);
}

async function duplicateDataset(
  client: SupabaseClient,
  datasetId: number,
) {
  await assertCapacity(client);
  const source = await findDataset(client, datasetId);
  const { data: rows, error } = await client.from("datasets").select("name");
  if (error) throw databaseError(error);

  const name = availableCopyName(
    source.name,
    new Set((rows ?? []).map((row) => String(row.name).toLowerCase())),
  );

  const { data, error: insertError } = await client
    .from("datasets")
    .insert({
      name,
      kind: source.kind,
      description: source.description,
      status: "draft",
      member_ids: source.member_ids,
      validation_state: source.member_ids.length > 0 ? "valid" : "warning",
    })
    .select("*")
    .single();
  if (insertError) throw databaseError(insertError);
  return data as DatasetRow;
}

async function reuseDataset(client: SupabaseClient, datasetId: number) {
  const current = await findDataset(client, datasetId);
  if (current.item_count === 0) {
    throw new GatewayError(
      "Add at least one member before reusing this dataset in a game.",
      400,
    );
  }

  const { data, error } = await client
    .from("datasets")
    .update({
      reuse_count: current.reuse_count + 1,
      last_used_at: new Date().toISOString(),
      status: "ready",
    })
    .eq("id", datasetId)
    .select("*")
    .single();
  if (error) throw databaseError(error);
  return data as DatasetRow;
}

async function assertCapacity(client: SupabaseClient) {
  const { count, error } = await client
    .from("datasets")
    .select("*", { count: "exact", head: true });
  if (error) throw databaseError(error);
  if ((count ?? 0) >= DATASET_LIMIT) {
    throw new GatewayError(
      `Dataset capacity reached. This workspace supports up to ${DATASET_LIMIT} datasets.`,
      409,
    );
  }
}

async function listAdminUsers(client: SupabaseClient) {
  const { data, error } = await client
    .from("admin_users")
    .select("*")
    .order("status", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw databaseError(error);
  return (data as AdminUserRow[]).map(mapAdminUser);
}

async function findAdminUser(client: SupabaseClient, userId: number) {
  const { data, error } = await client
    .from("admin_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!data) throw new GatewayError("Admin user not found.", 404);
  return data as AdminUserRow;
}

async function createAdminUser(
  client: SupabaseClient,
  input: AdminUserInput,
) {
  const { data, error } = await client
    .from("admin_users")
    .insert({
      name: cleanAdminUserName(input.name),
      email: cleanEmail(input.email),
      role: parseAdminUserRole(input.role ?? "facilitator"),
      status: parseAdminUserStatus(input.status ?? "invited"),
    })
    .select("*")
    .single();
  if (error) throw databaseError(error);
  return data as AdminUserRow;
}

async function updateAdminUser(
  client: SupabaseClient,
  userId: number,
  input: AdminUserInput,
) {
  const current = await findAdminUser(client, userId);
  const { data, error } = await client
    .from("admin_users")
    .update({
      name:
        input.name === undefined
          ? current.name
          : cleanAdminUserName(input.name),
      email:
        input.email === undefined ? current.email : cleanEmail(input.email),
      role:
        input.role === undefined
          ? current.role
          : parseAdminUserRole(input.role),
      status:
        input.status === undefined
          ? current.status
          : parseAdminUserStatus(input.status),
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw databaseError(error);
  return data as AdminUserRow;
}

async function getGameSettings(client: SupabaseClient) {
  const { data, error } = await client
    .from("game_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw databaseError(error);
  return data as GameSettingsRow;
}

async function updateGameSettings(
  client: SupabaseClient,
  input: GameSettingsInput,
) {
  const current = await getGameSettings(client);
  const { data, error } = await client
    .from("game_settings")
    .update({
      default_players:
        input.defaultPlayers === undefined
          ? current.default_players
          : boundedInteger(input.defaultPlayers, "Default players", 2, 12),
      default_rounds:
        input.defaultRounds === undefined
          ? current.default_rounds
          : boundedInteger(input.defaultRounds, "Default rounds", 4, 40),
      starting_balance:
        input.startingBalance === undefined
          ? current.starting_balance
          : boundedInteger(
              input.startingBalance,
              "Starting balance",
              1_000,
              1_000_000,
            ),
      turn_seconds:
        input.turnSeconds === undefined
          ? current.turn_seconds
          : boundedInteger(input.turnSeconds, "Turn duration", 15, 600),
      market_volatility:
        input.marketVolatility === undefined
          ? current.market_volatility
          : parseMarketVolatility(input.marketVolatility),
      auto_rotate_events:
        input.autoRotateEvents === undefined
          ? current.auto_rotate_events
          : parseBoolean(input.autoRotateEvents, "Auto-rotate events"),
      allow_negative_balance:
        input.allowNegativeBalance === undefined
          ? current.allow_negative_balance
          : parseBoolean(
              input.allowNegativeBalance,
              "Allow negative balance",
            ),
      enable_loans:
        input.enableLoans === undefined
          ? current.enable_loans
          : parseBoolean(input.enableLoans, "Enable loans"),
      require_facilitator:
        input.requireFacilitator === undefined
          ? current.require_facilitator
          : parseBoolean(
              input.requireFacilitator,
              "Require facilitator",
            ),
      updated_by:
        input.updatedBy === undefined
          ? current.updated_by
          : cleanUpdatedBy(input.updatedBy),
    })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw databaseError(error);
  return data as GameSettingsRow;
}

function mapDataset(row: DatasetRow) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    description: row.description,
    status: row.status,
    memberIds: row.member_ids,
    itemCount: row.item_count,
    reuseCount: row.reuse_count,
    validationState: row.validation_state,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminUser(row: AdminUserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGameSettings(row: GameSettingsRow) {
  return {
    defaultPlayers: row.default_players,
    defaultRounds: row.default_rounds,
    startingBalance: row.starting_balance,
    turnSeconds: row.turn_seconds,
    marketVolatility: row.market_volatility,
    autoRotateEvents: row.auto_rotate_events,
    allowNegativeBalance: row.allow_negative_balance,
    enableLoans: row.enable_loans,
    requireFacilitator: row.require_facilitator,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

function id(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new GatewayError("Invalid dataset ID.", 400);
  }
  return parsed;
}

function cleanAdminUserName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) throw new GatewayError("User name is required.", 400);
  if (name.length > 80) {
    throw new GatewayError("User name must be 80 characters or fewer.", 400);
  }
  return name;
}

function cleanEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new GatewayError("Enter a valid email address.", 400);
  }
  return email;
}

function parseAdminUserRole(value: unknown): AdminUserRole {
  if (
    value === "owner" ||
    value === "admin" ||
    value === "facilitator" ||
    value === "viewer"
  ) {
    return value;
  }
  throw new GatewayError("Select a valid user role.", 400);
}

function parseAdminUserStatus(value: unknown): AdminUserStatus {
  if (
    value === "active" ||
    value === "invited" ||
    value === "suspended"
  ) {
    return value;
  }
  throw new GatewayError("Select a valid user status.", 400);
}

function boundedInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new GatewayError(
      `${label} must be between ${minimum} and ${maximum}.`,
      400,
    );
  }
  return number;
}

function parseMarketVolatility(
  value: unknown,
): "low" | "balanced" | "high" {
  if (value === "low" || value === "balanced" || value === "high") {
    return value;
  }
  throw new GatewayError("Select a valid market volatility.", 400);
}

function parseBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new GatewayError(`${label} must be true or false.`, 400);
  }
  return value;
}

function cleanUpdatedBy(value: unknown) {
  const updatedBy = typeof value === "string" ? value.trim() : "";
  if (!updatedBy || updatedBy.length > 254) {
    throw new GatewayError("Settings editor is invalid.", 400);
  }
  return updatedBy;
}

function cleanName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) throw new GatewayError("Dataset name is required.", 400);
  if (name.length > 80) {
    throw new GatewayError(
      "Dataset name must be 80 characters or fewer.",
      400,
    );
  }
  return name;
}

function cleanDescription(value: unknown) {
  const description = typeof value === "string" ? value.trim() : "";
  if (description.length > 240) {
    throw new GatewayError(
      "Description must be 240 characters or fewer.",
      400,
    );
  }
  return description;
}

function parseKind(value: unknown): DatasetKind {
  if (value === "event" || value === "stock") return value;
  throw new GatewayError("Dataset type must be event or stock.", 400);
}

function parseStatus(value: unknown): DatasetStatus {
  if (value === "draft" || value === "ready" || value === "archived") {
    return value;
  }
  throw new GatewayError(
    "Dataset status must be draft, ready, or archived.",
    400,
  );
}

function sanitizeMemberIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new GatewayError("Members must be a list of numeric IDs.", 400);
  }
  const members = Array.from(
    new Set(
      value
        .map((member) => Number(member))
        .filter((member) => Number.isInteger(member) && member > 0),
    ),
  );
  if (members.length > 500) {
    throw new GatewayError(
      "A dataset can contain up to 500 member IDs.",
      400,
    );
  }
  return members;
}

function availableCopyName(sourceName: string, usedNames: Set<string>) {
  const base = `${sourceName} Copy`;
  if (!usedNames.has(base.toLowerCase())) return base;
  for (let index = 2; index <= DATASET_LIMIT; index += 1) {
    const candidate = `${base} ${index}`;
    if (!usedNames.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${Date.now()}`;
}

function databaseError(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return new GatewayError("This value is already in use.", 409);
  }
  return new GatewayError("The dataset could not be saved.", 500);
}

async function isAuthorized(request: Request) {
  const provided = request.headers.get("x-naviwealth-db-key");
  if (!provided) return false;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(provided),
  );
  const received = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (received.length !== GATEWAY_KEY_HASH.length) return false;

  let difference = 0;
  for (let index = 0; index < received.length; index += 1) {
    difference |=
      received.charCodeAt(index) ^ GATEWAY_KEY_HASH.charCodeAt(index);
  }
  return difference === 0;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}
