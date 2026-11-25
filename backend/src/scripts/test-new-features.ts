import http from "http";
import { createApp } from "../app";
import { pool } from "../core/database/connection";
import { authRepository } from "../modules/auth/infrastructure/auth-repository";

let server: http.Server;
let port = 0;

function httpRequest(
  path: string,
  method: string,
  body?: any,
  cookies?: string[],
  headers?: Record<string, string>
): Promise<{ status: number; data: any; cookies: string[] }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers || {}),
    };

    if (cookies && cookies.length > 0) {
      reqHeaders["Cookie"] = cookies.map((c) => c.split(";")[0]).join("; ");
    }

    if (body) {
      reqHeaders["Content-Length"] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          let parsed: any;
          try {
            parsed = JSON.parse(resData);
          } catch {
            parsed = resData;
          }
          const setCookieHeaders = res.headers["set-cookie"] || [];
          resolve({
            status: res.statusCode || 0,
            data: parsed,
            cookies: Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders],
          });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("=================================================");
  console.log("🧪 TESTING NEW FEATURES: MOBILE ACCESS, PASSWORDS & STUDENT EDIT");
  console.log("=================================================\n");

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        port = addr.port;
      }
      console.log(`🚀 In-memory test server listening on http://127.0.0.1:${port}\n`);
      resolve();
    });
  });

  const testEmail = `student_${Date.now()}@example.com`;
  const initialPassword = "MyInitialSecret123!";

  const mobilePublicKey = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestpublickeymobile" + Date.now();

  // 1. Send OTP first
  console.log("📧 1a. Testing Email OTP Dispatch for Registration...");
  const otpRes = await httpRequest(
    "/api/v1/auth/send-otp",
    "POST",
    {
      email: testEmail,
      fullName: "Mobile Student Rahul",
    }
  );
  if (otpRes.status !== 200 || !otpRes.data.success) {
    console.error("❌ Send OTP failed:", otpRes.data);
    process.exit(1);
  }
  const otpRecord = await authRepository.getLatestEmailVerification(testEmail);
  console.log(`   ✅ OTP generated and sent to email! (Code: ${otpRecord!.otp_code})`);

  // 1b. Test Mobile User-Agent and Sec-CH-UA-Mobile with valid OTP
  console.log("📱 1b. Testing Registration with Email OTP from Mobile / Tablet Device...");
  const regRes = await httpRequest(
    "/api/v1/auth/register",
    "POST",
    {
      fullName: "Mobile Student Rahul",
      email: testEmail,
      mobileNumber: "9876543210",
      classGrade: "Class 1",
      schoolName: "St. Xavier School",
      city: "Mumbai",
      state: "Maharashtra",
      password: initialPassword,
      otp: otpRecord!.otp_code,
      clientPublicKeySpki: mobilePublicKey,
      dbscSessionId: "mobile-session-" + Date.now(),
      deviceLabel: "Samsung Galaxy Tab S9",
    },
    [],
    {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Sec-CH-UA-Mobile": "?1",
    }
  );

  if (regRes.status !== 201) {
    console.error("❌ Registration from mobile failed:", regRes.status, regRes.data);
    process.exit(1);
  }
  const studentId = regRes.data.data.user.id;
  console.log(`   ✅ Registered student from mobile device without restriction! (ID: ${studentId})`);

  // 2. Admin Login
  console.log("\n🔑 2. Admin Logging in to Inspect Student List...");
  const adminLoginRes = await httpRequest(
    "/api/v1/auth/login",
    "POST",
    {
      email: "admin@gameplatform.local",
      password: "Admin@Secure123!",
      deviceLabel: "Admin MacBook Pro",
    }
  );

  if (adminLoginRes.status !== 200) {
    console.error("❌ Admin login failed:", adminLoginRes.data);
    process.exit(1);
  }
  const adminCookies = adminLoginRes.cookies;
  console.log("   ✅ Admin logged in successfully!");

  // 3. Admin Listing Students and Viewing Password
  console.log("\n👀 3. Admin Fetching Student List & Verifying Password Field...");
  const listRes = await httpRequest(
    `/api/v1/users/students?search=${encodeURIComponent(testEmail)}`,
    "GET",
    null,
    adminCookies
  );

  if (listRes.status !== 200 || !listRes.data.data.students.length) {
    console.error("❌ Failed to fetch students:", listRes.data);
    process.exit(1);
  }

  const foundStudent = listRes.data.data.students[0];
  console.log(`   Student Name: ${foundStudent.fullName}`);
  console.log(`   Student Class: ${foundStudent.classGrade}`);
  console.log(`   Student Password in Admin List: ${foundStudent.rawPassword}`);

  if (foundStudent.rawPassword !== initialPassword) {
    console.error(`❌ Expected password "${initialPassword}", got: "${foundStudent.rawPassword}"`);
    process.exit(1);
  }
  console.log("   ✅ Admin can see student's password in the student list!");

  // 4. Admin Editing All Details (Class, School, City, Password)
  console.log("\n✏️ 4. Admin Editing Student Details & Changing Class & Password...");
  const newPassword = "UpdatedNewPassword999!";
  const updateRes = await httpRequest(
    `/api/v1/users/students/${studentId}`,
    "PUT",
    {
      fullName: "Rahul M. Sharma (Updated)",
      email: testEmail,
      mobileNumber: "9123456789",
      classGrade: "Class 4", // Changing class from Class 1 to Class 4!
      schoolName: "Modern School Barakhamba",
      city: "New Delhi",
      state: "Delhi",
      password: newPassword,
      isActive: true,
    },
    adminCookies
  );

  if (updateRes.status !== 200) {
    console.error("❌ Student update failed:", updateRes.data);
    process.exit(1);
  }

  const updatedStudent = updateRes.data.data.student;
  console.log("   ✅ Updated Student Details:");
  console.log(`      • Full Name: ${updatedStudent.fullName}`);
  console.log(`      • New Class: ${updatedStudent.classGrade}`);
  console.log(`      • New School: ${updatedStudent.schoolName}`);
  console.log(`      • New Raw Password: ${updatedStudent.rawPassword}`);

  if (updatedStudent.classGrade !== "Class 4" || updatedStudent.rawPassword !== newPassword) {
    console.error("❌ Updated details mismatch!");
    process.exit(1);
  }

  // 5. Student Logging In with New Password
  console.log("\n🔓 5. Student Logging In with New Password from Tablet...");
  const studentLoginRes = await httpRequest(
    "/api/v1/auth/login",
    "POST",
    {
      email: testEmail,
      password: newPassword,
      clientPublicKeySpki: mobilePublicKey,
      deviceLabel: "Samsung Galaxy Tab S9",
    },
    regRes.cookies,
    {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-X810)",
    }
  );

  if (studentLoginRes.status !== 200) {
    console.error("❌ Student login with new password failed:", studentLoginRes.data);
    process.exit(1);
  }
  console.log("   ✅ Student successfully logged in with the updated password!");

  // 6. Test GET /api/v1/users/students/:id (View Details with Last Login & Session Info)
  console.log("\n👁️ 6. Admin Testing Student Full Details & Session Info (GET /api/v1/users/students/:id)...");
  const detailsRes = await httpRequest(
    `/api/v1/users/students/${studentId}`,
    "GET",
    undefined,
    adminCookies
  );

  if (detailsRes.status !== 200 || !detailsRes.data.success) {
    console.error("❌ Failed to fetch student full details:", detailsRes.data);
    process.exit(1);
  }

  const details = detailsRes.data.data;
  console.log("   ✅ Student details retrieved successfully:");
  console.log(`      • Name: ${details.student.fullName}`);
  console.log(`      • Password: ${details.student.rawPassword}`);
  console.log(`      • Last Login At: ${details.lastLoginAt}`);
  console.log(`      • Bound Device: ${details.activeDevice?.deviceLabel} (IP: ${details.activeDevice?.boundIp})`);
  console.log(`      • Active Session: ${details.activeSession ? "YES (ID: " + details.activeSession.id + ")" : "NO"}`);
  console.log(`      • Recent Sessions Count: ${details.recentSessions?.length || 0}`);

  if (!details.lastLoginAt || !details.activeDevice) {
    console.error("❌ Expected lastLoginAt and activeDevice to be present!");
    process.exit(1);
  }

  // 7. Testing Filters (Active, Deactivated, Class, Date Range)
  console.log("\n🔍 7. Testing Admin Filters (Active, Inactive, Class, Date Range)...");

  // 7.1 Filter Active Only
  const activeOnlyRes = await httpRequest(
    "/api/v1/users/students?status=active",
    "GET",
    undefined,
    adminCookies
  );
  if (activeOnlyRes.status !== 200 || !activeOnlyRes.data.success) {
    console.error("❌ Failed active status filter:", activeOnlyRes.data);
    process.exit(1);
  }
  const allActive = activeOnlyRes.data.data.students.every((s: any) => s.isActive === true);
  if (!allActive) {
    console.error("❌ Active-only filter returned inactive students!");
    process.exit(1);
  }
  console.log(`   ✅ Active-only filter returned ${activeOnlyRes.data.data.students.length} students (all isActive === true)`);

  // 7.2 Deactivate student to test deactivated list
  console.log("   🔄 Deactivating student...");
  const toggleRes = await httpRequest(
    `/api/v1/users/students/${studentId}/status`,
    "PATCH",
    undefined,
    adminCookies
  );
  if (toggleRes.status !== 200 || !toggleRes.data.success || toggleRes.data.data.isActive !== false) {
    console.error("❌ Failed to deactivate student:", toggleRes.data);
    process.exit(1);
  }
  console.log("   ✅ Student deactivated successfully.");

  // 7.3 Filter Inactive Only
  const inactiveOnlyRes = await httpRequest(
    "/api/v1/users/students?status=inactive",
    "GET",
    undefined,
    adminCookies
  );
  if (inactiveOnlyRes.status !== 200 || !inactiveOnlyRes.data.success) {
    console.error("❌ Failed inactive status filter:", inactiveOnlyRes.data);
    process.exit(1);
  }
  const foundInInactive = inactiveOnlyRes.data.data.students.some((s: any) => s.id === studentId && s.isActive === false);
  if (!foundInInactive) {
    console.error("❌ Deactivated filter did not return the deactivated student!");
    process.exit(1);
  }
  console.log(`   ✅ Deactivated filter successfully returned deactivated student! (Total inactive: ${inactiveOnlyRes.data.data.students.length})`);

  // 7.4 Filter by Class
  const classFilterRes = await httpRequest(
    "/api/v1/users/students?classGrade=Class%204",
    "GET",
    undefined,
    adminCookies
  );
  if (classFilterRes.status !== 200 || !classFilterRes.data.success) {
    console.error("❌ Failed class filter:", classFilterRes.data);
    process.exit(1);
  }
  const foundInClass4 = classFilterRes.data.data.students.some((s: any) => s.id === studentId);
  if (!foundInClass4) {
    console.error("❌ Class 4 filter did not return our Class 4 student!");
    process.exit(1);
  }
  console.log(`   ✅ Class filter ('Class 4') returned expected students!`);

  // 7.5 Filter by Date Range (Today)
  const today = new Date().toISOString().slice(0, 10);
  const dateFilterRes = await httpRequest(
    `/api/v1/users/students?startDate=${today}&endDate=${today}`,
    "GET",
    undefined,
    adminCookies
  );
  if (dateFilterRes.status !== 200 || !dateFilterRes.data.success) {
    console.error("❌ Failed date filter:", dateFilterRes.data);
    process.exit(1);
  }
  const foundInDate = dateFilterRes.data.data.students.some((s: any) => s.id === studentId);
  if (!foundInDate) {
    console.error("❌ Date range filter did not return student created today!");
    process.exit(1);
  }
  console.log(`   ✅ Date range filter (${today} to ${today}) successfully returned student!`);

  // 7.6 Reactivate student
  await httpRequest(`/api/v1/users/students/${studentId}/status`, "PATCH", undefined, adminCookies);
  console.log("   ✅ Reactivated student back to active.");

  console.log("\n=================================================");
  console.log("🎉 ALL TESTS PASSED! ALL REQUIREMENTS VERIFIED 100%");
  console.log("=================================================");
}

runTests()
  .catch((err) => {
    console.error("❌ Test crashed:", err);
    process.exit(1);
  })
  .finally(() => {
    if (server) server.close();
    pool.end();
  });
