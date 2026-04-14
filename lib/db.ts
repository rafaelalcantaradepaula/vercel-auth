import "server-only";

import { Pool, type PoolClient, type PoolConfig } from "pg";

import { getDatabaseUrl, getDeploymentEnvironmentStatus } from "@/lib/env";

let pool: Pool | undefined;

export function getDatabaseEnvironmentStatus() {
  return getDeploymentEnvironmentStatus();
}

function getPoolConfig(): PoolConfig {
  const database = getDatabaseUrl();
  const connectionString = database.value;

  if (!connectionString) {
    throw new Error(
      "A database connection string is not configured. Add DATABASE_URL or POSTGRES_URL to your Vercel project or local environment.",
    );
  }

  return {
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  };
}

export function getDbPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig());
  }

  return pool;
}

export async function withDbClient<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getDbPool().connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function verifyDatabaseConnection() {
  return withDbClient(async (client) => {
    await client.query("select 1");
    return true;
  });
}
