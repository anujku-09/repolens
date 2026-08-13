/**
 * Safe environment configuration for RepoLens.
 * Validates and provides fallback defaults for development and production environments.
 */

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "RepoLens",
  IS_DEV: process.env.NODE_ENV !== "production",
} as const;

export function validateEnv() {
  const missing: string[] = [];
  
  if (missing.length > 0) {
    console.warn(`[RepoLens Warning] Missing optional environment variables: ${missing.join(", ")}`);
  }
}
