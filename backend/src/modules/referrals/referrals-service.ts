import crypto from "crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "../../core/database/connection";
import {
  users,
  referrals,
  promo_referral_codes,
  referral_settings,
} from "../../core/database/schema/index";
import { BadRequestError, ConflictError, NotFoundError } from "../../core/errors/app-error";

export class ReferralsService {
  /**
   * Retrieves the active global referral program settings (creates default row if missing).
   */
  async getReferralSettings() {
    const [existing] = await db.select().from(referral_settings).limit(1);
    if (existing) return existing;

    const [ins] = await db.insert(referral_settings).values({
      is_enabled: true,
      max_referrals_per_student: 5,
      referee_discount_type: "FLAT",
      referee_discount_value: 200,
      referrer_reward_type: "FLAT",
      referrer_reward_value: 800,
      reward_trigger: "ON_SUBSCRIPTION",
    });

    const [created] = await db
      .select()
      .from(referral_settings)
      .where(eq(referral_settings.id, Number(ins.insertId)))
      .limit(1);
    return created;
  }

  /**
   * Admin: Updates global referral program rules.
   */
  async updateReferralSettings(
    adminId: number,
    input: {
      isEnabled?: boolean;
      maxReferralsPerStudent?: number;
      refereeDiscountType?: "FLAT" | "PERCENT";
      refereeDiscountValue?: number;
      referrerRewardType?: "FLAT" | "PERCENT";
      referrerRewardValue?: number;
      rewardTrigger?: "ON_SUBSCRIPTION" | "ON_SIGNUP";
    }
  ) {
    const current = await this.getReferralSettings();

    await db
      .update(referral_settings)
      .set({
        ...(input.isEnabled !== undefined ? { is_enabled: input.isEnabled } : {}),
        ...(input.maxReferralsPerStudent !== undefined
          ? { max_referrals_per_student: input.maxReferralsPerStudent }
          : {}),
        ...(input.refereeDiscountType !== undefined
          ? { referee_discount_type: input.refereeDiscountType }
          : {}),
        ...(input.refereeDiscountValue !== undefined
          ? { referee_discount_value: input.refereeDiscountValue }
          : {}),
        ...(input.referrerRewardType !== undefined
          ? { referrer_reward_type: input.referrerRewardType }
          : {}),
        ...(input.referrerRewardValue !== undefined
          ? { referrer_reward_value: input.referrerRewardValue }
          : {}),
        ...(input.rewardTrigger !== undefined
          ? { reward_trigger: input.rewardTrigger }
          : {}),
        updated_by_admin_id: adminId,
      })
      .where(eq(referral_settings.id, current.id));

    return this.getReferralSettings();
  }

  /**
   * Public: Validates a shareable referral code on the /register?ref=CODE page.
   */
  async getPublicReferralInfo(code: string) {
    const cleanCode = code.trim().toUpperCase();
    const settings = await this.getReferralSettings();

    if (!settings.is_enabled) {
      return { valid: false, reason: "Referral program is currently paused." };
    }

    const [referrer] = await db
      .select()
      .from(users)
      .where(eq(users.referral_code, cleanCode))
      .limit(1);

    if (!referrer) {
      return { valid: false, reason: "Referral invite link is invalid." };
    }

    const rewardedRows = await db
      .select()
      .from(referrals)
      .where(and(eq(referrals.referrer_id, referrer.id), eq(referrals.status, "REWARDED")));

    if (rewardedRows.length >= settings.max_referrals_per_student) {
      return {
        valid: false,
        reason: `${referrer.full_name} has reached the maximum referral limit (${settings.max_referrals_per_student}).`,
      };
    }

    return {
      valid: true,
      referralCode: referrer.referral_code!,
      referrerName: referrer.full_name,
      discountType: settings.referee_discount_type,
      discountValue: settings.referee_discount_value,
    };
  }

  /**
   * Called during student registration when ?ref=CODE was used.
   * Logs the referral immediately as REGISTERED (or REWARDED if trigger is ON_SIGNUP).
   */
  async attributeRegistrationReferral(newUserId: number, refCode?: string): Promise<void> {
    if (!refCode || !refCode.trim()) return;
    const cleanCode = refCode.trim().toUpperCase();
    const settings = await this.getReferralSettings();
    if (!settings.is_enabled) return;

    const [referrer] = await db
      .select()
      .from(users)
      .where(eq(users.referral_code, cleanCode))
      .limit(1);

    if (!referrer || referrer.id === newUserId) return;

    const existingRefs = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrer_id, referrer.id));

    const rewardedCount = existingRefs.filter((r) => r.status === "REWARDED").length;
    if (rewardedCount >= settings.max_referrals_per_student) return;

    const triggerRewardNow =
      settings.reward_trigger === "ON_SIGNUP" && settings.referrer_reward_type === "FLAT";
    const rewardCredited = triggerRewardNow ? settings.referrer_reward_value : 0;

    await db.insert(referrals).values({
      referrer_id: referrer.id,
      referee_id: newUserId,
      referral_code: cleanCode,
      discount_given: 0,
      reward_credited: rewardCredited,
      status: triggerRewardNow ? "REWARDED" : "REGISTERED",
    });

    if (triggerRewardNow && rewardCredited > 0) {
      await db
        .update(users)
        .set({
          reward_wallet_balance: sql`${users.reward_wallet_balance} + ${rewardCredited}`,
        })
        .where(eq(users.id, referrer.id));
    }
  }

  /**
   * Validates either an Admin-generated Coupon Code (with expiration & max uses)
   * OR a Peer Student Referral Code (using dynamic Admin Referral Settings).
   */
  async validateReferralCode(code: string, currentUserId: number, planPriceInr?: number) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      throw new BadRequestError("Please enter a coupon or referral code");
    }

    // 1. Check Admin-Generated Coupon Codes first
    const [promo] = await db
      .select()
      .from(promo_referral_codes)
      .where(eq(promo_referral_codes.code, cleanCode))
      .limit(1);

    if (promo) {
      if (!promo.is_active) {
        throw new BadRequestError("This coupon code has been deactivated by admin.");
      }

      if (new Date() > new Date(promo.expires_at)) {
        throw new BadRequestError(
          `This coupon code expired on ${new Date(promo.expires_at).toLocaleDateString()}.`
        );
      }

      if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
        throw new BadRequestError("This coupon code has reached its maximum usage limit.");
      }

      let discountAmount = 0;
      if (planPriceInr) {
        if (promo.discount_flat_inr > 0) {
          discountAmount = Math.min(promo.discount_flat_inr, planPriceInr - 1);
        } else {
          discountAmount = Math.round((planPriceInr * promo.discount_percent) / 100);
        }
      }

      return {
        valid: true,
        source: "ADMIN_PROMO" as const,
        referralCode: promo.code,
        referrerName: promo.label || "Official Coupon",
        discountPercent: promo.discount_percent,
        discountFlatInr: promo.discount_flat_inr,
        discountAmount,
        expiresAt: promo.expires_at,
      };
    }

    // 2. Fallback: Check Peer Student Referral Codes with Admin Settings
    const settings = await this.getReferralSettings();
    if (!settings.is_enabled) {
      throw new BadRequestError("Student referral discounts are currently disabled.");
    }

    const [referrer] = await db
      .select()
      .from(users)
      .where(eq(users.referral_code, cleanCode))
      .limit(1);

    if (!referrer) {
      throw new NotFoundError("Invalid referral or coupon code. Please check and try again.");
    }

    if (referrer.id === currentUserId) {
      throw new BadRequestError("You cannot use your own referral code.");
    }

    const [existingRewarded] = await db
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.referee_id, currentUserId),
          eq(referrals.status, "REWARDED")
        )
      )
      .limit(1);

    // Check if the user has already purchased with a referral earlier (by checking orders or rewarded status when reward trigger was ON_SUBSCRIPTION)
    const [existingOrderPaid] = await db
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.referee_id, currentUserId),
          sql`${referrals.discount_given} > 0`
        )
      )
      .limit(1);

    if (existingOrderPaid || (existingRewarded && settings.reward_trigger === "ON_SUBSCRIPTION")) {
      throw new BadRequestError(
        "Student referral discount can only be used on your first subscription purchase."
      );
    }

    // Check referrer's limit
    const referrerRewards = await db
      .select()
      .from(referrals)
      .where(and(eq(referrals.referrer_id, referrer.id), eq(referrals.status, "REWARDED")));

    if (referrerRewards.length >= settings.max_referrals_per_student) {
      throw new BadRequestError(
        "This student referral code has reached its maximum referral limit."
      );
    }

    let discountAmount = 0;
    if (planPriceInr) {
      if (settings.referee_discount_type === "FLAT") {
        discountAmount = Math.min(settings.referee_discount_value, planPriceInr - 1);
      } else {
        discountAmount = Math.round((planPriceInr * settings.referee_discount_value) / 100);
      }
    }

    return {
      valid: true,
      source: "STUDENT_PEER" as const,
      referralCode: referrer.referral_code!,
      referrerName: referrer.full_name,
      discountPercent:
        settings.referee_discount_type === "PERCENT" ? settings.referee_discount_value : 0,
      discountFlatInr:
        settings.referee_discount_type === "FLAT" ? settings.referee_discount_value : 0,
      discountAmount,
      expiresAt: null,
    };
  }

  /**
   * Gets referral summary, program rules, and invited friends list for the logged-in student.
   */
  async getMyStats(userId: number) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const settings = await this.getReferralSettings();

    const records = await db
      .select({
        id: referrals.id,
        refereeId: referrals.referee_id,
        status: referrals.status,
        rewardCredited: referrals.reward_credited,
        discountGiven: referrals.discount_given,
        createdAt: referrals.created_at,
        refereeName: users.full_name,
        refereeEmail: users.email,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referee_id, users.id))
      .where(eq(referrals.referrer_id, userId))
      .orderBy(desc(referrals.created_at));

    const totalConverted = records.filter((r) => r.status === "REWARDED").length;
    const totalEarned = records.reduce((sum, r) => sum + (r.rewardCredited || 0), 0);
    const maxEarnable =
      settings.referrer_reward_type === "FLAT"
        ? settings.referrer_reward_value * settings.max_referrals_per_student
        : 0;

    return {
      referralCode: user.referral_code,
      referredByCode: user.referred_by_code,
      rewardWalletBalance: user.reward_wallet_balance,
      totalInvited: records.length,
      totalConverted,
      totalEarned,
      history: records,
      settings: {
        isEnabled: settings.is_enabled,
        maxReferralsPerStudent: settings.max_referrals_per_student,
        refereeDiscountType: settings.referee_discount_type,
        refereeDiscountValue: settings.referee_discount_value,
        referrerRewardType: settings.referrer_reward_type,
        referrerRewardValue: settings.referrer_reward_value,
        rewardTrigger: settings.reward_trigger,
        maxEarnableAmount: maxEarnable,
      },
    };
  }

  /**
   * Admin: Gets full peer referral ledger across all students.
   */
  async getAdminReferralLedger() {
    const referrerUser = alias(users, "referrerUser");
    const refereeUser = alias(users, "refereeUser");

    const rows = await db
      .select({
        id: referrals.id,
        referralCode: referrals.referral_code,
        status: referrals.status,
        discountGiven: referrals.discount_given,
        rewardCredited: referrals.reward_credited,
        createdAt: referrals.created_at,
        referrerName: referrerUser.full_name,
        referrerEmail: referrerUser.email,
        refereeName: refereeUser.full_name,
        refereeEmail: refereeUser.email,
      })
      .from(referrals)
      .innerJoin(referrerUser, eq(referrals.referrer_id, referrerUser.id))
      .innerJoin(refereeUser, eq(referrals.referee_id, refereeUser.id))
      .orderBy(desc(referrals.created_at));

    return rows;
  }

  // =========================================================================
  // ADMIN COUPON CODE MANAGEMENT (WITH EXPIRATION PERIOD)
  // =========================================================================

  async listAdminPromoCodes() {
    const rows = await db
      .select()
      .from(promo_referral_codes)
      .orderBy(desc(promo_referral_codes.created_at));

    const now = new Date();
    return rows.map((row) => ({
      ...row,
      isExpired: now > new Date(row.expires_at),
    }));
  }

  async createAdminPromoCode(
    adminId: number,
    input: {
      code?: string;
      label: string;
      discountPercent?: number;
      discountFlatInr?: number;
      maxUses?: number | null;
      expiresAt?: string;
      expiresInDays?: number;
      isActive?: boolean;
    }
  ) {
    const rawCode = input.code?.trim().toUpperCase();
    const finalCode =
      rawCode && rawCode.length >= 3
        ? rawCode
        : `EDU${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const [existing] = await db
      .select()
      .from(promo_referral_codes)
      .where(eq(promo_referral_codes.code, finalCode))
      .limit(1);

    if (existing) {
      throw new ConflictError(`Coupon code "${finalCode}" already exists.`);
    }

    let expirationDate: Date;
    if (input.expiresAt) {
      expirationDate = new Date(input.expiresAt);
      if (Number.isNaN(expirationDate.getTime())) {
        throw new BadRequestError("Invalid expiration date format");
      }
      if (input.expiresAt.length <= 10) {
        expirationDate.setHours(23, 59, 59, 999);
      }
    } else {
      const days = input.expiresInDays && input.expiresInDays > 0 ? input.expiresInDays : 30;
      expirationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const [insertRes] = await db.insert(promo_referral_codes).values({
      code: finalCode,
      label: input.label.trim(),
      discount_percent: input.discountPercent ?? 10,
      discount_flat_inr: input.discountFlatInr ?? 0,
      max_uses: input.maxUses ?? null,
      used_count: 0,
      expires_at: expirationDate,
      is_active: input.isActive ?? true,
      created_by_admin_id: adminId,
    });

    const [created] = await db
      .select()
      .from(promo_referral_codes)
      .where(eq(promo_referral_codes.id, Number(insertRes.insertId)))
      .limit(1);

    return created;
  }

  async updateAdminPromoCode(
    id: number,
    input: {
      label?: string;
      discountPercent?: number;
      discountFlatInr?: number;
      maxUses?: number | null;
      expiresAt?: string;
      expiresInDays?: number;
      isActive?: boolean;
    }
  ) {
    const [existing] = await db
      .select()
      .from(promo_referral_codes)
      .where(eq(promo_referral_codes.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Coupon code not found");
    }

    let nextExpiresAt = existing.expires_at;
    if (input.expiresAt) {
      nextExpiresAt = new Date(input.expiresAt);
      if (input.expiresAt.length <= 10) {
        nextExpiresAt.setHours(23, 59, 59, 999);
      }
    } else if (input.expiresInDays && input.expiresInDays > 0) {
      nextExpiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    }

    await db
      .update(promo_referral_codes)
      .set({
        ...(input.label !== undefined ? { label: input.label.trim() } : {}),
        ...(input.discountPercent !== undefined
          ? { discount_percent: input.discountPercent }
          : {}),
        ...(input.discountFlatInr !== undefined
          ? { discount_flat_inr: input.discountFlatInr }
          : {}),
        ...(input.maxUses !== undefined ? { max_uses: input.maxUses } : {}),
        expires_at: nextExpiresAt,
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      })
      .where(eq(promo_referral_codes.id, id));

    const [updated] = await db
      .select()
      .from(promo_referral_codes)
      .where(eq(promo_referral_codes.id, id))
      .limit(1);

    return updated;
  }

  async deleteAdminPromoCode(id: number) {
    const [existing] = await db
      .select()
      .from(promo_referral_codes)
      .where(eq(promo_referral_codes.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Coupon code not found");
    }

    await db.delete(promo_referral_codes).where(eq(promo_referral_codes.id, id));
    return existing;
  }
}

export const referralsService = new ReferralsService();
