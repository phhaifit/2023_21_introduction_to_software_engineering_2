export interface AuthToken {
  id: string;
  userId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt: Date | null;
}
