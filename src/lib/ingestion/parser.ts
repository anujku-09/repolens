import { GitTreeItem, RepositoryFileInsert, IngestionSummary } from "@/types";

/**
 * File Extension to Language Mapping Registry
 */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".pyw": "Python",
  ".java": "Java",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".hpp": "C++",
  ".cc": "C++",
  ".cs": "C#",
  ".go": "Go",
  ".rs": "Rust",
  ".php": "PHP",
  ".rb": "Ruby",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".css": "CSS",
  ".scss": "CSS",
  ".sass": "CSS",
  ".less": "CSS",
  ".html": "HTML",
  ".htm": "HTML",
  ".json": "JSON",
  ".md": "Markdown",
  ".markdown": "Markdown",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".sql": "SQL",
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  ".xml": "XML",
  ".svg": "SVG",
  ".dockerfile": "Docker",
  ".toml": "TOML",
  ".env": "Config",
  ".gitignore": "Git",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
};

/**
 * Extract lowercase extension from filename (e.g. "page.tsx" -> ".tsx")
 */
export function detectExtension(filename: string): string | null {
  const parts = filename.split("/");
  const baseName = parts[parts.length - 1];

  if (!baseName || (baseName.startsWith(".") && !baseName.includes(".", 1))) {
    // Handle dotfiles like .gitignore
    return baseName.startsWith(".") ? baseName.toLowerCase() : null;
  }

  const lastDotIndex = baseName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return null;
  }

  return baseName.slice(lastDotIndex).toLowerCase();
}

/**
 * Detect language name based on filename and extension
 */
export function detectLanguage(filename: string, extension: string | null): string | null {
  const baseName = filename.split("/").pop() || "";

  if (baseName.toLowerCase() === "dockerfile") {
    return "Docker";
  }
  if (baseName.toLowerCase() === "makefile") {
    return "Makefile";
  }

  if (extension && EXTENSION_LANGUAGE_MAP[extension]) {
    return EXTENSION_LANGUAGE_MAP[extension];
  }

  return null;
}

/**
 * Converts raw GitHub Git Tree items into complete, hierarchical RepositoryFile database records.
 * Synthesizes missing directory entries for complete tree exploration.
 */
export function parseGitTreeToRepositoryFiles(
  repositoryId: string,
  userId: string,
  rawTree: GitTreeItem[]
): {
  records: RepositoryFileInsert[];
  summary: IngestionSummary;
} {
  const recordMap = new Map<string, RepositoryFileInsert>();
  const languageBreakdown: Record<string, { count: number; bytes: number }> = {};

  let totalFiles = 0;
  let totalDirectories = 0;
  let totalCodeSize = 0;

  // Function to ensure directory entries exist for all parent paths
  const ensureDirectoryExists = (dirPath: string) => {
    if (!dirPath || recordMap.has(dirPath)) return;

    const pathSegments = dirPath.split("/").filter(Boolean);
    let currentPath = "";

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!recordMap.has(currentPath)) {
        const depth = i;
        recordMap.set(currentPath, {
          repository_id: repositoryId,
          user_id: userId,
          path: currentPath,
          name: segment,
          type: "directory",
          size: null,
          extension: null,
          language: null,
          parent_path: parentPath,
          depth,
        });
        totalDirectories++;
      }
    }
  };

  // Process raw tree items
  for (const item of rawTree) {
    if (!item.path || item.path.startsWith(".git/")) {
      continue;
    }

    const segments = item.path.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    const name = segments[segments.length - 1];
    const depth = segments.length - 1;
    const parentPath = segments.slice(0, -1).join("/");

    // Ensure parent directories exist
    if (parentPath) {
      ensureDirectoryExists(parentPath);
    }

    if (item.type === "tree") {
      if (!recordMap.has(item.path)) {
        recordMap.set(item.path, {
          repository_id: repositoryId,
          user_id: userId,
          path: item.path,
          name,
          type: "directory",
          size: null,
          extension: null,
          language: null,
          parent_path: parentPath,
          depth,
        });
        totalDirectories++;
      }
    } else {
      // It is a blob / file
      const size = typeof item.size === "number" ? item.size : 0;
      const extension = detectExtension(name);
      const language = detectLanguage(name, extension);

      recordMap.set(item.path, {
        repository_id: repositoryId,
        user_id: userId,
        path: item.path,
        name,
        type: "file",
        size,
        extension,
        language,
        parent_path: parentPath,
        depth,
      });

      totalFiles++;
      totalCodeSize += size;

      if (language) {
        if (!languageBreakdown[language]) {
          languageBreakdown[language] = { count: 0, bytes: 0 };
        }
        languageBreakdown[language].count += 1;
        languageBreakdown[language].bytes += size;
      }
    }
  }

  const records = Array.from(recordMap.values());

  return {
    records,
    summary: {
      totalFiles,
      totalDirectories,
      totalCodeSize,
      languageBreakdown,
    },
  };
}
