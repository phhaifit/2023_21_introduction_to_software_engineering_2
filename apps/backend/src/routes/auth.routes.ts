import { Router } from "express";

import {
  createAuthController,
  type AuthController
} from "../controllers/auth.controller.js";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";

export function createAuthRouter(
  controller: AuthController = createAuthController(),
  authMiddleware = createAuthMiddleware()
) {
  const router = Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.post("/logout", controller.logout);
  router.get("/me", authMiddleware, controller.me);

  return router;
}

export const authRouter = createAuthRouter();
