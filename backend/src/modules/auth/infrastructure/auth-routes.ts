import { Router } from "express";
import { authController } from "./auth-controller";
import { requireAuth, requireAdmin } from "../../../core/middleware/auth-guard";

const router = Router();

// Public routes
router.post("/register", (req, res, next) => authController.register(req, res, next));
router.post("/login", (req, res, next) => authController.login(req, res, next));
router.post("/logout", (req, res, next) => authController.logout(req, res, next));

// Authenticated current user profile
router.get("/me", requireAuth, (req, res) => authController.me(req, res));

// Admin-controlled password reset
router.post(
  "/admin/set-password",
  requireAuth,
  requireAdmin,
  (req, res, next) => authController.adminSetPassword(req, res, next)
);

export const authRoutes = router;
