"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  initialLoginActionState,
  loginAction,
  type LoginActionState,
} from "@/app/login/actions";

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

      <div className="auth-actions">
        <LoginSubmitButton />
      </div>
    </form>
  );
}
