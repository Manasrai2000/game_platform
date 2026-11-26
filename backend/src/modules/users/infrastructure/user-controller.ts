import { Request, Response, NextFunction } from "express";
import { eq, desc, like, or, sql, and, inArray } from "drizzle-orm";
import { db } from "../../../core/database/connection";
import {
  users,
  user_devices,
  sessions,
  subscriptions,
  orders,
  plans,
  classes,
} from "../../../core/database/schema/index";
import { deviceLockService } from "../../devices/public/device-service";
import { NotFoundError, ConflictError } from "../../../core/errors/app-error";
import { hashPassword } from "../../../core/security/argon2";

export class UserController {
  /**
   * Admin lists all students with their active device status and profile details.
   */
  async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = (req.query.search as string) || "";
      const status = req.query.status as string | undefined; // "active" | "inactive" | "all"
      const planTier = req.query.planTier as string | undefined; // "all" | "premium" | "free" | "expired"
      const classGrade = req.query.classGrade as string | undefined;
      const startDate = req.query.startDate as string | undefined; // "YYYY-MM-DD"
      const endDate = req.query.endDate as string | undefined; // "YYYY-MM-DD"

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const baseConditions: any[] = [eq(users.role, "STUDENT")];

      if (search.trim()) {
        const s = search.trim();
        baseConditions.push(
          or(
            like(users.full_name, `%${s}%`),
            like(users.email, `%${s}%`),
            like(users.mobile_number, `%${s}%`),
            like(users.school_name, `%${s}%`),
            like(users.city, `%${s}%`),
            like(users.state, `%${s}%`)
          )
        );
      }

      if (status === "active") {
        baseConditions.push(eq(users.is_active, true));
      } else if (status === "inactive") {
        baseConditions.push(eq(users.is_active, false));
      }

      if (classGrade && classGrade.trim() !== "" && classGrade !== "all") {
        baseConditions.push(eq(users.class_grade, classGrade.trim()));
      }

      if (startDate && startDate.trim() !== "") {
        baseConditions.push(sql`${users.created_at} >= ${startDate.trim() + " 00:00:00"}`);
      }

      if (endDate && endDate.trim() !== "") {
        baseConditions.push(sql`${users.created_at} <= ${endDate.trim() + " 23:59:59"}`);
      }

      const now = new Date();
      const activeSubExists = sql`EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = ${users.id} AND s.status = 'ACTIVE' AND s.expires_at > ${now})`;
      const anySubExists = sql`EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = ${users.id})`;

      const conditions = [...baseConditions];
      if (planTier === "premium") {
        conditions.push(activeSubExists);
      } else if (planTier === "free") {
        conditions.push(sql`NOT ${anySubExists}`);
      } else if (planTier === "expired") {
        conditions.push(sql`NOT ${activeSubExists} AND ${anySubExists}`);
      }

      const whereClause = and(...conditions);
      const baseWhereClause = and(...baseConditions);

      const studentList = await db
        .select({
          id: users.id,
          fullName: users.full_name,
          email: users.email,
          mobileNumber: users.mobile_number,
          classGrade: users.class_grade,
          schoolName: users.school_name,
          city: users.city,
          state: users.state,
          isActive: users.is_active,
          rawPassword: users.raw_password,
          createdAt: users.created_at,
          activeDeviceId: user_devices.id,
          activeDeviceLabel: user_devices.device_label,
          activeDeviceLastSeen: user_devices.last_seen_at,
          activeDeviceBoundIp: user_devices.bound_ip,
        })
        .from(users)
        .leftJoin(
          user_devices,
          and(
            eq(users.id, user_devices.user_id),
            eq(user_devices.status, "ACTIVE")
          )
        )
        .where(whereClause)
        .orderBy(desc(users.created_at))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);
      const total = Number(countResult?.count || 0);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      // Global Free vs Premium tier counts across all students (stays stable while searching/filtering)
      const [tierCounts] = await db
        .select({
          totalStudents: sql<number>`count(*)`,
          premiumCount: sql<number>`COALESCE(SUM(CASE WHEN ${activeSubExists} THEN 1 ELSE 0 END), 0)`,
          expiredCount: sql<number>`COALESCE(SUM(CASE WHEN NOT ${activeSubExists} AND ${anySubExists} THEN 1 ELSE 0 END), 0)`,
          freeCount: sql<number>`COALESCE(SUM(CASE WHEN NOT ${anySubExists} THEN 1 ELSE 0 END), 0)`,
        })
        .from(users)
        .where(eq(users.role, "STUDENT"));

      // Batch-enrich with Class Plan Price, Subscription Status, and Latest Paid Order
      const studentIds = studentList.map((s) => s.id);
      const [allClasses, activePlans] = await Promise.all([
        db.select().from(classes),
        db.select().from(plans).where(eq(plans.is_active, true)),
      ]);

      const subsMap = new Map<number, any[]>();
      const paidOrderMap = new Map<number, any>();

      if (studentIds.length > 0) {
        const [studentSubs, paidOrders] = await Promise.all([
          db
            .select({
              userId: subscriptions.user_id,
              planTitle: plans.title,
              planCode: plans.code,
              planPrice: plans.price_inr,
              status: subscriptions.status,
              startsAt: subscriptions.starts_at,
              expiresAt: subscriptions.expires_at,
            })
            .from(subscriptions)
            .leftJoin(plans, eq(subscriptions.plan_id, plans.id))
            .where(inArray(subscriptions.user_id, studentIds))
            .orderBy(desc(subscriptions.expires_at)),
          db
            .select({
              id: orders.id,
              userId: orders.user_id,
              planTitle: plans.title,
              baseAmount: orders.base_amount,
              discountAmount: orders.discount_amount,
              walletDiscountUsed: orders.wallet_discount_used,
              finalAmount: orders.final_amount,
              referralCodeUsed: orders.referral_code_used,
              gateway: orders.gateway,
              gatewayPaymentId: orders.gateway_payment_id,
              paidAt: orders.updated_at,
              createdAt: orders.created_at,
            })
            .from(orders)
            .leftJoin(plans, eq(orders.plan_id, plans.id))
            .where(and(inArray(orders.user_id, studentIds), eq(orders.status, "PAID")))
            .orderBy(desc(orders.created_at)),
        ]);

        for (const sub of studentSubs) {
          const arr = subsMap.get(sub.userId) || [];
          arr.push(sub);
          subsMap.set(sub.userId, arr);
        }

        for (const ord of paidOrders) {
          if (!paidOrderMap.has(ord.userId)) {
            paidOrderMap.set(ord.userId, ord);
          }
        }
      }

      const enrichedStudents = studentList.map((student) => {
        const matchedClass = student.classGrade
          ? allClasses.find(
              (c) => c.name.toLowerCase().trim() === student.classGrade.toLowerCase().trim()
            )
          : undefined;
        const classPlan =
          (matchedClass && activePlans.find((p) => p.class_id === matchedClass.id)) ||
          activePlans.find((p) => p.class_id === null) ||
          null;

        const userSubs = subsMap.get(student.id) || [];
        const activeSub =
          userSubs.find((s) => s.status === "ACTIVE" && new Date(s.expiresAt) > now) || null;
        const latestSub = activeSub || userSubs[0] || null;
        const planStatus: "PREMIUM" | "EXPIRED" | "FREE" = activeSub
          ? "PREMIUM"
          : latestSub
          ? "EXPIRED"
          : "FREE";

        const latestPaidOrder = paidOrderMap.get(student.id) || null;

        return {
          ...student,
          planStatus,
          classPlanPrice: classPlan ? classPlan.price_inr : null,
          classPlanTitle: classPlan ? classPlan.title : null,
          subscription: latestSub
            ? {
                planTitle: latestSub.planTitle || "Premium Plan",
                status: latestSub.status,
                startsAt: latestSub.startsAt,
                expiresAt: latestSub.expiresAt,
              }
            : null,
          latestPaidOrder,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          students: enrichedStudents,
          summary: {
            totalStudents: Number(tierCounts?.totalStudents || 0),
            premiumCount: Number(tierCounts?.premiumCount || 0),
            expiredCount: Number(tierCounts?.expiredCount || 0),
            freeCount: Number(tierCounts?.freeCount || 0),
          },
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin toggles a student's active status.
   * If deactivating, terminates all active sessions immediately.
   */
  async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = Number(req.params.id);
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!targetUser) {
        throw new NotFoundError("Student not found");
      }

      const newStatus = !targetUser.is_active;

      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ is_active: newStatus })
          .where(eq(users.id, targetUserId));

        if (!newStatus) {
          // If deactivated, revoke all active sessions immediately
          await tx
            .update(sessions)
            .set({ revoked_at: new Date() })
            .where(
              and(eq(sessions.user_id, targetUserId), sql`revoked_at IS NULL`)
            );
        }
      });

      res.status(200).json({
        success: true,
        message: `Student account ${newStatus ? "activated" : "deactivated"} successfully`,
        data: { isActive: newStatus },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin triggers single-device reset for a student:
   * Marks ACTIVE device as REVOKED and terminates active sessions,
   * allowing the student to bind their new laptop on their next login.
   */
  async resetDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = Number(req.params.id);
      const reason = (req.body.reason as string) || "Reset by Administrator";
      const adminUserId = req.user!.id;
      const adminIp = req.ip || req.socket.remoteAddress || "127.0.0.1";

      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!targetUser) {
        throw new NotFoundError("Student not found");
      }

      await deviceLockService.adminRevoke(
        adminUserId,
        targetUserId,
        reason,
        adminIp
      );

      res.status(200).json({
        success: true,
        message:
          "Device lock successfully reset. The student can now log in and bind their new device.",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin updates a student's full profile details (including class/grade, password, status).
   */
  async updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = Number(req.params.id);
      const {
        fullName,
        email,
        mobileNumber,
        classGrade,
        schoolName,
        city,
        state,
        password,
        isActive,
      } = req.body;

      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!targetUser || targetUser.role !== "STUDENT") {
        throw new NotFoundError("Student not found");
      }

      // Check email uniqueness if email changed
      if (email && email.toLowerCase().trim() !== targetUser.email.toLowerCase()) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);
        if (existing) {
          throw new ConflictError("Another account already exists with this email address");
        }
      }

      const updatePayload: Record<string, any> = {};
      if (fullName !== undefined) updatePayload.full_name = fullName.trim();
      if (email !== undefined) updatePayload.email = email.toLowerCase().trim();
      if (mobileNumber !== undefined) updatePayload.mobile_number = mobileNumber.trim();
      if (classGrade !== undefined) updatePayload.class_grade = classGrade.trim();
      if (schoolName !== undefined) updatePayload.school_name = schoolName.trim();
      if (city !== undefined) updatePayload.city = city.trim();
      if (state !== undefined) updatePayload.state = state.trim();
      if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);

      if (password && password.trim().length >= 6) {
        const passwordHash = await hashPassword(password.trim());
        updatePayload.password_hash = passwordHash;
        updatePayload.raw_password = password.trim();
      }

      if (Object.keys(updatePayload).length > 0) {
        await db
          .update(users)
          .set(updatePayload)
          .where(eq(users.id, targetUserId));
      }

      const [updatedUser] = await db
        .select({
          id: users.id,
          fullName: users.full_name,
          email: users.email,
          mobileNumber: users.mobile_number,
          classGrade: users.class_grade,
          schoolName: users.school_name,
          city: users.city,
          state: users.state,
          isActive: users.is_active,
          rawPassword: users.raw_password,
          createdAt: users.created_at,
        })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      res.status(200).json({
        success: true,
        message: "Student details updated successfully",
        data: { student: updatedUser },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin views comprehensive student details including active device,
   * current session, and recent login history.
   */
  async getStudentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = Number(req.params.id);

      const [student] = await db
        .select({
          id: users.id,
          fullName: users.full_name,
          email: users.email,
          mobileNumber: users.mobile_number,
          classGrade: users.class_grade,
          schoolName: users.school_name,
          city: users.city,
          state: users.state,
          isActive: users.is_active,
          rawPassword: users.raw_password,
          createdAt: users.created_at,
          updatedAt: users.updated_at,
        })
        .from(users)
        .where(and(eq(users.id, studentId), eq(users.role, "STUDENT")))
        .limit(1);

      if (!student) {
        throw new NotFoundError("Student not found");
      }

      // Fetch active device binding
      const [activeDevice] = await db
        .select({
          id: user_devices.id,
          deviceLabel: user_devices.device_label,
          boundIp: user_devices.bound_ip,
          status: user_devices.status,
          lastSeenAt: user_devices.last_seen_at,
          createdAt: user_devices.created_at,
        })
        .from(user_devices)
        .where(
          and(
            eq(user_devices.user_id, studentId),
            eq(user_devices.status, "ACTIVE")
          )
        )
        .limit(1);

      // Fetch recent sessions (last 5 sessions)
      const recentSessions = await db
        .select({
          id: sessions.id,
          ipAddress: sessions.ip_address,
          userAgent: sessions.user_agent,
          createdAt: sessions.created_at,
          expiresAt: sessions.expires_at,
          revokedAt: sessions.revoked_at,
        })
        .from(sessions)
        .where(eq(sessions.user_id, studentId))
        .orderBy(desc(sessions.created_at))
        .limit(5);

      // Current active session (latest unrevoked session that hasn't expired)
      const now = new Date();
      const activeSession =
        recentSessions.find(
          (s) => !s.revokedAt && new Date(s.expiresAt) > now
        ) || null;

      // Last login time (from most recent session or device last seen)
      const lastLoginAt =
        recentSessions[0]?.createdAt || activeDevice?.lastSeenAt || null;

      // Fetch subscription & payment order history + class plan pricing
      const [allClasses, activePlans, studentSubs, studentOrders] = await Promise.all([
        db.select().from(classes),
        db.select().from(plans).where(eq(plans.is_active, true)),
        db
          .select({
            id: subscriptions.id,
            planTitle: plans.title,
            planCode: plans.code,
            planPrice: plans.price_inr,
            status: subscriptions.status,
            startsAt: subscriptions.starts_at,
            expiresAt: subscriptions.expires_at,
            createdAt: subscriptions.created_at,
          })
          .from(subscriptions)
          .leftJoin(plans, eq(subscriptions.plan_id, plans.id))
          .where(eq(subscriptions.user_id, studentId))
          .orderBy(desc(subscriptions.expires_at)),
        db
          .select({
            id: orders.id,
            planTitle: plans.title,
            planCode: plans.code,
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
          .leftJoin(plans, eq(orders.plan_id, plans.id))
          .where(eq(orders.user_id, studentId))
          .orderBy(desc(orders.created_at)),
      ]);

      const matchedClass = student.classGrade
        ? allClasses.find(
            (c) => c.name.toLowerCase().trim() === student.classGrade.toLowerCase().trim()
          )
        : undefined;
      const classPlan =
        (matchedClass && activePlans.find((p) => p.class_id === matchedClass.id)) ||
        activePlans.find((p) => p.class_id === null) ||
        null;

      const activeSubscription =
        studentSubs.find((s) => s.status === "ACTIVE" && new Date(s.expiresAt) > now) || null;
      const planStatus: "PREMIUM" | "EXPIRED" | "FREE" = activeSubscription
        ? "PREMIUM"
        : studentSubs.length > 0
        ? "EXPIRED"
        : "FREE";

      res.status(200).json({
        success: true,
        data: {
          student,
          activeDevice: activeDevice || null,
          activeSession: activeSession || null,
          lastLoginAt,
          recentSessions,
          planStatus,
          classPlanPrice: classPlan ? classPlan.price_inr : null,
          classPlanTitle: classPlan ? classPlan.title : null,
          activeSubscription,
          subscriptionHistory: studentSubs,
          paymentOrders: studentOrders,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
