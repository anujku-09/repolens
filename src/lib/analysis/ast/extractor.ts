import ts from "typescript";
import {
  FileAnalysisPayload,
  AstImport,
  AstExport,
  AstFunction,
  AstClass,
  AstVariable,
  AstComponent,
} from "@/types";

/**
 * Helper to check if AST node has export modifier.
 */
function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  if (!modifiers) return false;
  return modifiers.some(
    (m) => m.kind === ts.SyntaxKind.ExportKeyword || m.kind === ts.SyntaxKind.DefaultKeyword
  );
}

/**
 * Helper to check if AST node has async modifier.
 */
function hasAsyncModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  if (!modifiers) return false;
  return modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
}

/**
 * Helper to check if a function contains JSX return statements or JSX elements.
 */
function containsJsx(node: ts.Node): boolean {
  let foundJsx = false;

  function visit(child: ts.Node) {
    if (foundJsx) return;
    if (
      ts.isJsxElement(child) ||
      ts.isJsxSelfClosingElement(child) ||
      ts.isJsxFragment(child)
    ) {
      foundJsx = true;
      return;
    }
    ts.forEachChild(child, visit);
  }

  visit(node);
  return foundJsx;
}

/**
 * Calculates start line and end line for an AST node using SourceFile line mapping (1-indexed).
 */
function getNodeLines(node: ts.Node, sourceFile: ts.SourceFile): { startLine: number; endLine: number } {
  const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  return {
    startLine: startPos.line + 1,
    endLine: endPos.line + 1,
  };
}

/**
 * Extracts deterministic structural facts (Imports, Exports, Functions, Classes, Variables, Components)
 * from a TypeScript SourceFile AST.
 */
export function extractStructuralFacts(sourceFile: ts.SourceFile): FileAnalysisPayload {
  const imports: AstImport[] = [];
  const exports: AstExport[] = [];
  const functions: AstFunction[] = [];
  const classes: AstClass[] = [];
  const variables: AstVariable[] = [];
  const components: AstComponent[] = [];

  const isJsxFile = sourceFile.fileName.endsWith(".tsx") || sourceFile.fileName.endsWith(".jsx");

  // Iterate over top-level statements in SourceFile
  ts.forEachChild(sourceFile, (node) => {
    // 1. IMPORTS
    if (ts.isImportDeclaration(node)) {
      const source = ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : "";
      let defaultImport: string | null = null;
      let namespaceImport: string | null = null;
      const namedImports: string[] = [];

      if (node.importClause) {
        if (node.importClause.name) {
          defaultImport = node.importClause.name.text;
        }

        if (node.importClause.namedBindings) {
          if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            namespaceImport = node.importClause.namedBindings.name.text;
          } else if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach((spec) => {
              namedImports.push(spec.name.text);
            });
          }
        }
      }

      imports.push({
        source,
        defaultImport,
        namespaceImport,
        namedImports,
      });
    }

    // 2. EXPORTS
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach((spec) => {
          exports.push({
            name: spec.name.text,
            default: false,
          });
        });
      }
    }

    if (ts.isExportAssignment(node)) {
      let exportName = "default";
      if (ts.isIdentifier(node.expression)) {
        exportName = node.expression.text;
      }
      exports.push({
        name: exportName,
        default: true,
      });
    }

    // 3. FUNCTION DECLARATIONS
    if (ts.isFunctionDeclaration(node)) {
      const funcName = node.name ? node.name.text : "anonymousFunction";
      const isExported = hasExportModifier(node);
      const isAsync = hasAsyncModifier(node);
      const { startLine, endLine } = getNodeLines(node, sourceFile);

      functions.push({
        name: funcName,
        async: isAsync,
        exported: isExported,
        startLine,
        endLine,
      });

      if (isExported) {
        exports.push({ name: funcName, default: false });
      }

      // React Component Heuristic: PascalCase function returning JSX
      if (/^[A-Z][a-zA-B0-9]*$/.test(funcName) && (isJsxFile || containsJsx(node))) {
        components.push({
          name: funcName,
          startLine,
          endLine,
          heuristic: true,
        });
      }
    }

    // 4. CLASS DECLARATIONS
    if (ts.isClassDeclaration(node)) {
      const className = node.name ? node.name.text : "AnonymousClass";
      const isExported = hasExportModifier(node);
      const { startLine, endLine } = getNodeLines(node, sourceFile);

      classes.push({
        name: className,
        exported: isExported,
        startLine,
        endLine,
      });

      if (isExported) {
        exports.push({ name: className, default: false });
      }
    }

    // 5. VARIABLE STATEMENTS & ARROW FUNCTIONS
    if (ts.isVariableStatement(node)) {
      const isExported = hasExportModifier(node);

      node.declarationList.declarations.forEach((decl) => {
        if (ts.isIdentifier(decl.name)) {
          const varName = decl.name.text;

          // Check if variable initializer is an arrow function or function expression
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
          ) {
            const funcNode = decl.initializer;
            const isAsync = hasAsyncModifier(funcNode);
            const { startLine, endLine } = getNodeLines(node, sourceFile);

            functions.push({
              name: varName,
              async: isAsync,
              exported: isExported,
              startLine,
              endLine,
            });

            if (isExported) {
              exports.push({ name: varName, default: false });
            }

            // React Component Heuristic: PascalCase variable initialized to function returning JSX
            if (/^[A-Z][a-zA-B0-9]*$/.test(varName) && (isJsxFile || containsJsx(funcNode))) {
              components.push({
                name: varName,
                startLine,
                endLine,
                heuristic: true,
              });
            }
          } else {
            // Standard variable/constant declaration
            variables.push({
              name: varName,
              exported: isExported,
            });

            if (isExported) {
              exports.push({ name: varName, default: false });
            }
          }
        }
      });
    }
  });

  return {
    imports,
    exports,
    functions,
    classes,
    variables,
    components,
  };
}
