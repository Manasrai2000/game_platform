import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { referralsService } from "./referrals-service";

const validateSchema = z.object({
  code: z.string().min(2).max(32),
  planPriceInr: z.number().optional(),
});

const updateSettingsSchema = z.object({
  isEnabled: z.boolean().optional(),
  maxReferralsPerStudent: z.coerce.number().int().min(1).max(1000).optional(),
  refereeDiscountType: z.enum(["FLAT", "PERCENT"]).optional(),
  refereeDiscountValue: z.coerce.number().int().min(0).max(50000).optional(),
  referrerRewardType: z.enum(["FLAT", "PERCENT"]).optional(),
  referrerRewardValue: z.coerce.number().int().min(0).max(50000).optional(),
  rewardTrigger: z.enum(["ON_SUBSCRIPTION", "ON_SIGNUP"]).optional(),
});

const createAdminPromoSchema = z.object({
  code: z.string().max(32).optional(),
  label: z.string().min(2, "Label is required").max(150),
  discountPercent: z.coerce.number().int().min(0).max(95).default(10),
  discountFlatInr: z.coerce.number().int().min(0).default(0),
  maxUses: z.coerce.number().int().min(1).nullable().optional(),
  expiresAt: z.string().optional(),
  expiresInDays: z.coerce.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

const updateAdminPromoSchema = z.object({
  label: z.string().min(2).max(150).optional(),
  discountPercent: z.coerce.number().int().min(0).max(95).optional(),
  discountFlatInr: z.coerce.number().int().min(0).optional(),
  maxUses: z.coerce.number().int().min(1).nullable().optional(),
  expiresAt: z.string().optional(),
  expiresInDays: z.coerce.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export class ReferralsController {
  // Public endpoint for /register?ref=CODE
  async getPublicInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = String(req.params.code || "");
      const info = await referralsService.getPublicReferralInfo(code);
      res.status(200).json({
        success: true,
        data: info,
      });
    } catch (err) {
      next(err);
    }
  }

  async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const parsed = validateSchema.parse(req.body);
      const result = await referralsService.validateReferralCode(
        parsed.code,
        user.id,
        parsed.planPriceInr
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const stats = await referralsService.getMyStats(user.id);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Referral Program Settings & Ledger ---
  async getAdminSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await referralsService.getReferralSettings();
      const ledger = await referralsService.getAdminReferralLedger();
      res.status(200).json({
        success: true,
        data: { settings, ledger },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAdminSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admin = req.user!;
      const parsed = updateSettingsSchema.parse(req.body);
      const updated = await referralsService.updateReferralSettings(admin.id, parsed);
      res.status(200).json({
        success: true,
        message: "Referral program rules updated successfully!",
        data: { settings: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Coupon Code Generator ---
  async listAdminCodes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const codes = await referralsService.listAdminPromoCodes();
      res.status(200).json({
        success: true,
        data: { codes },
      });
    } catch (err) {
      next(err);
    }
  }

  async createAdminCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admin = req.user!;
      const parsed = createAdminPromoSchema.parse(req.body);
      const created = await referralsService.createAdminPromoCode(admin.id, parsed);
      res.status(201).json({
        success: true,
        message: `Coupon code "${created.code}" generated successfully!`,
        data: { code: created },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAdminCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const parsed = updateAdminPromoSchema.parse(req.body);
      const updated = await referralsService.updateAdminPromoCode(id, parsed);
      res.status(200).json({
        success: true,
        message: "Coupon code updated successfully!",
        data: { code: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAdminCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await referralsService.deleteAdminPromoCode(id);
      res.status(200).json({
        success: true,
        message: "Coupon code deleted successfully!",
      });
    } catch (err) {
      next(err);
    }
  }
}

export const referralsController = new ReferralsController();
