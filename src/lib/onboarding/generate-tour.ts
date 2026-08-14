import { createClient } from "@/lib/supabase/server";
import { getRepositoryById } from "@/lib/repositories";
import { getRepositoryFiles } from "@/lib/repositories/files";
import {
  RepositoryOnboardingTour,
  OnboardingTourStep,
  RepositoryFile,
  RepositorySymbol,
  SymbolKind,
} from "@/types";

/**
 * Feature 12: Guided Repository Onboarding Tour Generator Engine.
 * Dynamically computes a 5-minute interactive onboarding tour for new developers,
 * deriving entry points, central hub modules, schemas, actions, and key components.
 */
export async function generateRepositoryOnboardingTour(
  repositoryId: string
): Promise<{ success: boolean; tour?: RepositoryOnboardingTour; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return { success: false, error: "Unauthorized: Please log in first." };
  }

  // 1. Verify Repository Ownership
  const repository = await getRepositoryById(repositoryId);
  if (!repository) {
    return { success: false, error: "Repository not found." };
  }

  // 2. Bulk load repository files
  const files = await getRepositoryFiles(repositoryId);
  const codeFiles = files.filter((f) => f.type === "file");

  if (codeFiles.length === 0) {
    return { success: false, error: "Repository file tree has no indexed code files." };
  }

  const idToFileMap = new Map<string, RepositoryFile>();
  const pathToFileMap = new Map<string, RepositoryFile>();
  files.forEach((f) => {
    idToFileMap.set(f.id, f);
    pathToFileMap.set(f.path, f);
  });

  // 3. Bulk load dependencies to compute Fan-In and Fan-Out
  const { data: depsData } = await supabase
    .from("repository_dependencies")
    .select("source_file_id, target_file_id")
    .eq("repository_id", repositoryId);

  const fileFanInMap = new Map<string, number>();
  const fileFanOutMap = new Map<string, number>();

  (depsData || []).forEach((d) => {
    if (d.target_file_id) {
      fileFanInMap.set(d.target_file_id, (fileFanInMap.get(d.target_file_id) || 0) + 1);
    }
    if (d.source_file_id) {
      fileFanOutMap.set(d.source_file_id, (fileFanOutMap.get(d.source_file_id) || 0) + 1);
    }
  });

  // 4. Bulk load symbols and symbol reference counts
  const { data: symbolsData } = await supabase
    .from("repository_symbols")
    .select("*")
    .eq("repository_id", repositoryId);

  const symbols = (symbolsData || []) as RepositorySymbol[];

  const { data: refsData } = await supabase
    .from("repository_symbol_references")
    .select("symbol_id")
    .eq("repository_id", repositoryId);

  const symbolRefCountMap = new Map<string, number>();
  (refsData || []).forEach((r) => {
    symbolRefCountMap.set(r.symbol_id, (symbolRefCountMap.get(r.symbol_id) || 0) + 1);
  });

  // FileId -> Symbols defined in file
  const fileSymbolsMap = new Map<string, RepositorySymbol[]>();
  symbols.forEach((s) => {
    if (!fileSymbolsMap.has(s.defining_file_id)) {
      fileSymbolsMap.set(s.defining_file_id, []);
    }
    fileSymbolsMap.get(s.defining_file_id)!.push(s);
  });

  // 5. Bulk load architecture score
  const { data: scoreData } = await supabase
    .from("repository_architecture_scores")
    .select("health_score")
    .eq("repository_id", repositoryId)
    .maybeSingle();

  // Helper to extract top key symbols for a file
  const getKeySymbolsForFile = (fileId: string) => {
    const syms = fileSymbolsMap.get(fileId) || [];
    return syms
      .map((s) => ({
        name: s.symbol_name,
        kind: s.symbol_kind,
        referenceCount: symbolRefCountMap.get(s.id) || 0,
      }))
      .sort((a, b) => b.referenceCount - a.referenceCount)
      .slice(0, 3);
  };

  // --- AUTOMATED 5-7 STEP ONBOARDING TOUR SELECTION ---
  const tourSteps: OnboardingTourStep[] = [];
  const selectedFileIds = new Set<string>();

  // STEP 1: Application Entry & Root Router
  const entryFile =
    codeFiles.find((f) => f.path.endsWith("layout.tsx") || f.path.endsWith("layout.jsx")) ||
    codeFiles.find((f) => f.path.endsWith("page.tsx") || f.path.endsWith("page.jsx")) ||
    codeFiles.find((f) => f.path.endsWith("index.ts") || f.path.endsWith("main.ts")) ||
    codeFiles[0];

  if (entryFile) {
    selectedFileIds.add(entryFile.id);
    tourSteps.push({
      stepNumber: 1,
      title: "Application Entry & Layout Shell",
      role: "Root Router & Entry Point",
      filePath: entryFile.path,
      fileId: entryFile.id,
      whyItMatters: "Sets up the global layout shell, providers, and main routing entry point for the entire repository.",
      keySymbols: getKeySymbolsForFile(entryFile.id),
      fanIn: fileFanInMap.get(entryFile.id) || 0,
      fanOut: fileFanOutMap.get(entryFile.id) || 0,
      aiExplanation: `This module serves as the primary entry point (${entryFile.path}). Modifying this file impacts top-level routing and UI layout wrapping.`,
    });
  }

  // STEP 2: Core Auth & Connection Engine
  const authFile = codeFiles.find((f) =>
    f.path.includes("supabase/server") ||
    f.path.includes("auth") ||
    f.path.includes("client") ||
    f.path.includes("db") ||
    f.path.includes("api")
  );

  if (authFile && !selectedFileIds.has(authFile.id)) {
    selectedFileIds.add(authFile.id);
    tourSteps.push({
      stepNumber: tourSteps.length + 1,
      title: "Authentication & Database Session Engine",
      role: "Infrastructure Services",
      filePath: authFile.path,
      fileId: authFile.id,
      whyItMatters: "Handles authentication sessions, Supabase database connections, and API client initializations.",
      keySymbols: getKeySymbolsForFile(authFile.id),
      fanIn: fileFanInMap.get(authFile.id) || 0,
      fanOut: fileFanOutMap.get(authFile.id) || 0,
      aiExplanation: `Core infrastructure module (${authFile.path}) providing authenticated client connections across server components.`,
    });
  }

  // STEP 3: Central Architectural Hub (Highest Fan-In File)
  const sortedByFanIn = [...codeFiles]
    .filter((f) => !selectedFileIds.has(f.id))
    .sort((a, b) => (fileFanInMap.get(b.id) || 0) - (fileFanInMap.get(a.id) || 0));

  const centralHubFile = sortedByFanIn[0];
  if (centralHubFile) {
    const hubFanIn = fileFanInMap.get(centralHubFile.id) || 0;
    selectedFileIds.add(centralHubFile.id);
    tourSteps.push({
      stepNumber: tourSteps.length + 1,
      title: `Central Architectural Hub (Fan-In: ${hubFanIn})`,
      role: "High-Coupling Core Utility",
      filePath: centralHubFile.path,
      fileId: centralHubFile.id,
      whyItMatters: `Central utility imported by ${hubFanIn} files across the codebase. Changes here have high blast radius impact.`,
      keySymbols: getKeySymbolsForFile(centralHubFile.id),
      fanIn: hubFanIn,
      fanOut: fileFanOutMap.get(centralHubFile.id) || 0,
      aiExplanation: `This module is the most heavily imported file in the codebase. Always verify Change Impact before modifying functions here.`,
    });
  }

  // STEP 4: Domain Types & Schema Model
  const schemaFile = codeFiles.find((f) =>
    (f.path.includes("types") || f.path.includes("models") || f.path.includes("schema")) &&
    !selectedFileIds.has(f.id)
  );

  if (schemaFile) {
    selectedFileIds.add(schemaFile.id);
    tourSteps.push({
      stepNumber: tourSteps.length + 1,
      title: "Domain Schemas & TypeScript Contracts",
      role: "Type System & Models",
      filePath: schemaFile.path,
      fileId: schemaFile.id,
      whyItMatters: "Defines core TypeScript interfaces, entity schemas, and data contracts consumed across client & server.",
      keySymbols: getKeySymbolsForFile(schemaFile.id),
      fanIn: fileFanInMap.get(schemaFile.id) || 0,
      fanOut: fileFanOutMap.get(schemaFile.id) || 0,
      aiExplanation: `Central type definition repository (${schemaFile.path}) ensuring compile-time type safety across all components.`,
    });
  }

  // STEP 5: Server Actions / Business Logic Layer
  const actionsFile = codeFiles.find((f) =>
    (f.path.includes("actions") || f.path.includes("services") || f.path.includes("controllers")) &&
    !selectedFileIds.has(f.id)
  );

  if (actionsFile) {
    selectedFileIds.add(actionsFile.id);
    tourSteps.push({
      stepNumber: tourSteps.length + 1,
      title: "Server Actions & Business Logic",
      role: "Data Mutations & RPC Layer",
      filePath: actionsFile.path,
      fileId: actionsFile.id,
      whyItMatters: "Exposes server actions and business procedures for database mutations, analysis pipelines, and search.",
      keySymbols: getKeySymbolsForFile(actionsFile.id),
      fanIn: fileFanInMap.get(actionsFile.id) || 0,
      fanOut: fileFanOutMap.get(actionsFile.id) || 0,
      aiExplanation: `Server action handler (${actionsFile.path}) encapsulating mutation logic, authorization checks, and revalidations.`,
    });
  }

  // STEP 6: Key UI Component System
  const uiFile = codeFiles.find((f) =>
    (f.path.includes("components") || f.path.includes("views")) &&
    !selectedFileIds.has(f.id)
  );

  if (uiFile) {
    selectedFileIds.add(uiFile.id);
    tourSteps.push({
      stepNumber: tourSteps.length + 1,
      title: "Primary Interactive UI Component",
      role: "Frontend View System",
      filePath: uiFile.path,
      fileId: uiFile.id,
      whyItMatters: "Renders core interactive interface elements, handling client-side state, user events, and navigation.",
      keySymbols: getKeySymbolsForFile(uiFile.id),
      fanIn: fileFanInMap.get(uiFile.id) || 0,
      fanOut: fileFanOutMap.get(uiFile.id) || 0,
      aiExplanation: `Interactive UI component module (${uiFile.path}) managing user interaction workflows and state rendering.`,
    });
  }

  const tour: RepositoryOnboardingTour = {
    repositoryId,
    repositoryName: repository.full_name,
    totalSteps: tourSteps.length,
    estimatedTimeMinutes: 5,
    healthScore: scoreData?.health_score ?? null,
    steps: tourSteps,
  };

  return {
    success: true,
    tour,
    error: null,
  };
}
