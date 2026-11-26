import { Router } from "express";
import { authController } from "./auth-controller";
import { requireAuth, requireAdmin } from "../../../core/middleware/auth-guard";
import { createRateLimiter } from "../../../core/middleware/rate-limit";

const router = Router();

const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  message: "Too many authentication attempts. Please wait a minute and try again.",
});

const otpRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  message: "Too many OTP requests. Please wait 1 minute before requesting another code.",
});

// Public routes
router.post("/send-otp", otpRateLimiter, (req, res, next) =>
  authController.sendOtp(req, res, next)
);
router.post("/register", authRateLimiter, (req, res, next) =>
  authController.register(req, res, next)
);
router.post("/login", authRateLimiter, (req, res, next) =>
  authController.login(req, res, next)
);
router.post("/logout", (req, res, next) => authController.logout(req, res, next));

// Authenticated current user profile
router.get("/me", requireAuth, (req, res) => authController.me(req, res));
router.put("/me", requireAuth, (req, res, next) => authController.updateMe(req, res, next));

// Admin-controlled password reset
router.post(
  "/admin/set-password",
  requireAuth,
  requireAdmin,
  (req, res, next) => authController.adminSetPassword(req, res, next)
);

export const authRoutes = router;
