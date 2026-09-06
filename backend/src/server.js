import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const backendDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(backendDirectory, "../../.env") });
dotenv.config({ path: resolve(backendDirectory, "../../.env.local"), override: true });
dotenv.config({ path: resolve(backendDirectory, "../.env"), override: false });
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { prisma } from "./db.js";
import { registerPostRoutes } from "./posts.js";
import { registerReelRoutes } from "./reels.js";
import { registerReelActionRoutes } from "./reel-actions.js";
import { registerReelCommentRoutes } from "./reel-comments.js";
import { registerMessageRoutes } from "./messages.js";
import { registerMessageActionRoutes } from "./message-actions.js";
import { registerMessageExtraRoutes } from "./message-extras.js";
import { registerMessageMemberRoutes } from "./message-members.js";
import { registerCallRoutes } from "./calls.js";
import { registerSettingsRoutes } from "./settings.js";
import { registerAccountSecurityRoutes } from "./account-security.js";
import { registerNetworkRoutes } from "./network.js";
import { registerStoryRoutes } from "./stories.js";
import { registerDirectoryRoutes } from "./directory.js";
import { registerCompanyRoutes } from "./company.js";
import { registerCompanyFeatureRoutes } from "./company-features.js";
import { registerGroupRoutes } from "./groups.js";
import { registerAdminRoutes } from "./admin.js";
import { registerIdentityRoutes } from "./identity.js";
import { registerProfileRoutes } from "./profile.js";
import { registerUploadRoutes } from "./upload.js";
import { registerNotificationRoutes } from "./notifications.js";
import { registerSystemRoutes } from "./system.js";
import { registerAiRoutes } from "./ai.js";
import { registerSupportRoutes } from "./support.js";
import { registerSubscriptionRoutes } from "./subscription.js";
import { registerStripeSyncRoutes } from "./stripe-sync.js";
import { registerPushRoutes } from "./push.js";
import { registerAccountSwitchRoutes } from "./account-switch.js";
import { registerAdRoutes } from "./ads.js";
import { registerRealtimeRoutes } from "./realtime.js";

const app = Fastify({
  logger: process.env.NODE_ENV !== "test",
  trustProxy: true,
});

const frontendOrigin = process.env.FRONTEND_ORIGIN || (process.env.NODE_ENV === "production" ? "https://lynoralink.netlify.app" : "http://localhost:3000");
const port = Number.parseInt(process.env.PORT || process.env.BACKEND_PORT || "4001", 10);
const host = process.env.HOST || process.env.BACKEND_HOST || "0.0.0.0";

await app.register(helmet, {
  contentSecurityPolicy: false,
});
await app.register(cors, {
  origin: frontendOrigin,
  credentials: true,
});
await app.register(rateLimit, {
  max: process.env.NODE_ENV === "production" ? 300 : 600,
  timeWindow: "1 minute",
  keyGenerator: (request) => request.headers["x-lynora-user-id"] || request.ip,
});
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

app.get("/v1/health", async () => ({
  ok: true,
  service: "lynoralink-backend",
}));

app.get("/", async () => ({
  ok: true,
  service: "lynoralink-backend",
  health: "/v1/health",
}));

await registerPostRoutes(app);
await registerReelRoutes(app);
await registerReelActionRoutes(app);
await registerReelCommentRoutes(app);
await registerMessageRoutes(app);
await registerMessageActionRoutes(app);
await registerMessageExtraRoutes(app);
await registerMessageMemberRoutes(app);
await registerCallRoutes(app);
await registerSettingsRoutes(app);
await registerAccountSecurityRoutes(app);
await registerIdentityRoutes(app);
await registerProfileRoutes(app);
await registerUploadRoutes(app);
await registerNetworkRoutes(app);
await registerStoryRoutes(app);
await registerDirectoryRoutes(app);
await registerCompanyRoutes(app);
await registerCompanyFeatureRoutes(app);
await registerGroupRoutes(app);
await registerAdminRoutes(app);
await registerNotificationRoutes(app);
await registerSystemRoutes(app);
await registerAiRoutes(app);
await registerSupportRoutes(app);
await registerSubscriptionRoutes(app);
await registerStripeSyncRoutes(app);
await registerPushRoutes(app);
await registerAccountSwitchRoutes(app);
await registerAdRoutes(app);
await registerRealtimeRoutes(app);

app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: "Route not found" });
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
    error: error.statusCode && error.statusCode < 500 ? error.message : "Internal server error",
  });
});

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
