import {
  FileAnalysisPayload,
  AstImport,
  AstExport,
  AstFunction,
  AstClass,
  AstVariable,
} from "@/types";

/**
 * Deterministically extracts structural facts (Imports, Exports, Functions, Classes, Variables)
 * from Python source code text using clean line parsing and AST regex patterns.
 */
export function extractPythonStructuralFacts(content: string): FileAnalysisPayload {
  const imports: AstImport[] = [];
  const exports: AstExport[] = [];
  const functions: AstFunction[] = [];
  const classes: AstClass[] = [];
  const variables: AstVariable[] = [];

  if (!content || typeof content !== "string") {
    return { imports, exports, functions, classes, variables, components: [] };
  }

  const lines = content.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;
    const trimmed = lineText.trim();

    // Skip empty lines or full line comments
    if (!trimmed || trimmed.startsWith("#")) return;

    // 1. IMPORTS
    // e.g. import os, sys
    // e.g. import pandas as pd
    if (trimmed.startsWith("import ")) {
      const statement = trimmed.slice(7).trim();
      const parts = statement.split(",");
      parts.forEach((p) => {
        const importSpec = p.trim().split(" as ")[0].trim();
        if (importSpec) {
          imports.push({
            source: importSpec,
            defaultImport: null,
            namespaceImport: null,
            namedImports: [],
          });
        }
      });
    }

    // e.g. from typing import List, Optional
    // e.g. from .utils import helper
    if (trimmed.startsWith("from ")) {
      const fromMatch = trimmed.match(/^from\s+([^\s]+)\s+import\s+(.+)$/);
      if (fromMatch) {
        const moduleSource = fromMatch[1];
        const symbolsRaw = fromMatch[2];
        const namedSymbols = symbolsRaw
          .replace(/[()]/g, "")
          .split(",")
          .map((s) => s.trim().split(" as ")[0].trim())
          .filter(Boolean);

        imports.push({
          source: moduleSource,
          defaultImport: null,
          namespaceImport: null,
          namedImports: namedSymbols,
        });
      }
    }

    // 2. FUNCTIONS
    // e.g. def process_data(req):
    // e.g. async def fetch_user(user_id: str):
    const funcMatch = trimmed.match(/^(async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (funcMatch) {
      const isAsync = !!funcMatch[1];
      const funcName = funcMatch[2];
      const isPublic = !funcName.startsWith("_");

      functions.push({
        name: funcName,
        async: isAsync,
        exported: isPublic,
        startLine: lineNumber,
        endLine: lineNumber,
      });

      if (isPublic) {
        exports.push({ name: funcName, default: false });
      }
    }

    // 3. CLASSES
    // e.g. class UserProfile(BaseModel):
    const classMatch = trimmed.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (classMatch) {
      const className = classMatch[1];
      const isPublic = !className.startsWith("_");

      classes.push({
        name: className,
        exported: isPublic,
        startLine: lineNumber,
        endLine: lineNumber,
      });

      if (isPublic) {
        exports.push({ name: className, default: false });
      }
    }

    // 4. GLOBAL VARIABLES (Top level without indent)
    if (!lineText.startsWith(" ") && !lineText.startsWith("\t")) {
      const varMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(:\s*[^=]+)?\s*=\s*/);
      if (
        varMatch &&
        !trimmed.startsWith("def ") &&
        !trimmed.startsWith("class ") &&
        !trimmed.startsWith("import ") &&
        !trimmed.startsWith("from ")
      ) {
        const varName = varMatch[1];
        const isPublic = !varName.startsWith("_");

        variables.push({
          name: varName,
          exported: isPublic,
        });

        if (isPublic) {
          exports.push({ name: varName, default: false });
        }
      }
    }
  });

  return {
    imports,
    exports,
    functions,
    classes,
    variables,
    components: [],
  };
}
