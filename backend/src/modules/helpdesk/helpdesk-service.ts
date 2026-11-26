import crypto from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../core/database/connection";
import { support_tickets, users, SupportTicketModel } from "../../core/database/schema/index";
import { NotFoundError } from "../../core/errors/app-error";
import { emailService } from "../../core/email/email-service";
import { AuthenticatedUser } from "../../core/middleware/auth-guard";

export type TicketCategory =
  | "LOGIN_DEVICE_LOCK"
  | "REGISTRATION_OTP"
  | "PASSWORD_RESET"
  | "PAYMENT_SUBSCRIPTION"
  | "ACTIVITY_BUG"
  | "OTHER";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type SlaTier = "LATE_CRITICAL" | "AGING_HIGH" | "NORMAL" | "RESOLVED";

export interface EnrichedTicket extends SupportTicketModel {
  ageHours: number;
  isUnresolved: boolean;
  slaTier: SlaTier;
  studentClassGrade: string | null;
}

function enrichTicket(
  row: SupportTicketModel,
  studentClassGrade: string | null = null
): EnrichedTicket {
  const now = Date.now();
  const createdMs = new Date(row.created_at).getTime();
  const ageHours = Math.max(0, Math.round(((now - createdMs) / 3600000) * 10) / 10);
  const isUnresolved = row.status === "OPEN" || row.status === "IN_PROGRESS";

  let slaTier: SlaTier = "RESOLVED";
  if (isUnresolved) {
    if (ageHours >= 48 || row.priority === "URGENT") {
      slaTier = "LATE_CRITICAL";
    } else if (ageHours >= 24 || row.priority === "HIGH") {
      slaTier = "AGING_HIGH";
    } else {
      slaTier = "NORMAL";
    }
  }

  return {
    ...row,
    ageHours,
    isUnresolved,
    slaTier,
    studentClassGrade,
  };
}

function getTierRank(tier: SlaTier): number {
  switch (tier) {
    case "LATE_CRITICAL":
      return 3;
    case "AGING_HIGH":
      return 2;
    case "NORMAL":
      return 1;
    case "RESOLVED":
    default:
      return 0;
  }
}

export class HelpdeskService {
  /**
   * Submit a support ticket from either an authenticated student OR a non-registered guest.
   */
  async createTicket(
    authUser: AuthenticatedUser | undefined,
    input: {
      name: string;
      email: string;
      mobile?: string;
      category: TicketCategory;
      subject: string;
      description: string;
    }
  ) {
    const cleanEmail = (authUser?.email || input.email).toLowerCase().trim();
    const cleanName = (authUser?.fullName || input.name).trim();
    const cleanMobile = (authUser?.mobileNumber || input.mobile || "").trim() || null;

    let linkedUserId: number | null = authUser?.id || null;
    let isRegistered = Boolean(authUser);

    if (!linkedUserId) {
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (existingUser) {
        linkedUserId = existingUser.id;
        isRegistered = true;
      }
    }

    // Generate human-readable Ticket Number e.g. TKT-48219
    const randomNum = 10000 + crypto.randomInt(0, 89999);
    const ticketNumber = `TKT-${randomNum}`;

    // Auto-elevate priority slightly for urgent blocks like device lock or payment
    const defaultPriority: TicketPriority =
      input.category === "LOGIN_DEVICE_LOCK" || input.category === "PAYMENT_SUBSCRIPTION"
        ? "HIGH"
        : "MEDIUM";

    const [ins] = await db.insert(support_tickets).values({
      ticket_number: ticketNumber,
      user_id: linkedUserId,
      is_registered_user: isRegistered,
      requester_name: cleanName,
      requester_email: cleanEmail,
      requester_mobile: cleanMobile,
      category: input.category,
      subject: input.subject.trim(),
      description: input.description.trim(),
      status: "OPEN",
      priority: defaultPriority,
    });

    const [created] = await db
      .select()
      .from(support_tickets)
      .where(eq(support_tickets.id, Number(ins.insertId)))
      .limit(1);

    // Non-blocking email notification
    emailService
      .sendHelpdeskEmail({
        to: cleanEmail,
        recipientName: cleanName,
        ticketNumber,
        subject: created.subject,
        status: created.status,
        isNewTicket: true,
      })
      .catch(() => {});

    return enrichTicket(created, authUser?.classGrade || null);
  }

  /**
   * Student: Fetch all tickets submitted by the logged-in user.
   */
  async getMyTickets(userId: number, email: string) {
    const byUserId = await db
      .select()
      .from(support_tickets)
      .where(eq(support_tickets.user_id, userId))
      .orderBy(desc(support_tickets.created_at));

    const byEmail = await db
      .select()
      .from(support_tickets)
      .where(eq(support_tickets.requester_email, email.toLowerCase().trim()))
      .orderBy(desc(support_tickets.created_at));

    const mergedMap = new Map<number, SupportTicketModel>();
    for (const t of [...byUserId, ...byEmail]) {
      mergedMap.set(t.id, t);
    }

    return Array.from(mergedMap.values())
      .map((t) => enrichTicket(t))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Public: Non-registered guest status lookup by Ticket Number + Email.
   */
  async trackGuestTicket(ticketNumber: string, email: string) {
    const cleanTicket = ticketNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    const [found] = await db
      .select()
      .from(support_tickets)
      .where(
        and(
          eq(support_tickets.ticket_number, cleanTicket),
          eq(support_tickets.requester_email, cleanEmail)
        )
      )
      .limit(1);

    if (!found) {
      throw new NotFoundError(
        "No ticket found matching that Ticket Number and Email address."
      );
    }

    return enrichTicket(found);
  }

  /**
   * Admin: Lists tickets sorted strictly by Unresolved & Late/Aging Priority Queue.
   */
  async listAdminTickets(filters?: {
    status?: string;
    userType?: "all" | "registered" | "guest";
    category?: string;
    search?: string;
  }) {
    const rows = await db
      .select({
        ticket: support_tickets,
        studentClass: users.class_grade,
      })
      .from(support_tickets)
      .leftJoin(users, eq(support_tickets.user_id, users.id));

    const enrichedAll = rows.map((r) => enrichTicket(r.ticket, r.studentClass));

    // Summary KPIs before filtering
    const summary = {
      totalAll: enrichedAll.length,
      totalOpen: enrichedAll.filter((t) => t.isUnresolved).length,
      lateCriticalCount: enrichedAll.filter((t) => t.slaTier === "LATE_CRITICAL").length,
      agingHighCount: enrichedAll.filter((t) => t.slaTier === "AGING_HIGH").length,
      resolvedCount: enrichedAll.filter((t) => !t.isUnresolved).length,
    };

    // Apply filters
    let filtered = enrichedAll;
    if (filters?.status && filters.status !== "all") {
      if (filters.status === "unresolved") {
        filtered = filtered.filter((t) => t.isUnresolved);
      } else {
        filtered = filtered.filter((t) => t.status === filters.status);
      }
    }

    if (filters?.userType === "registered") {
      filtered = filtered.filter((t) => t.is_registered_user);
    } else if (filters?.userType === "guest") {
      filtered = filtered.filter((t) => !t.is_registered_user);
    }

    if (filters?.category && filters.category !== "all") {
      filtered = filtered.filter((t) => t.category === filters.category);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.requester_name.toLowerCase().includes(q) ||
          t.requester_email.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
      );
    }

    // Priority Queue Sorting:
    // 1. Unresolved before Resolved
    // 2. Higher SLA tier first (LATE_CRITICAL > AGING_HIGH > NORMAL > RESOLVED)
    // 3. Oldest unresolved tickets first (created_at ASC)
    // 4. Resolved tickets newest resolved first
    filtered.sort((a, b) => {
      if (a.isUnresolved !== b.isUnresolved) {
        return a.isUnresolved ? -1 : 1;
      }

      if (a.isUnresolved && b.isUnresolved) {
        const rankDiff = getTierRank(b.slaTier) - getTierRank(a.slaTier);
        if (rankDiff !== 0) return rankDiff;
        // Oldest unresolved ticket comes FIRST so late tickets get resolved quickly!
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      // Both resolved: newest updated/resolved first
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return {
      tickets: filtered,
      summary,
    };
  }

  /**
   * Admin: Update ticket status, priority, and resolution reply.
   */
  async updateAdminTicket(
    ticketId: number,
    adminId: number,
    input: {
      status?: TicketStatus;
      priority?: TicketPriority;
      adminReply?: string;
    }
  ) {
    const [existing] = await db
      .select()
      .from(support_tickets)
      .where(eq(support_tickets.id, ticketId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Support ticket not found");
    }

    const nextStatus = input.status ?? existing.status;
    const isNowResolved = nextStatus === "RESOLVED" || nextStatus === "CLOSED";

    await db
      .update(support_tickets)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.adminReply !== undefined ? { admin_reply: input.adminReply.trim() || null } : {}),
        ...(isNowResolved && !existing.resolved_at
          ? { resolved_at: new Date(), resolved_by_admin_id: adminId }
          : !isNowResolved
          ? { resolved_at: null, resolved_by_admin_id: null }
          : {}),
      })
      .where(eq(support_tickets.id, ticketId));

    const [updated] = await db
      .select()
      .from(support_tickets)
      .where(eq(support_tickets.id, ticketId))
      .limit(1);

    // Send update email when resolved or replied
    if (isNowResolved || (input.adminReply && input.adminReply.trim())) {
      emailService
        .sendHelpdeskEmail({
          to: updated.requester_email,
          recipientName: updated.requester_name,
          ticketNumber: updated.ticket_number,
          subject: updated.subject,
          status: updated.status,
          adminReply: updated.admin_reply,
          isNewTicket: false,
        })
        .catch(() => {});
    }

    return enrichTicket(updated);
  }
}

export const helpdeskService = new HelpdeskService();
