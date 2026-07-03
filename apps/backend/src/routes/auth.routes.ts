import { Router } from "express";

import {
  createAuthController,
  type AuthController
} from "../controllers/auth.controller.js";

export function createAuthRouter(controller: AuthController = createAuthController()) {
  const router = Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.post("/logout", controller.logout);

  return router;
}

export const authRouter = createAuthRouter();
