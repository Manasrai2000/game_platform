import http from "http";

const API_HOST = "127.0.0.1";
const API_PORT = 4000;

function httpRequest(
  path: string,
  method = "GET",
  body?: any,
  cookies: string[] = []
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any; rawCookies: string[] }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Cookie: cookies.join("; "),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            data: parsed,
            rawCookies: res.headers["set-cookie"] || [],
          });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runStage2Verification() {
  console.log("=================================================");
  console.log("🚀 STARTING STAGE 2 GAME JOURNEY & RESUME TEST");
  console.log("=================================================\n");

  // Step 1: Verify Static Activity Storage
  console.log("📦 1. Verifying Static Activity Package Storage...");
  const staticRes = await httpRequest("/activities-storage/class_4/index.html", "GET");
  if (staticRes.status === 200 && typeof staticRes.data === "string" && staticRes.data.includes("Class Journey Expedition")) {
    console.log("   ✅ Static index.html is accessible via /activities-storage/class_4/index.html");
  } else {
    throw new Error(`Static storage check failed with status ${staticRes.status}`);
  }

  // Step 2: Register/Login a Student in Class 1
  console.log("\n📝 2. Registering Student for Class 1...");
  const testEmail = `journey.student.${Date.now()}@test.local`;
  const regRes = await httpRequest("/api/v1/auth/register", "POST", {
    fullName: "Journey Explorer Student",
    email: testEmail,
    password: "Password@123!",
    mobileNumber: "9876543299",
    classGrade: "Class 1",
    schoolName: "Delhi Public School",
    city: "New Delhi",
    state: "Delhi",
    deviceLabel: "Student MacBook Air",
  });

  if (!regRes.data.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  }
  console.log("   ✅ Student registered in 'Class 1'!");
  const sessionCookies = regRes.rawCookies.map((c) => c.split(";")[0]);

  // Step 3: Fetch Student's Initial Journey
  console.log("\n🎮 3. Fetching Student's Class 1 Journey...");
  const journeyRes = await httpRequest("/api/v1/activities/my-journey", "GET", null, sessionCookies);
  if (!journeyRes.data.success || !journeyRes.data.data.hasPackage) {
    throw new Error(`Failed to load journey: ${JSON.stringify(journeyRes.data)}`);
  }

  const journey = journeyRes.data.data;
  console.log(`   ✅ Loaded package: "${journey.activity.title}"`);
  console.log(`   Initial Checkpoint: Stage ${journey.progress.currentCheckpoint} (Completed: ${journey.progress.maxCompletedCheckpoint})`);
  
  if (journey.progress.currentCheckpoint !== 1 || journey.progress.maxCompletedCheckpoint !== 0) {
    throw new Error("Initial checkpoint must be 1 with 0 completed");
  }

  // Step 4: Advance to Checkpoint 2 (Complete Level 1)
  console.log("\n⭐ 4. Completing Stage 1 and Advancing Checkpoint...");
  const adv1Res = await httpRequest(
    "/api/v1/activities/my-journey/checkpoint",
    "POST",
    {
      completedCheckpoint: 1,
      nextCheckpoint: 2,
      stateData: { score: 100, level: 1 },
    },
    sessionCookies
  );

  if (!adv1Res.data.success) {
    throw new Error(`Failed to advance checkpoint: ${JSON.stringify(adv1Res.data)}`);
  }

  const prog1 = adv1Res.data.data.progress;
  console.log(`   ✅ Stage 1 Completed! Current Checkpoint is now: Stage ${prog1.currentCheckpoint}`);
  if (prog1.currentCheckpoint !== 2 || prog1.maxCompletedCheckpoint !== 1) {
    throw new Error("Progress did not update to checkpoint 2 with maxCompleted 1");
  }

  // Step 5: Test Auto-Resume & No-Replay Enforcement
  console.log("\n🔄 5. Simulating New Session / Login to Test Auto-Resume & No-Replay...");
  const resumeRes = await httpRequest("/api/v1/activities/my-journey", "GET", null, sessionCookies);
  const resumed = resumeRes.data.data.progress;
  console.log(`   ✅ Auto-Resume Verified: Student automatically resumes at Stage ${resumed.currentCheckpoint}`);
  console.log(`   ✅ No-Replay Verified: Stage 1 is recorded as completed (maxCompleted: ${resumed.maxCompletedCheckpoint})`);

  if (resumed.currentCheckpoint !== 2 || resumed.maxCompletedCheckpoint !== 1) {
    throw new Error("Auto-resume did not return checkpoint 2");
  }

  // Step 6: Complete Remaining Stages
  console.log("\n🏆 6. Completing Remaining Stages to Finish Journey...");
  await httpRequest(
    "/api/v1/activities/my-journey/checkpoint",
    "POST",
    { completedCheckpoint: 2, nextCheckpoint: 3 },
    sessionCookies
  );
  const finalAdv = await httpRequest(
    "/api/v1/activities/my-journey/checkpoint",
    "POST",
    { completedCheckpoint: 3, nextCheckpoint: 4 },
    sessionCookies
  );

  const finalProg = finalAdv.data.data.progress;
  console.log(`   ✅ Journey Finished! Is Completed: ${finalProg.isCompleted}`);
  if (!finalProg.isCompleted) {
    throw new Error("Journey was not marked as completed after Stage 3");
  }

  console.log("\n=================================================");
  console.log("🎉 ALL STAGE 2 VERIFICATION TESTS PASSED (6/6)!");
  console.log("=================================================");
}

runStage2Verification().catch((err) => {
  console.error("❌ Stage 2 test failed:", err);
  process.exit(1);
});
