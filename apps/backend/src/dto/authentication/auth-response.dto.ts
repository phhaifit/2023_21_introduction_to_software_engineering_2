import type { PublicUserResponse } from "./public-user-response.dto.js";

export interface AuthResponse {
  user: PublicUserResponse;
  accessToken: string;
  expiresAt: string;
}
