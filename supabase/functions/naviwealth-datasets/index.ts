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
type CountryCode = "MY" | "CN";
type CurrencyCode = "MYR" | "CNY";
type LocalizationState = "localized" | "needs_review";
type DatasetInput = {
  name?: unknown;
  kind?: unknown;
  description?: unknown;
  status?: unknown;
  memberIds?: unknown;
  countryCode?: unknown;
  localizationState?: unknown;
};

type AdminUserRole = "superadmin" | "admin" | "facilitator" | "viewer";
type AdminUserStatus = "active" | "invited" | "suspended";
type AdminUserInput = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  status?: unknown;
  password?: unknown;
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
type StockPriceUpdateInput = {
  updates?: unknown;
};
type EventRecordInput = {
  data?: unknown;
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
  country_code: CountryCode;
  currency_code: CurrencyCode;
  dataset_family_id: string;
  localization_state: LocalizationState;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminUserRow = {
  id: number;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminActor = {
  id: number;
  authUserId: string;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
};

type AdminAuditLogRow = {
  id: number;
  actor_admin_user_id: number | null;
  actor_auth_user_id: string | null;
  actor_name: string;
  actor_email: string;
  actor_role: AdminUserRole;
  action: string;
  resource_type: string;
  resource_id: string | null;
  summary: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
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

type StockInstrumentRow = {
  id: number;
  symbol: string;
  display_name: string;
  asset_class: string;
  scenario: string;
  source_name: string;
};

type StockPricePointRow = {
  period: number;
  price: number | string;
  updated_at: string;
};

type EventRecordRow = {
  id: number;
  dataset_id: number;
  row_number: number;
  source_file: string;
  data: Record<string, string>;
  created_at: string;
  updated_at: string;
};

type RequestBody = {
  operation?: unknown;
  id?: unknown;
  actorUserId?: unknown;
  accessToken?: unknown;
  refreshToken?: unknown;
  email?: unknown;
  password?: unknown;
  input?:
    | DatasetInput
    | AdminUserInput
    | GameSettingsInput
    | StockPriceUpdateInput
    | EventRecordInput;
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

    const operation = operationName(body.operation);
    if (operation === "loginAdmin") {
      return json({
        session: await loginAdmin(client, body.email, body.password),
      });
    }
    if (operation === "refreshAdminSession") {
      return json({
        session: await refreshAdminSession(client, body.refreshToken),
      });
    }
    if (operation === "getAdminSession") {
      return json({
        user: await getAdminSession(client, body.accessToken),
      });
    }

    const actor = await requireAdminActor(client, body.actorUserId);
    assertOperationPermission(actor, operation);

    switch (operation) {
      case "list":
        return json({ datasets: await listDatasets(client) });
      case "get":
        return json({
          dataset: mapDataset(await findDataset(client, id(body.id))),
        });
      case "create": {
        const dataset = mapDataset(
          await createDataset(client, (body.input ?? {}) as DatasetInput),
        );
        await writeAudit(client, actor, {
          action: "dataset.create",
          resourceType: "dataset",
          resourceId: String(dataset.id),
          summary: `Created ${dataset.kind} dataset “${dataset.name}”.`,
          afterData: dataset,
        });
        return json({ dataset }, 201);
      }
      case "update": {
        const datasetId = id(body.id);
        const before = mapDataset(await findDataset(client, datasetId));
        const dataset = mapDataset(
          await updateDataset(
            client,
            datasetId,
            (body.input ?? {}) as DatasetInput,
          ),
        );
        await writeAudit(client, actor, {
          action: "dataset.update",
          resourceType: "dataset",
          resourceId: String(dataset.id),
          summary: `Updated dataset “${dataset.name}”.`,
          beforeData: before,
          afterData: dataset,
        });
        return json({ dataset });
      }
      case "delete": {
        const datasetId = id(body.id);
        const before = mapDataset(await findDataset(client, datasetId));
        await deleteDataset(client, datasetId);
        await writeAudit(client, actor, {
          action: "dataset.delete",
          resourceType: "dataset",
          resourceId: String(datasetId),
          summary: `Deleted dataset “${before.name}”.`,
          beforeData: before,
        });
        return json({ deleted: true });
      }
      case "duplicate": {
        const sourceId = id(body.id);
        const dataset = mapDataset(await duplicateDataset(client, sourceId));
        await writeAudit(client, actor, {
          action: "dataset.duplicate",
          resourceType: "dataset",
          resourceId: String(dataset.id),
          summary: `Duplicated dataset #${sourceId} as “${dataset.name}”.`,
          afterData: dataset,
          metadata: { sourceDatasetId: sourceId },
        });
        return json({ dataset }, 201);
      }
      case "reuse": {
        const datasetId = id(body.id);
        const before = mapDataset(await findDataset(client, datasetId));
        const dataset = mapDataset(await reuseDataset(client, datasetId));
        await writeAudit(client, actor, {
          action: "dataset.reuse",
          resourceType: "dataset",
          resourceId: String(dataset.id),
          summary: `Prepared dataset “${dataset.name}” for reuse.`,
          beforeData: before,
          afterData: dataset,
        });
        return json({ dataset });
      }
      case "createCountryVariant": {
        const sourceId = id(body.id);
        const dataset = mapDataset(
          await createCountryVariant(
            client,
            sourceId,
            parseCountryCode(
              ((body.input ?? {}) as DatasetInput).countryCode,
            ),
          ),
        );
        await writeAudit(client, actor, {
          action: "dataset.country_variant.create",
          resourceType: "dataset",
          resourceId: String(dataset.id),
          summary: `Created ${dataset.countryCode} variant “${dataset.name}”.`,
          afterData: dataset,
          metadata: { sourceDatasetId: sourceId },
        });
        return json({ dataset }, 201);
      }
      case "listAdminUsers":
        return json({ users: await listAdminUsers(client) });
      case "createAdminUser": {
        const user = mapAdminUser(
          await createAdminUser(
            client,
            (body.input ?? {}) as AdminUserInput,
          ),
        );
        await writeAudit(client, actor, {
          action: "admin_user.create",
          resourceType: "admin_user",
          resourceId: String(user.id),
          summary: `Created ${user.role} account for ${user.email}.`,
          afterData: user,
        });
        return json({ user }, 201);
      }
      case "updateAdminUser": {
        const userId = id(body.id);
        const before = mapAdminUser(await findAdminUser(client, userId));
        const user = mapAdminUser(
          await updateAdminUser(
            client,
            actor,
            userId,
            (body.input ?? {}) as AdminUserInput,
          ),
        );
        await writeAudit(client, actor, {
          action: "admin_user.update",
          resourceType: "admin_user",
          resourceId: String(user.id),
          summary: `Updated access for ${user.email}.`,
          beforeData: before,
          afterData: user,
        });
        return json({ user });
      }
      case "listAuditLogs":
        return json({ logs: await listAuditLogs(client) });
      case "getGameSettings":
        return json({
          settings: mapGameSettings(await getGameSettings(client)),
        });
      case "updateGameSettings": {
        const before = mapGameSettings(await getGameSettings(client));
        const settings = mapGameSettings(
          await updateGameSettings(client, {
            ...((body.input ?? {}) as GameSettingsInput),
            updatedBy: actor.email,
          }),
        );
        await writeAudit(client, actor, {
          action: "game_settings.update",
          resourceType: "game_settings",
          resourceId: "1",
          summary: "Updated shared game settings.",
          beforeData: before,
          afterData: settings,
        });
        return json({ settings });
      }
      case "getStockPriceSeries":
        return json({
          series: await getStockPriceSeries(client, stockId(body.id)),
        });
      case "updateStockPrices": {
        const instrumentId = stockId(body.id);
        const input = (body.input ?? {}) as StockPriceUpdateInput;
        const series = await updateStockPrices(client, instrumentId, input);
        await writeAudit(client, actor, {
          action: "stock_prices.update",
          resourceType: "stock_instrument",
          resourceId: String(instrumentId),
          summary: `Updated ${Array.isArray(input.updates) ? input.updates.length : 0} price points for ${series.symbol}.`,
          metadata: {
            updatedPeriods: Array.isArray(input.updates)
              ? input.updates
                  .slice(0, 360)
                  .map((update) =>
                    typeof update === "object" && update
                      ? Number((update as { period?: unknown }).period)
                      : null,
                  )
                  .filter((period) => Number.isInteger(period))
              : [],
          },
        });
        return json({ series });
      }
      case "listEventRecords":
        return json({
          records: await listEventRecords(client, id(body.id)),
        });
      case "updateEventRecord": {
        const result = await updateEventRecord(
          client,
          eventRecordId(body.id),
          (body.input ?? {}) as EventRecordInput,
        );
        await writeAudit(client, actor, {
          action: "event_record.update",
          resourceType: "event_record",
          resourceId: String(result.record.id),
          summary: `Updated event row ${result.record.rowNumber}.`,
          beforeData: result.beforeData,
          afterData: result.afterData,
          metadata: { datasetId: result.record.datasetId },
        });
        return json({ record: result.record });
      }
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

async function loginAdmin(
  client: SupabaseClient,
  emailValue: unknown,
  passwordValue: unknown,
) {
  const email = cleanEmail(emailValue);
  const password = cleanPassword(passwordValue);
  const candidate = await findAdminUserByEmail(client, email);
  if (!candidate || candidate.status !== "active") {
    throw new GatewayError("Invalid email or password.", 401);
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user || !data.session) {
    throw new GatewayError("Invalid email or password.", 401);
  }

  let row = candidate;
  if (!row.auth_user_id) {
    const { data: linked, error: linkError } = await client
      .from("admin_users")
      .update({ auth_user_id: data.user.id })
      .eq("id", row.id)
      .is("auth_user_id", null)
      .select("*")
      .single();
    if (linkError) throw databaseError(linkError);
    row = linked as AdminUserRow;
  }
  if (row.auth_user_id !== data.user.id) {
    throw new GatewayError("Invalid email or password.", 401);
  }

  row = await markAdminActive(client, row.id);
  return mapAuthSession(data.session, row);
}

async function refreshAdminSession(
  client: SupabaseClient,
  refreshTokenValue: unknown,
) {
  const refreshToken = requiredToken(refreshTokenValue, "refresh");
  const { data, error } = await client.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.user || !data.session) {
    throw new GatewayError("Your session has expired. Sign in again.", 401);
  }
  const row = await findActiveAdminByAuthId(client, data.user.id);
  return mapAuthSession(data.session, row);
}

async function getAdminSession(
  client: SupabaseClient,
  accessTokenValue: unknown,
) {
  const accessToken = requiredToken(accessTokenValue, "access");
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new GatewayError("Sign in is required.", 401);
  }
  return mapAdminSessionUser(
    await findActiveAdminByAuthId(client, data.user.id),
  );
}

async function findAdminUserByEmail(
  client: SupabaseClient,
  email: string,
) {
  const { data, error } = await client
    .from("admin_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw databaseError(error);
  return data ? (data as AdminUserRow) : null;
}

async function findActiveAdminByAuthId(
  client: SupabaseClient,
  authUserId: string,
) {
  const { data, error } = await client
    .from("admin_users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!data || data.status !== "active") {
    throw new GatewayError("This administrator account is not active.", 403);
  }
  return data as AdminUserRow;
}

async function markAdminActive(client: SupabaseClient, userId: number) {
  const { data, error } = await client
    .from("admin_users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw databaseError(error);
  return data as AdminUserRow;
}

async function requireAdminActor(
  client: SupabaseClient,
  authUserIdValue: unknown,
): Promise<AdminActor> {
  const authUserId = cleanUuid(authUserIdValue);
  const row = await findActiveAdminByAuthId(client, authUserId);
  return {
    id: row.id,
    authUserId,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
  };
}

function assertOperationPermission(actor: AdminActor, operation: string) {
  const superadminOnly = new Set([
    "listAdminUsers",
    "createAdminUser",
    "updateAdminUser",
    "listAuditLogs",
  ]);
  const adminWrite = new Set([
    "create",
    "update",
    "delete",
    "duplicate",
    "createCountryVariant",
    "updateGameSettings",
    "updateStockPrices",
    "updateEventRecord",
  ]);
  const facilitatorWrite = new Set(["reuse"]);

  if (superadminOnly.has(operation) && actor.role !== "superadmin") {
    throw new GatewayError("Superadmin access is required.", 403);
  }
  if (
    adminWrite.has(operation) &&
    actor.role !== "superadmin" &&
    actor.role !== "admin"
  ) {
    throw new GatewayError("Administrator edit access is required.", 403);
  }
  if (
    facilitatorWrite.has(operation) &&
    actor.role !== "superadmin" &&
    actor.role !== "admin" &&
    actor.role !== "facilitator"
  ) {
    throw new GatewayError("Facilitator access is required.", 403);
  }
}

function mapAuthSession(
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in: number;
  },
  row: AdminUserRow,
) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt:
      session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
    user: mapAdminSessionUser(row),
  };
}

function mapAdminSessionUser(row: AdminUserRow) {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    permissions: permissionsForRole(row.role),
  };
}

function permissionsForRole(role: AdminUserRole) {
  if (role === "superadmin") {
    return [
      "portal.view",
      "simulation.run",
      "datasets.reuse",
      "datasets.edit",
      "settings.edit",
      "users.manage",
      "audit.view",
    ];
  }
  if (role === "admin") {
    return [
      "portal.view",
      "simulation.run",
      "datasets.reuse",
      "datasets.edit",
      "settings.edit",
    ];
  }
  if (role === "facilitator") {
    return ["portal.view", "simulation.run", "datasets.reuse"];
  }
  return ["portal.view"];
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
  const countryCode = parseCountryCode(input.countryCode ?? "MY");
  const { data, error } = await client
    .from("datasets")
    .insert({
      name: cleanName(input.name),
      kind: parseKind(input.kind),
      description: cleanDescription(input.description),
      status: parseStatus(input.status ?? "draft"),
      member_ids: members,
      validation_state: members.length > 0 ? "valid" : "warning",
      country_code: countryCode,
      currency_code: currencyForCountry(countryCode),
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
  const localizationState =
    input.localizationState === undefined
      ? current.localization_state
      : parseLocalizationState(input.localizationState);
  const status =
    input.status === undefined ? current.status : parseStatus(input.status);
  if (localizationState === "needs_review" && status === "ready") {
    throw new GatewayError(
      "Complete country localization before marking this dataset ready.",
      409,
    );
  }

  const { data, error } = await client
    .from("datasets")
    .update({
      name: input.name === undefined ? current.name : cleanName(input.name),
      kind: input.kind === undefined ? current.kind : parseKind(input.kind),
      description:
        input.description === undefined
          ? current.description
          : cleanDescription(input.description),
      status,
      member_ids: members,
      localization_state: localizationState,
      validation_state:
        members.length > 0 && localizationState === "localized"
          ? "valid"
          : "warning",
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
  const { data: rows, error } = await client
    .from("datasets")
    .select("name")
    .eq("kind", source.kind)
    .eq("country_code", source.country_code);
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
      country_code: source.country_code,
      currency_code: source.currency_code,
      localization_state: source.localization_state,
    })
    .select("*")
    .single();
  if (insertError) throw databaseError(insertError);
  return data as DatasetRow;
}

async function createCountryVariant(
  client: SupabaseClient,
  datasetId: number,
  countryCode: CountryCode,
) {
  await assertCapacity(client);
  const source = await findDataset(client, datasetId);
  if (source.kind !== "event") {
    throw new GatewayError(
      "Country variants are currently available only for event datasets.",
      400,
    );
  }

  const { data, error } = await client.rpc("create_event_country_variant", {
    source_dataset_id: datasetId,
    target_country_code: countryCode,
  });
  if (error) throw databaseError(error);
  return findDataset(client, Number(data));
}

async function reuseDataset(client: SupabaseClient, datasetId: number) {
  const current = await findDataset(client, datasetId);
  if (current.localization_state === "needs_review") {
    throw new GatewayError(
      "Complete the country localization review before using this dataset.",
      409,
    );
  }
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
  const name = cleanAdminUserName(input.name);
  const email = cleanEmail(input.email);
  const password = cleanPassword(input.password);
  const role = parseAdminUserRole(input.role ?? "facilitator");
  const existing = await findAdminUserByEmail(client, email);
  if (existing?.auth_user_id) {
    throw new GatewayError("This administrator already has a login.", 409);
  }

  const { data: authData, error: authError } =
    await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
  if (authError || !authData.user) {
    throw new GatewayError(
      authError?.message ?? "The administrator login could not be created.",
      authError?.status ?? 500,
    );
  }

  const save = existing
    ? client
        .from("admin_users")
        .update({
          auth_user_id: authData.user.id,
          name,
          role,
          status: "active",
        })
        .eq("id", existing.id)
    : client.from("admin_users").insert({
        auth_user_id: authData.user.id,
        name,
        email,
        role,
        status: "active",
      });
  const { data, error } = await save.select("*").single();
  if (error) {
    await client.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
    throw databaseError(error);
  }
  return data as AdminUserRow;
}

async function updateAdminUser(
  client: SupabaseClient,
  actor: AdminActor,
  userId: number,
  input: AdminUserInput,
) {
  const current = await findAdminUser(client, userId);
  const nextRole =
    input.role === undefined
      ? current.role
      : parseAdminUserRole(input.role);
  const nextStatus =
    input.status === undefined
      ? current.status
      : parseAdminUserStatus(input.status);
  if (
    current.id === actor.id &&
    (nextRole !== "superadmin" || nextStatus !== "active")
  ) {
    throw new GatewayError(
      "You cannot remove your own superadmin access.",
      409,
    );
  }
  if (
    current.role === "superadmin" &&
    current.status === "active" &&
    (nextRole !== "superadmin" || nextStatus !== "active")
  ) {
    const { count, error: countError } = await client
      .from("admin_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "superadmin")
      .eq("status", "active");
    if (countError) throw databaseError(countError);
    if ((count ?? 0) <= 1) {
      throw new GatewayError(
        "Keep at least one active superadmin account.",
        409,
      );
    }
  }
  if (
    input.email !== undefined &&
    cleanEmail(input.email) !== current.email
  ) {
    throw new GatewayError(
      "Change login emails from Supabase Auth before updating this directory.",
      409,
    );
  }
  const { data, error } = await client
    .from("admin_users")
    .update({
      name:
        input.name === undefined
          ? current.name
          : cleanAdminUserName(input.name),
      email:
        input.email === undefined ? current.email : cleanEmail(input.email),
      role: nextRole,
      status: nextStatus,
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw databaseError(error);
  return data as AdminUserRow;
}

async function listAuditLogs(client: SupabaseClient) {
  const { data, error } = await client
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw databaseError(error);
  return ((data ?? []) as AdminAuditLogRow[]).map(mapAuditLog);
}

type AuditInput = {
  action: string;
  resourceType: string;
  resourceId?: string;
  summary: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

async function writeAudit(
  client: SupabaseClient,
  actor: AdminActor,
  input: AuditInput,
) {
  const { error } = await client.from("admin_audit_logs").insert({
    actor_admin_user_id: actor.id,
    actor_auth_user_id: actor.authUserId,
    actor_name: actor.name,
    actor_email: actor.email,
    actor_role: actor.role,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    summary: input.summary,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    console.error("Audit log insert failed", error);
    throw new GatewayError(
      "The change was saved, but its audit entry could not be recorded.",
      500,
    );
  }
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

async function getStockPriceSeries(
  client: SupabaseClient,
  instrumentId: number,
) {
  const [{ data: instrument, error: instrumentError }, { data, error }] =
    await Promise.all([
      client
        .from("stock_instruments")
        .select("*")
        .eq("id", instrumentId)
        .maybeSingle(),
      client
        .from("stock_price_points")
        .select("period, price, updated_at")
        .eq("stock_id", instrumentId)
        .order("period", { ascending: true }),
    ]);

  if (instrumentError) throw databaseError(instrumentError);
  if (!instrument) throw new GatewayError("Stock instrument not found.", 404);
  if (error) throw databaseError(error);

  const points = (data ?? []) as StockPricePointRow[];
  if (points.length !== 360) {
    throw new GatewayError(
      "This stock sequence does not contain all 360 price points.",
      409,
    );
  }

  return mapStockPriceSeries(
    instrument as StockInstrumentRow,
    points,
  );
}

async function updateStockPrices(
  client: SupabaseClient,
  instrumentId: number,
  input: StockPriceUpdateInput,
) {
  const updates = sanitizeStockPriceUpdates(input.updates);
  const { error } = await client.from("stock_price_points").upsert(
    updates.map((update) => ({
      stock_id: instrumentId,
      period: update.period,
      price: update.price,
    })),
    { onConflict: "stock_id,period" },
  );
  if (error) throw databaseError(error);
  return getStockPriceSeries(client, instrumentId);
}

async function listEventRecords(
  client: SupabaseClient,
  datasetId: number,
) {
  const dataset = await findDataset(client, datasetId);
  if (dataset.kind !== "event") {
    throw new GatewayError("This package is not an event dataset.", 400);
  }

  const { data, error } = await client
    .from("event_records")
    .select("*")
    .eq("dataset_id", datasetId)
    .order("row_number", { ascending: true });
  if (error) throw databaseError(error);
  return ((data ?? []) as EventRecordRow[]).map(mapEventRecord);
}

async function findEventRecord(
  client: SupabaseClient,
  recordId: number,
) {
  const { data, error } = await client
    .from("event_records")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!data) throw new GatewayError("Event record not found.", 404);
  return data as EventRecordRow;
}

async function updateEventRecord(
  client: SupabaseClient,
  recordId: number,
  input: EventRecordInput,
) {
  const current = await findEventRecord(client, recordId);
  const eventData = sanitizeEventRecordData(input.data, current.data);
  const { data, error } = await client
    .from("event_records")
    .update({ data: eventData })
    .eq("id", recordId)
    .select("*")
    .single();
  if (error) throw databaseError(error);
  const beforeData: Record<string, string> = {};
  const afterData: Record<string, string> = {};
  for (const key of Object.keys(eventData)) {
    if (current.data[key] !== eventData[key]) {
      beforeData[key] = current.data[key] ?? "";
      afterData[key] = eventData[key];
    }
  }
  return {
    record: mapEventRecord(data as EventRecordRow),
    beforeData,
    afterData,
  };
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
    countryCode: row.country_code,
    currencyCode: row.currency_code,
    datasetFamilyId: row.dataset_family_id,
    localizationState: row.localization_state,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEventRecord(row: EventRecordRow) {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    rowNumber: row.row_number,
    sourceFile: row.source_file,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminUser(row: AdminUserRow) {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAuditLog(row: AdminAuditLogRow) {
  return {
    id: row.id,
    actorAdminUserId: row.actor_admin_user_id,
    actorAuthUserId: row.actor_auth_user_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    summary: row.summary,
    beforeData: row.before_data,
    afterData: row.after_data,
    metadata: row.metadata,
    createdAt: row.created_at,
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

function mapStockPriceSeries(
  instrument: StockInstrumentRow,
  points: StockPricePointRow[],
) {
  return {
    stockId: instrument.id,
    symbol: instrument.symbol,
    displayName: instrument.display_name,
    assetClass: instrument.asset_class,
    scenario: instrument.scenario,
    sourceName: instrument.source_name,
    points: points.map((point) => ({
      period: point.period,
      price: Number(point.price),
      updatedAt: point.updated_at,
    })),
  };
}

function id(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new GatewayError("Invalid dataset ID.", 400);
  }
  return parsed;
}

function stockId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    throw new GatewayError("Invalid stock ID.", 400);
  }
  return parsed;
}

function eventRecordId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new GatewayError("Invalid event record ID.", 400);
  }
  return parsed;
}

function sanitizeEventRecordData(
  value: unknown,
  current: Record<string, string>,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GatewayError("Event details must be a field-value object.", 400);
  }

  const candidate = value as Record<string, unknown>;
  const expectedKeys = Object.keys(current).sort();
  const receivedKeys = Object.keys(candidate).sort();
  if (
    expectedKeys.length === 0 ||
    expectedKeys.length > 60 ||
    expectedKeys.length !== receivedKeys.length ||
    expectedKeys.some((key, index) => key !== receivedKeys[index])
  ) {
    throw new GatewayError(
      "Event fields must match the imported source record.",
      400,
    );
  }

  const sanitized: Record<string, string> = {};
  for (const key of expectedKeys) {
    const fieldValue = candidate[key];
    if (typeof fieldValue !== "string") {
      throw new GatewayError(`Event field "${key}" must be text.`, 400);
    }
    if (fieldValue.length > 20_000) {
      throw new GatewayError(
        `Event field "${key}" is too long to save.`,
        400,
      );
    }
    sanitized[key] = fieldValue;
  }

  if (new TextEncoder().encode(JSON.stringify(sanitized)).length > 150_000) {
    throw new GatewayError("This event record is too large to save.", 400);
  }
  return sanitized;
}

function sanitizeStockPriceUpdates(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 360) {
    throw new GatewayError(
      "Provide between 1 and 360 stock price updates.",
      400,
    );
  }

  const periods = new Set<number>();
  return value.map((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      throw new GatewayError("Each stock price update is invalid.", 400);
    }
    const update = candidate as { period?: unknown; price?: unknown };
    const period = Number(update.period);
    const price = Number(update.price);
    if (!Number.isInteger(period) || period < 1 || period > 360) {
      throw new GatewayError(
        "Stock price periods must be between 1 and 360.",
        400,
      );
    }
    if (!Number.isFinite(price) || price < 0 || price > 999_999_999_999) {
      throw new GatewayError(
        "Stock prices must be valid positive numbers.",
        400,
      );
    }
    if (periods.has(period)) {
      throw new GatewayError("Stock price periods must be unique.", 400);
    }
    periods.add(period);
    return { period, price: Math.round(price * 100) / 100 };
  });
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
    value === "superadmin" ||
    value === "admin" ||
    value === "facilitator" ||
    value === "viewer"
  ) {
    return value;
  }
  throw new GatewayError("Select a valid user role.", 400);
}

function cleanPassword(value: unknown) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 12 || password.length > 128) {
    throw new GatewayError(
      "Passwords must contain between 12 and 128 characters.",
      400,
    );
  }
  return password;
}

function requiredToken(value: unknown, label: string) {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token || token.length > 10_000) {
    throw new GatewayError(`A valid ${label} token is required.`, 401);
  }
  return token;
}

function cleanUuid(value: unknown) {
  const uuid = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      uuid,
    )
  ) {
    throw new GatewayError("A valid administrator identity is required.", 401);
  }
  return uuid;
}

function operationName(value: unknown) {
  const operation = typeof value === "string" ? value.trim() : "";
  if (!operation || operation.length > 80) {
    throw new GatewayError("A valid gateway operation is required.", 400);
  }
  return operation;
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

function parseCountryCode(value: unknown): CountryCode {
  if (value === "MY" || value === "CN") return value;
  throw new GatewayError("Country code must be MY or CN.", 400);
}

function currencyForCountry(countryCode: CountryCode): CurrencyCode {
  return countryCode === "MY" ? "MYR" : "CNY";
}

function parseLocalizationState(value: unknown): LocalizationState {
  if (value === "localized" || value === "needs_review") return value;
  throw new GatewayError("Select a valid localization state.", 400);
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
  if (error.message?.includes("already has a variant")) {
    return new GatewayError(
      "This dataset family already has a variant for that country.",
      409,
    );
  }
  if (error.message?.includes("Choose a different country")) {
    return new GatewayError("Choose a different country.", 400);
  }
  if (error.code === "P0002") {
    return new GatewayError("Dataset not found.", 404);
  }
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
