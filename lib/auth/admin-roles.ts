import "server-only";

import type { PoolClient } from "pg";

import { getAppRouteDefinitions, normalizeRoutePermissions } from "@/lib/auth/routes";
import { withDbClient } from "@/lib/db";

const ADMIN_ROLE_NAME = "adm";
const BASIC_ROLE_NAME = "basic";
const SYSTEM_ROLE_NAMES = new Set([ADMIN_ROLE_NAME, BASIC_ROLE_NAME]);
const MINIMUM_BASIC_PERMISSION = "/";
const ROLE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,19}$/;

const ASSIGNABLE_PERMISSION_CATALOG = getAppRouteDefinitions().flatMap((route) =>
  route.visibility === "protected" && route.permission
    ? [
        {
          path: route.permission,
          label: route.label,
          description: route.description,
          includeInNavigation: route.includeInNavigation,
        },
      ]
    : [],
);

const ASSIGNABLE_PERMISSION_SET = new Set(
  ASSIGNABLE_PERMISSION_CATALOG.map((permission) => permission.path),
);

export type AdminRolePermissionOption = {
  path: string;
  label: string;
  description: string;
  includeInNavigation: boolean;
};

export type AdminRoleRecord = {
  id: number;
  name: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  activeUserCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type AdminRolesPageData = {
  roles: AdminRoleRecord[];
  permissionCatalog: AdminRolePermissionOption[];
  summary: {
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    protectedRoutes: number;
  };
};

export type AdminRolesErrorCode =
  | "INVALID_ROLE_NAME"
  | "INVALID_PERMISSIONS"
  | "ROLE_NOT_FOUND"
  | "ROLE_NAME_IN_USE"
  | "SYSTEM_ROLE_RENAME";

export class AdminRolesError extends Error {
  code: AdminRolesErrorCode;

  constructor(code: AdminRolesErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type AdminRoleRow = {
  id: string;
  name: string;
  permissions: string[] | null;
  is_system: boolean;
  user_count: number;
  active_user_count: number;
  created_at: Date | null;
  updated_at: Date | null;
};

type RoleLookupRow = {
  id: string;
  name: string;
  is_system: boolean;
};

function parseNumericId(value: string, label: string) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${label} is invalid.`);
  }

  return parsedValue;
}

function normalizeRoleName(value: string) {
  return value.trim().toLowerCase();
}

function validateRoleNameOrThrow(value: string) {
  const normalizedValue = normalizeRoleName(value);

  if (!ROLE_NAME_PATTERN.test(normalizedValue)) {
    throw new AdminRolesError(
      "INVALID_ROLE_NAME",
      "Role name must be lowercase and contain between 1 and 20 letters, numbers, dashes or underscores.",
    );
  }

  return normalizedValue;
}

function buildNormalizedPermissionsOrThrow(roleName: string, rawPermissions: readonly string[]) {
  const normalizedPermissions = normalizeRoutePermissions(
    rawPermissions.map((permission) => String(permission ?? "").trim()),
  );

  const hasUnknownPermission = normalizedPermissions.some(
    (permission) => permission !== "*" && !ASSIGNABLE_PERMISSION_SET.has(permission),
  );

  if (hasUnknownPermission) {
    throw new AdminRolesError(
      "INVALID_PERMISSIONS",
      "One or more submitted route permissions are invalid.",
    );
  }

  if (roleName === ADMIN_ROLE_NAME) {
    return ["*"];
  }

  if (normalizedPermissions.includes("*")) {
    throw new AdminRolesError(
      "INVALID_PERMISSIONS",
      "Only the admin role can receive wildcard access.",
    );
  }

  if (roleName === BASIC_ROLE_NAME) {
    return normalizeRoutePermissions([...normalizedPermissions, MINIMUM_BASIC_PERMISSION]);
  }

  return normalizedPermissions;
}

async function getRoleByIdOrThrow(client: PoolClient, roleId: number) {
  const result = await client.query<RoleLookupRow>(
    `
      select
        id::text as id,
        name,
        is_system
      from auth_roles
      where id = $1::bigint
      limit 1
    `,
    [roleId],
  );

  const role = result.rows[0];

  if (!role) {
    throw new AdminRolesError("ROLE_NOT_FOUND", "Target role was not found.");
  }

  return {
    id: parseNumericId(role.id, "role id"),
    name: role.name.trim(),
    isSystem: role.is_system,
  };
}

function handlePgError(error: unknown): never {
  const code = typeof error === "object" && error ? Reflect.get(error, "code") : undefined;

  if (code === "23505") {
    throw new AdminRolesError("ROLE_NAME_IN_USE", "Role name is already in use.");
  }

  throw error;
}

export async function getAdminRolesPageData(): Promise<AdminRolesPageData> {
  return withDbClient(async (client) => {
    const rolesResult = await client.query<AdminRoleRow>(`
      select
        r.id::text as id,
        r.name,
        r.permissions,
        r.is_system,
        count(u.id)::int as user_count,
        (count(*) filter (where u.is_active = true))::int as active_user_count,
        r.created_at,
        r.updated_at
      from auth_roles r
      left join auth_users u on u.role_id = r.id
      group by r.id, r.name, r.permissions, r.is_system, r.created_at, r.updated_at
      order by
        case
          when r.name = 'adm' then 0
          when r.name = 'basic' then 1
          else 2
        end,
        lower(r.name)
    `);

    const roles = rolesResult.rows.map((row) => ({
      id: parseNumericId(row.id, "role id"),
      name: row.name.trim(),
      permissions: normalizeRoutePermissions(row.permissions ?? []),
      isSystem: row.is_system,
      userCount: row.user_count,
      activeUserCount: row.active_user_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      roles,
      permissionCatalog: ASSIGNABLE_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
      summary: {
        totalRoles: roles.length,
        systemRoles: roles.filter((role) => role.isSystem).length,
        customRoles: roles.filter((role) => !role.isSystem).length,
        protectedRoutes: ASSIGNABLE_PERMISSION_CATALOG.length,
      },
    };
  });
}

export async function createAdminManagedRole(input: {
  name: string;
  permissions: string[];
}) {
  const name = validateRoleNameOrThrow(input.name);
  const permissions = buildNormalizedPermissionsOrThrow(name, input.permissions);

  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      await client.query(
        `
          insert into auth_roles (name, permissions, is_system)
          values ($1, $2::text[], false)
        `,
        [name, permissions],
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      handlePgError(error);
    }
  });
}

export async function updateAdminManagedRole(input: {
  roleId: number;
  name: string;
  permissions: string[];
}) {
  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      const currentRole = await getRoleByIdOrThrow(client, input.roleId);
      const requestedName = validateRoleNameOrThrow(input.name);

      if (currentRole.isSystem && requestedName !== currentRole.name) {
        throw new AdminRolesError(
          "SYSTEM_ROLE_RENAME",
          "System roles cannot be renamed.",
        );
      }

      const nextName = currentRole.isSystem ? currentRole.name : requestedName;
      const nextPermissions = buildNormalizedPermissionsOrThrow(nextName, input.permissions);

      await client.query(
        `
          update auth_roles
          set name = $2,
              permissions = $3::text[],
              updated_at = current_timestamp
          where id = $1::bigint
        `,
        [currentRole.id, nextName, nextPermissions],
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      handlePgError(error);
    }
  });
}

export function isSystemRoleName(roleName: string) {
  return SYSTEM_ROLE_NAMES.has(roleName.trim().toLowerCase());
}
