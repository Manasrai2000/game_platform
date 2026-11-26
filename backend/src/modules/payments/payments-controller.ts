import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { paymentsService } from "./payments-service";

const createOrderSchema = z.object({
  planCode: z.string().min(2).max(50),
  referralCode: z.string().max(32).optional(),
  useWallet: z.boolean().optional(),
});

const verifyPaymentSchema = z.object({
  gatewayOrderId: z.string().min(3),
  gatewayPaymentId: z.string().min(3),
  signature: z.string().min(3),
});

const createAdminPlanSchema = z.object({
  classId: z.coerce.number().positive().nullable().default(null),
  code: z.string().max(50).optional(),
  title: z.string().min(2, "Plan title is required").max(150),
  description: z.string().optional(),
  priceInr: z.coerce.number().int().min(1, "Price must be at least ₹1"),
  durationDays: z.coerce.number().int().min(1).default(365),
  badge: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

const updateAdminPlanSchema = z.object({
  classId: z.coerce.number().positive().nullable().optional(),
  title: z.string().min(2).max(150).optional(),
  description: z.string().optional(),
  priceInr: z.coerce.number().int().min(1).optional(),
  durationDays: z.coerce.number().int().min(1).optional(),
  badge: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});

export class PaymentsController {
  async listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const list = await paymentsService.listStudentPlans(user.classGrade);
      res.status(200).json({
        success: true,
        data: { plans: list },
      });
    } catch (err) {
      next(err);
    }
  }

  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const parsed = createOrderSchema.parse(req.body);
      const order = await paymentsService.createOrder(
        user.id,
        parsed.planCode,
        parsed.referralCode,
        parsed.useWallet
      );
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const parsed = verifyPaymentSchema.parse(req.body);
      const result = await paymentsService.verifyPayment(user.id, parsed);
      res.status(200).json({
        success: true,
        message: "Payment verified! Premium curriculum unlocked.",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async razorpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawReq = req as Request & { rawBody?: Buffer };
      const rawBody = rawReq.rawBody || JSON.stringify(req.body);
      const signature = String(req.headers["x-razorpay-signature"] || "");
      const result = await paymentsService.handleRazorpayWebhook(rawBody, signature);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Class-Wise Plan Management ---
  async listAdminPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await paymentsService.listAllAdminPlans();
      res.status(200).json({
        success: true,
        data: { plans: list },
      });
    } catch (err) {
      next(err);
    }
  }

  async createAdminPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createAdminPlanSchema.parse(req.body);
      const created = await paymentsService.createAdminPlan(parsed);
      res.status(201).json({
        success: true,
        message: `Subscription plan "${created.title}" created successfully!`,
        data: { plan: created },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAdminPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const parsed = updateAdminPlanSchema.parse(req.body);
      const updated = await paymentsService.updateAdminPlan(id, parsed);
      res.status(200).json({
        success: true,
        message: "Subscription plan updated successfully!",
        data: { plan: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAdminPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await paymentsService.deleteAdminPlan(id);
      res.status(200).json({
        success: true,
        message: "Subscription plan deleted successfully!",
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Payments Ledger & Revenue ---
  async listAdminOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = (req.query.status as "ALL" | "PAID" | "PENDING" | "FAILED") || "ALL";
      const gateway = (req.query.gateway as "ALL" | "RAZORPAY" | "SANDBOX") || "ALL";
      const result = await paymentsService.listAdminOrders({
        search: req.query.search as string | undefined,
        status,
        classGrade: req.query.classGrade as string | undefined,
        gateway,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 25,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const paymentsController = new PaymentsController();
