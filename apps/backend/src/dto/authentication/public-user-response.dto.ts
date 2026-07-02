import type { UserStatus } from "../../entities/index.js";

export interface PublicUserResponse {
  id: string;
  email: string;
  status: UserStatus;
}
