import { NextResponse } from "next/server";

import { inspectDatabaseState } from "@/lib/bootstrap";
import { getDeploymentEnvironmentStatus } from "@/lib/env";
import { verifyDatabaseConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const environment = getDeploymentEnvironmentStatus();

  let databaseReachable = false;
  let databaseState: Awaited<ReturnType<typeof inspectDatabaseState>> | null = null;
  let errorMessage: string | null = null;

  if (environment.hasDatabaseUrl) {
    try {
      databaseReachable = await verifyDatabaseConnection();
      databaseState = await inspectDatabaseState();
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Unknown database readiness error.";
    }
  } else {
    errorMessage = "DATABASE_URL or POSTGRES_URL is missing.";
  }

  const ok =
    environment.hasDatabaseUrl &&
    databaseReachable &&
    Boolean(databaseState?.matchesConfiguredSchema);

  return NextResponse.json(
    {
      ok,
      environment,
      database: {
        reachable: databaseReachable,
        state: databaseState,
      },
      error: errorMessage,
    },
    {
      status: ok ? 200 : 503,
    },
  );
}
