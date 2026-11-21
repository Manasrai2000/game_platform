# Subscription LMS Platform

A high-security, desktop-only Subscription Learning Management System built with **Next.js App Router**, **Node.js Clean Architecture Modular Monolith**, and **MySQL 8**.

---

## 🏗️ Architecture Overview

The project is structured into two main packages:
- **`backend/`**: Node.js Modular Monolith with TypeScript, Express 5, and Drizzle ORM (`mysql2`). Follows Feature-Based Clean Architecture (`auth`, `devices`, `users`).
- **`frontend/`**: Next.js App Router (TypeScript, Tailwind CSS) with desktop-only gates and WebCrypto device binding.

---

## 🔒 Stage 1 Core Security Highlights

1. **Desktop & Laptop Enforcement:**
   - Server-side check via `Sec-CH-UA-Mobile` low-entropy Client Hint header + User-Agent fallback.
2. **Single-Device Hard Block:**
   - MySQL 8 virtual generated column (`active_slot`) + unique index `uq_user_one_active_device (user_id, active_slot)`.
   - Concurrency locking with `SELECT ... FOR UPDATE`.
   - Non-extractable WebCrypto ECDSA keys (IndexedDB) + Chrome DBSC session binding.
   - If an unauthorized laptop/browser attempts login:  
     Returns `HTTP 403`: `"Sorry, this account cannot able to access this is not the right device"`.
3. **Admin Exemption & Reset Control:**
   - `ADMIN` role can log in from any device.
   - Students cannot self-reset passwords or devices; they contact the Administrator.
   - Admin can reset student devices and update/assign passwords directly via the Admin Console.
4. **Argon2id Hashing:**
   - OWASP-recommended parameters (`m=19456`, `t=2`, `p=1`) + secret server pepper stored strictly in `.env`.

---

## 🚀 Getting Started

### 1. Database Setup (MySQL 8)
1. Ensure MySQL 8 is running.
2. Create the database:
   ```sql
   CREATE DATABASE game_platform_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 2. Backend Setup
```bash
cd backend

# 1. Copy environment variables
cp .env.example .env
# Edit .env with your MySQL credentials and SERVER_PEPPER

# 2. Run database migrations
npm run db:migrate

# 3. Seed initial Administrator account
npm run db:seed:admin

# 4. Start backend in development mode
npm run dev
```
Backend will be running at `http://localhost:4000`.

### 3. Frontend Setup
```bash
cd frontend

npm run dev
```
Frontend will be running at `http://localhost:3000`.

---

## 📁 Backend Directory Structure

```
backend/
├── drizzle/                          # Generated versioned SQL migrations
├── src/
│   ├── core/                         # Shared Kernel & Infrastructure
│   │   ├── config/                   # Zod-validated environment config
│   │   ├── database/                 # Drizzle connection & schemas
│   │   ├── errors/                   # AppError hierarchy
│   │   ├── middleware/               # Desktop gate, auth guard, error handler
│   │   └── security/                 # Argon2id, token generators, CSPRNG
│   ├── modules/
│   │   ├── auth/                     # Register, Login, Logout, AdminSetPassword
│   │   ├── devices/                  # Single-Device Lock Engine (FOR UPDATE locks)
│   │   └── users/                    # Admin Student Management & Device Reset
│   ├── scripts/                      # Admin seed script
│   ├── composition-root.ts           # Route mounting & dependency wiring
│   ├── app.ts                        # Express application setup
│   └── server.ts                     # HTTP server entry point
└── drizzle.config.ts
```
