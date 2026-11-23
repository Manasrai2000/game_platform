import { Request, Response, NextFunction } from "express";
import { eq, desc, like, or, sql, and } from "drizzle-orm";
import { db } from "../../../core/database/connection";
import { users, user_devices, sessions } from "../../../core/database/schema/index";
import { deviceLockService } from "../../devices/public/device-service";
import { NotFoundError } from "../../../core/errors/app-error";

export class UserController {
  /**
   * Admin lists all students with their active device status and profile details.
   */
  async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = (req.query.search as string) || "";
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const whereClause = search
        ? and(
            eq(users.role, "STUDENT"),
            or(
              like(users.full_name, `%${search}%`),
              like(users.email, `%${search}%`),
              like(users.mobile_number, `%${search}%`),
              like(users.school_name, `%${search}%`),
              like(users.city, `%${search}%`),
              like(users.state, `%${search}%`)
            )
          )
        : eq(users.role, "STUDENT");

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

      res.status(200).json({
        success: true,
        data: {
          students: studentList,
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
}

export const userController = new UserController();
