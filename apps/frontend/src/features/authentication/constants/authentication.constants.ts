import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";
import type { AuthErrorCode } from "@ai-agent-platform/shared";

export const AUTHENTICATION_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERROR_CODES.INVALID_INPUT]: "Please check the submitted information.",
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: "Invalid email or password.",
  [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]: "An account with this email already exists.",
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: "This account is currently unavailable.",
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: "This account is currently unavailable.",
  [AUTH_ERROR_CODES.UNAUTHORIZED]: "Please log in to continue."
};
