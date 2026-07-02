import type { User } from "../entities/index.js";
import { prisma } from "../db/prisma.js";
import { Prisma, type User as PrismaUser } from "../generated/prisma/client.js";

import { DuplicateUserEmailError } from "./user-repository.error.js";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

function mapPrismaUserToUser(record: PrismaUser): User {
  return {
    id: record.id,
    email: record.email,
    passwordHash: record.passwordHash,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function isUniqueEmailError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const meta = error.meta as Record<string, unknown> | undefined;
  const target = meta?.target;

  if (Array.isArray(target)) {
    return target.includes("email");
  }

  if (target === "email" || target === "users_email_key") {
    return true;
  }

  const driverAdapterError = meta?.driverAdapterError;

  if (!driverAdapterError || typeof driverAdapterError !== "object") {
    return false;
  }

  const cause = (driverAdapterError as { cause?: unknown }).cause;

  if (!cause || typeof cause !== "object") {
    return false;
  }

  const constraint = (cause as { constraint?: unknown }).constraint;

  if (!constraint || typeof constraint !== "object") {
    return false;
  }

  const fields = (constraint as { fields?: unknown }).fields;

  return Array.isArray(fields) && fields.includes("email");
}

export async function findByEmail(normalizedEmail: string): Promise<User | null> {
  const record = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  return record ? mapPrismaUserToUser(record) : null;
}

export async function findById(id: string): Promise<User | null> {
  const record = await prisma.user.findUnique({
    where: {
      id
    }
  });

  return record ? mapPrismaUserToUser(record) : null;
}

export async function existsByEmail(normalizedEmail: string): Promise<boolean> {
  const record = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    },
    select: {
      id: true
    }
  });

  return record !== null;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    const record = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash
      }
    });

    return mapPrismaUserToUser(record);
  } catch (error) {
    if (isUniqueEmailError(error)) {
      throw new DuplicateUserEmailError();
    }

    throw error;
  }
}
