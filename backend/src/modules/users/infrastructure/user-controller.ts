import { Request, Response, NextFunction } from "express";
import { eq, desc, like, or, sql, and } from "drizzle-orm";
import { db } from "../../../core/database/connection";
import { users, user_devices, sessions } from "../../../core/database/schema/index";
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
      const classGrade = req.query.classGrade as string | undefined;
      const startDate = req.query.startDate as string | undefined; // "YYYY-MM-DD"
      const endDate = req.query.endDate as string | undefined; // "YYYY-MM-DD"

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(users.role, "STUDENT")];

      if (search.trim()) {
        const s = search.trim();
        conditions.push(
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
        conditions.push(eq(users.is_active, true));
      } else if (status === "inactive") {
        conditions.push(eq(users.is_active, false));
      }

      if (classGrade && classGrade.trim() !== "" && classGrade !== "all") {
        conditions.push(eq(users.class_grade, classGrade.trim()));
      }

      if (startDate && startDate.trim() !== "") {
        conditions.push(sql`${users.created_at} >= ${startDate.trim() + " 00:00:00"}`);
      }

      if (endDate && endDate.trim() !== "") {
        conditions.push(sql`${users.created_at} <= ${endDate.trim() + " 23:59:59"}`);
      }

      const whereClause = and(...conditions);

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

      res.status(200).json({
        success: true,
        data: {
          student,
          activeDevice: activeDevice || null,
          activeSession: activeSession || null,
          lastLoginAt,
          recentSessions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
