import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth-guard";
import { trackingController } from "./tracking-controller";

const router = Router();

router.get("/user-activity-status", requireAuth, (req, res, next) =>
  trackingController.getStatus(req, res, next)
);

router.post("/event", requireAuth, (req, res, next) =>
  trackingController.logEvent(req, res, next)
);

export const trackingRoutes = router;
