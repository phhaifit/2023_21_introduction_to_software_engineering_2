import { compare, hash } from "bcryptjs";

const PASSWORD_HASH_SALT_ROUNDS = 12;

export class PasswordEncoderError extends Error {
  constructor() {
    super("Password encoding operation failed.");
    this.name = "PasswordEncoderError";
  }
}

export async function hashPassword(plaintextPassword: string): Promise<string> {
  try {
    return await hash(plaintextPassword, PASSWORD_HASH_SALT_ROUNDS);
  } catch {
    throw new PasswordEncoderError();
  }
}

export async function verifyPassword(
  plaintextPassword: string,
  passwordHash: string
): Promise<boolean> {
  try {
    return await compare(plaintextPassword, passwordHash);
  } catch {
    return false;
  }
}
