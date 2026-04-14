import Link from "next/link";
import { redirect } from "next/navigation";

import { createRoleAction, updateRoleAction } from "@/app/admin/roles/actions";
import { getAdminRolesPageData } from "@/lib/auth/admin-roles";
import { getCurrentAuthSession } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminRolesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FlashMessage = {
  tone: "success" | "error";
  text: string;
};

const flashMessages: Record<string, FlashMessage> = {
  "role-created": { tone: "success", text: "Role criada com sucesso." },
  "role-updated": { tone: "success", text: "Role atualizada com sucesso." },
  INVALID_ROLE_NAME: {
    tone: "error",
    text: "Use um nome em minusculas com ate 20 caracteres, usando letras, numeros, hifens ou underscore.",
  },
  INVALID_PERMISSIONS: {
    tone: "error",
    text: "Selecione apenas permissoes validas do catalogo de rotas protegidas.",
  },
  ROLE_NOT_FOUND: { tone: "error", text: "A role selecionada nao foi encontrada." },
  ROLE_NAME_IN_USE: { tone: "error", text: "Ja existe uma role com esse nome." },
  SYSTEM_ROLE_RENAME: {
    tone: "error",
    text: "As roles de sistema `adm` e `basic` mantem o nome fixo para preservar a governanca.",
  },
  UNEXPECTED_ERROR: {
    tone: "error",
    text: "Nao foi possivel salvar a role agora. Tente novamente.",
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
    return "Ainda nao";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRolePermissionsSummary(permissions: string[]) {
  if (!permissions.length) {
    return "Sem rotas protegidas atribuidas.";
  }

  if (permissions.includes("*")) {
    return "Acesso total a todas as rotas protegidas.";
  }

  return `${permissions.length} permissao(oes) salva(s).`;
}

export default async function AdminRolesPage({ searchParams }: AdminRolesPageProps) {
  const authSession = await getCurrentAuthSession();

  if (!authSession) {
    redirect("/login");
  }

  if (authSession.roleName !== "adm") {
    return (
      <main className="page-shell page-shell--narrow">
        <section className="notice-panel">
          <p className="notice-panel__eyebrow">Acesso restrito</p>
          <h1 className="notice-panel__title">Somente administradores podem gerenciar roles.</h1>
          <p className="notice-panel__copy">
            Sua sessao atual nao possui permissao para ajustar permissoes por rota.
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
    const pageData = await getAdminRolesPageData();

    return (
      <main className="page-shell page-shell--wide">
        <section className="summary-panel">
          <p className="summary-panel__eyebrow">Administracao</p>
          <h1 className="summary-panel__title">Governanca de roles</h1>
          <p className="summary-panel__copy">
            Controle o conjunto de rotas protegidas liberado para cada perfil, preservando as
            garantias minimas das roles de sistema.
          </p>
          <div className="summary-grid admin-summary-grid">
            <div className="summary-card">
              <p className="summary-card__label">Total de roles</p>
              <p className="summary-card__value">{pageData.summary.totalRoles}</p>
            </div>
            <div className="summary-card">
              <p className="summary-card__label">Roles de sistema</p>
              <p className="summary-card__value">{pageData.summary.systemRoles}</p>
            </div>
            <div className="summary-card">
              <p className="summary-card__label">Roles customizadas</p>
              <p className="summary-card__value">{pageData.summary.customRoles}</p>
            </div>
            <div className="summary-card">
              <p className="summary-card__label">Rotas protegidas</p>
              <p className="summary-card__value">{pageData.summary.protectedRoutes}</p>
            </div>
          </div>
          <div className="admin-summary-actions auth-link-row">
            <Link href="/admin/users" className="app-button app-button--auto">
              Abrir usuarios
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
                <p className="panel__eyebrow">Nova role</p>
                <h2 className="table-panel__title">Criar perfil</h2>
              </div>
            </div>
            <div className="panel__content">
              <form action={createRoleAction} className="admin-form-stack">
                <div className="auth-field">
                  <label htmlFor="name" className="auth-label">
                    Nome da role
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="auth-input"
                    placeholder="operacao"
                    required
                  />
                  <p className="admin-inline-note">
                    Use ate 20 caracteres em minusculas, com letras, numeros, hifens ou
                    underscore.
                  </p>
                </div>

                <div className="admin-form-stack">
                  <div>
                    <p className="auth-label">Permissoes por rota</p>
                    <p className="admin-inline-note">
                      Selecione quais rotas protegidas esta role podera acessar.
                    </p>
                  </div>
                  <div className="admin-role-permission-grid">
                    {pageData.permissionCatalog.map((permission) => (
                      <label key={permission.path} className="admin-role-option">
                        <input
                          type="checkbox"
                          name="permissions"
                          value={permission.path}
                          className="admin-role-option__input"
                        />
                        <span className="admin-role-option__body">
                          <span className="admin-role-option__title">{permission.label}</span>
                          <span className="admin-role-option__path">{permission.path}</span>
                          <span className="admin-role-option__copy">
                            {permission.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="admin-actions-row">
                  <button type="submit" className="app-button app-button--auto">
                    Criar role
                  </button>
                </div>
              </form>
            </div>
          </article>

          <article className="panel panel--alt admin-panel">
            <div className="panel__header panel__header--alt">
              <div>
                <p className="panel__eyebrow">Roles cadastradas</p>
                <h2 className="table-panel__title">Catalogo de permissoes</h2>
              </div>
            </div>
            <div className="panel__content">
              <div className="admin-role-list">
                {pageData.roles.map((role) => (
                  <section key={role.id} className="admin-role-card">
                    <div className="admin-user-header">
                      <div>
                        <h3 className="admin-user-title">{role.name}</h3>
                        <p className="admin-user-login">{getRolePermissionsSummary(role.permissions)}</p>
                      </div>
                      <div className="admin-badge-row">
                        <span className="app-badge">
                          {role.isSystem ? "Sistema" : "Customizada"}
                        </span>
                        <span className="app-badge app-badge--success">
                          {role.activeUserCount} ativo(s)
                        </span>
                      </div>
                    </div>

                    <div className="admin-meta-grid">
                      <div className="summary-card">
                        <p className="summary-card__label">Usuarios vinculados</p>
                        <p className="summary-card__value admin-meta-value">{role.userCount}</p>
                      </div>
                      <div className="summary-card">
                        <p className="summary-card__label">Atualizada em</p>
                        <p className="summary-card__value admin-meta-value">
                          {formatDateTime(role.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="admin-role-permission-badges">
                      {role.permissions.length ? (
                        role.permissions.map((permission) => (
                          <span key={permission} className="query-chip">
                            {permission}
                          </span>
                        ))
                      ) : (
                        <p className="admin-inline-note">
                          Esta role nao possui rotas protegidas atribuidas no momento.
                        </p>
                      )}
                    </div>

                    <form action={updateRoleAction} className="admin-form-stack admin-form-stack--card">
                      <input type="hidden" name="roleId" value={String(role.id)} />
                      {role.isSystem ? (
                        <input type="hidden" name="name" value={role.name} />
                      ) : null}

                      <div className="admin-form-grid">
                        <div className="auth-field">
                          <label htmlFor={`role-name-${role.id}`} className="auth-label">
                            Nome
                          </label>
                          <input
                            id={`role-name-${role.id}`}
                            name="name"
                            type="text"
                            className="auth-input"
                            defaultValue={role.name}
                            disabled={role.isSystem}
                            required
                          />
                        </div>
                      </div>

                      {role.name === "adm" ? (
                        <div className="warning-panel">
                          A role `adm` sempre preserva acesso total com `*` e nao pode ser
                          esvaziada nem renomeada por esta tela.
                        </div>
                      ) : (
                        <div className="admin-form-stack">
                          <div>
                            <p className="auth-label">Rotas liberadas</p>
                            <p className="admin-inline-note">
                              {role.name === "basic"
                                ? "A role basic sempre mantera acesso minimo a /, mesmo quando voce ajustar as demais permissoes."
                                : "Marque as rotas protegidas que esta role podera acessar apos o proximo login do usuario."}
                            </p>
                          </div>
                          <div className="admin-role-permission-grid">
                            {pageData.permissionCatalog.map((permission) => {
                              const checked = role.permissions.includes(permission.path);
                              const isLockedBasicHome =
                                role.name === "basic" && permission.path === "/";

                              return (
                                <label
                                  key={`${role.id}-${permission.path}`}
                                  className={`admin-role-option ${
                                    isLockedBasicHome ? "admin-role-option--locked" : ""
                                  }`}
                                >
                                  {isLockedBasicHome ? (
                                    <input type="hidden" name="permissions" value={permission.path} />
                                  ) : null}
                                  <input
                                    type="checkbox"
                                    name="permissions"
                                    value={permission.path}
                                    className="admin-role-option__input"
                                    defaultChecked={checked}
                                    disabled={isLockedBasicHome}
                                  />
                                  <span className="admin-role-option__body">
                                    <span className="admin-role-option__title">{permission.label}</span>
                                    <span className="admin-role-option__path">{permission.path}</span>
                                    <span className="admin-role-option__copy">
                                      {permission.description}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="admin-actions-row">
                        <button type="submit" className="app-button app-button--auto">
                          Salvar role
                        </button>
                        {role.isSystem ? (
                          <p className="admin-inline-note">
                            Roles de sistema mantem regras fixas para garantir `adm` e `basic`.
                          </p>
                        ) : null}
                      </div>
                    </form>
                  </section>
                ))}

                {!pageData.roles.length ? (
                  <div className="warning-panel">
                    Nenhuma role foi encontrada. Execute o bootstrap para recriar as roles de
                    sistema.
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
          <h1 className="notice-panel__title">A tela de roles nao pode ser carregada agora.</h1>
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
