import { RepositoryFile } from "@/types";

/**
 * Maximum source file size limit for content ingestion (1 MB).
 * Files above this size threshold are safely skipped.
 */
export const MAX_SOURCE_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

/**
 * Explicit allowlist of source code, configuration, and documentation file extensions.
 */
export const ALLOWED_SOURCE_EXTENSIONS = new Set<string>([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".swift",
  ".kt",
  ".kts",
  ".css",
  ".scss",
  ".html",
  ".vue",
  ".svelte",
  ".json",
  ".yaml",
  ".yml",
  ".md",
]);

/**
 * Path prefixes to exclude from source code content ingestion (dependencies, build outputs, internal objects).
 */
export const EXCLUDED_PATH_PREFIXES = [
  ".git/",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".next/",
  "vendor/",
];

export interface SourceFileReason {
  isAnalyzable: boolean;
  reason: string;
}

/**
 * Evaluates whether a repository file qualifies for source content ingestion based on
 * file type, extension allowlist, path exclusions, and file size limits.
 */
export function isAnalyzableSourceFile(file: Partial<RepositoryFile>): boolean {
  return getSourceFileReason(file).isAnalyzable;
}

/**
 * Detailed policy evaluation with human-readable reason.
 */
export function getSourceFileReason(file: Partial<RepositoryFile>): SourceFileReason {
  if (!file || !file.path) {
    return { isAnalyzable: false, reason: "Invalid file record" };
  }

  if (file.type === "directory") {
    return { isAnalyzable: false, reason: "Directory object" };
  }

  // Check excluded path prefixes
  const normalizedPath = file.path.toLowerCase();
  for (const prefix of EXCLUDED_PATH_PREFIXES) {
    if (normalizedPath.startsWith(prefix) || normalizedPath.includes(`/${prefix}`)) {
      return { isAnalyzable: false, reason: `Path excluded by system policy (${prefix})` };
    }
  }

  // Check size limit
  if (typeof file.size === "number" && file.size > MAX_SOURCE_FILE_SIZE) {
    return {
      isAnalyzable: false,
      reason: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 1 MB limit`,
    };
  }

  // Check extension allowlist
  const ext = file.extension?.toLowerCase();
  if (ext && ALLOWED_SOURCE_EXTENSIONS.has(ext)) {
    return { isAnalyzable: true, reason: "Matches source code allowlist extension" };
  }

  // Handle special filenames like Dockerfile or Makefile
  const baseName = file.name?.toLowerCase();
  if (baseName === "dockerfile" || baseName === "makefile" || baseName === "package.json") {
    return { isAnalyzable: true, reason: "System build configuration file" };
  }

  return {
    isAnalyzable: false,
    reason: ext ? `Extension '${ext}' is not in source allowlist` : "Non-code / binary file format",
  };
}
