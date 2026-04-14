import "server-only";

import type { PoolClient } from "pg";

import {
  DEFAULT_ADMIN_LOGIN,
  DEFAULT_ADMIN_PASSWORD,
  LEGACY_DEFAULT_ADMIN_PASSWORD,
} from "@/lib/auth/default-admin";
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

type AuthUserLoginRow = {
  user_id: string;
  login: string;
  name: string;
  password_hash: string;
  is_active: boolean;
  role_name: string;
  permissions: string[] | null;
};

async function upgradeLegacyDefaultAdminPasswordIfNeeded(
  client: PoolClient,
  user: AuthUserLoginRow,
  attemptedPassword: string,
) {
  if (
    normalizeEmailAddress(user.login) !== DEFAULT_ADMIN_LOGIN ||
    attemptedPassword !== DEFAULT_ADMIN_PASSWORD
  ) {
    return false;
  }

  const usesLegacyDefaultPassword = await verifyPassword(
    LEGACY_DEFAULT_ADMIN_PASSWORD,
    user.password_hash,
  );

  if (!usesLegacyDefaultPassword) {
    return false;
  }

  const updatedPasswordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

  await client.query(
    `
      update auth_users
      set password_hash = $2,
          updated_at = current_timestamp
      where id = $1::bigint
    `,
    [user.user_id, updatedPasswordHash],
  );

  return true;
}

export async function authenticateUserLogin(
  emailAddress: string,
  password: string,
): Promise<AuthenticatedUserSessionData | null> {
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

    const user = result.rows[0];

    if (!user?.is_active) {
      return null;
    }

    let passwordMatches = await verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
      passwordMatches = await upgradeLegacyDefaultAdminPasswordIfNeeded(client, user, password);
    }

    if (!passwordMatches) {
      return null;
    }

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
