import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentAuthSession } from "@/lib/auth/session-server";
import { getDatabaseEnvironmentStatus } from "@/lib/db";
import { isLandingPageReady } from "@/lib/landing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getLoginBlockers(environmentStatus: ReturnType<typeof getDatabaseEnvironmentStatus>) {
  const blockers: string[] = [];

  if (!environmentStatus.hasDatabaseUrl) {
    blockers.push("Configure DATABASE_URL ou POSTGRES_URL antes de liberar o login.");
  }

  if (!environmentStatus.auth.hasSessionSecret) {
    blockers.push("Defina AUTH_SESSION_SECRET para permitir a emissao de cookies de sessao.");
  } else if (!environmentStatus.auth.sessionSecretMinLengthSatisfied) {
    blockers.push("AUTH_SESSION_SECRET precisa ter pelo menos 32 caracteres.");
  }

  return blockers;
}

export default async function LoginPage() {
  const environmentStatus = getDatabaseEnvironmentStatus();
  const authSession = await getCurrentAuthSession();

  if (authSession) {
    redirect("/");
  }

  const blockers = getLoginBlockers(environmentStatus);
  const databaseReady =
    blockers.length === 0 && environmentStatus.hasDatabaseUrl
      ? await isLandingPageReady()
      : false;

  if (!databaseReady) {
    return (
      <main className="page-shell page-shell--narrow">
        <section className="notice-panel">
          <p className="notice-panel__eyebrow">Login indisponivel</p>
          <h1 className="notice-panel__title">
            A autenticacao precisa de um ambiente pronto antes de aceitar acessos.
          </h1>
          <p className="notice-panel__copy">
            Conclua a configuracao do banco e da sessao de autenticacao para habilitar o login.
          </p>
          <div className="auth-notice-list">
            {blockers.map((blocker) => (
              <p key={blocker} className="auth-notice-item">
                {blocker}
              </p>
            ))}
            {!blockers.length ? (
              <p className="auth-notice-item">
                Execute o bootstrap do banco para aplicar o schema `1.1` e carregar o usuario
                administrativo inicial.
              </p>
            ) : null}
          </div>
          <div className="notice-panel__actions auth-link-row">
            <Link href="/db_bootstrap" className="app-button app-button--auto">
              Abrir DB Bootstrap
            </Link>
            <Link href="/" className="app-button app-button--auto">
              Voltar ao inicio
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell--auth">
      <div className="auth-shell">
        <section className="auth-panel auth-panel--hero">
          <p className="panel__eyebrow">Sprint 4</p>
          <h1 className="auth-title">Entre com seu email para acessar a aplicacao.</h1>
          <p className="auth-copy">
            O login agora usa sessao propria com cookie seguro, roles por rota e validacao no
            banco criado pelo bootstrap `1.1`.
          </p>
          <div className="hero-panel__badges">
            <div className="app-badge">Login por email</div>
            <div className="app-badge app-badge--success">Sessao segura</div>
          </div>
          <div className="auth-stat-grid">
            <div className="summary-card">
              <p className="summary-card__label">Versao do banco</p>
              <p className="summary-card__value">{environmentStatus.dbVersion}</p>
            </div>
            <div className="summary-card">
              <p className="summary-card__label">Cookie</p>
              <p className="summary-card__value">
                {environmentStatus.auth.secureCookies ? "Secure" : "Local"}
              </p>
            </div>
            <div className="summary-card">
              <p className="summary-card__label">Sessao</p>
              <p className="summary-card__value">
                {environmentStatus.auth.sessionTtlHours}h
              </p>
            </div>
          </div>
        </section>

        <section className="auth-panel auth-panel--form">
          <p className="panel__eyebrow">Login</p>
          <h2 className="auth-form-title">Acessar agora</h2>
          <p className="auth-form-copy">
            Use um email cadastrado no banco e a senha associada a esse usuario.
          </p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
