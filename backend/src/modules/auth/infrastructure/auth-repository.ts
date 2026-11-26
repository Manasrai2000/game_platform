import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../../../core/database/connection";
import { users, sessions, auth_audit_logs, emailVerifications, User, EmailVerification } from "../../../core/database/schema/index";
import { generateUUID } from "../../../core/security/tokens";

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    return user || null;
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  async createUser(data: {
    fullName: string;
    email: string;
    mobileNumber: string;
    classGrade: string;
    schoolName: string;
    city?: string;
    state?: string;
    passwordHash: string;
    rawPassword?: string;
    role?: "STUDENT" | "ADMIN";
    referredByCode?: string;
  }): Promise<User> {
    const [result] = await db.insert(users).values({
      full_name: data.fullName,
      email: data.email.toLowerCase().trim(),
      mobile_number: data.mobileNumber.trim(),
      class_grade: data.classGrade.trim(),
      school_name: data.schoolName.trim(),
      city: (data.city || "").trim(),
      state: (data.state || "").trim(),
      password_hash: data.passwordHash,
      raw_password: data.rawPassword || null,
      role: data.role || "STUDENT",
      referred_by_code: data.referredByCode ? data.referredByCode.trim().toUpperCase() : null,
      is_active: true,
      email_verified_at: new Date(),
    });

    const newId = Number(result.insertId);
    const cleanPrefix = (data.fullName || "STU").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5) || "STU";
    const generatedRefCode = `${cleanPrefix}${100 + newId}`;

    await db
      .update(users)
      .set({ referral_code: generatedRefCode })
      .where(eq(users.id, newId));

    const user = await this.findById(newId);
    if (!user) throw new Error("User creation failed to return entity");
    return user;
  }

  async createEmailVerification(data: {
    email: string;
    otpCode: string;
    expiresAt: Date;
  }): Promise<void> {
    await db.insert(emailVerifications).values({
      email: data.email.toLowerCase().trim(),
      otp_code: data.otpCode,
      expires_at: data.expiresAt,
      is_verified: false,
    });
  }

  async getLatestEmailVerification(email: string): Promise<EmailVerification | null> {
    const [record] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, email.toLowerCase().trim()))
      .orderBy(desc(emailVerifications.created_at))
      .limit(1);
    return record || null;
  }

  async markEmailVerified(id: number): Promise<void> {
    await db
      .update(emailVerifications)
      .set({ is_verified: true })
      .where(eq(emailVerifications.id, id));
  }

  async createSession(data: {
    userId: number;
    deviceId: number | null;
    sessionTokenHash: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
  }): Promise<string> {
    const sessionId = generateUUID();
    await db.insert(sessions).values({
      id: sessionId,
      user_id: data.userId,
      device_id: data.deviceId,
      session_token_hash: data.sessionTokenHash,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      expires_at: data.expiresAt,
    });
    return sessionId;
  }

  async revokeSession(sessionTokenHash: string): Promise<void> {
    await db
      .update(sessions)
      .set({ revoked_at: new Date() })
      .where(eq(sessions.session_token_hash, sessionTokenHash));
  }

  async updateUserPassword(userId: number, newPasswordHash: string, rawPassword?: string): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Update password
      await tx
        .update(users)
        .set({
          password_hash: newPasswordHash,
          ...(rawPassword ? { raw_password: rawPassword } : {}),
        })
        .where(eq(users.id, userId));

      // 2. Terminate all active sessions for this user (preserves user_devices lock!)
      await tx
        .update(sessions)
        .set({ revoked_at: new Date() })
        .where(and(eq(sessions.user_id, userId), sql`revoked_at IS NULL`));
    });
  }

  async updateProfile(
    userId: number,
    data: {
      fullName?: string;
      mobileNumber?: string;
      schoolName?: string;
      city?: string;
      state?: string;
      passwordHash?: string;
      rawPassword?: string;
    }
  ): Promise<User> {
    const updatePayload: Record<string, any> = {};
    if (data.fullName !== undefined) updatePayload.full_name = data.fullName.trim();
    if (data.mobileNumber !== undefined) updatePayload.mobile_number = data.mobileNumber.trim();
    if (data.schoolName !== undefined) updatePayload.school_name = data.schoolName.trim();
    if (data.city !== undefined) updatePayload.city = data.city.trim();
    if (data.state !== undefined) updatePayload.state = data.state.trim();
    if (data.passwordHash !== undefined) {
      updatePayload.password_hash = data.passwordHash;
      updatePayload.raw_password = data.rawPassword || null;
    }

    if (Object.keys(updatePayload).length > 0) {
      await db.update(users).set(updatePayload).where(eq(users.id, userId));
    }

    const updated = await this.findById(userId);
    if (!updated) throw new Error("User not found after update");
    return updated;
  }

  async logEvent(
    actorId: number | null,
    targetId: number | null,
    eventType: string,
    ip: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await db.insert(auth_audit_logs).values({
      actor_user_id: actorId,
      target_user_id: targetId,
      event_type: eventType,
      ip_address: ip,
      metadata_json: metadata || null,
    });
  }
}

export const authRepository = new AuthRepository();
