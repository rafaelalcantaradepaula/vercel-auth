import "server-only";

import type { PoolClient } from "pg";

import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/auth/identity";
import { hashPassword } from "@/lib/auth/password";
import { withDbClient } from "@/lib/db";

const ADMIN_ROLE_NAME = "adm";

export type AdminUserRoleOption = {
  id: number;
  name: string;
  permissions: string[];
  userCount: number;
};

export type AdminUserRecord = {
  id: number;
  login: string;
  name: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type AdminUsersPageData = {
  roles: AdminUserRoleOption[];
  users: AdminUserRecord[];
  summary: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
  };
};

export type AdminUsersErrorCode =
  | "INVALID_EMAIL"
  | "INVALID_NAME"
  | "INVALID_PASSWORD"
  | "ROLE_NOT_FOUND"
  | "LOGIN_IN_USE"
  | "USER_NOT_FOUND"
  | "SELF_DEACTIVATE"
  | "SELF_ROLE_CHANGE"
  | "LAST_ACTIVE_ADMIN";

export class AdminUsersError extends Error {
  code: AdminUsersErrorCode;

  constructor(code: AdminUsersErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type AdminRoleRow = {
  id: string;
  name: string;
  permissions: string[] | null;
  user_count: number;
};

type AdminUserRow = {
  id: string;
  login: string;
  name: string;
  role_id: string;
  role_name: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
};

type RoleLookupRow = {
  id: string;
  name: string;
};

type UserLookupRow = {
  id: string;
  login: string;
  role_name: string;
  is_active: boolean;
};

function parseNumericId(value: string, label: string) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${label} is invalid.`);
  }

  return parsedValue;
}

function normalizeUserName(value: string) {
  return value.trim();
}

function validateNameOrThrow(value: string) {
  const normalizedValue = normalizeUserName(value);

  if (!normalizedValue || normalizedValue.length > 60) {
    throw new AdminUsersError(
      "INVALID_NAME",
      "User name must have between 1 and 60 characters.",
    );
  }

  return normalizedValue;
}

function validatePasswordOrThrow(value: string) {
  if (value.length < 8) {
    throw new AdminUsersError(
      "INVALID_PASSWORD",
      "Password must have at least 8 characters.",
    );
  }

  return value;
}

function validateEmailOrThrow(value: string) {
  if (!isValidEmailAddress(value)) {
    throw new AdminUsersError("INVALID_EMAIL", "User login must be a valid email address.");
  }

  return normalizeEmailAddress(value);
}

async function getRoleByIdOrThrow(client: PoolClient, roleId: number) {
  const result = await client.query<RoleLookupRow>(
    `
      select id::text as id, name
      from auth_roles
      where id = $1::bigint
      limit 1
    `,
    [roleId],
  );

  const role = result.rows[0];

  if (!role) {
    throw new AdminUsersError("ROLE_NOT_FOUND", "Selected role does not exist.");
  }

  return {
    id: parseNumericId(role.id, "role id"),
    name: role.name.trim(),
  };
}

async function getUserByIdOrThrow(client: PoolClient, userId: number) {
  const result = await client.query<UserLookupRow>(
    `
      select
        u.id::text as id,
        u.login,
        r.name as role_name,
        u.is_active
      from auth_users u
      inner join auth_roles r on r.id = u.role_id
      where u.id = $1::bigint
      limit 1
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AdminUsersError("USER_NOT_FOUND", "Target user was not found.");
  }

  return {
    id: parseNumericId(user.id, "user id"),
    login: normalizeEmailAddress(user.login),
    roleName: user.role_name.trim(),
    isActive: user.is_active,
  };
}

async function countActiveAdminUsers(client: PoolClient) {
  const result = await client.query<{ active_admin_count: number }>(
    `
      select count(*)::int as active_admin_count
      from auth_users u
      inner join auth_roles r on r.id = u.role_id
      where u.is_active = true
        and r.name = $1
    `,
    [ADMIN_ROLE_NAME],
  );

  return result.rows[0]?.active_admin_count ?? 0;
}

async function guardLastActiveAdmin(
  client: PoolClient,
  currentRoleName: string,
  currentIsActive: boolean,
  nextRoleName: string,
  nextIsActive: boolean,
) {
  const isRemovingAdminAccess =
    currentRoleName === ADMIN_ROLE_NAME &&
    currentIsActive &&
    (!nextIsActive || nextRoleName !== ADMIN_ROLE_NAME);

  if (!isRemovingAdminAccess) {
    return;
  }

  const activeAdminCount = await countActiveAdminUsers(client);

  if (activeAdminCount <= 1) {
    throw new AdminUsersError(
      "LAST_ACTIVE_ADMIN",
      "The last active admin cannot be deactivated or reassigned.",
    );
  }
}

function handlePgError(error: unknown): never {
  const code = typeof error === "object" && error ? Reflect.get(error, "code") : undefined;

  if (code === "23505") {
    throw new AdminUsersError("LOGIN_IN_USE", "User login is already in use.");
  }

  throw error;
}

export async function getAdminUsersPageData(): Promise<AdminUsersPageData> {
  return withDbClient(async (client) => {
    const [rolesResult, usersResult] = await Promise.all([
      client.query<AdminRoleRow>(`
        select
          r.id::text as id,
          r.name,
          r.permissions,
          count(u.id)::int as user_count
        from auth_roles r
        left join auth_users u on u.role_id = r.id
        group by r.id, r.name, r.permissions
        order by case when r.name = 'adm' then 0 else 1 end, lower(r.name)
      `),
      client.query<AdminUserRow>(`
        select
          u.id::text as id,
          u.login,
          u.name,
          u.role_id::text as role_id,
          r.name as role_name,
          u.is_active,
          u.last_login_at,
          u.created_at,
          u.updated_at
        from auth_users u
        inner join auth_roles r on r.id = u.role_id
        order by lower(u.login)
      `),
    ]);

    const roles = rolesResult.rows.map((row) => ({
      id: parseNumericId(row.id, "role id"),
      name: row.name.trim(),
      permissions: row.permissions ?? [],
      userCount: row.user_count,
    }));

    const users = usersResult.rows.map((row) => ({
      id: parseNumericId(row.id, "user id"),
      login: normalizeEmailAddress(row.login),
      name: row.name.trim(),
      roleId: parseNumericId(row.role_id, "role id"),
      roleName: row.role_name.trim(),
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      roles,
      users,
      summary: {
        totalUsers: users.length,
        activeUsers: users.filter((user) => user.isActive).length,
        inactiveUsers: users.filter((user) => !user.isActive).length,
        adminUsers: users.filter((user) => user.roleName === ADMIN_ROLE_NAME).length,
      },
    };
  });
}

export async function createAdminManagedUser(input: {
  login: string;
  name: string;
  roleId: number;
  password: string;
}) {
  const login = validateEmailOrThrow(input.login);
  const name = validateNameOrThrow(input.name);
  const password = validatePasswordOrThrow(input.password);

  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      const role = await getRoleByIdOrThrow(client, input.roleId);
      const passwordHash = await hashPassword(password);

      await client.query(
        `
          insert into auth_users (login, name, role_id, password_hash, is_active)
          values ($1, $2, $3::bigint, $4, true)
        `,
        [login, name, role.id, passwordHash],
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      handlePgError(error);
    }
  });
}

export async function updateAdminManagedUser(input: {
  userId: number;
  actingUserId: number;
  name: string;
  roleId: number;
  isActive: boolean;
}) {
  const name = validateNameOrThrow(input.name);

  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      const targetUser = await getUserByIdOrThrow(client, input.userId);
      const targetRole = await getRoleByIdOrThrow(client, input.roleId);

      if (input.actingUserId === targetUser.id && targetRole.name !== targetUser.roleName) {
        throw new AdminUsersError(
          "SELF_ROLE_CHANGE",
          "Current admin session cannot change its own role here.",
        );
      }

      if (input.actingUserId === targetUser.id && !input.isActive) {
        throw new AdminUsersError(
          "SELF_DEACTIVATE",
          "Current admin session cannot deactivate itself here.",
        );
      }

      await guardLastActiveAdmin(
        client,
        targetUser.roleName,
        targetUser.isActive,
        targetRole.name,
        input.isActive,
      );

      await client.query(
        `
          update auth_users
          set name = $2,
              role_id = $3::bigint,
              is_active = $4,
              updated_at = current_timestamp
          where id = $1::bigint
        `,
        [targetUser.id, name, targetRole.id, input.isActive],
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      handlePgError(error);
    }
  });
}

export async function resetAdminManagedUserPassword(input: {
  userId: number;
  password: string;
}) {
  const password = validatePasswordOrThrow(input.password);

  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      const targetUser = await getUserByIdOrThrow(client, input.userId);
      const passwordHash = await hashPassword(password);

      await client.query(
        `
          update auth_users
          set password_hash = $2,
              updated_at = current_timestamp
          where id = $1::bigint
        `,
        [targetUser.id, passwordHash],
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      handlePgError(error);
    }
  });
}
