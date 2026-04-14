import { redirect } from "next/navigation";

import { AppDataCarousel } from "@/components/app-data-carousel";
import { requireAuthenticatedSession } from "@/lib/auth/session-server";
import { getDatabaseEnvironmentStatus } from "@/lib/db";
import {
  getLandingPageData,
  isLandingPageReady,
  type LandingPageData,
} from "@/lib/landing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatHeaderDate(date: Date) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAccessWarning(params: Record<string, string | string[] | undefined>) {
  if (readSingleSearchParam(params.access) !== "denied") {
    return null;
  }

  return "Sua sessao atual nao possui permissao para a rota solicitada.";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  await requireAuthenticatedSession();

  const environmentStatus = getDatabaseEnvironmentStatus();

  if (!environmentStatus.hasDatabaseUrl) {
    redirect("/db_bootstrap");
  }

  const landingPageReady = await isLandingPageReady();

  if (!landingPageReady) {
    redirect("/db_bootstrap");
  }

  let landingData: LandingPageData;

  try {
    landingData = await getLandingPageData();
  } catch {
    redirect("/db_bootstrap");
  }

  const todayLabel = formatHeaderDate(new Date());
  const resolvedSearchParams = (await searchParams) ?? {};
  const accessWarning = getAccessWarning(resolvedSearchParams);

  return (
    <main className="page-shell page-shell--dashboard">
      <div className="dashboard-shell">
        <section className="hero-panel">
          <div className="hero-panel__layout">
            <div>
              <p className="hero-panel__date">{todayLabel}</p>
              <h1 className="hero-panel__title">{landingData.appName}</h1>
              <p className="hero-panel__copy">
                Painel principal da aplicacao com diagnostico de conexao e
                registros carregados diretamente do banco em tempo real.
              </p>
            </div>
            <div className="hero-panel__badges">
              <div className="app-badge">
                DB version {landingData.dbVersion}
              </div>
            </div>
          </div>
        </section>

        {accessWarning ? <div className="warning-panel dashboard-warning">{accessWarning}</div> : null}

        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Conexao do banco</p>
              </div>
              <div className="app-badge">
                Fonte: {environmentStatus.databaseUrlSource ?? "indisponivel"}
              </div>
            </div>

            {environmentStatus.connectionDetails ? (
              <>
                <div className="panel__content">
                  <div className="card-grid">
                    <div className="info-card">
                      <p className="info-card__label">Protocol</p>
                      <p className="info-card__value">
                        {environmentStatus.connectionDetails.protocol}
                      </p>
                    </div>
                    <div className="info-card">
                      <p className="info-card__label">Host</p>
                      <p className="info-card__value">
                        {environmentStatus.connectionDetails.host}
                      </p>
                    </div>
                    <div className="info-card info-card--compact">
                      <p className="info-card__label">Port</p>
                      <p className="info-card__value">
                        {environmentStatus.connectionDetails.port}
                      </p>
                    </div>
                    <div className="info-card">
                      <p className="info-card__label">Database</p>
                      <p className="info-card__value">
                        {environmentStatus.connectionDetails.database}
                      </p>
                    </div>
                    <div className="info-card">
                      <p className="info-card__label">User</p>
                      <p className="info-card__value">
                        {environmentStatus.connectionDetails.username}
                      </p>
                    </div>
                    <div className="info-card">
                      <p className="info-card__label">Password</p>
                      <p className="info-card__value">
                        {environmentStatus.connectionDetails.passwordMasked}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="panel__content panel__divider">
                  <div className="card-grid">
                    <div className="info-card info-card--success">
                      <p className="info-card__label info-card__label--accent">
                        SSL enabled
                      </p>
                      <p className="info-card__value">
                        {environmentStatus.connectionDetails.sslEnabled ? "Sim" : "Nao"}
                      </p>
                    </div>
                    <div className="info-card">
                      <p className="info-card__label">SSL mode</p>
                      <p className="info-card__value">
                        {environmentStatus.connectionDetails.sslMode ?? "-"}
                      </p>
                    </div>
                    <div className="info-card info-card--wide">
                      <p className="info-card__label">Masked URL</p>
                      <p className="info-card__value info-card__value--wrap">
                        {environmentStatus.connectionDetails.rawUrlMasked}
                      </p>
                    </div>
                  </div>

                  <div className="query-panel">
                    <div className="query-panel__header">
                      <p className="query-panel__eyebrow">Query params</p>
                      <p className="query-panel__meta">
                        {environmentStatus.connectionDetails.queryParams.length} parametros ativos
                      </p>
                    </div>

                    {environmentStatus.connectionDetails.queryParams.length ? (
                      <div className="query-chip-list">
                        {environmentStatus.connectionDetails.queryParams.map((param) => (
                          <div key={param.key} className="query-chip">
                            <span className="query-chip__key">{param.key}</span>: {param.value}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="panel-message">
                        Nenhum query param foi encontrado na connection string ativa.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="panel__content">
                <div className="warning-panel">
                  A connection string do banco nao pode ser interpretada.
                </div>
              </div>
            )}
          </section>

          <section className="panel panel--alt">
            <div className="panel__header panel__header--alt">
              <div>
                <p className="panel__eyebrow">app_data</p>
              </div>
              <div className="app-badge">
                {landingData.items.length} registros
              </div>
            </div>
            <div className="panel__content">
              <AppDataCarousel items={landingData.items} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
