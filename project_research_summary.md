# Stage 1 Architecture & Security Blueprint: Subscription LMS

> [!NOTE]
> **Project Context & Quotation Alignment (`LMS_Quotation (1).pdf`)**  
> **Budget:** ₹65,000 (Desktop & Laptop Browsers Only) | **Timeline:** 45–60 Calendar Days  
> **Payment Milestones:** 30% Advance (₹19,500) | 40% Staging (₹26,000) | 30% Final Handover (₹19,500)  
> **Stage 1 Deliverables:** Module 1 (Auth & Profiles), Module 2 (Admin User Mgmt), Module 3 (Single-Device Restriction) totaling **₹19,000** (29.2% of project total, perfectly aligned with the 30% advance).

---

## 1. Executive Summary & Core Security Realities

Your proposed technology stack—**MySQL 8** (with **MySQL Workbench** for modeling/inspections), a **Node.js Modular Monolith** structured around **Clean Architecture**, and a **Next.js App Router (v16)** frontend—is ideal for delivering a robust, maintainable desktop-only LMS within the 45–60 day schedule.

Focusing Stage 1 strictly on authentication, roles, and single-device locking lays an unshakeable foundation before building activities, subscriptions, or payment flows.

### Two Critical Architectural Boundaries

1. **Physical Hardware ID Limitations on the Web:**
   > [!WARNING]
   > No standard browser or web application can extract an immutable physical hardware identifier (such as CPU ID, Motherboard UUID, or MAC address) across browser cache wipes or OS reinstalls. This boundary is already explicitly noted in your quotation's scope exclusions.
   
   To make the single-device restriction practically unbreachable, fragile client-side browser fingerprinting must be replaced with:
   - A strict **Admin-gated device state machine** enforced by MySQL 8 database constraints.
   - Server-side stateful sessions.
   - Non-extractable WebCrypto cryptographic keys stored in IndexedDB.
   - Hardware-backed session binding (**Chrome DBSC** and **WebAuthn Level 3**) where supported.

2. **Module 4 Threat Vector (HTML/JS Activity ZIP Packages):**
   > [!CAUTION]
   > Uploaded interactive activity packages contain arbitrary JavaScript. If these scripts run on the same origin as your main LMS application, a single poorly written or malicious package can read cookies, hijack authenticated sessions, and bypass device locks entirely.
   
   - Cookie scoping must use the `__Host-` prefix from Day 1.
   - Interactive activity previews must be served from a completely separate sandbox domain (e.g., `lms-activities-sandbox.in`) inside an isolated `<iframe>`.

---

## 2. Quotation Scope Review & Stage 1 Alignment

| Scope Item | Quotation Specification | Architectural & Implementation Decision |
| :--- | :--- | :--- |
| **Platform Target** | Strictly desktop & laptop browsers | Enforce desktop-only gating at the HTTP header layer (`Sec-CH-UA-Mobile`) and CSS viewport/pointer layer. Mobile testing is excluded. |
| **User Roles** | Two roles: `ADMIN` and `STUDENT` | Strict Role-Based Access Control (RBAC). Admin requires mandatory 2FA/MFA. Student requires device locking. |
| **Deliverables & Budget** | 11 Modules totaling ₹65,000 | **Stage 1 (Core Security & Auth):** Modules 1, 2, 3 (₹19,000).<br>**Stage 2 (Learning Engine):** Modules 4, 5, 6, 7 (Activities, Progress, Dashboard).<br>**Stage 3 (Monetization & Go-Live):** Modules 8, 9, 10, 11 (Subscriptions, Payments, Referrals, Deployment). |
| **Exclusions (Client-Provided)** | Domain, hosting, Email/OTP, payment gateway | Confirm client-supplied email provider (AWS SES, Resend, Brevo) and hosting topology early to prevent Stage 1 schedule slippage. |

---

## 3. Technology Stack & MySQL Workbench Workflow

Choosing active, long-term supported runtimes avoids premature migrations and tooling friction.

### Recommended Technology Stack

| Layer | Recommended Choice | Technical Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Node.js 26 Active LTS**<br>*(or Node.js 24 Maintenance LTS)* | Node.js 20 reached EOL on April 30, 2026. Node.js 22 reaches EOL on April 30, 2027. Node 26 entered Active LTS in late October 2026 (EOL April 2029). Node 26 provides native `crypto.randomUUIDv7()` and top-tier V8 performance. |
| **Database** | **MySQL 8.x** (InnoDB Engine) | InnoDB is mandatory. It supports transactional row-level locking (`SELECT ... FOR UPDATE`) needed to eliminate concurrent login race conditions, foreign key cascades, and virtual generated columns. |
| **ORM / Query Layer** | **Drizzle ORM** (`mysql2` driver) | MySQL lacks partial unique indexes (`WHERE status = 'ACTIVE'`). DB-enforced device locking requires a MySQL 8 generated column with a unique index. Drizzle supports `.generatedAlwaysAs()` and `.for('update')` natively in code and migration files. |
| **Frontend** | **Next.js 16** (App Router, TS) | Renames `middleware.ts` to `proxy.ts` (running on Node runtime by default), implements dynamic rendering by default to avoid accidental data caching, and pairs cleanly with BFF/DAL patterns. |
| **Password Hashing** | **Argon2id** (`@node-rs/argon2`) | OWASP's default standard for new applications. Memory-hard against GPU/ASIC cracking, resistant to side-channel attacks, and free of bcrypt's silent 72-byte truncation flaw. |
| **Rate Limiting** | **`rate-limiter-flexible`** | Provides atomic rate-limiting counters backed directly by MySQL (`mysql2`) on Day 1—saving Redis hosting costs initially—while allowing seamless switching to Redis/Valkey later. |

### Keeping MySQL Workbench Synchronized (Zero Schema Drift)

> [!IMPORTANT]
> Never execute ad-hoc schema modifications (`ALTER TABLE`) directly in production or staging through MySQL Workbench.

```
+-------------------------------------------------------+
|  1. Drizzle TypeScript Schema (src/core/schema.ts)    |  <-- Single Source of Truth
+-------------------------------------------------------+
                           |
                           v  drizzle-kit generate
+-------------------------------------------------------+
|  2. Versioned SQL Migration Files (drizzle/xxxx.sql)  |  <-- Checked into Git
+-------------------------------------------------------+
                           |
                           v  drizzle-kit migrate
+-------------------------------------------------------+
|  3. MySQL 8 Database (Local / Staging / Production)  |
+-------------------------------------------------------+
                           |
                           v  Database > Reverse Engineer...
+-------------------------------------------------------+
|  4. MySQL Workbench Visual EER Diagram (.mwb / PDF)   |  <-- For inspection & documentation
+-------------------------------------------------------+
```

1. **Single Source of Truth:** Define every table, column, generated column, foreign key, and unique index in Drizzle TypeScript schema.
2. **Automated Migrations:** Generate versioned SQL files via `drizzle-kit generate` and apply them using `drizzle-kit migrate`.
3. **Workbench Role:** Use MySQL Workbench strictly for visual schema modeling, slow query inspection (`EXPLAIN ANALYZE`), index audits, and generating client-ready EER diagrams via **Database > Reverse Engineer...**.

---

## 4. Backend Modular Monolith Architecture (Clean Architecture)

For an 11-module LMS delivered in 45–60 days, a Modular Monolith offers the maintenance benefits of domain isolation without the deployment and operational complexity of microservices.

```
backend/
├── src/
│   ├── core/                           # Shared Kernel & Cross-Cutting Concerns
│   │   ├── database/                   # Drizzle client, mysql2 pool
│   │   ├── errors/                     # AppError hierarchy, error handler
│   │   ├── security/                   # Argon2id, HMAC, CSPRNG helpers
│   │   ├── rate-limiter/               # rate-limiter-flexible factory
│   │   └── logger/                     # Pino structured logger
│   │
│   ├── modules/
│   │   ├── auth/                       # [Stage 1] Core Auth & Email OTP
│   │   │   ├── domain/                 # Password policy, OTP entity, session rules
│   │   │   ├── application/            # Register, Login, Logout, ResetPassword use cases
│   │   │   ├── infrastructure/         # MySQL repos, email adapter, controllers, routes
│   │   │   └── public/                 # Exported interfaces (IAuthSessionVerifier)
│   │   │
│   │   ├── devices/                    # [Stage 1] Single-Device Lock System
│   │   │   ├── domain/                 # Device binding state machine (ACTIVE, REVOKED)
│   │   │   ├── application/            # VerifyOrBindDevice, RequestSwitch, AdminReset
│   │   │   ├── infrastructure/         # MySQL repo with FOR UPDATE, WebCrypto/DBSC verifier
│   │   │   └── public/                 # IDeviceLockService
│   │   │
│   │   ├── users/                      # [Stage 1] Admin User Management & Profiles
│   │   │   ├── domain/                 # User entity, roles (ADMIN, STUDENT)
│   │   │   ├── application/            # ListUsers, ToggleUserStatus, ProfileManagement
│   │   │   ├── infrastructure/         # MySQL user repo, admin HTTP controllers
│   │   │   └── public/                 # IUsersPublicApi
│   │   │
│   │   ├── activities/                 # [Stage 2] ZIP Upload, Extraction, Sandbox Links
│   │   ├── subscriptions/              # [Stage 2] Plans, Trials, Expiry Management
│   │   ├── payments/                   # [Stage 2] Gateway Integration, Webhooks
│   │   └── referrals/                  # [Stage 2] Referral Codes, Attribution
│   │
│   ├── composition-root.ts             # Dependency wiring & router mounting (/api/v1/...)
│   └── server.ts                       # HTTP server entry point
│
└── tests/
    ├── unit/                           # Domain and use-case tests with in-memory mocks
    └── integration/                    # Supertest HTTP tests against isolated MySQL test DB
```

### Architectural Directory Breakdown

| Directory Path | Architectural Layer | Responsibilities and Strict Boundaries |
| :--- | :--- | :--- |
| `src/core/` | Shared Kernel | Global `AppError` hierarchy, Pino structured logging, Zod environment validation, MySQL connection pool, cryptographic helpers (Argon2id, HMAC, CSPRNG), rate-limiter factory, and HTTP hardening middleware (Helmet, CORS, Fetch-Metadata CSRF guard). |
| `src/modules/auth/` | **Stage 1 Core**<br>(Auth & OTP) | `domain/` (password rules, OTP lifecycle), `application/` (Login, Register, Logout, ForgotPassword use cases), `infrastructure/` (MySQL repos, email adapter, controllers, Zod validators), `public/` (`IAuthSessionVerifier`, `IAuthSessionRevoker`). |
| `src/modules/devices/` | **Stage 1 Core**<br>(Device Lock) | `domain/` (device state machine), `application/` (VerifyOrBindDevice, RequestSwitch, AdminResetDevice), `infrastructure/` (transactional repo with `SELECT ... FOR UPDATE`, WebCrypto verifier), `public/` (`IDeviceLockService`). |
| `src/modules/users/` | **Stage 1 Core**<br>(User Mgmt) | `domain/` (`User` entity, `ADMIN`/`STUDENT` roles), `application/` (SearchUsers, DeactivateUser with immediate session purge), `infrastructure/` (admin routes, user repos), `public/` (`IUsersPublicApi`). Credentials are kept in a separate `AuthUser` type so `password_hash` never leaks into profile DTOs. |
| `src/modules/activities/` | **Stage 2 Module** | ZIP ingestion (Zip Slip and zip-bomb validation), access rules, signed sandboxed iframe URL generation. |
| `src/modules/subscriptions/`| **Stage 2 Module** | Trial calculations, subscription plans, coupon validation, subscription start/expiry tracking. |
| `src/modules/payments/` | **Stage 2 Module** | Payment gateway adapter, checkout creation, server signature verification, idempotent webhook handling. |
| `src/modules/referrals/` | **Stage 2 Module** | Referral link generation, conversion tracking, reward attribution. |
| `src/composition-root.ts` | Dependency Wiring | Wires concrete MySQL repos into use cases, injects use cases into controllers, and mounts routes under `/api/v1/`. |
| `tests/` | Automated Verification| `unit/` (domain/use-case tests with in-memory mocks) and `integration/` (Supertest route tests against isolated test MySQL covering race conditions and device lockouts). |

---

## 5. Single-Device Lock System: 5 Defense Layers

A bulletproof single-device lock must defeat five primary bypass vectors:
1. **Credential Sharing:** Student A gives their password to Student B.
2. **Race Conditions:** Two laptops click "Login" at the exact same millisecond.
3. **Cookie Export:** Manual extraction of session cookies via DevTools or browser extensions.
4. **Browser/Profile Switching:** Opening Incognito or a different browser on the same laptop.
5. **Password Reset Abuse:** Using "Forgot Password" on a shared email to clear the device binding.

```
                              [ Student Login Request ]
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Layer 5: Desktop-Only Gate (Sec-CH-UA-Mobile) │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Layer 4: Rate Limiting & Telemetry Inspection │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Layer 2: MySQL 8 Concurrency Lock (FOR UPDATE)│
                 └───────────────────────┬───────────────────────┘
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Layer 1: Server-Side State Machine & Sessions │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Layer 3: WebCrypto Key & Chrome DBSC Binding  │
                 └───────────────────────────────────────────────┘
```

### Layer 1: Stateful Server-Side Sessions & Hard-Block Policy
- **No Stateless JWTs:** Stateless tokens cannot be revoked instantly without server-side state. Instead, use opaque 256-bit (32-byte) cryptographically random tokens stored hashed (SHA-256) in MySQL and delivered via `__Host-sid` HttpOnly cookies.
- **Hard-Block (Never "Auto-Kick"):** Systems that log out old devices when a new device signs in enable two students to easily time-share an account. We enforce an **Admin-Gated Hard Block**:
  1. *First Login:* Browser generates an ECDSA key pair, backend binds the device record as `ACTIVE`, and sets cookies.
  2. *Subsequent Logins:* Browser presents `__Host-device_id` and signs a fresh server challenge. If verified, a new session is issued.
  3. *Unauthorized Device Attempt:* Returns `HTTP 403 DEVICE_LOCKED`. Logs the attempt and lets the student submit a device switch request.
  4. *Admin Reset:* Only an Admin can revoke an active device, which atomically marks the device `REVOKED` and destroys all active sessions.
  5. *Password Reset Preservation:* Forgot Password logs out all sessions, but **deliberately preserves** the device lock so shared emails cannot circumvent Admin controls.

### Layer 2: MySQL 8 Atomic Concurrency Control
- **Row-Level Transaction Locking:** Every login, device binding, and reset runs inside an InnoDB transaction beginning with:
  ```sql
  SELECT id, is_active FROM users WHERE id = ? FOR UPDATE;
  ```
- **Virtual Generated Column Constraint:**
  ```sql
  active_slot TINYINT GENERATED ALWAYS AS (IF(status = 'ACTIVE', 1, NULL)) VIRTUAL,
  UNIQUE KEY uq_user_one_active_device (user_id, active_slot)
  ```
  Under MySQL's ANSI-SQL NULL uniqueness semantics, multiple historical `REVOKED` rows (`active_slot = NULL`) can exist, but MySQL physically rejects inserting a second `ACTIVE` row (`active_slot = 1`) for the same user.

### Layer 3: Layered Cryptographic Device Proofs
- **Non-Extractable WebCrypto Keys (Universal Baseline):**
  - Generates ECDSA P-256 keys in IndexedDB with `extractable: false`.
  - Keys cannot be read or copied via DevTools `exportKey()`.
  - Pair with `navigator.storage.persist()` and `__Host-device_id` cookie fallback to gracefully handle Safari's 7-day script-storage eviction.
- **Chrome Device Bound Session Credentials (DBSC):**
  - Binds session cookies to the local hardware TPM (Windows) or Secure Enclave (macOS).
  - Even if raw cookies are stolen, they expire within minutes and cannot be refreshed on another machine without hardware private key signatures.
- **WebAuthn Level 3 (Admin Accounts):**
  - Enforce `BE=0, BS=0` (non-syncable single-device passkey) for privileged Admin accounts.

### Layer 4: Telemetry Anomaly Detection
- Track client IP, `Sec-CH-UA-Platform`, and `last_seen_at` without rigid IP binding (to prevent false lockouts from mobile hotspots or VPNs). Flag impossible travel or rapid browser engine switches on the Admin dashboard.

### Layer 5: Desktop-Only Enforcement
- Inspect `Sec-CH-UA-Mobile` (`?0` desktop, `?1` mobile) on HTTPS requests with a User-Agent fallback for Safari/Firefox. Render a graceful roadblock UI on mobile devices.

---

## 6. Authentication, RBAC, Password & OTP Hardening

### Password Security & Storage (Argon2id)
- **Algorithm:** Argon2id via `@node-rs/argon2`.
- **Parameters:** Explicitly configured: `m = 19456 KiB` (19 MiB), `t = 2`, `p = 1`.
- **Server Pepper:** Stored strictly in environment variables (never in the database) and combined via HMAC-SHA256 before hashing.
- **Password Policy:** NIST SP 800-63B compliant (minimum 15 characters, maximum 64+ characters, all Unicode allowed, no forced periodic rotation, checked against breached password dictionaries).

### Email OTP & Recovery Security
- **Generation:** 6-digit numeric OTPs via Node's CSPRNG (`crypto.randomInt(100000, 999999)`).
- **Storage:** Only store `HMAC-SHA256(otp, serverSecret)` in `email_otps`. Plaintext OTP is never logged or stored.
- **Lifecycle:** 10-minute TTL, single-use consumption, maximum 5 attempts before invalidation.
- **Anti-Enumeration:** Generic response messages with constant-time processing for all password reset requests.

### Layered Rate Limiting (`rate-limiter-flexible`)

```
+───────────────────────────+──────────────────────────────────────────────────────────+
| Limiter Type              | Threshold & Scope                                        |
+───────────────────────────+──────────────────────────────────────────────────────────+
| 1. Global Per-IP Limiter  | 60 requests / minute per IP (prevents DoS & Argon2 load)  |
| 2. Per-Account Failed Auth| 5 consecutive failed logins / hour (triggers cooldown)   |
| 3. Distributed Attack Cap | 20 failed attempts / 24 hours per target email across IPs|
| 4. OTP Request Cooldown   | 60s cooldown between resends, max 5 OTP emails / hour    |
+───────────────────────────+──────────────────────────────────────────────────────────+
```

---

## 7. Frontend Security & Next.js 16 Hardening

1. **Proxy vs. Data Access Layer (DAL):**
   > [!WARNING]
   > Do not rely on `proxy.ts` (formerly `middleware.ts`) as your sole authorization gate (CVE-2025-29927).
   - Use `proxy.ts` strictly for optimistic redirects and CSP nonce generation.
   - Authorize every request at the **Data Access Layer (DAL)** called by Server Components, Server Actions, and Route Handlers.
2. **Backend-for-Frontend (BFF) & Zero localStorage:**
   - Store **zero** auth tokens in `localStorage` or `sessionStorage`.
   - Store all credentials in `__Host-sid` and `__Host-device_id` cookies (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`).
3. **Layered CSRF Defenses:**
   - Enforce `Sec-Fetch-Site: same-origin` on all state-changing endpoints.
   - Validate `Origin` and `Host` headers on Server Actions.
4. **Strict Nonce-Based Content Security Policy (CSP):**
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
   ```
5. **Activity Sandbox Isolation (Preparing for Module 4):**
   - Serve uncompressed ZIP activity packages from a distinct domain: `https://lms-activities-sandbox.in`.
   - Embed inside an iframe: `<iframe sandbox="allow-scripts" referrerpolicy="no-referrer">`.
   - Prevent Zip Slip during archive extraction by validating `target.startsWith(destDir + path.sep)` and blocking symlinks.

---

## 8. Core MySQL 8 Database Schema

```sql
-- ============================================================================
-- 1. Core Users Table (Admin & Student)
-- ============================================================================
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- Argon2id PHC string
  full_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,  -- Phone / WhatsApp number (for payment & communication)
  class_grade VARCHAR(50) NOT NULL,    -- Student class / grade (e.g., "Class 10", "Grade 8")
  school_name VARCHAR(200) NOT NULL,   -- School name
  role ENUM('STUDENT', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  email_verified_at DATETIME(3) NULL,
  mfa_secret_enc VARCHAR(255) NULL,    -- Encrypted TOTP secret (for ADMIN)
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_mobile (mobile_number),
  INDEX idx_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. Single-Device Binding Table (Max 1 ACTIVE device per student)
-- ============================================================================
CREATE TABLE user_devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  device_token_hash CHAR(64) NOT NULL,   -- SHA-256 of __Host-device_id cookie
  public_key_spki TEXT NULL,             -- WebCrypto ECDSA P-256 public key
  dbsc_session_id VARCHAR(128) NULL,     -- Optional Chrome DBSC binding ID
  device_label VARCHAR(200) NOT NULL,    -- e.g., "Chrome 146 on Windows 11"
  status ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
  active_slot TINYINT GENERATED ALWAYS AS (IF(status = 'ACTIVE', 1, NULL)) VIRTUAL,
  bound_ip VARCHAR(45) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  revoked_by_admin_id BIGINT UNSIGNED NULL,
  revoke_reason VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_devices_admin FOREIGN KEY (revoked_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_user_one_active_device (user_id, active_slot),
  UNIQUE KEY uq_device_token_hash (device_token_hash),
  INDEX idx_devices_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. Stateful Server-Side Sessions (Instant Revocation)
-- ============================================================================
CREATE TABLE sessions (
  id CHAR(36) PRIMARY KEY,               -- UUIDv7 via crypto.randomUUIDv7()
  user_id BIGINT UNSIGNED NOT NULL,
  device_id BIGINT UNSIGNED NULL,        -- NULL for Admin sessions, non-null for Students
  session_token_hash CHAR(64) NOT NULL,  -- SHA-256 of opaque __Host-sid cookie
  ip_address VARCHAR(45) NOT NULL,
  user_agent VARCHAR(512) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_device FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE CASCADE,
  UNIQUE KEY uq_session_token_hash (session_token_hash),
  INDEX idx_sessions_user_active (user_id, revoked_at, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. Device Switch / Unlock Requests (Admin Review Queue)
-- ============================================================================
CREATE TABLE device_reset_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  requested_device_label VARCHAR(200) NOT NULL,
  requested_ip VARCHAR(45) NOT NULL,
  student_reason VARCHAR(500) NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reset_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reset_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. Email OTPs (Verification & Password Reset)
-- ============================================================================
CREATE TABLE email_otps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  purpose ENUM('EMAIL_VERIFY', 'PASSWORD_RESET') NOT NULL,
  otp_hash CHAR(64) NOT NULL,            -- HMAC-SHA256(otp, serverPepper)
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_otps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_otps_lookup (user_id, purpose, consumed_at, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. Immutable Security & Audit Trail
-- ============================================================================
CREATE TABLE auth_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  target_user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(64) NOT NULL,       -- LOGIN_OK, DEVICE_LOCK_BLOCKED, ADMIN_DEVICE_RESET, etc.
  ip_address VARCHAR(45) NOT NULL,
  metadata_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_audit_target_time (target_user_id, created_at),
  INDEX idx_audit_event_time (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 9. Finalized Stage 1 Engineering Specifications (Confirmed via `answer.txt`)

All 10 architecture and workflow decisions are now locked for Stage 1 implementation:

| # | Topic | Confirmed Decision & Implementation Specification |
| :--- | :--- | :--- |
| **1** | **Browser Switches & Cache Wipe** | **Strict Block:** If a student switches browsers (Chrome to Edge/Firefox) or clears browser storage on the same laptop, the system strictly blocks login until an Admin resets the device. |
| **2** | **Blocked Device UI Message** | **Custom Error Message:** On unauthorized device login, the student receives the exact message:<br>`"Sorry, this account cannot able to access this is not the right device"`<br>No self-service form required; student contacts the Admin externally. |
| **3** | **Admin Device Policy** | **Unrestricted Access:** `ADMIN` accounts are completely exempt from the single-device restriction and can log in from any desktop/laptop. |
| **4** | **Password Management** | **Admin-Controlled Reset:** Students do not have self-service email OTP resets. When a student forgets their password, they contact the Admin. The Admin resets or assigns a new password directly from the Admin Management Console. *(Passwords are securely hashed with Argon2id; Admin overrides/sets new password).* |
| **5** | **Architecture Pattern** | **Feature-Based Clean Architecture:** Modular Monolith in Node.js (TypeScript) organized strictly around domain features (`auth/`, `devices/`, `users/`). |
| **6** | **ORM Choice** | **Drizzle ORM (`mysql2`):** Delivers clean abstractions, high performance, and native support for MySQL 8 virtual generated columns and `SELECT ... FOR UPDATE` row locks. |
| **7** | **Redis & Rate Limiting** | **Deferred to Later Update:** No Redis infrastructure in Stage 1. Rate-limiting is skipped for initial build and will be added during future maintenance updates to keep initial setup clean and lightweight. |
| **8** | **Activity Sandbox Domain** | **Strict Separation:** Module 4 interactive HTML/JS activities will run on a completely separate domain/origin from Day 1 to safeguard session cookies. |
| **9** | **Student Registration Fields** | **Complete Profile Schema:** Onboarding captures `full_name`, `email`, `mobile_number` (payment & WhatsApp contact), `class_grade`, `school_name`, and `password`. |
| **10**| **Chrome DBSC Timing** | **Include in Stage 1:** Chrome Device Bound Session Credentials (DBSC) TPM/Secure Enclave hardware binding will be implemented directly in Stage 1 alongside WebCrypto. |
