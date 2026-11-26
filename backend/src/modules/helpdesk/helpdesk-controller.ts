import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { helpdeskService } from "./helpdesk-service";

const createTicketSchema = z.object({
  name: z.string().min(2, "Name is required").max(150),
  email: z.string().email("Valid email address is required").max(255),
  mobile: z.string().max(20).optional(),
  category: z
    .enum([
      "LOGIN_DEVICE_LOCK",
      "REGISTRATION_OTP",
      "PASSWORD_RESET",
      "PAYMENT_SUBSCRIPTION",
      "ACTIVITY_BUG",
      "OTHER",
    ])
    .default("OTHER"),
  subject: z.string().min(2, "Subject must be at least 2 characters").max(255),
  description: z.string().min(3, "Please enter a brief description of your problem (at least 3 characters)"),
});

const updateAdminTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  adminReply: z.string().optional(),
});

export class HelpdeskController {
  async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createTicketSchema.parse(req.body);
      const ticket = await helpdeskService.createTicket(req.user, parsed);
      res.status(201).json({
        success: true,
        message: `Ticket ${ticket.ticket_number} created! Our admin team will resolve it shortly.`,
        data: { ticket },
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const tickets = await helpdeskService.getMyTickets(user.id, user.email);
      res.status(200).json({
        success: true,
        data: { tickets },
      });
    } catch (err) {
      next(err);
    }
  }

  async trackGuestTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketNumber = String(req.query.ticketNumber || "");
      const email = String(req.query.email || "");
      const ticket = await helpdeskService.trackGuestTicket(ticketNumber, email);
      res.status(200).json({
        success: true,
        data: { ticket },
      });
    } catch (err) {
      next(err);
    }
  }

  async listAdminTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const userType =
        req.query.userType === "registered" || req.query.userType === "guest"
          ? req.query.userType
          : "all";
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const result = await helpdeskService.listAdminTickets({
        status,
        userType,
        category,
        search,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAdminTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const admin = req.user!;
      const parsed = updateAdminTicketSchema.parse(req.body);
      const updated = await helpdeskService.updateAdminTicket(id, admin.id, parsed);

      res.status(200).json({
        success: true,
        message: `Ticket ${updated.ticket_number} updated (${updated.status})!`,
        data: { ticket: updated },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const helpdeskController = new HelpdeskController();
