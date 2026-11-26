# Educational Activity Integration & API Guide

Yeh documentation aapko batayega ki **kisi bhi HTML5 / JavaScript Educational Game Activity ko LMS Platform ke sath kaise connect karna hai**, kaun-si APIs use hoti hain, aur **sabse easy & manageable tarika** kaun-sa hai.

---

## 1. Sabse Easy & Manageable Tarika Kaun-sa Hai?

Activities ko platform se connect karne ke **2 tarike** hain:

### ⭐ Option A: `postMessage` Bridge (RECOMMENDED — Sabse Easy & Zero Maintenance)
Jab student Dashboard par **PLAY** click karta hai, to hamara LMS platform aapki activity (`index.html`) ko ek secure Full-Page `<iframe>` me kholta hai aur URL me current progress, demo limit, aur subscription status automatically bhej deta hai.

* **Aapki activity ko koi `fetch()`, cookie, CORS, ya Paywall logic likhne ki zarurat NAHI padti.**
* Jab student koi stage/level jeet jaye, to activity ko sirf **1 function** (`EduGameBridge.completeStage(...)`) call karna hota hai.
* Parent LMS Dashboard (`frontend/src/app/dashboard/page.tsx`) khud:
  1. Backend API (`POST /api/v1/activities/my-journey/checkpoint`) call karke MySQL me progress save karta hai.
  2. Agar Demo khatam ho gaya aur student subscribed nahi hai, to automatically **Full-Page Subscription Paywall** open kar deta hai.
  3. Browser Back button aur keyboard shortcuts lock rakhta hai.
* **Why is this the most manageable?** Kal ko agar backend API URLs, payment rules, ya tracking endpoints change hote hain, to aapko **50 activity ZIPs dobara edit aur re-upload nahi karne padenge**—sirf LMS dashboard handle karega!

### Option B: Direct REST API Calls (Advanced / Standalone Mode)
Agar aapki activity bina Dashboard iframe ke direct browser tab me chal rahi hai (same domain / valid session cookies ke sath), tab aap niche Section 4 wale direct `fetch()` functions copy-paste kar sakate hain.

---

## 2. LMS Platform Activity Ko URL Se Kya Data Bhejta Hai?

Jab platform aapki activity (`index.html`) load karta hai, to URL automatically is format me hota hai:
```text
http://localhost:4000/activities-storage/class_4/index.html?checkpoint=1&maxCompleted=0&demoLimit=1&isSubscribed=0
```

| Query Parameter | Example | Meaning & Rule |
|---|---|---|
| `checkpoint` | `1`, `2`, `3` | Student abhi **is stage** par resume kar raha hai. Game isi stage se start hona chahiye. |
| `maxCompleted` | `0`, `1`, `2` | Student itni stages pehle hi pass kar chuka hai. In stages (`<= maxCompleted`) ko **dobara replay nahi karne dena hai**. |
| `demoLimit` | `1` | Admin Panel se set ki gayi **Free Demo Stages** ki limit. |
| `isSubscribed` | `0` or `1` | `1` = Paid Subscription Active; `0` = Sirf Demo stages (`<= demoLimit`) allowed hain. *(Admin Preview me yeh param nahi hota, to sab stages open rehti hain).* |

---

## 3. Copy-Paste Ready Helper Code (Har Activity Me Lagayein)

Is code block ko copy karke apni har nayi activity ke `game.js` (ya `index.html` ke `<script>`) ke sabse upar paste kar dijiye. Isse **Auto-Resume, Demo/Premium Lock, Anti-Replay, Browser Back Lock, aur Progress Save** sab kuch ek sath lag jayega!

```javascript
/**
 * ============================================================================
 * EDU-GAME LMS BRIDGE (Copy-Paste Ready Helper)
 * Handles: Auto-Resume, Anti-Replay, Demo/Paywall Check, Browser Lock, & Save
 * ============================================================================
 */
const EduGameBridge = (function () {
  const params = new URLSearchParams(window.location.search);

  const state = {
    currentCheckpoint: parseInt(params.get("checkpoint"), 10) || 1,
    maxCompleted: parseInt(params.get("maxCompleted"), 10) || 0,
    demoLimit: parseInt(params.get("demoLimit"), 10) || 1,
    // Admin preview me isSubscribed query param nahi hota, isliye default true rakhte hain
    isSubscribed: !params.has("isSubscribed") || params.get("isSubscribed") === "1",
  };

  /**
   * 1. Activity load hote hi call karein -> Standalone bypass check + Browser Back Lock
   */
  function init(onResumeCallback) {
    // Security Guard: Prevent direct URL bypass outside LMS Portal
    if (window.self === window.top) {
      document.body.innerHTML =
        '<div style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
        '<h2 style="color:#4f46e5;">🔒 Authorized LMS Portal Required</h2>' +
        '<p style="color:#475569;">Please open this activity from your Student Dashboard.</p>' +
        '</div>';
      return;
    }

    // Lock Browser Back Button inside iframe
    try {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", function () {
        window.history.pushState(null, "", window.location.href);
        console.warn("Browser back navigation is locked during gameplay.");
      });
    } catch (e) {}

    // Block Backspace / Alt+Left / Cmd+[ / Mouse Back buttons
    window.addEventListener(
      "keydown",
      function (e) {
        const isInput =
          e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
        if (e.key === "Backspace" && !isInput) e.preventDefault();
        if (
          (e.altKey && e.key === "ArrowLeft") ||
          (e.metaKey && (e.key === "ArrowLeft" || e.key === "["))
        ) {
          e.preventDefault();
        }
      },
      true
    );

    window.addEventListener(
      "mouseup",
      function (e) {
        if (e.button === 3 || e.button === 4) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    if (typeof onResumeCallback === "function") {
      onResumeCallback(state.currentCheckpoint, state);
    }
  }

  /**
   * 2. Stage open karne se pehle check karein ki student is stage ko khel sakta hai ya nahi
   */
  function canPlayStage(stageNumber) {
    if (stageNumber <= state.maxCompleted) {
      return { allowed: false, reason: "COMPLETED_NO_REPLAY" };
    }
    if (!state.isSubscribed && stageNumber > state.demoLimit) {
      return { allowed: false, reason: "PREMIUM_LOCKED" };
    }
    if (stageNumber > state.currentCheckpoint) {
      return { allowed: false, reason: "FUTURE_STAGE_LOCKED" };
    }
    return { allowed: true, reason: "OK" };
  }

  /**
   * 3. Jab student koi stage/level complete kare to is function ko call karein
   */
  function completeStage(completedStageNumber, nextStageNumber, extraStateData = {}) {
    state.maxCompleted = Math.max(state.maxCompleted, completedStageNumber);
    state.currentCheckpoint = Math.max(state.currentCheckpoint, nextStageNumber);

    // Parent LMS Dashboard ko notify karein (Ye automatic API call + Paywall trigger karega)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "EDUCATION_GAME_CHECKPOINT_COMPLETED",
          completedCheckpoint: completedStageNumber,
          nextCheckpoint: nextStageNumber,
          stateData: {
            currentLevel: nextStageNumber,
            lastCompleted: completedStageNumber,
            timestamp: Date.now(),
            ...extraStateData,
          },
        },
        "*"
      );
    }

    // Agar demo limit complete hui aur user subscribed nahi hai to game ko yahi pause karein
    const needsSubscription = !state.isSubscribed && completedStageNumber >= state.demoLimit;
    return {
      needsSubscription,
      nextStage: nextStageNumber,
    };
  }

  return {
    state,
    init,
    canPlayStage,
    completeStage,
  };
})();
```

### Iska Use Apne Game Me Kaise Karein? (Example):

```javascript
// 1. Game start hone par initialize & auto-resume karein:
EduGameBridge.init(function (resumeStage, state) {
  console.log("Resuming at Stage:", resumeStage);
  loadStage(resumeStage);
});

// 2. Kisi stage ko render karne se pehle permission check karein:
function loadStage(stageNum) {
  const check = EduGameBridge.canPlayStage(stageNum);

  if (!check.allowed) {
    if (check.reason === "COMPLETED_NO_REPLAY") {
      alert("Yeh stage pehle hi complete ho chuki hai! Replay allowed nahi hai.");
    } else if (check.reason === "PREMIUM_LOCKED") {
      alert("Yeh Premium stage hai! Unlock karne ke liye subscribe karein.");
    } else {
      alert("Pehle pichhli stage complete karein.");
    }
    return;
  }

  // Stage render karein...
}

// 3. Jab student Stage 1 Jeet Jaye:
function onPlayerWinsStage(stageNum, score) {
  const res = EduGameBridge.completeStage(stageNum, stageNum + 1, { score: score });

  if (res.needsSubscription) {
    // Parent LMS platform automatically Full-Page Subscription Paywall khol dega!
    showMessage("Demo Complete! Subscription plans open ho rahe hain...");
    return;
  }

  // Agli stage par move karein
  setTimeout(() => loadStage(res.nextStage), 1200);
}
```

---

## 4. Direct Backend REST APIs Reference (Copy-Paste Fetch Functions)

Agar kabhi aapko activity ke andar se **direct backend API** call karni ho (bina parent iframe ke), to yeh 4 endpoints use hote hain. *(Note: `credentials: "include"` zaruri hai taaki auth session cookie backend ko jaye).*

```javascript
const API_BASE = "http://localhost:4000/api/v1";
```

### API 1: User Validation, Subscription & Progress Check
* **Endpoint:** `GET /api/v1/tracking/user-activity-status`
* **Use:** Check karne ke liye ki user valid hai, device locked hai, demo complete hua ya nahi, aur subscription active hai ya nahi.

```javascript
async function validateStudentStatus() {
  const res = await fetch(`${API_BASE}/tracking/user-activity-status`, {
    method: "GET",
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "User validation failed");
  }
  return json.data;
  // Returns:
  // {
  //   user: { id, fullName, classGrade, myReferralCode },
  //   access: { hasActiveSubscription, isDeviceLocked, isDesktop },
  //   activity: { currentCheckpoint, maxCompletedCheckpoint, demoCheckpoints, isDemoCompleted, canProceed, lockReason }
  // }
}
```

---

### API 2: Activity Package & Saved Journey State Load Karna
* **Endpoint:** `GET /api/v1/activities/my-journey`
* **Use:** Student ki class ka active game package aur `journeyState` JSON fetch karne ke liye.

```javascript
async function fetchStudentJourney() {
  const res = await fetch(`${API_BASE}/activities/my-journey`, {
    method: "GET",
    credentials: "include",
  });
  const json = await res.json();
  return json.data;
}
```

---

### API 3: Checkpoint Complete Karna & Progress Save Karna
* **Endpoint:** `POST /api/v1/activities/my-journey/checkpoint`
* **Use:** Stage complete hone par DB me save karne ke liye. *(Agar student bina subscription ke Demo se aage badhne ki koshish karega to server `403 Forbidden` return karega).*

```javascript
async function saveCompletedCheckpoint(completedCheckpoint, nextCheckpoint, stateData = {}) {
  const res = await fetch(`${API_BASE}/activities/my-journey/checkpoint`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      completedCheckpoint, // e.g., 1
      nextCheckpoint,      // e.g., 2
      stateData,           // e.g., { score: 100, timeSpent: 45 }
    }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to save checkpoint");
  }
  return json.data;
  // Returns: { progress, demoCompleted: true/false, subscriptionRequired: true/false }
}
```

---

### API 4: Custom Activity Event Track Karna (Analytics)
* **Endpoint:** `POST /api/v1/tracking/event`
* **Use:** Game analytics track karne ke liye (jaise `HINT_USED`, `GAME_STARTED`, `WRONG_ATTEMPT`, `STAGE_CLEARED`).

```javascript
async function trackActivityEvent(eventType, classId = null, metadata = {}) {
  await fetch(`${API_BASE}/tracking/event`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType, // e.g., "GAME_HINT_USED"
      classId,
      metadata,
    }),
  });
}
```

---

## 5. Easy Manageability Architecture (Pro Tip for Scale)

Agar aapke paas **10, 20 ya 50 alag-alag activities** hain (e.g. Class 1 se Class 10 ke alag games), to sabse maintainable workflow yeh rahega:

1. **Standardized Contract:** Har activity ke andar sirf `EduGameBridge` (`postMessage` pattern) use karein—**direct API URLs (`localhost:4000`) games ke andar hardcode na karein.**
2. **Dynamic URL Switching:** Jab aap production server (e.g. `https://app.yourschool.com`) par deploy karenge, to `postMessage` ko koi domain change karne ki zarurat nahi padegi—sirf frontend `NEXT_PUBLIC_API_URL` update karne se saari 50 activities bina kisi re-upload ke kaam karengi!
3. **ZIP Packaging Checklist (Admin Upload ke liye):**
   * ZIP file ke root level par **`index.html`** hona chahiye (kisi extra nested folder ke andar nahi).
   * Total stages count (`totalCheckpoints`) aur free demo stages (`demoCheckpointsCount`) Admin Panel → **Game Activities → Demo Config** se set karein.
   * Upload karne ke baad Admin Panel me **Preview** button par click karke stages verify kar lein.
