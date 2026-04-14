import "server-only";

import { withDbClient } from "@/lib/db";
import { type AppDataRow, inspectDatabaseState } from "@/lib/bootstrap";

export type LandingPageData = {
  appName: string;
  dbVersion: string;
  items: AppDataRow[];
};

type AppMetaLookupRow = {
  prop: string;
  string_value: string | null;
};

function normalizeText(value: string | null) {
  return value?.trim() ?? "";
}

export async function isLandingPageReady() {
  try {
    const state = await inspectDatabaseState();
    return state.matchesConfiguredSchema;
  } catch {
    return false;
  }
}

export async function getLandingPageData(): Promise<LandingPageData> {
  return withDbClient(async (client) => {
    const [metaResult, itemsResult] = await Promise.all([
      client.query<AppMetaLookupRow>(`
        select prop, string_value
        from app_meta
        where prop in ('app_name', 'db_version')
      `),
      client.query<AppDataRow>(`
        select small_str, large_str, num, dt
        from app_data
        order by dt asc, small_str asc
      `),
    ]);

    const metaMap = new Map(
      metaResult.rows.map((row) => [row.prop.trim(), normalizeText(row.string_value)]),
    );

    return {
      appName: metaMap.get("app_name") || "Unknown app",
      dbVersion: metaMap.get("db_version") || "Unknown version",
      items: itemsResult.rows.map((row) => ({
        ...row,
        small_str: row.small_str.trim(),
        large_str: row.large_str?.trim() ?? null,
      })),
    };
  });
}
