import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAuthSession } from "@/lib/auth/session-server";
import { appConfig } from "@/lib/app-config";
import { bootstrapDatabase, inspectDatabaseState } from "@/lib/bootstrap";
import { getDatabaseEnvironmentStatus } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function shouldRequireAdminForBootstrap(
  state: Awaited<ReturnType<typeof inspectDatabaseState>> | null,
) {
  // Once auth is fully provisioned, bootstrap becomes an admin-only maintenance screen.
  return Boolean(state?.matchesConfiguredSchema);
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function DbBootstrapPage() {
  const environmentStatus = getDatabaseEnvironmentStatus();
  const authSession = await getCurrentAuthSession();
  let databaseState: Awaited<ReturnType<typeof inspectDatabaseState>> | null = null;

  if (environmentStatus.hasDatabaseUrl) {
    try {
      databaseState = await inspectDatabaseState();
    } catch {
      databaseState = null;
    }
  }

  if (shouldRequireAdminForBootstrap(databaseState) && !authSession) {
    redirect("/login");
  }

  if (shouldRequireAdminForBootstrap(databaseState) && authSession?.roleName !== "adm") {
    redirect("/?access=denied");
  }

  if (!environmentStatus.hasDatabaseUrl) {
    return (
      <main className="page-shell page-shell--narrow">
        <section className="notice-panel">
          <p className="notice-panel__eyebrow">Bootstrap unavailable</p>
          <h1 className="notice-panel__title">
            DATABASE_URL is required before Phase 2 can run.
          </h1>
          <p className="notice-panel__copy">
            Add the database connection string in Vercel or in your local
            environment to enable schema creation, seed loading, and the
            bootstrap grid view.
          </p>
          <div className="notice-panel__actions">
            <Link href="/" className="app-button app-button--auto">
              Back to home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  try {
    const result = await bootstrapDatabase();

    return (
      <main className="page-shell page-shell--wide">
        <section className="summary-panel">
          <p className="summary-panel__eyebrow">Phase 2 bootstrap</p>
          <h1 className="summary-panel__title">Database bootstrap completed</h1>
          <p className="summary-panel__copy">
            The bootstrap flow has inspected the schema for {appConfig.appName},
            applied the required initialization logic, and loaded the current
            database contents below.
          </p>
          <dl className="summary-grid">
            <div className="summary-card">
              <dt className="summary-card__label">Action</dt>
              <dd className="summary-card__value summary-card__value--capitalize">
                {result.action}
              </dd>
            </div>
            <div className="summary-card">
              <dt className="summary-card__label">Stored version</dt>
              <dd className="summary-card__value">{result.state.currentDbVersion ?? "not set"}</dd>
            </div>
            <div className="summary-card">
              <dt className="summary-card__label">Version status</dt>
              <dd className="summary-card__value">
                {result.state.matchesDbVersion ? "Aligned" : "Pending update"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="table-grid">
          <article className="table-panel">
            <div className="table-panel__header">
              <h2 className="table-panel__title">app_meta</h2>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>prop</th>
                    <th>string_value</th>
                    <th>double_value</th>
                    <th>int_value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.snapshot.appMeta.map((row) => (
                    <tr key={row.prop}>
                      <td className="data-table__cell--primary">{row.prop.trim()}</td>
                      <td>{row.string_value?.trim() || "-"}</td>
                      <td>{row.double_value ?? "-"}</td>
                      <td>{row.int_value ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="table-panel table-panel--alt">
            <div className="table-panel__header">
              <h2 className="table-panel__title">app_data</h2>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>small_str</th>
                    <th>large_str</th>
                    <th>num</th>
                    <th>dt</th>
                  </tr>
                </thead>
                <tbody>
                  {result.snapshot.appData.map((row) => (
                    <tr key={row.small_str + String(row.dt)}>
                      <td className="data-table__cell--primary">{row.small_str.trim()}</td>
                      <td>{row.large_str?.trim() || "-"}</td>
                      <td>{row.num ?? "-"}</td>
                      <td>{formatDateTime(row.dt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown bootstrap error.";

    return (
      <main className="page-shell page-shell--narrow">
        <section className="notice-panel">
          <p className="notice-panel__eyebrow">Bootstrap failed</p>
          <h1 className="notice-panel__title">
            The database bootstrap could not finish.
          </h1>
          <p className="notice-panel__copy">{message}</p>
          <div className="notice-panel__actions">
            <Link href="/" className="app-button app-button--auto">
              Back to home
            </Link>
          </div>
        </section>
      </main>
    );
  }
}
