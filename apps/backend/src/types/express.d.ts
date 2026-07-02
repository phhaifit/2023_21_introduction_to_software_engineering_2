import type { RequestIdentity } from "../services/payments.service.js";

declare global {
  namespace Express {
    interface Request {
      identity: RequestIdentity;
    }
  }
}

export {};
