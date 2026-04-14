import "server-only";

import type { PoolClient } from "pg";

import { appConfig } from "@/lib/app-config";
import { withDbClient } from "@/lib/db";

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
  currentDbVersion: string | null;
  matchesDbVersion: boolean;
};

export type BootstrapResult = {
  action: "seeded" | "updated" | "unchanged";
  state: DatabaseState;
  snapshot: DatabaseSnapshot;
};

function normalizeText(value: string | null) {
  return value?.trim() ?? null;
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

export async function inspectDatabaseState(): Promise<DatabaseState> {
  return withDbClient(async (client) => {
    const hasAppMetaTable = await tableExists(client, "app_meta");
    const hasAppDataTable = await tableExists(client, "app_data");

    if (!hasAppMetaTable) {
      return {
        hasAppMetaTable,
        hasAppDataTable,
        currentDbVersion: null,
        matchesDbVersion: false,
      };
    }

    const currentDbVersion = await getCurrentDbVersion(client);

    return {
      hasAppMetaTable,
      hasAppDataTable,
      currentDbVersion,
      matchesDbVersion: currentDbVersion === appConfig.dbVersion,
    };
  });
}

async function recreateSchema(client: PoolClient) {
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
}

async function seedInitialData(client: PoolClient) {
  const dbVersionAsNumber = Number.parseFloat(appConfig.dbVersion);
  const dbVersionAsInt = Number.parseInt(appConfig.dbVersion, 10);

  await client.query(
    `
      insert into app_meta (prop, string_value, double_value, int_value)
      values
        ('db_version', $1, $2, $3),
        ('app_name', $4, null, null)
    `,
    [
      appConfig.dbVersion,
      Number.isFinite(dbVersionAsNumber) ? dbVersionAsNumber : null,
      Number.isFinite(dbVersionAsInt) ? dbVersionAsInt : null,
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
}

export async function updateDb(client: PoolClient, currentDbVersion: string | null) {
  void client;
  void currentDbVersion;
  return false;
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
        currentDbVersion = appConfig.dbVersion;
      } else {
        currentDbVersion = await getCurrentDbVersion(client);

        if (!currentDbVersion) {
          await recreateSchema(client);
          await seedInitialData(client);
          action = "seeded";
          currentDbVersion = appConfig.dbVersion;
        } else if (currentDbVersion !== appConfig.dbVersion) {
          const wasUpdated = await updateDb(client, currentDbVersion);
          action = wasUpdated ? "updated" : "unchanged";
        }
      }

      const snapshot = await fetchSnapshot(client);

      await client.query("commit");

      return {
        action,
        state: {
          hasAppMetaTable: true,
          hasAppDataTable: true,
          currentDbVersion,
          matchesDbVersion: currentDbVersion === appConfig.dbVersion,
        },
        snapshot,
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}
