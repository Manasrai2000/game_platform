import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./core/config/env";
import { desktopOnlyGate } from "./core/middleware/desktop-gate";
import { errorHandler } from "./core/middleware/error-handler";
import { buildApiRouter } from "./composition-root";

export function createApp(): express.Application {
  const app = express();

  // Basic security headers (allowing cross-origin iframe sandbox embedding)
  app.use(
    helmet({
      frameguard: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // CORS for frontend Next.js application
  const allowedOrigins = [
    env.APP_ORIGIN,
    env.SANDBOX_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev, or origin match
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  // Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Health check
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Static educational activities storage (bucket style static file serving)
  app.use(
    "/activities-storage",
    (_req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.removeHeader("X-Frame-Options");
      next();
    },
    express.static(path.resolve(__dirname, "../storage/activities"))
  );

  // Desktop-only enforcement applied to all API v1 endpoints
  app.use("/api/v1", desktopOnlyGate, buildApiRouter());

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
