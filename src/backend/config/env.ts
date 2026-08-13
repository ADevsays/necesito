import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadLocalEnv() {
  const file = join(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(file, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index < 0) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional local env file
  }
}

loadLocalEnv();

function requiredEnv(name: string, fallback = "") {
  const value = process.env[name] ?? fallback;
  return value.trim();
}

export const env = {
  port: Number(process.env.PORT || 3000),
  tursoDatabaseUrl: requiredEnv("TURSO_DATABASE_URL"),
  tursoAuthToken: requiredEnv("TURSO_AUTH_TOKEN"),
  vapidPublicKey: requiredEnv("VAPID_PUBLIC_KEY"),
  vapidPrivateKey: requiredEnv("VAPID_PRIVATE_KEY"),
  coordinatorToken: requiredEnv("COORDINATOR_TOKEN"),
  isProduction: process.env.NODE_ENV === "production",
};
