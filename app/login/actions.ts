"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { LoginActionState } from "@/app/login/state";
import { shouldExposeLoginDebug } from "@/lib/auth/config";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/auth/identity";
import { hashPassword } from "@/lib/auth/password";
import {
  createSignedAuthSessionToken,
  getAuthSessionCookieDescriptor,
} from "@/lib/auth/session";
import {
  authenticateUserLogin,
  getLoginPasswordDebugInfo,
} from "@/lib/auth/users";

const INVALID_CREDENTIALS_MESSAGE = "Email ou senha invalidos.";
const AUTH_UNAVAILABLE_MESSAGE = "Autenticacao indisponivel no momento.";

async function buildLoginFailureState(
  errorMessage: string,
  rawEmail: string,
  password: string,
  actionStage: string,
): Promise<LoginActionState> {
  const submittedEmail = normalizeEmailAddress(rawEmail);

  if (!shouldExposeLoginDebug()) {
    return {
      errorMessage,
      submittedEmail,
      debugInfo: null,
    };
  }

  try {
    return {
      errorMessage,
      submittedEmail,
      debugInfo: {
        ...(await getLoginPasswordDebugInfo(submittedEmail, password)),
        actionStage,
      },
    };
  } catch (error) {
    let generatedHash: string | null = null;

    try {
      generatedHash = password ? await hashPassword(password) : null;
    } catch {
      generatedHash = null;
    }

    return {
      errorMessage,
      submittedEmail,
      debugInfo: {
        normalizedLogin: submittedEmail,
        generatedHash,
        userFound: false,
        storedHash: null,
        passwordMatchesStoredHash: false,
        userIsActive: null,
        roleName: null,
        authDecision: "debug-error",
        actionStage,
        debugError: error instanceof Error ? error.message : "Unknown login debug error.",
        notes: [
          "Nao foi possivel consultar o banco para completar o debug desta tentativa.",
          "Se o banco foi recriado, confirme se /db_bootstrap foi executado antes do login.",
        ],
      },
    };
  }
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const rawEmail = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const submittedEmail = normalizeEmailAddress(rawEmail);

  if (!isValidEmailAddress(rawEmail) || !password.trim()) {
    return buildLoginFailureState(INVALID_CREDENTIALS_MESSAGE, rawEmail, password, "input-validation");
  }

  try {
    const authenticatedUser = await authenticateUserLogin(submittedEmail, password);

    if (!authenticatedUser) {
      return buildLoginFailureState(
        INVALID_CREDENTIALS_MESSAGE,
        rawEmail,
        password,
        "authenticateUserLogin-returned-null",
      );
    }

    const token = await createSignedAuthSessionToken(authenticatedUser);
    const cookieDescriptor = getAuthSessionCookieDescriptor(token);
    const cookieStore = await cookies();

    cookieStore.set(cookieDescriptor);
  } catch {
    return buildLoginFailureState(
      AUTH_UNAVAILABLE_MESSAGE,
      rawEmail,
      password,
      "session-setup-error",
    );
  }

  redirect("/");
}
