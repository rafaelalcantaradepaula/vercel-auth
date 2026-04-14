import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 64;

export async function hashPassword(password: string) {
  if (!password) {
    throw new Error("Password cannot be empty.");
  }

  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_BYTES)) as Buffer;

  return [
    PASSWORD_HASH_PREFIX,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!password || !storedHash) {
    return false;
  }

  const [algorithm, saltHex, keyHex] = storedHash.split("$");

  if (
    algorithm !== PASSWORD_HASH_PREFIX ||
    !saltHex ||
    !keyHex ||
    saltHex.length % 2 !== 0 ||
    keyHex.length % 2 !== 0
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");
  const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}
