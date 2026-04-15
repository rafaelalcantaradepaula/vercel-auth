import "server-only";

import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { withDbClient } from "@/lib/db";

export type ChangePasswordErrorCode =
  | "USER_NOT_FOUND"
  | "CURRENT_PASSWORD_INVALID"
  | "INVALID_PASSWORD"
  | "PASSWORD_CONFIRMATION_MISMATCH";

export class ChangePasswordError extends Error {
  code: ChangePasswordErrorCode;

  constructor(code: ChangePasswordErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type ChangePasswordUserRow = {
  id: string;
  password_hash: string;
  is_active: boolean;
};

function validateNewPasswordOrThrow(value: string) {
  if (value.length < 8) {
    throw new ChangePasswordError(
      "INVALID_PASSWORD",
      "Password must have at least 8 characters.",
    );
  }

  return value;
}

function validateConfirmationOrThrow(password: string, confirmation: string) {
  if (password !== confirmation) {
    throw new ChangePasswordError(
      "PASSWORD_CONFIRMATION_MISMATCH",
      "Password confirmation must match the new password.",
    );
  }
}

export async function changeAuthenticatedUserPassword(input: {
  userId: number;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const newPassword = validateNewPasswordOrThrow(input.newPassword);
  validateConfirmationOrThrow(newPassword, input.confirmPassword);

  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      const userResult = await client.query<ChangePasswordUserRow>(
        `
          select
            id::text as id,
            password_hash,
            is_active
          from auth_users
          where id = $1::bigint
          limit 1
        `,
        [input.userId],
      );

      const user = userResult.rows[0];

      if (!user || !user.is_active) {
        throw new ChangePasswordError("USER_NOT_FOUND", "Authenticated user was not found.");
      }

      const currentPasswordMatches = await verifyPassword(input.currentPassword, user.password_hash);

      if (!currentPasswordMatches) {
        throw new ChangePasswordError(
          "CURRENT_PASSWORD_INVALID",
          "Current password does not match the stored password hash.",
        );
      }

      const passwordHash = await hashPassword(newPassword);

      await client.query(
        `
          update auth_users
          set password_hash = $2,
              updated_at = current_timestamp
          where id = $1::bigint
        `,
        [input.userId, passwordHash],
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}
