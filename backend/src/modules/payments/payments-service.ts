import crypto from "crypto";
import { eq, and, sql, isNull, desc, like, or, gt } from "drizzle-orm";
import { db } from "../../core/database/connection";
import {
  plans,
  orders,
  subscriptions,
  users,
  referrals,
  classes,
  promo_referral_codes,
} from "../../core/database/schema/index";
import { env } from "../../core/config/env";
import { BadRequestError, ConflictError, NotFoundError } from "../../core/errors/app-error";
import { referralsService } from "../referrals/referrals-service";
import { trackingService } from "../tracking/tracking-service";

export class PaymentsService {
  /**
   * Lists active plans tailored to the student's class.
   * Falls back to global plans (class_id IS NULL) if no class-specific plan is configured.
   */
  async listStudentPlans(classGrade: string | null) {
    if (classGrade) {
      const allClasses = await db.select().from(classes);
      const matched = allClasses.find(
        (c) => c.name.toLowerCase().trim() === classGrade.toLowerCase().trim()
      );

      if (matched) {
        const classPlans = await db
          .select()
          .from(plans)
          .where(and(eq(plans.class_id, matched.id), eq(plans.is_active, true)));

        if (classPlans.length > 0) {
          return classPlans;
        }
      }
    }

    // Fallback to global plans
    const globalPlans = await db
      .select()
      .from(plans)
      .where(and(isNull(plans.class_id), eq(plans.is_active, true)));

    if (globalPlans.length > 0) {
      return globalPlans;
    }

    return db.select().from(plans).where(eq(plans.is_active, true));
  }

  // =========================================================================
  // ADMIN CLASS-WISE SUBSCRIPTION PLANS MANAGEMENT
  // =========================================================================

  async listAllAdminPlans() {
    const rows = await db
      .select({
        id: plans.id,
        classId: plans.class_id,
        className: classes.name,
        code: plans.code,
        title: plans.title,
        description: plans.description,
        priceInr: plans.price_inr,
        durationDays: plans.duration_days,
        badge: plans.badge,
        isActive: plans.is_active,
        createdAt: plans.created_at,
        updatedAt: plans.updated_at,
      })
      .from(plans)
      .leftJoin(classes, eq(plans.class_id, classes.id))
      .orderBy(desc(plans.created_at));

    return rows.map((r) => ({
      ...r,
      className: r.className || "All Classes (Global Default)",
    }));
  }

  async createAdminPlan(input: {
    classId: number | null;
    code?: string;
    title: string;
    description?: string;
    priceInr: number;
    durationDays: number;
    badge?: string;
    isActive?: boolean;
  }) {
    if (input.classId !== null) {
      const [cls] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, input.classId))
        .limit(1);
      if (!cls) throw new NotFoundError("Selected class not found");
    }

    const generatedCode = input.code?.trim().toUpperCase()
      ? input.code.trim().toUpperCase()
      : `CLS_${input.classId || "ALL"}_${Date.now().toString().slice(-5)}`;

    const [existing] = await db
      .select()
      .from(plans)
      .where(eq(plans.code, generatedCode))
      .limit(1);

    if (existing) {
      throw new ConflictError(`Plan code "${generatedCode}" already exists.`);
    }

    const [insertRes] = await db.insert(plans).values({
      class_id: input.classId,
      code: generatedCode,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      price_inr: input.priceInr,
      duration_days: input.durationDays,
      badge: input.badge?.trim() || null,
      is_active: input.isActive ?? true,
    });

    const [created] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, Number(insertRes.insertId)))
      .limit(1);

    return created;
  }

  async updateAdminPlan(
    id: number,
    input: {
      classId?: number | null;
      title?: string;
      description?: string;
      priceInr?: number;
      durationDays?: number;
      badge?: string | null;
      isActive?: boolean;
    }
  ) {
    const [existing] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);

    if (!existing) throw new NotFoundError("Subscription plan not found");

    if (input.classId !== undefined && input.classId !== null) {
      const [cls] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, input.classId))
        .limit(1);
      if (!cls) throw new NotFoundError("Selected class not found");
    }

    await db
      .update(plans)
      .set({
        ...(input.classId !== undefined ? { class_id: input.classId } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() || null }
          : {}),
        ...(input.priceInr !== undefined ? { price_inr: input.priceInr } : {}),
        ...(input.durationDays !== undefined ? { duration_days: input.durationDays } : {}),
        ...(input.badge !== undefined ? { badge: input.badge } : {}),
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      })
      .where(eq(plans.id, id));

    const [updated] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);

    return updated;
  }

  async deleteAdminPlan(id: number) {
    const [existing] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);

    if (!existing) throw new NotFoundError("Subscription plan not found");
    await db.delete(plans).where(eq(plans.id, id));
    return existing;
  }

  // =========================================================================
  // ORDER CREATION & PAYMENT VERIFICATION
  // =========================================================================

  async createOrder(
    userId: number,
    planCode: string,
    referralCode?: string,
    useWallet?: boolean
  ) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(and(eq(plans.code, planCode), eq(plans.is_active, true)))
      .limit(1);

    if (!plan) {
      throw new NotFoundError("Selected subscription plan not found");
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    let discountAmount = 0;
    let appliedReferralCode: string | null = null;

    // Use explicit code or auto-apply user's referredByCode if eligible
    const candidateCode = referralCode?.trim() || user?.referred_by_code?.trim();
    if (candidateCode) {
      try {
        const refCheck = await referralsService.validateReferralCode(
          candidateCode,
          userId,
          plan.price_inr
        );
        discountAmount = refCheck.discountAmount;
        appliedReferralCode = refCheck.referralCode;
      } catch (err) {
        // If explicitly passed by user, propagate error; if auto-applied from registration, ignore if ineligible
        if (referralCode && referralCode.trim()) {
          throw err;
        }
      }
    }

    const amountAfterCode = Math.max(plan.price_inr - discountAmount, 1);
    let walletDiscountUsed = 0;
    if (useWallet && user && user.reward_wallet_balance > 0 && amountAfterCode > 1) {
      walletDiscountUsed = Math.min(user.reward_wallet_balance, amountAfterCode - 1);
    }

    const finalAmount = Math.max(amountAfterCode - walletDiscountUsed, 1);

    let gatewayOrderId = `order_sandbox_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    let gatewayMode: "RAZORPAY" | "SANDBOX" = "SANDBOX";

    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      const authHeader = Buffer.from(
        `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
      ).toString("base64");

      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalAmount * 100,
          currency: "INR",
          receipt: `rcpt_${userId}_${Date.now()}`,
        }),
      });

      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        throw new BadRequestError(`Payment gateway error: ${errText}`);
      }

      const rzpOrder = (await rzpRes.json()) as { id: string };
      gatewayOrderId = rzpOrder.id;
      gatewayMode = "RAZORPAY";
    }

    const [insertRes] = await db.insert(orders).values({
      user_id: userId,
      plan_id: plan.id,
      base_amount: plan.price_inr,
      discount_amount: discountAmount,
      wallet_discount_used: walletDiscountUsed,
      final_amount: finalAmount,
      referral_code_used: appliedReferralCode,
      status: "PENDING",
      gateway: gatewayMode,
      gateway_order_id: gatewayOrderId,
    });

    await trackingService.trackEvent(userId, null, "CHECKOUT_INITIATED", {
      planCode: plan.code,
      finalAmount,
      walletDiscountUsed,
      referralCode: appliedReferralCode,
    });

    return {
      orderId: Number(insertRes.insertId),
      gatewayOrderId,
      gatewayMode,
      razorpayKeyId: env.RAZORPAY_KEY_ID || null,
      currency: "INR",
      baseAmount: plan.price_inr,
      discountAmount,
      walletDiscountUsed,
      finalAmount,
      plan: {
        code: plan.code,
        title: plan.title,
        durationDays: plan.duration_days,
      },
    };
  }

  async verifyPayment(
    userId: number,
    input: {
      gatewayOrderId: string;
      gatewayPaymentId: string;
      signature: string;
    }
  ) {
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.gateway_order_id, input.gatewayOrderId),
          eq(orders.user_id, userId)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError("Payment order not found");
    }

    if (order.status === "PAID") {
      return { alreadyProcessed: true, orderId: order.id };
    }

    if (order.gateway === "RAZORPAY" && env.RAZORPAY_KEY_SECRET) {
      const generatedSig = crypto
        .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
        .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
        .digest("hex");

      const sigBuf = Buffer.from(input.signature || "", "utf8");
      const genBuf = Buffer.from(generatedSig, "utf8");
      const isValid =
        sigBuf.length === genBuf.length && crypto.timingSafeEqual(sigBuf, genBuf);

      if (!isValid) {
        await db
          .update(orders)
          .set({ status: "FAILED" })
          .where(eq(orders.id, order.id));
        throw new BadRequestError("Invalid payment signature verification");
      }
    } else {
      if (!input.gatewayPaymentId || !input.signature.startsWith("sandbox_sig_")) {
        throw new BadRequestError("Invalid sandbox payment verification token");
      }
    }

    return this.activatePaidOrder(order, input.gatewayPaymentId);
  }

  /**
   * Razorpay Server-to-Server Webhook Handler
   * Automatically activates subscription even if student closes browser mid-redirect.
   */
  async handleRazorpayWebhook(rawBody: Buffer | string, signatureHeader: string) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new BadRequestError("RAZORPAY_WEBHOOK_SECRET is not configured");
    }

    const expectedSig = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signatureHeader || "", "utf8");
    const expBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new BadRequestError("Invalid Razorpay webhook signature");
    }

    const payload = JSON.parse(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"));
    const eventName: string = payload?.event || "";

    if (eventName === "payment.captured" || eventName === "order.paid") {
      const paymentEntity = payload?.payload?.payment?.entity;
      const gatewayOrderId: string | undefined =
        paymentEntity?.order_id || payload?.payload?.order?.entity?.id;
      const gatewayPaymentId: string | undefined = paymentEntity?.id;

      if (!gatewayOrderId || !gatewayPaymentId) {
        return { ignored: true, reason: "Missing order_id or payment_id in webhook payload" };
      }

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.gateway_order_id, gatewayOrderId))
        .limit(1);

      if (!order) {
        return { ignored: true, reason: "Order not found in LMS" };
      }

      if (order.status === "PAID") {
        return { alreadyProcessed: true, orderId: order.id };
      }

      return this.activatePaidOrder(order, gatewayPaymentId);
    }

    return { ignored: true, event: eventName };
  }

  /**
   * Shared idempotent helper to mark order PAID, deduct wallet, activate/extend subscription,
   * and credit coupon usage or peer referral rewards.
   */
  private async activatePaidOrder(
    order: typeof orders.$inferSelect,
    gatewayPaymentId: string
  ) {
    const userId = order.user_id;

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, order.plan_id))
      .limit(1);

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    // 1. Mark order PAID
    await db
      .update(orders)
      .set({
        status: "PAID",
        gateway_payment_id: gatewayPaymentId,
      })
      .where(eq(orders.id, order.id));

    // 1b. Deduct wallet balance if wallet discount was used
    if (order.wallet_discount_used > 0) {
      await db
        .update(users)
        .set({
          reward_wallet_balance: sql`GREATEST(0, ${users.reward_wallet_balance} - ${order.wallet_discount_used})`,
        })
        .where(eq(users.id, userId));
    }

    // 2. Activate or Extend Subscription cleanly if an active one already exists
    const now = new Date();
    const [existingActiveSub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.user_id, userId), eq(subscriptions.status, "ACTIVE")))
      .orderBy(desc(subscriptions.expires_at))
      .limit(1);

    const startsAt =
      existingActiveSub && new Date(existingActiveSub.expires_at) > now
        ? new Date(existingActiveSub.expires_at)
        : now;
    const expiresAt = new Date(
      startsAt.getTime() + plan.duration_days * 24 * 60 * 60 * 1000
    );

    await db.insert(subscriptions).values({
      user_id: userId,
      plan_id: plan.id,
      order_id: order.id,
      status: "ACTIVE",
      starts_at: now,
      expires_at: expiresAt,
    });

    // 3. Handle Admin Coupon Code OR Student Peer Referral Reward (with Dynamic Admin Settings)
    if (order.referral_code_used) {
      const [promo] = await db
        .select()
        .from(promo_referral_codes)
        .where(eq(promo_referral_codes.code, order.referral_code_used))
        .limit(1);

      if (promo) {
        await db
          .update(promo_referral_codes)
          .set({ used_count: sql`${promo_referral_codes.used_count} + 1` })
          .where(eq(promo_referral_codes.id, promo.id));
      } else {
        const settings = await referralsService.getReferralSettings();
        const [referrer] = await db
          .select()
          .from(users)
          .where(eq(users.referral_code, order.referral_code_used))
          .limit(1);

        if (referrer && referrer.id !== userId && settings.is_enabled) {
          const referrerRewardedCount = await db
            .select()
            .from(referrals)
            .where(
              and(eq(referrals.referrer_id, referrer.id), eq(referrals.status, "REWARDED"))
            );

          const [existingRef] = await db
            .select()
            .from(referrals)
            .where(eq(referrals.referee_id, userId))
            .limit(1);

          const canReward = referrerRewardedCount.length < settings.max_referrals_per_student;
          const rewardAmt =
            settings.referrer_reward_type === "PERCENT"
              ? Math.round((order.base_amount * settings.referrer_reward_value) / 100)
              : settings.referrer_reward_value;

          if (!existingRef) {
            await db.insert(referrals).values({
              referrer_id: referrer.id,
              referee_id: userId,
              referral_code: order.referral_code_used,
              discount_given: order.discount_amount,
              reward_credited: canReward ? rewardAmt : 0,
              status: canReward ? "REWARDED" : "APPLIED",
            });
            if (canReward && rewardAmt > 0) {
              await db
                .update(users)
                .set({
                  reward_wallet_balance: sql`${users.reward_wallet_balance} + ${rewardAmt}`,
                })
                .where(eq(users.id, referrer.id));
            }
          } else if (existingRef.status !== "REWARDED") {
            await db
              .update(referrals)
              .set({
                discount_given: order.discount_amount,
                reward_credited: canReward ? rewardAmt : 0,
                status: canReward ? "REWARDED" : "APPLIED",
              })
              .where(eq(referrals.id, existingRef.id));

            if (canReward && rewardAmt > 0) {
              await db
                .update(users)
                .set({
                  reward_wallet_balance: sql`${users.reward_wallet_balance} + ${rewardAmt}`,
                })
                .where(eq(users.id, referrer.id));
            }
          } else if (existingRef.status === "REWARDED" && existingRef.discount_given === 0) {
            // Update discount_given when reward was already credited on signup
            await db
              .update(referrals)
              .set({ discount_given: order.discount_amount })
              .where(eq(referrals.id, existingRef.id));
          }
        }
      }
    }

    // 4. Track telemetry
    await trackingService.trackEvent(userId, null, "PAYMENT_SUCCESS", {
      orderId: order.id,
      planCode: plan.code,
      finalAmount: order.final_amount,
    });
    await trackingService.trackEvent(userId, null, "PREMIUM_STAGE_UNLOCKED", {
      planCode: plan.code,
    });

    return {
      orderId: order.id,
      planTitle: plan.title,
      startsAt,
      expiresAt,
      unlocked: true,
    };
  }

  // =========================================================================
  // ADMIN PAYMENTS LEDGER & REVENUE ANALYTICS
  // =========================================================================

  async listAdminOrders(filters: {
    search?: string;
    status?: "ALL" | "PAID" | "PENDING" | "FAILED";
    classGrade?: string;
    gateway?: "ALL" | "RAZORPAY" | "SANDBOX";
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, Math.max(1, filters.limit || 25));
    const offset = (page - 1) * limit;

    const baseConditions: any[] = [];

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      baseConditions.push(
        or(
          like(users.full_name, `%${s}%`),
          like(users.email, `%${s}%`),
          like(users.mobile_number, `%${s}%`),
          like(orders.referral_code_used, `%${s}%`),
          like(orders.gateway_order_id, `%${s}%`),
          like(orders.gateway_payment_id, `%${s}%`)
        )
      );
    }

    if (filters.classGrade && filters.classGrade.trim() !== "" && filters.classGrade !== "all") {
      baseConditions.push(eq(users.class_grade, filters.classGrade.trim()));
    }

    if (filters.gateway && filters.gateway !== "ALL") {
      baseConditions.push(eq(orders.gateway, filters.gateway));
    }

    if (filters.startDate && filters.startDate.trim() !== "") {
      baseConditions.push(sql`${orders.created_at} >= ${filters.startDate.trim() + " 00:00:00"}`);
    }

    if (filters.endDate && filters.endDate.trim() !== "") {
      baseConditions.push(sql`${orders.created_at} <= ${filters.endDate.trim() + " 23:59:59"}`);
    }

    const rowConditions = [...baseConditions];
    if (filters.status && filters.status !== "ALL") {
      rowConditions.push(eq(orders.status, filters.status));
    }

    const whereClause = rowConditions.length > 0 ? and(...rowConditions) : undefined;
    const paidSummaryWhere = and(...baseConditions, eq(orders.status, "PAID"));

    const [
      rows,
      countRows,
      paidAggRows,
      todayAggRows,
      monthAggRows,
      totalStudentRows,
      activePremiumRows,
    ] = await Promise.all([
        db
          .select({
            id: orders.id,
            userId: orders.user_id,
            studentName: users.full_name,
            studentEmail: users.email,
            studentMobile: users.mobile_number,
            studentClassGrade: users.class_grade,
            planId: orders.plan_id,
            planCode: plans.code,
            planTitle: plans.title,
            planClassName: classes.name,
            baseAmount: orders.base_amount,
            discountAmount: orders.discount_amount,
            walletDiscountUsed: orders.wallet_discount_used,
            finalAmount: orders.final_amount,
            referralCodeUsed: orders.referral_code_used,
            status: orders.status,
            gateway: orders.gateway,
            gatewayOrderId: orders.gateway_order_id,
            gatewayPaymentId: orders.gateway_payment_id,
            createdAt: orders.created_at,
            updatedAt: orders.updated_at,
          })
          .from(orders)
          .innerJoin(users, eq(orders.user_id, users.id))
          .leftJoin(plans, eq(orders.plan_id, plans.id))
          .leftJoin(classes, eq(plans.class_id, classes.id))
          .where(whereClause)
          .orderBy(desc(orders.created_at))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .innerJoin(users, eq(orders.user_id, users.id))
          .where(whereClause),

        db
          .select({
            totalRevenueInr: sql<number>`COALESCE(SUM(${orders.final_amount}), 0)`,
            totalBaseAmountInr: sql<number>`COALESCE(SUM(${orders.base_amount}), 0)`,
            totalDiscountGivenInr: sql<number>`COALESCE(SUM(${orders.discount_amount} + ${orders.wallet_discount_used}), 0)`,
            paidOrdersCount: sql<number>`count(*)`,
          })
          .from(orders)
          .innerJoin(users, eq(orders.user_id, users.id))
          .where(paidSummaryWhere),

        db
          .select({
            todayRevenueInr: sql<number>`COALESCE(SUM(${orders.final_amount}), 0)`,
          })
          .from(orders)
          .where(and(eq(orders.status, "PAID"), sql`DATE(${orders.created_at}) = CURDATE()`)),

        db
          .select({
            thisMonthRevenueInr: sql<number>`COALESCE(SUM(${orders.final_amount}), 0)`,
          })
          .from(orders)
          .where(
            and(
              eq(orders.status, "PAID"),
              sql`YEAR(${orders.created_at}) = YEAR(CURDATE()) AND MONTH(${orders.created_at}) = MONTH(CURDATE())`
            )
          ),

        db
          .select({
            totalStudents: sql<number>`count(*)`,
          })
          .from(users)
          .where(eq(users.role, "STUDENT")),

        db
          .select({
            activePremiumCount: sql<number>`COUNT(DISTINCT ${subscriptions.user_id})`,
          })
          .from(subscriptions)
          .innerJoin(users, eq(subscriptions.user_id, users.id))
          .where(
            and(
              eq(users.role, "STUDENT"),
              eq(subscriptions.status, "ACTIVE"),
              gt(subscriptions.expires_at, new Date())
            )
          ),
      ]);

    const total = Number(countRows[0]?.count || 0);
    const totalStudents = Number(totalStudentRows[0]?.totalStudents || 0);
    const activePremiumStudentsCount = Number(activePremiumRows[0]?.activePremiumCount || 0);

    return {
      orders: rows.map((r) => ({
        ...r,
        planClassName: r.planClassName || "Global Plan",
      })),
      summary: {
        totalRevenueInr: Number(paidAggRows[0]?.totalRevenueInr || 0),
        totalBaseAmountInr: Number(paidAggRows[0]?.totalBaseAmountInr || 0),
        totalDiscountGivenInr: Number(paidAggRows[0]?.totalDiscountGivenInr || 0),
        paidOrdersCount: Number(paidAggRows[0]?.paidOrdersCount || 0),
        todayRevenueInr: Number(todayAggRows[0]?.todayRevenueInr || 0),
        thisMonthRevenueInr: Number(monthAggRows[0]?.thisMonthRevenueInr || 0),
        activePremiumStudentsCount,
        freeStudentsCount: Math.max(0, totalStudents - activePremiumStudentsCount),
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}

export const paymentsService = new PaymentsService();
