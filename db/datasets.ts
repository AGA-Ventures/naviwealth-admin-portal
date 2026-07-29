import { getD1 } from "./index";

export const DATASET_LIMIT = 30;

export type DatasetKind = "event" | "stock";
export type DatasetStatus = "draft" | "ready" | "archived";
export type ValidationState = "valid" | "warning";

export type Dataset = {
  id: number;
  name: string;
  kind: DatasetKind;
  description: string;
  status: DatasetStatus;
  memberIds: number[];
  itemCount: number;
  reuseCount: number;
  validationState: ValidationState;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DatasetRow = {
  id: number;
  name: string;
  kind: DatasetKind;
  description: string;
  status: DatasetStatus;
  member_ids: string;
  item_count: number;
  reuse_count: number;
  validation_state: ValidationState;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

type DatasetInput = {
  name: string;
  kind: DatasetKind;
  description?: string;
  status?: DatasetStatus;
  memberIds?: number[];
};

const seedDatasets: DatasetInput[] = [
  {
    name: "Event Set 1 Edited",
    kind: "event",
    description: "Primary balanced event rotation for Side A and Side B.",
    status: "ready",
    memberIds: Array.from({ length: 29 }, (_, index) => index + 1),
  },
  {
    name: "Event Set 2",
    kind: "event",
    description: "A compact opportunity and lifestyle event rotation.",
    status: "ready",
    memberIds: Array.from({ length: 22 }, (_, index) => index + 30),
  },
  {
    name: "Event Set 3",
    kind: "event",
    description: "Advanced cashflow, property, and market scenarios.",
    status: "ready",
    memberIds: Array.from({ length: 25 }, (_, index) => index + 52),
  },
  {
    name: "Event Set 4",
    kind: "event",
    description: "Short-form event rotation for guided workshops.",
    status: "ready",
    memberIds: Array.from({ length: 16 }, (_, index) => index + 76),
  },
  {
    name: "Stock Set 1",
    kind: "stock",
    description: "Starter market with four simulated instruments.",
    status: "ready",
    memberIds: [1, 2, 3, 4],
  },
  {
    name: "Stock Set 2",
    kind: "stock",
    description: "Full eight-instrument simulated market.",
    status: "ready",
    memberIds: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    name: "Stock Set 3",
    kind: "stock",
    description: "Full market package tuned for classroom play.",
    status: "ready",
    memberIds: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    name: "Stock Set 4",
    kind: "stock",
    description: "Full market package reserved for seasonal games.",
    status: "ready",
    memberIds: [1, 2, 3, 4, 5, 6, 7, 8],
  },
];

export class DatasetStoreError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function ensureDatasetSchema() {
  const d1 = getD1();
  await d1.batch([
    d1.prepare(`
      CREATE TABLE IF NOT EXISTS datasets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('event', 'stock')),
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
        member_ids TEXT NOT NULL DEFAULT '[]',
        item_count INTEGER NOT NULL DEFAULT 0,
        reuse_count INTEGER NOT NULL DEFAULT 0,
        validation_state TEXT NOT NULL DEFAULT 'valid' CHECK (validation_state IN ('valid', 'warning')),
        last_used_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    d1.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS datasets_name_unique ON datasets (lower(name))",
    ),
    d1.prepare(
      "CREATE INDEX IF NOT EXISTS datasets_updated_at_idx ON datasets (updated_at DESC)",
    ),
  ]);

  const countRow = await d1
    .prepare("SELECT COUNT(*) AS total FROM datasets")
    .first<{ total: number }>();

  if ((countRow?.total ?? 0) === 0) {
    await d1.batch(
      seedDatasets.map((dataset, index) => {
        const members = sanitizeMemberIds(dataset.memberIds ?? []);
        return d1
          .prepare(
            `INSERT INTO datasets
              (name, kind, description, status, member_ids, item_count, reuse_count, validation_state)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            dataset.name,
            dataset.kind,
            dataset.description ?? "",
            dataset.status ?? "draft",
            JSON.stringify(members),
            members.length,
            Math.max(1, 7 - index),
            dataset.kind === "event" && index === 0 ? "warning" : "valid",
          );
      }),
    );
  }
}

export async function listDatasets() {
  await ensureDatasetSchema();
  const result = await getD1()
    .prepare("SELECT * FROM datasets ORDER BY updated_at DESC, id DESC")
    .all<DatasetRow>();
  return result.results.map(mapDataset);
}

export async function createDataset(input: DatasetInput) {
  await ensureDatasetSchema();
  const d1 = getD1();
  const countRow = await d1
    .prepare("SELECT COUNT(*) AS total FROM datasets")
    .first<{ total: number }>();

  if ((countRow?.total ?? 0) >= DATASET_LIMIT) {
    throw new DatasetStoreError(
      `Dataset capacity reached. This workspace supports up to ${DATASET_LIMIT} datasets.`,
      409,
    );
  }

  const name = cleanName(input.name);
  const kind = parseKind(input.kind);
  const status = parseStatus(input.status ?? "draft");
  const members = sanitizeMemberIds(input.memberIds ?? []);

  try {
    const result = await d1
      .prepare(
        `INSERT INTO datasets
          (name, kind, description, status, member_ids, item_count, validation_state)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
      )
      .bind(
        name,
        kind,
        cleanDescription(input.description),
        status,
        JSON.stringify(members),
        members.length,
        members.length > 0 ? "valid" : "warning",
      )
      .first<DatasetRow>();

    if (!result) {
      throw new DatasetStoreError("The dataset could not be created.", 500);
    }
    return mapDataset(result);
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function updateDataset(id: number, input: Partial<DatasetInput>) {
  await ensureDatasetSchema();
  const current = await findDatasetRow(id);
  const name = input.name === undefined ? current.name : cleanName(input.name);
  const kind = input.kind === undefined ? current.kind : parseKind(input.kind);
  const status =
    input.status === undefined ? current.status : parseStatus(input.status);
  const description =
    input.description === undefined
      ? current.description
      : cleanDescription(input.description);
  const members =
    input.memberIds === undefined
      ? parseMembers(current.member_ids)
      : sanitizeMemberIds(input.memberIds);

  try {
    const result = await getD1()
      .prepare(
        `UPDATE datasets
         SET name = ?, kind = ?, description = ?, status = ?, member_ids = ?,
             item_count = ?, validation_state = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING *`,
      )
      .bind(
        name,
        kind,
        description,
        status,
        JSON.stringify(members),
        members.length,
        members.length > 0 ? "valid" : "warning",
        id,
      )
      .first<DatasetRow>();

    if (!result) {
      throw new DatasetStoreError("Dataset not found.", 404);
    }
    return mapDataset(result);
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function deleteDataset(id: number) {
  await ensureDatasetSchema();
  const result = await getD1()
    .prepare("DELETE FROM datasets WHERE id = ? RETURNING id")
    .bind(id)
    .first<{ id: number }>();

  if (!result) {
    throw new DatasetStoreError("Dataset not found.", 404);
  }
}

export async function duplicateDataset(id: number) {
  await ensureDatasetSchema();
  const source = await findDatasetRow(id);
  const allNames = await getD1()
    .prepare("SELECT name FROM datasets")
    .all<{ name: string }>();
  const name = availableCopyName(
    source.name,
    new Set(allNames.results.map((row) => row.name.toLowerCase())),
  );

  return createDataset({
    name,
    kind: source.kind,
    description: source.description,
    status: "draft",
    memberIds: parseMembers(source.member_ids),
  });
}

export async function reuseDataset(id: number) {
  await ensureDatasetSchema();
  const current = await findDatasetRow(id);
  if (current.item_count === 0) {
    throw new DatasetStoreError(
      "Add at least one member before reusing this dataset in a game.",
      400,
    );
  }

  const result = await getD1()
    .prepare(
      `UPDATE datasets
       SET reuse_count = reuse_count + 1,
           last_used_at = CURRENT_TIMESTAMP,
           status = 'ready',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING *`,
    )
    .bind(id)
    .first<DatasetRow>();

  if (!result) {
    throw new DatasetStoreError("Dataset not found.", 404);
  }
  return mapDataset(result);
}

async function findDatasetRow(id: number) {
  const result = await getD1()
    .prepare("SELECT * FROM datasets WHERE id = ?")
    .bind(id)
    .first<DatasetRow>();

  if (!result) {
    throw new DatasetStoreError("Dataset not found.", 404);
  }
  return result;
}

function mapDataset(row: DatasetRow): Dataset {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    description: row.description,
    status: row.status,
    memberIds: parseMembers(row.member_ids),
    itemCount: row.item_count,
    reuseCount: row.reuse_count,
    validationState: row.validation_state,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) {
    throw new DatasetStoreError("Dataset name is required.", 400);
  }
  if (name.length > 80) {
    throw new DatasetStoreError(
      "Dataset name must be 80 characters or fewer.",
      400,
    );
  }
  return name;
}

function cleanDescription(value: unknown) {
  const description = typeof value === "string" ? value.trim() : "";
  if (description.length > 240) {
    throw new DatasetStoreError(
      "Description must be 240 characters or fewer.",
      400,
    );
  }
  return description;
}

function parseKind(value: unknown): DatasetKind {
  if (value === "event" || value === "stock") return value;
  throw new DatasetStoreError("Dataset type must be event or stock.", 400);
}

function parseStatus(value: unknown): DatasetStatus {
  if (value === "draft" || value === "ready" || value === "archived") {
    return value;
  }
  throw new DatasetStoreError(
    "Dataset status must be draft, ready, or archived.",
    400,
  );
}

function sanitizeMemberIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new DatasetStoreError("Members must be a list of numeric IDs.", 400);
  }

  const members = Array.from(
    new Set(
      value
        .map((member) => Number(member))
        .filter((member) => Number.isInteger(member) && member > 0),
    ),
  );

  if (members.length > 500) {
    throw new DatasetStoreError(
      "A dataset can contain up to 500 member IDs.",
      400,
    );
  }
  return members;
}

function parseMembers(value: string) {
  try {
    return sanitizeMemberIds(JSON.parse(value));
  } catch {
    return [];
  }
}

function mapWriteError(error: unknown) {
  if (error instanceof DatasetStoreError) return error;
  const message = error instanceof Error ? error.message : "";
  if (
    message.toLowerCase().includes("unique") ||
    message.includes("datasets_name_unique")
  ) {
    return new DatasetStoreError(
      "A dataset with this name already exists.",
      409,
    );
  }
  return new DatasetStoreError("The dataset could not be saved.", 500);
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
