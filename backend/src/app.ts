import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./core/config/env";
import { desktopOnlyGate } from "./core/middleware/desktop-gate";
import { errorHandler } from "./core/middleware/error-handler";
import { buildApiRouter } from "./composition-root";

export function createApp(): express.Application {
  const app = express();

  // Basic security headers
  app.use(helmet());

  // CORS for frontend Next.js application
  app.use(
    cors({
      origin: [env.APP_ORIGIN, env.SANDBOX_ORIGIN],
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

  // Desktop-only enforcement applied to all API v1 endpoints
  app.use("/api/v1", desktopOnlyGate, buildApiRouter());

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
