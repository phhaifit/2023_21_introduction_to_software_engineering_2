import path from "node:path";
import { fileURLToPath } from "node:url";

// Load environment variables natively in Node.js 20+
try {
  process.loadEnvFile();
} catch {}

try {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const backendDir = path.resolve(currentDir, "../..");
  process.loadEnvFile(path.join(backendDir, ".env"));
} catch {}

try {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(currentDir, "../../../..");
  process.loadEnvFile(path.join(rootDir, ".env"));
} catch {}

const nodeEnv = process.env.NODE_ENV ?? "development";
const paymentProvider = process.env.PAYMENT_PROVIDER ?? "mock";

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  defaultUserId: process.env.DEFAULT_USER_ID ?? "local-user",
  defaultWorkspaceId: process.env.DEFAULT_WORKSPACE_ID ?? "default-workspace",
  defaultUserRole: (process.env.DEFAULT_USER_ROLE === "member" ? "member" : "admin") as
    | "member"
    | "admin",
  paymentProvider,
  mockPaymentEnabled: paymentProvider === "mock" && nodeEnv !== "production",
  demoControlsEnabled: nodeEnv !== "production"
};
