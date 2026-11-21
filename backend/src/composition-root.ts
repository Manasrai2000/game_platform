import { Router } from "express";
import { authRoutes } from "./modules/auth/infrastructure/auth-routes";
import { userRoutes } from "./modules/users/infrastructure/user-routes";

export function buildApiRouter(): Router {
  const router = Router();

  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);

  return router;
}
