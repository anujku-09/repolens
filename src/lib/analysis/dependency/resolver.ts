import { RepositoryFile } from "@/types";

export type ResolvedImport =
  | { type: "internal"; targetFile: RepositoryFile }
  | { type: "external"; packageName: string }
  | { type: "unresolved"; importPath: string };

/**
 * Normalizes a file system path string:
 * - Replaces backslashes with forward slashes
 * - Strips leading slashes
 * - Resolves '.' and '..' segments
 */
export function normalizePath(rawPath: string): string {
  if (!rawPath) return "";

  const clean = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = clean.split("/");
  const stack: string[] = [];

  for (const seg of segments) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(seg);
    }
  }

  return stack.join("/");
}

/**
 * Extracts external package name from an import path.
 * e.g. "react" -> "react", "next/navigation" -> "next", "@supabase/supabase-js" -> "@supabase/supabase-js", "@scope/pkg/sub" -> "@scope/pkg"
 */
export function extractPackageName(importPath: string): string {
  if (importPath.startsWith("@")) {
    const parts = importPath.split("/");
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return importPath;
  }
  return importPath.split("/")[0];
}

/**
 * Resolves an import path string against a repository file path map.
 * Supports:
 * - Relative imports (./, ../)
 * - TypeScript path aliases (@/* -> src/*)
 * - Automatic extension matching (.ts, .tsx, .js, .jsx, .mjs, .cjs)
 * - Directory index matching (/index.ts, /index.tsx, etc.)
 * - External package detection (react, next, lucide-react, etc.)
 * - Unresolved internal imports detection
 */
export function resolveImportPath(
  importingFilePath: string,
  importPath: string,
  fileMap: Map<string, RepositoryFile>
): ResolvedImport {
  if (!importPath || typeof importPath !== "string") {
    return { type: "unresolved", importPath: importPath || "" };
  }

  const isRelative = importPath.startsWith("./") || importPath.startsWith("../");
  const isAlias = importPath.startsWith("@/");
  const isAbsoluteRoot = importPath.startsWith("/");

  // 1. Handle External Imports (e.g. "react", "lucide-react", "next/navigation", "@supabase/ssr")
  if (!isRelative && !isAlias && !isAbsoluteRoot) {
    return {
      type: "external",
      packageName: extractPackageName(importPath),
    };
  }

  // 2. Compute Candidate Target Base Path
  let candidateBasePath = "";

  if (isAlias) {
    // Replace `@/` with `src/` (or try without `src/`)
    candidateBasePath = importPath.replace(/^@\//, "src/");
  } else if (isRelative) {
    // Resolve relative to importing file's directory
    const normalizedImporting = normalizePath(importingFilePath);
    const lastSlash = normalizedImporting.lastIndexOf("/");
    const importingDir = lastSlash !== -1 ? normalizedImporting.slice(0, lastSlash) : "";
    candidateBasePath = importingDir ? `${importingDir}/${importPath}` : importPath;
  } else if (isAbsoluteRoot) {
    candidateBasePath = importPath.slice(1);
  }

  const normalizedCandidate = normalizePath(candidateBasePath);

  // 3. Extension & Index File Resolution Strategy
  const extensionCandidates = [
    normalizedCandidate, // Exact match if extension included
    `${normalizedCandidate}.ts`,
    `${normalizedCandidate}.tsx`,
    `${normalizedCandidate}.js`,
    `${normalizedCandidate}.jsx`,
    `${normalizedCandidate}.mjs`,
    `${normalizedCandidate}.cjs`,
    `${normalizedCandidate}/index.ts`,
    `${normalizedCandidate}/index.tsx`,
    `${normalizedCandidate}/index.js`,
    `${normalizedCandidate}/index.jsx`,
  ];

  // If alias, also try resolving without leading "src/" (e.g., if codebase root is not inside src/)
  if (isAlias) {
    const rawAliasPath = normalizePath(importPath.replace(/^@\//, ""));
    extensionCandidates.push(
      rawAliasPath,
      `${rawAliasPath}.ts`,
      `${rawAliasPath}.tsx`,
      `${rawAliasPath}.js`,
      `${rawAliasPath}.jsx`,
      `${rawAliasPath}/index.ts`,
      `${rawAliasPath}/index.tsx`
    );
  }

  // Search candidate extensions in fileMap
  for (const candidate of extensionCandidates) {
    const matchedFile = fileMap.get(candidate);
    if (matchedFile && matchedFile.type === "file") {
      return {
        type: "internal",
        targetFile: matchedFile,
      };
    }
  }

  // 4. Return Unresolved if it looked internal but couldn't be found
  return {
    type: "unresolved",
    importPath,
  };
}
