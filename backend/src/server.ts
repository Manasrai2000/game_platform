import { createApp } from "./app";
import { env } from "./core/config/env";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 LMS Backend running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
  console.log(`🔒 Desktop-Only Gate & Single-Device Lock Engine Active`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});
