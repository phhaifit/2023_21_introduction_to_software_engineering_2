export type UserStatus = "active" | "disabled" | "locked";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
