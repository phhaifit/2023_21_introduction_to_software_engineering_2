export declare const USER_STATUSES: {
  readonly ACTIVE: "active";
  readonly DISABLED: "disabled";
  readonly LOCKED: "locked";
};

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export interface PublicUser {
  id: string;
  email: string;
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
  expiresAt: string;
}

export declare const AUTH_ERROR_CODES: {
  readonly INVALID_INPUT: "INVALID_INPUT";
  readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
  readonly EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS";
  readonly ACCOUNT_DISABLED: "ACCOUNT_DISABLED";
  readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
  readonly UNAUTHORIZED: "UNAUTHORIZED";
};

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
export type AuthField = keyof RegisterInput;

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  field?: AuthField;
}
