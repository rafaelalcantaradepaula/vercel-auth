"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction } from "@/app/login/actions";
import {
  initialLoginActionState,
  type LoginActionState,
} from "@/app/login/state";

function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="app-button auth-submit-button" disabled={pending}>
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginActionState, FormData>(
    loginAction,
    initialLoginActionState,
  );

  return (
    <form action={formAction} className="auth-form">
      <div className="auth-field">
        <label htmlFor="email" className="auth-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className="auth-input"
          placeholder="adm@vercel"
          defaultValue={state.submittedEmail}
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password" className="auth-label">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="auth-input"
          placeholder="Digite sua senha"
          required
        />
      </div>

      {state.errorMessage ? (
        <div className="warning-panel auth-feedback" role="alert">
          {state.errorMessage}
        </div>
      ) : null}

      {state.debugInfo ? (
        <section className="panel auth-debug-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Debug</p>
              <h3 className="table-panel__title">Diagnostico da senha enviada</h3>
            </div>
          </div>
          <div className="panel__content auth-debug-content">
            <div className="auth-debug-grid">
              <div className="summary-card">
                <p className="summary-card__label">Login normalizado</p>
                <p className="summary-card__value auth-debug-value">
                  {state.debugInfo.normalizedLogin || "-"}
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-card__label">Usuario encontrado</p>
                <p className="summary-card__value auth-debug-value">
                  {state.debugInfo.userFound ? "Sim" : "Nao"}
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-card__label">Senha confere com BD</p>
                <p className="summary-card__value auth-debug-value">
                  {state.debugInfo.passwordMatchesStoredHash ? "Sim" : "Nao"}
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-card__label">Usuario ativo</p>
                <p className="summary-card__value auth-debug-value">
                  {state.debugInfo.userIsActive === null
                    ? "-"
                    : state.debugInfo.userIsActive
                      ? "Sim"
                      : "Nao"}
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-card__label">Role encontrada</p>
                <p className="summary-card__value auth-debug-value">
                  {state.debugInfo.roleName ?? "-"}
                </p>
              </div>
            </div>

            <div className="auth-debug-block">
              <p className="auth-label">Hash gerado nesta tentativa</p>
              <pre className="auth-debug-code">{state.debugInfo.generatedHash ?? "(vazio)"}</pre>
            </div>

            <div className="auth-debug-block">
              <p className="auth-label">Hash atualmente salvo no banco</p>
              <pre className="auth-debug-code">{state.debugInfo.storedHash ?? "(usuario nao encontrado)"}</pre>
            </div>

            <div className="auth-debug-notes">
              {state.debugInfo.notes.map((note) => (
                <p key={note} className="panel-message auth-debug-note">
                  {note}
                </p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="auth-actions">
        <LoginSubmitButton />
      </div>
    </form>
  );
}
