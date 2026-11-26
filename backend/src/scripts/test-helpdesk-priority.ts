import http from "http";
import { db, pool } from "../core/database/connection";
import { users, support_tickets } from "../core/database/schema/index";
import { eq, inArray } from "drizzle-orm";
import { hashPassword } from "../core/security/argon2";

function httpReq(
  path: string,
  method: string,
  body?: unknown,
  cookie?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 4000,
        path: `/api/v1${path}`,
        method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              json: JSON.parse(data),
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              json: { raw: data },
            });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runHelpdeskPriorityE2E() {
  console.log("==============================================================");
  console.log("🧪 E2E VERIFICATION: HELPDESK (GUEST + STUDENT + SLA QUEUE)");
  console.log("==============================================================");

  const ts = Date.now();
  const password = "HelpdeskTestPassword123!";
  const passwordHash = await hashPassword(password);

  const [adminIns] = await db.insert(users).values({
    email: `hd_admin_${ts}@test.local`,
    password_hash: passwordHash,
    full_name: "Helpdesk Admin",
    mobile_number: "9999999961",
    class_grade: "Class 1",
    school_name: "Admin HQ",
    role: "ADMIN",
    is_active: true,
    email_verified_at: new Date(),
  });
  const adminId = Number(adminIns.insertId);

  const [stuIns] = await db.insert(users).values({
    email: `hd_stu_${ts}@test.local`,
    password_hash: passwordHash,
    full_name: "Helpdesk Student",
    mobile_number: "9999999962",
    class_grade: "Class 1",
    school_name: "Test School",
    role: "STUDENT",
    referral_code: `HDSTU${ts}`.slice(0, 14).toUpperCase(),
    is_active: true,
    email_verified_at: new Date(),
  });
  const stuId = Number(stuIns.insertId);

  const createdTicketIds: number[] = [];

  try {
    const adminLogin = await httpReq("/auth/login", "POST", {
      email: `hd_admin_${ts}@test.local`,
      password,
      deviceLabel: "Admin Browser",
    });
    const adminCookie = (adminLogin.headers["set-cookie"] || [])
      .map((c) => c.split(";")[0])
      .join("; ");

    const stuLogin = await httpReq("/auth/login", "POST", {
      email: `hd_stu_${ts}@test.local`,
      password,
      deviceLabel: "Student Browser",
    });
    const stuCookie = (stuLogin.headers["set-cookie"] || [])
      .map((c) => c.split(";")[0])
      .join("; ");

    // 1. Non-Registered Guest Ticket Submission
    console.log("1️⃣ Testing Non-Registered Guest ticket submission...");
    const guestEmail = `guest_visitor_${ts}@example.com`;
    const guestSubmit = await httpReq("/helpdesk/tickets", "POST", {
      name: "Non-Registered Parent",
      email: guestEmail,
      mobile: "9876500001",
      category: "REGISTRATION_OTP",
      subject: `Guest OTP issue ${ts}`,
      description: "I am trying to register my child but did not see the OTP email.",
    });
    if (
      guestSubmit.status !== 201 ||
      guestSubmit.json.data.ticket.is_registered_user !== false
    ) {
      throw new Error("Guest ticket creation failed: " + JSON.stringify(guestSubmit.json));
    }
    const guestTkt = guestSubmit.json.data.ticket;
    createdTicketIds.push(guestTkt.id);
    console.log(`   ✅ Guest ticket created: ${guestTkt.ticket_number} (is_registered_user=false)`);

    // 2. Public Guest Tracking Lookup
    console.log("2️⃣ Testing Public Guest ticket lookup...");
    const trackRes = await httpReq(
      `/helpdesk/track?ticketNumber=${encodeURIComponent(guestTkt.ticket_number)}&email=${encodeURIComponent(guestEmail)}`,
      "GET"
    );
    if (trackRes.status !== 200 || trackRes.json.data.ticket.status !== "OPEN") {
      throw new Error("Guest ticket tracking failed: " + JSON.stringify(trackRes.json));
    }
    console.log("   ✅ Public tracker returned OPEN status cleanly");

    // 3. Registered Student Submission + My Tickets
    console.log("3️⃣ Testing Registered Student ticket submission...");
    const stuSubmit = await httpReq(
      "/helpdesk/tickets",
      "POST",
      {
        name: "Helpdesk Student",
        email: `hd_stu_${ts}@test.local`,
        category: "PASSWORD_RESET",
        subject: `Student password reset ${ts}`,
        description: "Please help reset my login password.",
      },
      stuCookie
    );
    if (
      stuSubmit.status !== 201 ||
      stuSubmit.json.data.ticket.is_registered_user !== true ||
      stuSubmit.json.data.ticket.user_id !== stuId
    ) {
      throw new Error("Student ticket creation failed: " + JSON.stringify(stuSubmit.json));
    }
    createdTicketIds.push(stuSubmit.json.data.ticket.id);

    const myTickets = await httpReq("/helpdesk/my-tickets", "GET", undefined, stuCookie);
    if (
      myTickets.status !== 200 ||
      !myTickets.json.data.tickets.some((t: any) => t.id === stuSubmit.json.data.ticket.id)
    ) {
      throw new Error("Student my-tickets missing newly created ticket");
    }
    console.log("   ✅ Registered student ticket linked & visible in my-tickets");

    // 4. Test SLA Aging Priority Queue Sorting (Late >48h, Aging >24h, Normal <24h, Resolved at bottom)
    console.log("4️⃣ Testing SLA Aging Priority Queue Sorting (Late/Old Unresolved First)...");
    const now = Date.now();
    const hoursAgo = (h: number) => new Date(now - h * 3600000);

    const [lateIns] = await db.insert(support_tickets).values({
      ticket_number: `TKT-LATE-${ts}`.slice(0, 20),
      is_registered_user: false,
      requester_name: "Late Ticket User",
      requester_email: "late@test.local",
      category: "OTHER",
      subject: `LATE 72h Ticket ${ts}`,
      description: "Submitted 72 hours ago and still unresolved.",
      status: "OPEN",
      priority: "MEDIUM",
      created_at: hoursAgo(72),
    });
    const lateId = Number(lateIns.insertId);
    createdTicketIds.push(lateId);

    const [agingIns] = await db.insert(support_tickets).values({
      ticket_number: `TKT-AGE-${ts}`.slice(0, 20),
      is_registered_user: false,
      requester_name: "Aging Ticket User",
      requester_email: "aging@test.local",
      category: "OTHER",
      subject: `AGING 30h Ticket ${ts}`,
      description: "Submitted 30 hours ago and still unresolved.",
      status: "OPEN",
      priority: "MEDIUM",
      created_at: hoursAgo(30),
    });
    const agingId = Number(agingIns.insertId);
    createdTicketIds.push(agingId);

    const [freshIns] = await db.insert(support_tickets).values({
      ticket_number: `TKT-NEW-${ts}`.slice(0, 20),
      is_registered_user: false,
      requester_name: "Fresh Ticket User",
      requester_email: "fresh@test.local",
      category: "OTHER",
      subject: `FRESH 1h Ticket ${ts}`,
      description: "Submitted 1 hour ago.",
      status: "OPEN",
      priority: "MEDIUM",
      created_at: hoursAgo(1),
    });
    const freshId = Number(freshIns.insertId);
    createdTicketIds.push(freshId);

    const [resolvedIns] = await db.insert(support_tickets).values({
      ticket_number: `TKT-RES-${ts}`.slice(0, 20),
      is_registered_user: false,
      requester_name: "Resolved Ticket User",
      requester_email: "resolved@test.local",
      category: "OTHER",
      subject: `RESOLVED 80h Ticket ${ts}`,
      description: "Old ticket already resolved.",
      status: "RESOLVED",
      priority: "URGENT",
      created_at: hoursAgo(80),
      resolved_at: hoursAgo(2),
    });
    const resolvedId = Number(resolvedIns.insertId);
    createdTicketIds.push(resolvedId);

    const adminList = await httpReq(
      `/helpdesk/admin/tickets?search=${ts}`,
      "GET",
      undefined,
      adminCookie
    );
    const orderedIds = adminList.json.data.tickets.map((t: any) => t.id);

    const idxLate = orderedIds.indexOf(lateId);
    const idxAging = orderedIds.indexOf(agingId);
    const idxFresh = orderedIds.indexOf(freshId);
    const idxResolved = orderedIds.indexOf(resolvedId);

    if (!(idxLate < idxAging && idxAging < idxFresh && idxFresh < idxResolved)) {
      throw new Error(
        `Unexpected priority sort order! Indices: late=${idxLate}, aging=${idxAging}, fresh=${idxFresh}, resolved=${idxResolved}`
      );
    }
    console.log(
      `   ✅ Exact Priority Queue order verified: [72h LATE (#${idxLate + 1}) -> 30h AGING (#${idxAging + 1}) -> 1h NORMAL (#${idxFresh + 1}) -> RESOLVED (#${idxResolved + 1})]`
    );

    // 5. Admin Resolves Guest Ticket & Verifies Guest Sees Reply
    console.log("5️⃣ Admin resolving guest ticket & testing guest status check...");
    const resolveRes = await httpReq(
      `/helpdesk/admin/tickets/${guestTkt.id}`,
      "PATCH",
      {
        status: "RESOLVED",
        priority: "HIGH",
        adminReply: "Your email verification quota was cleared. Please try registering again!",
      },
      adminCookie
    );
    if (
      resolveRes.status !== 200 ||
      resolveRes.json.data.ticket.status !== "RESOLVED" ||
      !resolveRes.json.data.ticket.resolved_at
    ) {
      throw new Error("Admin ticket resolution failed: " + JSON.stringify(resolveRes.json));
    }

    const trackResolved = await httpReq(
      `/helpdesk/track?ticketNumber=${encodeURIComponent(guestTkt.ticket_number)}&email=${encodeURIComponent(guestEmail)}`,
      "GET"
    );
    if (
      trackResolved.json.data.ticket.status !== "RESOLVED" ||
      !trackResolved.json.data.ticket.admin_reply.includes("quota was cleared")
    ) {
      throw new Error("Guest tracker did not reflect RESOLVED status and admin reply");
    }
    console.log("   ✅ Admin resolution & guest status tracking verified!");
    console.log("==============================================================");
    console.log("🎉 ALL HELPDESK & PRIORITY QUEUE E2E TESTS PASSED!");
    console.log("==============================================================");
  } finally {
    if (createdTicketIds.length > 0) {
      await db.delete(support_tickets).where(inArray(support_tickets.id, createdTicketIds));
    }
    await db.delete(users).where(eq(users.id, adminId));
    await db.delete(users).where(eq(users.id, stuId));
    await pool.end();
  }
}

runHelpdeskPriorityE2E().catch((err) => {
  console.error("❌ Helpdesk E2E Failed:", err);
  process.exit(1);
});
