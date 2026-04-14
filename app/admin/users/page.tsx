import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createUserAction,
  resetUserPasswordAction,
  updateUserAction,
} from "@/app/admin/users/actions";
import { getAdminUsersPageData } from "@/lib/auth/admin-users";
import { getCurrentAuthSession } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FlashMessage = {
  tone: "success" | "error";
  text: string;
};

const flashMessages: Record<string, FlashMessage> = {
  "user-created": { tone: "success", text: "Usuario criado com sucesso." },
  "user-updated": { tone: "success", text: "Usuario atualizado com sucesso." },
  "password-reset": { tone: "success", text: "Senha redefinida com sucesso." },
  INVALID_EMAIL: { tone: "error", text: "Informe um email valido para o login do usuario." },
  INVALID_NAME: { tone: "error", text: "O nome do usuario deve ter entre 1 e 60 caracteres." },
  INVALID_PASSWORD: {
    tone: "error",
    text: "A senha deve ter pelo menos 8 caracteres.",
  },
  ROLE_NOT_FOUND: { tone: "error", text: "A role selecionada nao foi encontrada." },
  LOGIN_IN_USE: { tone: "error", text: "Ja existe um usuario com esse email." },
  USER_NOT_FOUND: { tone: "error", text: "O usuario informado nao foi encontrado." },
  SELF_DEACTIVATE: {
    tone: "error",
    text: "A sessao administrativa atual nao pode se desativar por esta tela.",
  },
  SELF_ROLE_CHANGE: {
    tone: "error",
    text: "A sessao administrativa atual nao pode trocar a propria role por esta tela.",
  },
  LAST_ACTIVE_ADMIN: {
    tone: "error",
    text: "O ultimo admin ativo nao pode ser desativado nem perder acesso administrativo.",
  },
  UNEXPECTED_ERROR: {
    tone: "error",
    text: "Nao foi possivel concluir a operacao agora. Tente novamente.",
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

function formatDateTime(value: Date | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const authSession = await getCurrentAuthSession();

  if (!authSession) {
    redirect("/login");
  }

  if (authSession.roleName !== "adm") {
    return (
      <main className="page-shell page-shell--narrow">
        <section className="notice-panel">
          <p className="notice-panel__eyebrow">Acesso restrito</p>
          <h1 className="notice-panel__title">Somente administradores podem gerenciar usuarios.</h1>
          <p className="notice-panel__copy">
            Sua sessao atual nao possui permissao para criar, editar ou redefinir senhas.
          </p>
          <div className="notice-panel__actions auth-link-row">
            <Link href="/" className="app-button app-button--auto">
              Voltar ao inicio
            </Link>
            <Link href="/logout" className="app-button app-button--auto">
              Encerrar sessao
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const flashMessage = getFlashMessage(resolvedSearchParams);

  try {
    const pageData = await getAdminUsersPageData();

    return (
      <main className="page-shell page-shell--wide">
        <section className="summary-panel">
          <p className="summary-panel__eyebrow">Administracao</p>
          <h1 className="summary-panel__title">Gestao de usuarios</h1>
          <p className="summary-panel__copy">
            Cadastre usuarios, troque roles, ative ou desative acessos e redefina senhas sem sair
            da aplicacao.
          </p>
          <div className="summary-grid admin-summary-grid">
            <div className="summary-card">
              <p className="summary-card__label">Total de usuarios</p>
              <p className="summary-card__value">{pageData.summary.totalUsers}</p>
            </div>
            <div className="summary-card">
              <p className="summary-card__label">Usuarios ativos</p>
              <p className="summary-card__value">{pageData.summary.activeUsers}</p>
            </div>
            <div className="summary-card">
              <p className="summary-card__label">Administradores</p>
              <p className="summary-card__value">{pageData.summary.adminUsers}</p>
            </div>
          </div>
          <div className="admin-summary-actions auth-link-row">
            <Link href="/admin/roles" className="app-button app-button--auto">
              Abrir roles
            </Link>
            <Link href="/" className="app-button app-button--auto">
              Voltar ao inicio
            </Link>
          </div>
        </section>

        {flashMessage ? (
          <section
            className={flashMessage.tone === "success" ? "summary-panel" : "notice-panel"}
          >
            <p className="summary-panel__copy admin-flash-message">{flashMessage.text}</p>
          </section>
        ) : null}

        <section className="admin-users-layout">
          <article className="panel admin-panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Novo usuario</p>
                <h2 className="table-panel__title">Criar acesso</h2>
              </div>
            </div>
            <div className="panel__content">
              <form action={createUserAction} className="admin-form-stack">
                <div className="admin-form-grid">
                  <div className="auth-field">
                    <label htmlFor="login" className="auth-label">
                      Email de login
                    </label>
                    <input
                      id="login"
                      name="login"
                      type="email"
                      className="auth-input"
                      placeholder="novo.usuario@vercel"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="name" className="auth-label">
                      Nome
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="auth-input"
                      placeholder="Nome do usuario"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="roleId" className="auth-label">
                      Role
                    </label>
                    <select id="roleId" name="roleId" className="auth-input" defaultValue="" required>
                      <option value="" disabled>
                        Selecione uma role
                      </option>
                      {pageData.roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="auth-field">
                    <label htmlFor="password" className="auth-label">
                      Senha inicial
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className="auth-input"
                      placeholder="Minimo de 8 caracteres"
                      required
                    />
                  </div>
                </div>
                <div className="admin-actions-row">
                  <button type="submit" className="app-button app-button--auto">
                    Criar usuario
                  </button>
                </div>
              </form>
            </div>
          </article>

          <article className="panel panel--alt admin-panel">
            <div className="panel__header panel__header--alt">
              <div>
                <p className="panel__eyebrow">Usuarios cadastrados</p>
                <h2 className="table-panel__title">Lista de acessos</h2>
              </div>
            </div>
            <div className="panel__content">
              <div className="admin-user-list">
                {pageData.users.map((user) => (
                  <section key={user.id} className="admin-user-card">
                    <div className="admin-user-header">
                      <div>
                        <h3 className="admin-user-title">{user.name}</h3>
                        <p className="admin-user-login">{user.login}</p>
                      </div>
                      <div className="admin-badge-row">
                        <span className="app-badge">{user.roleName}</span>
                        <span
                          className={`admin-status-badge ${
                            user.isActive ? "admin-status-badge--active" : "admin-status-badge--inactive"
                          }`}
                        >
                          {user.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>

                    <div className="admin-meta-grid">
                      <div className="summary-card">
                        <p className="summary-card__label">Ultimo login</p>
                        <p className="summary-card__value admin-meta-value">
                          {formatDateTime(user.lastLoginAt)}
                        </p>
                      </div>
                      <div className="summary-card">
                        <p className="summary-card__label">Atualizado em</p>
                        <p className="summary-card__value admin-meta-value">
                          {formatDateTime(user.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <form action={updateUserAction} className="admin-form-stack admin-form-stack--card">
                      <input type="hidden" name="userId" value={String(user.id)} />
                      <div className="admin-form-grid">
                        <div className="auth-field">
                          <label htmlFor={`name-${user.id}`} className="auth-label">
                            Nome
                          </label>
                          <input
                            id={`name-${user.id}`}
                            name="name"
                            type="text"
                            className="auth-input"
                            defaultValue={user.name}
                            required
                          />
                        </div>
                        <div className="auth-field">
                          <label htmlFor={`role-${user.id}`} className="auth-label">
                            Role
                          </label>
                          <select
                            id={`role-${user.id}`}
                            name="roleId"
                            className="auth-input"
                            defaultValue={String(user.roleId)}
                            required
                          >
                            {pageData.roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="auth-field">
                          <label htmlFor={`status-${user.id}`} className="auth-label">
                            Status
                          </label>
                          <select
                            id={`status-${user.id}`}
                            name="status"
                            className="auth-input"
                            defaultValue={user.isActive ? "active" : "inactive"}
                          >
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                          </select>
                        </div>
                      </div>
                      <div className="admin-actions-row">
                        <button type="submit" className="app-button app-button--auto">
                          Salvar ajustes
                        </button>
                        {authSession.userId === user.id ? (
                          <p className="admin-inline-note">
                            Sua propria sessao nao pode trocar de role nem se desativar aqui.
                          </p>
                        ) : null}
                      </div>
                    </form>

                    <form
                      action={resetUserPasswordAction}
                      className="admin-form-stack admin-form-stack--card"
                    >
                      <input type="hidden" name="userId" value={String(user.id)} />
                      <div className="admin-form-grid admin-form-grid--password">
                        <div className="auth-field">
                          <label htmlFor={`password-${user.id}`} className="auth-label">
                            Nova senha
                          </label>
                          <input
                            id={`password-${user.id}`}
                            name="password"
                            type="password"
                            className="auth-input"
                            placeholder="Minimo de 8 caracteres"
                            required
                          />
                        </div>
                      </div>
                      <div className="admin-actions-row">
                        <button type="submit" className="app-button app-button--auto">
                          Redefinir senha
                        </button>
                      </div>
                    </form>
                  </section>
                ))}

                {!pageData.users.length ? (
                  <div className="warning-panel">
                    Nenhum usuario foi encontrado. Crie o primeiro acesso acima.
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        </section>
      </main>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel carregar a administracao.";

    return (
      <main className="page-shell page-shell--narrow">
        <section className="notice-panel">
          <p className="notice-panel__eyebrow">Administracao indisponivel</p>
          <h1 className="notice-panel__title">A tela de usuarios nao pode ser carregada agora.</h1>
          <p className="notice-panel__copy">{message}</p>
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
}
