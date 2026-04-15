import Link from "next/link";

import { changePasswordAction } from "@/app/change-password/actions";
import { requireAuthenticatedSession } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChangePasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FlashMessage = {
  tone: "success" | "error";
  text: string;
};

const flashMessages: Record<string, FlashMessage> = {
  "password-updated": { tone: "success", text: "Senha atualizada com sucesso." },
  CURRENT_PASSWORD_INVALID: {
    tone: "error",
    text: "A senha atual informada nao confere.",
  },
  INVALID_PASSWORD: {
    tone: "error",
    text: "A nova senha deve ter pelo menos 8 caracteres.",
  },
  PASSWORD_CONFIRMATION_MISMATCH: {
    tone: "error",
    text: "A confirmacao da nova senha precisa ser igual ao novo valor.",
  },
  USER_NOT_FOUND: {
    tone: "error",
    text: "Nao foi possivel localizar a sessao autenticada para trocar a senha.",
  },
  UNEXPECTED_ERROR: {
    tone: "error",
    text: "Nao foi possivel atualizar a senha agora. Tente novamente.",
  },
};

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getFlashMessage(params: Record<string, string | string[] | undefined>) {
  const status = readSingleSearchParam(params.status);
  const error = readSingleSearchParam(params.error);

  if (error && flashMessages[error]) {
    return flashMessages[error];
  }

  if (status && flashMessages[status]) {
    return flashMessages[status];
  }

  return null;
}

export default async function ChangePasswordPage({ searchParams }: ChangePasswordPageProps) {
  const authSession = await requireAuthenticatedSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const flashMessage = getFlashMessage(resolvedSearchParams);

  return (
    <main className="page-shell page-shell--wide">
      <section className="summary-panel">
        <p className="summary-panel__eyebrow">Seguranca</p>
        <h1 className="summary-panel__title">Trocar senha</h1>
        <p className="summary-panel__copy">
          Atualize a senha da sua propria conta informando a senha atual e confirmando o novo
          valor antes de salvar.
        </p>
        <div className="summary-grid">
          <div className="summary-card">
            <p className="summary-card__label">Sessao atual</p>
            <p className="summary-card__value">{authSession.name}</p>
          </div>
          <div className="summary-card">
            <p className="summary-card__label">Login</p>
            <p className="summary-card__value">{authSession.login}</p>
          </div>
          <div className="summary-card">
            <p className="summary-card__label">Role</p>
            <p className="summary-card__value summary-card__value--capitalize">
              {authSession.roleName}
            </p>
          </div>
        </div>
      </section>

      {flashMessage ? (
        <section className={flashMessage.tone === "success" ? "summary-panel" : "notice-panel"}>
          <p className="summary-panel__copy admin-flash-message">{flashMessage.text}</p>
        </section>
      ) : null}

      <section className="admin-users-layout">
        <article className="panel admin-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Senha pessoal</p>
              <h2 className="table-panel__title">Atualizar credencial</h2>
            </div>
          </div>
          <div className="panel__content">
            <form action={changePasswordAction} className="admin-form-stack">
              <div className="admin-form-grid admin-form-grid--password">
                <div className="auth-field">
                  <label htmlFor="currentPassword" className="auth-label">
                    Senha atual
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    className="auth-input"
                    placeholder="Digite sua senha atual"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="newPassword" className="auth-label">
                    Nova senha
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    className="auth-input"
                    placeholder="Minimo de 8 caracteres"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="confirmPassword" className="auth-label">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="auth-input"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div className="admin-actions-row">
                <button type="submit" className="app-button app-button--auto">
                  Salvar nova senha
                </button>
                <p className="admin-inline-note">
                  A troca afeta apenas a conta autenticada nesta sessao.
                </p>
              </div>
            </form>
          </div>
        </article>
      </section>
    </main>
  );
}
