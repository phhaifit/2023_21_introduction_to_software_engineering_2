export const APP_NAME = "AI Agent Platform for Enterprise";

export type { Agent, AgentStatus, CreateAgentInput, UpdateAgentInput } from "./agent.js";
export { AUTH_ERROR_CODES, USER_STATUSES } from "./authentication.js";
export type {
  AuthError,
  AuthErrorCode,
  AuthField,
  AuthResponse,
  LoginInput,
  PublicUser,
  RegisterInput,
  UserStatus
} from "./authentication.js";
