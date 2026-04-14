import "server-only";

import type { PoolClient } from "pg";

import { hashPassword } from "@/lib/auth/password";
import { appConfig } from "@/lib/app-config";
import { withDbClient } from "@/lib/db";

const ADMIN_ROLE_NAME = "adm";
const BASIC_ROLE_NAME = "basic";
const DEFAULT_ADMIN_LOGIN = "adm@vercel";
const DEFAULT_ADMIN_NAME = "Administrador";
const DEFAULT_ADMIN_PASSWORD = "galo1908#";

export type AppMetaRow = {
  prop: string;
  string_value: string | null;
  double_value: number | null;
  int_value: number | null;
};

export type AppDataRow = {
  small_str: string;
  large_str: string | null;
  num: number | null;
  dt: Date | null;
};

export type DatabaseSnapshot = {
  appMeta: AppMetaRow[];
  appData: AppDataRow[];
};

export type DatabaseState = {
  hasAppMetaTable: boolean;
  hasAppDataTable: boolean;
  hasAuthRolesTable: boolean;
  hasAuthUsersTable: boolean;
  currentDbVersion: string | null;
  matchesDbVersion: boolean;
  matchesConfiguredSchema: boolean;
};

export type BootstrapResult = {
  action: "seeded" | "updated" | "unchanged";
  state: DatabaseState;
  snapshot: DatabaseSnapshot;
};

function normalizeText(value: string | null) {
  return value?.trim() ?? null;
}

function getVersionNumberValues(version: string) {
  const versionAsNumber = Number.parseFloat(version);
  const versionAsInt = Number.parseInt(version, 10);

  return {
    versionAsNumber: Number.isFinite(versionAsNumber) ? versionAsNumber : null,
    versionAsInt: Number.isFinite(versionAsInt) ? versionAsInt : null,
  };
}

async function tableExists(client: PoolClient, tableName: string) {
  const result = await client.query<{ exists: boolean }>(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public' and table_name = $1
      ) as exists
    `,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function getCurrentDbVersion(client: PoolClient) {
  const result = await client.query<{ string_value: string | null }>(
    `
      select string_value
      from app_meta
      where prop = 'db_version'
      limit 1
    `,
  );

  return normalizeText(result.rows[0]?.string_value ?? null);
}

function requiresAuthSchema(dbVersion: string) {
  switch (dbVersion) {
    case "1.0":
      return false;
    case "1.1":
      return true;
    default:
      throw new Error(`Unsupported database schema version: ${dbVersion}.`);
  }
}

export async function inspectDatabaseState(): Promise<DatabaseState> {
  return withDbClient(async (client) => {
    const hasAppMetaTable = await tableExists(client, "app_meta");
    const hasAppDataTable = await tableExists(client, "app_data");
    const hasAuthRolesTable = await tableExists(client, "auth_roles");
    const hasAuthUsersTable = await tableExists(client, "auth_users");

    if (!hasAppMetaTable) {
      return {
        hasAppMetaTable,
        hasAppDataTable,
        hasAuthRolesTable,
        hasAuthUsersTable,
        currentDbVersion: null,
        matchesDbVersion: false,
        matchesConfiguredSchema: false,
      };
    }

    const currentDbVersion = await getCurrentDbVersion(client);
    const hasRequiredAuthSchema =
      !requiresAuthSchema(appConfig.dbVersion) ||
      (hasAuthRolesTable && hasAuthUsersTable);
    const matchesDbVersion = currentDbVersion === appConfig.dbVersion;

    return {
      hasAppMetaTable,
      hasAppDataTable,
      hasAuthRolesTable,
      hasAuthUsersTable,
      currentDbVersion,
      matchesDbVersion,
      matchesConfiguredSchema:
        hasAppMetaTable && hasAppDataTable && hasRequiredAuthSchema && matchesDbVersion,
    };
  });
}

async function recreateSchema(client: PoolClient) {
  await client.query("drop table if exists auth_users");
  await client.query("drop table if exists auth_roles");
  await client.query("drop table if exists app_data");
  await client.query("drop table if exists app_meta");

  await client.query(`
    create table app_meta (
      prop char(20) primary key,
      string_value char(100),
      double_value real,
      int_value int
    )
  `);

  await client.query(`
    create table app_data (
      small_str char(20) primary key,
      large_str char(256),
      num real,
      dt timestamp
    )
  `);

  await ensureSchemaForVersion(client, appConfig.dbVersion);
}

async function seedInitialData(client: PoolClient) {
  const { versionAsInt, versionAsNumber } = getVersionNumberValues(appConfig.dbVersion);

  await client.query(
    `
      insert into app_meta (prop, string_value, double_value, int_value)
      values
        ('db_version', $1, $2, $3),
        ('app_name', $4, null, null)
    `,
    [
      appConfig.dbVersion,
      versionAsNumber,
      versionAsInt,
      appConfig.appName,
    ],
  );

  await client.query(`
    insert into app_data (small_str, large_str, num, dt)
    values
      ('hoje', 'dia de hoje', 10, current_timestamp),
      ('ontem', '24 horas atras', -10, current_timestamp - interval '1 day'),
      ('antes', 'uma hora atras', -1, current_timestamp - interval '1 hour'),
      ('Prox semana', 'Proxima semana', 20, current_timestamp + interval '7 day')
  `);

  await ensureSeedDataForVersion(client, appConfig.dbVersion);
}

export async function updateDb(client: PoolClient, currentDbVersion: string | null) {
  if (currentDbVersion === appConfig.dbVersion) {
    await ensureSchemaForVersion(client, currentDbVersion);
    await ensureSeedDataForVersion(client, currentDbVersion);
    return false;
  }

  if (currentDbVersion !== "1.0" || appConfig.dbVersion !== "1.1") {
    throw new Error(
      `Unsupported database migration path: ${currentDbVersion ?? "unknown"} -> ${appConfig.dbVersion}.`,
    );
  }

  await ensureSchemaForVersion(client, "1.1");
  await ensureSeedDataForVersion(client, "1.1");
  await updateStoredDbVersion(client, "1.1");

  return true;
}

async function ensureSchemaForVersion(client: PoolClient, dbVersion: string) {
  switch (dbVersion) {
    case "1.0":
      return;
    case "1.1":
      await createAuthSchema(client);
      return;
    default:
      throw new Error(`Unsupported database schema version: ${dbVersion}.`);
  }
}

async function ensureSeedDataForVersion(client: PoolClient, dbVersion: string) {
  switch (dbVersion) {
    case "1.0":
      return;
    case "1.1":
      await seedAuthData(client);
      return;
    default:
      throw new Error(`Unsupported database seed version: ${dbVersion}.`);
  }
}

async function createAuthSchema(client: PoolClient) {
  await client.query(`
    create table if not exists auth_roles (
      id bigserial primary key,
      name varchar(20) not null unique,
      permissions text[] not null default '{}'::text[],
      is_system boolean not null default false,
      created_at timestamp not null default current_timestamp,
      updated_at timestamp not null default current_timestamp
    )
  `);

  await client.query(`
    create table if not exists auth_users (
      id bigserial primary key,
      login varchar(120) not null unique,
      name varchar(60) not null,
      role_id bigint not null references auth_roles(id) on update restrict on delete restrict,
      password_hash text not null,
      is_active boolean not null default true,
      last_login_at timestamp null,
      created_at timestamp not null default current_timestamp,
      updated_at timestamp not null default current_timestamp,
      constraint auth_users_login_lowercase check (login = lower(login))
    )
  `);

  await client.query(`
    create index if not exists auth_users_role_id_idx
    on auth_users (role_id)
  `);
}

async function seedAuthData(client: PoolClient) {
  await upsertAuthRole(client, ADMIN_ROLE_NAME, ["*"], true);
  await upsertAuthRole(client, BASIC_ROLE_NAME, ["/"], true);

  const adminRoleResult = await client.query<{ id: number }>(
    `
      select id
      from auth_roles
      where name = $1
      limit 1
    `,
    [ADMIN_ROLE_NAME],
  );

  const adminRoleId = adminRoleResult.rows[0]?.id;

  if (!adminRoleId) {
    throw new Error("Default admin role could not be resolved.");
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

  await client.query(
    `
      insert into auth_users (login, name, role_id, password_hash, is_active)
      values ($1, $2, $3, $4, true)
      on conflict (login) do nothing
    `,
    [DEFAULT_ADMIN_LOGIN, DEFAULT_ADMIN_NAME, adminRoleId, passwordHash],
  );
}

async function upsertAuthRole(
  client: PoolClient,
  roleName: string,
  permissions: string[],
  isSystem: boolean,
) {
  await client.query(
    `
      insert into auth_roles (name, permissions, is_system)
      values ($1, $2::text[], $3)
      on conflict (name)
      do update
      set permissions = excluded.permissions,
          is_system = excluded.is_system,
          updated_at = current_timestamp
    `,
    [roleName, permissions, isSystem],
  );
}

async function updateStoredDbVersion(client: PoolClient, dbVersion: string) {
  const { versionAsInt, versionAsNumber } = getVersionNumberValues(dbVersion);

  await client.query(
    `
      insert into app_meta (prop, string_value, double_value, int_value)
      values ('db_version', $1, $2, $3)
      on conflict (prop)
      do update
      set string_value = excluded.string_value,
          double_value = excluded.double_value,
          int_value = excluded.int_value
    `,
    [dbVersion, versionAsNumber, versionAsInt],
  );
}

async function fetchSnapshot(client: PoolClient): Promise<DatabaseSnapshot> {
  const [appMetaResult, appDataResult] = await Promise.all([
    client.query<AppMetaRow>(`
      select prop, string_value, double_value, int_value
      from app_meta
      order by prop
    `),
    client.query<AppDataRow>(`
      select small_str, large_str, num, dt
      from app_data
      order by dt asc, small_str asc
    `),
  ]);

  return {
    appMeta: appMetaResult.rows.map((row) => ({
      ...row,
      prop: row.prop.trim(),
      string_value: normalizeText(row.string_value),
    })),
    appData: appDataResult.rows.map((row) => ({
      ...row,
      small_str: row.small_str.trim(),
      large_str: normalizeText(row.large_str),
    })),
  };
}

export async function bootstrapDatabase(): Promise<BootstrapResult> {
  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      const hasAppMetaTable = await tableExists(client, "app_meta");
      const hasAppDataTable = await tableExists(client, "app_data");

      let action: BootstrapResult["action"] = "unchanged";
      let currentDbVersion: string | null = null;

      if (!hasAppMetaTable || !hasAppDataTable) {
        await recreateSchema(client);
        await seedInitialData(client);
        action = "seeded";
      } else {
        currentDbVersion = await getCurrentDbVersion(client);

        if (!currentDbVersion) {
          await recreateSchema(client);
          await seedInitialData(client);
          action = "seeded";
        } else if (currentDbVersion !== appConfig.dbVersion) {
          const wasUpdated = await updateDb(client, currentDbVersion);
          action = wasUpdated ? "updated" : "unchanged";
        } else {
          await ensureSchemaForVersion(client, currentDbVersion);
          await ensureSeedDataForVersion(client, currentDbVersion);
        }
      }

      currentDbVersion = await getCurrentDbVersion(client);
      const snapshot = await fetchSnapshot(client);

      await client.query("commit");

      return {
        action,
        state: {
          hasAppMetaTable: true,
          hasAppDataTable: true,
          hasAuthRolesTable: appConfig.dbVersion === "1.1",
          hasAuthUsersTable: appConfig.dbVersion === "1.1",
          currentDbVersion,
          matchesDbVersion: currentDbVersion === appConfig.dbVersion,
          matchesConfiguredSchema: currentDbVersion === appConfig.dbVersion,
        },
        snapshot,
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}
