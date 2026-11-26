import { Router } from "express";
import { requireAuth, requireAdmin } from "../../core/middleware/auth-guard";
import { paymentsController } from "./payments-controller";

const router = Router();

// Student Endpoints
router.get("/plans", requireAuth, (req, res, next) =>
  paymentsController.listPlans(req, res, next)
);

router.post("/create-order", requireAuth, (req, res, next) =>
  paymentsController.createOrder(req, res, next)
);

router.post("/verify", requireAuth, (req, res, next) =>
  paymentsController.verifyPayment(req, res, next)
);

// Public Razorpay Server Webhook (Verified via x-razorpay-signature)
router.post("/webhook/razorpay", (req, res, next) =>
  paymentsController.razorpayWebhook(req, res, next)
);

// Admin Class-Wise Plans Management
router.get("/admin/plans", requireAuth, requireAdmin, (req, res, next) =>
  paymentsController.listAdminPlans(req, res, next)
);

router.post("/admin/plans", requireAuth, requireAdmin, (req, res, next) =>
  paymentsController.createAdminPlan(req, res, next)
);

router.put("/admin/plans/:id", requireAuth, requireAdmin, (req, res, next) =>
  paymentsController.updateAdminPlan(req, res, next)
);

router.delete("/admin/plans/:id", requireAuth, requireAdmin, (req, res, next) =>
  paymentsController.deleteAdminPlan(req, res, next)
);

// Admin Payments & Revenue Ledger
router.get("/admin/orders", requireAuth, requireAdmin, (req, res, next) =>
  paymentsController.listAdminOrders(req, res, next)
);

export const paymentsRoutes = router;
