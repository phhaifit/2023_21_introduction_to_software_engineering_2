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

export const env = {
  port: Number(process.env.PORT ?? 3000),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
};
