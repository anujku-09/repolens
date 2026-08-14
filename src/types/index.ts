/**
 * Shared TypeScript domain models for RepoLens database persistence, GitHub discovery, File Ingestion, Source Code Ingestion, AST Analysis, Dependency Graph, Symbol Resolution & Architecture Health Scoring (Feature 8B).
 */

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type RepositoryStatus = "connected" | "indexing" | "indexed" | "failed";

export interface Repository {
  id: string;
  user_id: string;
  github_repo_id: number | null;
  name: string;
  full_name: string;
  owner: string;
  url: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  default_branch: string;
  status?: RepositoryStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateRepositoryInput {
  github_repo_id?: number | null;
  name: string;
  full_name: string;
  owner: string;
  url?: string | null;
  description?: string | null;
  language?: string | null;
  stars?: number;
  forks?: number;
  default_branch?: string;
  status?: RepositoryStatus;
}

export interface UpdateRepositoryInput {
  github_repo_id?: number | null;
  name?: string;
  full_name?: string;
  owner?: string;
  url?: string | null;
  description?: string | null;
  language?: string | null;
  stars?: number;
  forks?: number;
  default_branch?: string;
  status?: RepositoryStatus;
}

/**
 * GitHub REST API Repository Data Structure
 */
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  private: boolean;
}

/**
 * GitHub Git Trees API Item Structure
 */
export interface GitTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
  url?: string;
}

/**
 * Database Record for public.repository_files
 */
export interface RepositoryFile {
  id: string;
  repository_id: string;
  user_id: string;
  path: string;
  name: string;
  type: "file" | "directory";
  size: number | null;
  extension: string | null;
  language: string | null;
  parent_path: string;
  depth: number;
  created_at: string;
}

export interface RepositoryFileInsert {
  repository_id: string;
  user_id: string;
  path: string;
  name: string;
  type: "file" | "directory";
  size: number | null;
  extension: string | null;
  language: string | null;
  parent_path: string;
  depth: number;
}

/**
 * Ingestion Summary Statistics (File Tree)
 */
export interface IngestionSummary {
  totalFiles: number;
  totalDirectories: number;
  totalCodeSize: number;
  languageBreakdown: Record<string, { count: number; bytes: number }>;
}

/**
 * Database Record for public.repository_file_contents
 */
export interface RepositoryFileContent {
  id: string;
  repository_file_id: string;
  repository_id: string;
  user_id: string;
  content: string;
  sha: string | null;
  encoding: string;
  size: number | null;
  created_at: string;
  updated_at: string;
}

export interface RepositoryFileContentInsert {
  repository_file_id: string;
  repository_id: string;
  user_id: string;
  content: string;
  sha?: string | null;
  encoding?: string;
  size?: number | null;
}

/**
 * Source Code Ingestion Summary Statistics
 */
export interface SourceIngestionSummary {
  totalFiles: number;
  analyzableFiles: number;
  ingestedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  totalBytes: number;
  languages: Record<string, number>;
}

/**
 * AST Structural Analysis Types
 */
export interface AstImport {
  source: string;
  defaultImport: string | null;
  namespaceImport: string | null;
  namedImports: string[];
}

export interface AstExport {
  name: string;
  default: boolean;
}

export interface AstFunction {
  name: string;
  async: boolean;
  exported: boolean;
  startLine: number;
  endLine: number;
}

export interface AstClass {
  name: string;
  exported: boolean;
  startLine: number;
  endLine: number;
}

export interface AstVariable {
  name: string;
  exported: boolean;
}

export interface AstComponent {
  name: string;
  startLine: number;
  endLine: number;
  heuristic: boolean;
}

export interface FileAnalysisPayload {
  imports: AstImport[];
  exports: AstExport[];
  functions: AstFunction[];
  classes: AstClass[];
  variables: AstVariable[];
  components: AstComponent[];
}

export type AnalysisStatus = "analyzed" | "unsupported" | "failed";

export interface RepositoryFileAnalysis {
  id: string;
  repository_file_id: string;
  repository_id: string;
  user_id: string;
  language: string;
  parser: string;
  parser_version: string | null;
  analysis: FileAnalysisPayload;
  imports_count: number;
  exports_count: number;
  functions_count: number;
  classes_count: number;
  variables_count: number;
  components_count: number;
  status: AnalysisStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepositoryAnalysisSummary {
  totalSourceFiles: number;
  analyzedFiles: number;
  unsupportedFiles: number;
  failedFiles: number;
  imports: number;
  exports: number;
  functions: number;
  classes: number;
  variables: number;
  components: number;
  unsupportedLanguages: string[];
}

/**
 * Dependency Graph Domain Types (Feature 7)
 */
export type DependencyType = "internal" | "external" | "unresolved";

export interface RepositoryDependency {
  id: string;
  repository_id: string;
  user_id: string;
  source_file_id: string;
  target_file_id: string;
  import_path: string;
  dependency_type: DependencyType;
  created_at: string;
}

export interface RepositoryDependencyInsert {
  repository_id: string;
  user_id: string;
  source_file_id: string;
  target_file_id: string;
  import_path: string;
  dependency_type: DependencyType;
}

export interface DependencyGraphSummary {
  filesProcessed: number;
  internalDependencies: number;
  externalDependencies: number;
  unresolvedDependencies: number;
  circularDependencyCount: number;
  mostImportedFiles: { path: string; count: number }[];
  mostDependentFiles: { path: string; count: number }[];
  externalPackages: { name: string; count: number }[];
  circularCycles: string[][];
}

export interface GraphNode {
  id: string;
  path: string;
  name: string;
  language: string | null;
  size: number | null;
  inDegree: number;
  outDegree: number;
  imports: string[];
  importedBy: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  importPath: string;
}

export interface SerializedGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: DependencyGraphSummary | null;
}

/**
 * Symbol-Level Resolution & Definition-to-Usage Domain Types (Feature 8A)
 */
export type SymbolKind = "function" | "class" | "component" | "variable" | "type" | "export";
export type ReferenceType = "import" | "call" | "type_reference";

export interface RepositorySymbol {
  id: string;
  repository_id: string;
  user_id: string;
  defining_file_id: string;
  symbol_name: string;
  symbol_kind: SymbolKind;
  is_exported: boolean;
  is_default_export: boolean;
  start_line: number | null;
  end_line: number | null;
  created_at: string;
}

export interface RepositorySymbolInsert {
  repository_id: string;
  user_id: string;
  defining_file_id: string;
  symbol_name: string;
  symbol_kind: SymbolKind;
  is_exported: boolean;
  is_default_export: boolean;
  start_line?: number | null;
  end_line?: number | null;
}

export interface RepositorySymbolReference {
  id: string;
  repository_id: string;
  user_id: string;
  symbol_id: string;
  referencing_file_id: string;
  reference_type: ReferenceType;
  import_alias: string | null;
  created_at: string;
}

export interface RepositorySymbolReferenceInsert {
  repository_id: string;
  user_id: string;
  symbol_id: string;
  referencing_file_id: string;
  reference_type: ReferenceType;
  import_alias?: string | null;
}

export interface SymbolGraphSummary {
  totalDefinedSymbols: number;
  exportedSymbolsCount: number;
  symbolReferencesCount: number;
  unusedExportsCount: number;
  topUsedSymbols: { symbol_name: string; defining_path: string; usages_count: number }[];
  unusedExports: { symbol_name: string; defining_path: string; kind: SymbolKind }[];
  allDefinedSymbols?: { symbol_name: string; defining_path: string; kind: SymbolKind; is_exported: boolean }[];
  allExportedSymbols?: { symbol_name: string; defining_path: string; kind: SymbolKind }[];
  allReferenceEdges?: { symbol_name: string; defining_path: string; referencing_path: string }[];
}

export interface SymbolWithReferences extends RepositorySymbol {
  defining_path: string;
  references: {
    referencing_file_id: string;
    referencing_path: string;
    reference_type: ReferenceType;
  }[];
}

/**
 * Architecture Health Scoring & Codebase Analytics Domain Types (Feature 8B)
 */
export interface LayerViolation {
  sourcePath: string;
  targetPath: string;
  violationType: string;
  reason: string;
}

export interface OrphanFile {
  fileId: string;
  path: string;
}

export interface FileInstabilityMetric {
  path: string;
  fanIn: number;
  fanOut: number;
  instability: number;
}

export interface ArchitectureAnalysisPayload {
  layerViolations: LayerViolation[];
  orphanFiles: OrphanFile[];
  topInstableFiles: FileInstabilityMetric[];
  mostCoupledFiles: { path: string; totalDegree: number }[];
  scoringBreakdown: {
    baseScore: number;
    circularCyclesPenalty: number;
    layerViolationsPenalty: number;
    unusedExportsPenalty: number;
    orphanFilesPenalty: number;
  };
}

export interface RepositoryArchitectureScore {
  id: string;
  repository_id: string;
  user_id: string;
  health_score: number;
  coupling_score: number;
  cohesion_score: number;
  modularity_score: number;
  instability_index: number | null;
  total_files_evaluated: number;
  layer_violations_count: number;
  orphan_files_count: number;
  circular_cycles_count: number;
  unused_exports_count: number;
  analysis_payload: ArchitectureAnalysisPayload;
  created_at: string;
  updated_at: string;
}

/**
 * Feature 9: Change Impact Analysis Domain Types
 */
export type ImpactRisk = "low" | "medium" | "high" | "critical";

export interface AffectedFileItem {
  id: string;
  path: string;
  name: string;
  depth: number;
}

export interface AffectedSymbolItem {
  symbol_name: string;
  kind: SymbolKind;
  defining_path: string;
  reference_count: number;
}

export interface AffectedComponentItem {
  name: string;
  path: string;
}

export interface AffectedRouteItem {
  route_path: string;
  file_path: string;
}

export interface ChangeImpactResult {
  targetFile: { id: string; path: string; name: string };
  risk: ImpactRisk;
  reasons: string[];
  directDependents: AffectedFileItem[];
  transitiveDependents: AffectedFileItem[];
  affectedSymbols: AffectedSymbolItem[];
  affectedComponents: AffectedComponentItem[];
  affectedRoutes: AffectedRouteItem[];
  inCircularCycle: boolean;
  stats: {
    directCount: number;
    transitiveCount: number;
    totalAffectedCount: number;
    maxDepth: number;
    fanIn: number;
    fanOut: number;
  };
}
