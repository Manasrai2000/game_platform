import { Router } from "express";
import { requireAuth, requireAdmin } from "../../core/middleware/auth-guard";
import { referralsController } from "./referrals-controller";

const router = Router();

// Public Endpoint for /register?ref=CODE
router.get("/public-info/:code", (req, res, next) =>
  referralsController.getPublicInfo(req, res, next)
);

// Student Endpoints
router.post("/validate", requireAuth, (req, res, next) =>
  referralsController.validate(req, res, next)
);

router.get("/my-stats", requireAuth, (req, res, next) =>
  referralsController.getMyStats(req, res, next)
);

// Admin Referral Program Settings & Ledger
router.get("/admin/settings", requireAuth, requireAdmin, (req, res, next) =>
  referralsController.getAdminSettings(req, res, next)
);

router.put("/admin/settings", requireAuth, requireAdmin, (req, res, next) =>
  referralsController.updateAdminSettings(req, res, next)
);

// Admin Coupon Code Generator Endpoints
router.get("/admin/codes", requireAuth, requireAdmin, (req, res, next) =>
  referralsController.listAdminCodes(req, res, next)
);

router.post("/admin/codes", requireAuth, requireAdmin, (req, res, next) =>
  referralsController.createAdminCode(req, res, next)
);

router.patch("/admin/codes/:id", requireAuth, requireAdmin, (req, res, next) =>
  referralsController.updateAdminCode(req, res, next)
);

router.delete("/admin/codes/:id", requireAuth, requireAdmin, (req, res, next) =>
  referralsController.deleteAdminCode(req, res, next)
);

export const referralsRoutes = router;
