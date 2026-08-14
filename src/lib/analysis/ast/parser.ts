import ts from "typescript";

/**
 * Maps file extension to TypeScript ScriptKind enum.
 */
export function getScriptKindForExtension(fileName: string): ts.ScriptKind {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();

  switch (ext) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".ts":
      return ts.ScriptKind.TS;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.Unknown;
  }
}

/**
 * Checks if a file extension is supported by the TypeScript Compiler AST parser.
 */
export function isTypeScriptAstSupported(fileName: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext);
}

/**
 * Checks if a file is a Python source file.
 */
export function isPythonSupported(fileName: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return ext === ".py";
}

/**
 * Safely parses raw source code text into a TypeScript SourceFile AST.
 * Handles syntax errors gracefully without throwing unhandled exceptions.
 */
export function parseTypeScriptSource(fileName: string, content: string): ts.SourceFile | null {
  if (!content || typeof content !== "string") {
    return null;
  }

  const scriptKind = getScriptKindForExtension(fileName);
  if (scriptKind === ts.ScriptKind.Unknown) {
    return null;
  }

  try {
    const sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true, // setParentNodes = true for full AST traversal
      scriptKind
    );

    return sourceFile;
  } catch (err) {
    console.warn(`[parseTypeScriptSource] Exception parsing ${fileName}:`, err);
    return null;
  }
}
