import { Router } from "express";
import { authRoutes } from "./modules/auth/infrastructure/auth-routes";
import { userRoutes } from "./modules/users/infrastructure/user-routes";
import { classesRoutes } from "./modules/classes/infrastructure/classes-routes";
import { activitiesRoutes } from "./modules/activities/infrastructure/activities-routes";
import { trackingRoutes } from "./modules/tracking/tracking-routes";
import { referralsRoutes } from "./modules/referrals/referrals-routes";
import { paymentsRoutes } from "./modules/payments/payments-routes";
import { helpdeskRoutes } from "./modules/helpdesk/helpdesk-routes";

export function buildApiRouter(): Router {
  const router = Router();

  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);
  router.use("/classes", classesRoutes);
  router.use("/activities", activitiesRoutes);
  router.use("/tracking", trackingRoutes);
  router.use("/referrals", referralsRoutes);
  router.use("/payments", paymentsRoutes);
  router.use("/helpdesk", helpdeskRoutes);

  return router;
}
