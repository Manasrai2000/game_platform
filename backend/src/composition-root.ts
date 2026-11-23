import { Router } from "express";
import { authRoutes } from "./modules/auth/infrastructure/auth-routes";
import { userRoutes } from "./modules/users/infrastructure/user-routes";
import { classesRoutes } from "./modules/classes/infrastructure/classes-routes";
import { activitiesRoutes } from "./modules/activities/infrastructure/activities-routes";

export function buildApiRouter(): Router {
  const router = Router();

  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);
  router.use("/classes", classesRoutes);
  router.use("/activities", activitiesRoutes);

  return router;
}
