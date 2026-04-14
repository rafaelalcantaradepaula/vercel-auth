import "server-only";

import { getAuthEnvironmentStatus, type AuthEnvironmentStatus } from "@/lib/auth/config";
import { appConfig } from "@/lib/app-config";

export type DatabaseConnectionQueryParam = {
  key: string;
  value: string;
};

export type DatabaseConnectionDetails = {
  source: "DATABASE_URL" | "POSTGRES_URL";
  protocol: string;
  host: string;
  port: string;
  database: string;
  username: string;
  passwordMasked: string;
  passwordPresent: boolean;
  sslEnabled: boolean;
  sslMode: string | null;
  queryParams: DatabaseConnectionQueryParam[];
  rawUrlMasked: string;
};

export type DeploymentEnvironmentStatus = {
  appName: string;
  dbVersion: string;
  hasDatabaseUrl: boolean;
  databaseUrlSource: "DATABASE_URL" | "POSTGRES_URL" | null;
  hasExplicitAppName: boolean;
  hasExplicitDbVersion: boolean;
  auth: AuthEnvironmentStatus;
  connectionDetails: DatabaseConnectionDetails | null;
};

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return {
      value: databaseUrl,
      source: "DATABASE_URL" as const,
    };
  }

  const postgresUrl = process.env.POSTGRES_URL?.trim();

  if (postgresUrl) {
    return {
      value: postgresUrl,
      source: "POSTGRES_URL" as const,
    };
  }

  return {
    value: null,
    source: null,
  };
}

export function getDeploymentEnvironmentStatus(): DeploymentEnvironmentStatus {
  const database = getDatabaseUrl();

  return {
    appName: appConfig.appName,
    dbVersion: appConfig.dbVersion,
    hasDatabaseUrl: Boolean(database.value),
    databaseUrlSource: database.source,
    hasExplicitAppName: Boolean(process.env.APP_NAME?.trim()),
    hasExplicitDbVersion: Boolean(process.env.DB_VERSION?.trim()),
    auth: getAuthEnvironmentStatus(),
    connectionDetails: getDatabaseConnectionDetails(),
  };
}

function maskSecret(value: string) {
  if (!value) {
    return "";
  }

  return "*".repeat(Math.max(value.length, 8));
}

export function getDatabaseConnectionDetails(): DatabaseConnectionDetails | null {
  const database = getDatabaseUrl();

  if (!database.value || !database.source) {
    return null;
  }

  try {
    const parsed = new URL(database.value);
    const passwordMasked = parsed.password ? maskSecret(parsed.password) : "";
    const queryParams = Array.from(parsed.searchParams.entries()).map(([key, value]) => ({
      key,
      value,
    }));
    const sslMode = parsed.searchParams.get("sslmode");
    const rawUrlMasked = `${parsed.protocol}//${parsed.username}${
      parsed.password ? `:${passwordMasked}` : ""
    }@${parsed.host}${parsed.pathname}${parsed.search}`;

    return {
      source: database.source,
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      port: parsed.port || "5432",
      database: parsed.pathname.replace(/^\//, "") || "-",
      username: parsed.username || "-",
      passwordMasked: passwordMasked || "-",
      passwordPresent: Boolean(parsed.password),
      sslEnabled: Boolean(sslMode) || parsed.searchParams.has("ssl"),
      sslMode,
      queryParams,
      rawUrlMasked,
    };
  } catch {
    return null;
  }
}
