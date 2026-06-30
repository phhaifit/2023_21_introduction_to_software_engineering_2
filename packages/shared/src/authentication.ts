export const USER_STATUSES = {
  ACTIVE: "active",
  DISABLED: "disabled",
  LOCKED: "locked"
} as const;

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
}

export interface RegisterInput {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}

export const AUTH_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  UNAUTHORIZED: "UNAUTHORIZED"
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
export type AuthField = keyof RegisterInput;

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  field?: AuthField;
}
