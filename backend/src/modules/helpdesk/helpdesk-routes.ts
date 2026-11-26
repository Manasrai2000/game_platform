import { Router } from "express";
import { requireAuth, requireAdmin, optionalAuth } from "../../core/middleware/auth-guard";
import { createRateLimiter } from "../../core/middleware/rate-limit";
import { helpdeskController } from "./helpdesk-controller";

const router = Router();

const ticketSubmitLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 15,
  message: "Too many support requests submitted. Please wait a few minutes.",
});

const ticketTrackLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 25,
});

// Public & Authenticated Ticket Submission
router.post("/tickets", ticketSubmitLimiter, optionalAuth, (req, res, next) =>
  helpdeskController.createTicket(req, res, next)
);

// Public Guest Ticket Tracker
router.get("/track", ticketTrackLimiter, (req, res, next) =>
  helpdeskController.trackGuestTicket(req, res, next)
);

// Authenticated Student Tickets
router.get("/my-tickets", requireAuth, (req, res, next) =>
  helpdeskController.getMyTickets(req, res, next)
);

// Admin Helpdesk Queue & Resolution
router.get("/admin/tickets", requireAuth, requireAdmin, (req, res, next) =>
  helpdeskController.listAdminTickets(req, res, next)
);

router.patch("/admin/tickets/:id", requireAuth, requireAdmin, (req, res, next) =>
  helpdeskController.updateAdminTicket(req, res, next)
);

export const helpdeskRoutes = router;
