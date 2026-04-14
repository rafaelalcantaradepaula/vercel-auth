import { NextResponse } from "next/server";

import { inspectDatabaseState } from "@/lib/bootstrap";
import { hasRoutePermission } from "@/lib/auth/routes";
import { getCurrentAuthSession } from "@/lib/auth/session-server";
import { getDeploymentEnvironmentStatus } from "@/lib/env";
import { verifyDatabaseConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const authSession = await getCurrentAuthSession();

  if (!authSession) {
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication is required for this route.",
      },
      {
        status: 401,
      },
    );
  }

  if (!hasRoutePermission("/api/health", authSession.permissions)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Your session does not have permission for this route.",
      },
      {
        status: 403,
      },
    );
  }

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
