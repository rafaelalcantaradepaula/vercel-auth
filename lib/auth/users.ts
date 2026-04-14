import "server-only";

import { normalizeEmailAddress } from "@/lib/auth/identity";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { normalizeRoutePermissions } from "@/lib/auth/routes";
import { withDbClient } from "@/lib/db";

export type AuthenticatedUserSessionData = {
  userId: number;
  login: string;
  name: string;
  roleName: string;
  permissions: string[];
};

export type LoginPasswordDebugInfo = {
  normalizedLogin: string;
  generatedHash: string | null;
  userFound: boolean;
  storedHash: string | null;
  passwordMatchesStoredHash: boolean;
  userIsActive: boolean | null;
  roleName: string | null;
  authDecision: "success" | "user-not-found" | "inactive-user" | "password-mismatch" | "debug-error";
  actionStage: string | null;
  debugError: string | null;
  notes: string[];
};

type AuthUserLoginRow = {
  user_id: string;
  login: string;
  name: string;
  password_hash: string;
  is_active: boolean;
  role_name: string;
  permissions: string[] | null;
};

type LoginAttemptResolution = {
  normalizedLogin: string;
  user: AuthUserLoginRow | null;
  passwordMatchesStoredHash: boolean;
  authDecision: "success" | "user-not-found" | "inactive-user" | "password-mismatch";
};

async function resolveLoginAttempt(
  emailAddress: string,
  password: string,
): Promise<LoginAttemptResolution> {
  const normalizedEmail = normalizeEmailAddress(emailAddress);

  return withDbClient(async (client) => {
    const result = await client.query<AuthUserLoginRow>(
      `
        select
          u.id::text as user_id,
          u.login,
          u.name,
          u.password_hash,
          u.is_active,
          r.name as role_name,
          r.permissions
        from auth_users u
        inner join auth_roles r on r.id = u.role_id
        where u.login = $1
        limit 1
      `,
      [normalizedEmail],
    );

    const user = result.rows[0] ?? null;

    if (!user) {
      return {
        normalizedLogin: normalizedEmail,
        user,
        passwordMatchesStoredHash: false,
        authDecision: "user-not-found",
      };
    }

    if (!user.is_active) {
      return {
        normalizedLogin: normalizedEmail,
        user,
        passwordMatchesStoredHash: false,
        authDecision: "inactive-user",
      };
    }

    const passwordMatchesStoredHash = await verifyPassword(password, user.password_hash);

    return {
      normalizedLogin: normalizedEmail,
      user,
      passwordMatchesStoredHash,
      authDecision: passwordMatchesStoredHash ? "success" : "password-mismatch",
    };
  });
}

export async function authenticateUserLogin(
  emailAddress: string,
  password: string,
): Promise<AuthenticatedUserSessionData | null> {
  const loginAttempt = await resolveLoginAttempt(emailAddress, password);
  const user = loginAttempt.user;

  if (loginAttempt.authDecision !== "success" || !user) {
    return null;
  }

  return withDbClient(async (client) => {
    await client.query(
      `
        update auth_users
        set last_login_at = current_timestamp
        where id = $1::bigint
      `,
      [user.user_id],
    );

    const userId = Number.parseInt(user.user_id, 10);

    if (!Number.isFinite(userId)) {
      throw new Error("Authenticated user id is invalid.");
    }

    return {
      userId,
      login: normalizeEmailAddress(user.login),
      name: user.name.trim(),
      roleName: user.role_name.trim(),
      permissions: normalizeRoutePermissions(user.permissions ?? []),
    };
  });
}

export async function getLoginPasswordDebugInfo(
  emailAddress: string,
  password: string,
): Promise<LoginPasswordDebugInfo> {
  const loginAttempt = await resolveLoginAttempt(emailAddress, password);
  const normalizedEmail = loginAttempt.normalizedLogin;
  const generatedHash = password ? await hashPassword(password) : null;
  const user = loginAttempt.user;

  return {
    normalizedLogin: normalizedEmail,
    generatedHash,
    userFound: Boolean(user),
    storedHash: user?.password_hash ?? null,
    passwordMatchesStoredHash: loginAttempt.passwordMatchesStoredHash,
    userIsActive: user?.is_active ?? null,
    roleName: user?.role_name?.trim() ?? null,
    authDecision: loginAttempt.authDecision,
    actionStage: null,
    debugError: null,
    notes: [
      "O hash gerado pela aplicacao usa salt aleatorio no scrypt, entao um hash novo nao fica igual ao hash salvo no banco por comparacao direta.",
      "Para validar a senha, o campo mais importante e 'passwordMatchesStoredHash'.",
    ],
  };
}
