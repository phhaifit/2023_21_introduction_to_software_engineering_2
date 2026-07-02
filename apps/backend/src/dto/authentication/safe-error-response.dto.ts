export type AuthenticationRequestField = "email" | "password";

export interface SafeErrorResponse {
  code: string;
  message: string;
  field?: AuthenticationRequestField;
}
