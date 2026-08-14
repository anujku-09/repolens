# 🔍 RepoLens — Modern Codebase Intelligence & Architectural Analytics Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20RLS-emerald?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **RepoLens** is a deterministic, AST-powered codebase intelligence platform designed to help developers, architects, and engineering teams understand, navigate, and refactor complex software repositories without AI hallucinations or heavy cloud compute dependencies.

---

## 📌 Executive Summary & Problem Statement

As software codebases grow in scale and contributor density, engineering teams face significant architectural debt:
- **Opaque Dependency Graphs**: Files import dozens of internal utilities and third-party packages with no clear visual representation of module boundaries or coupling.
- **Silent Architectural Decay**: Circular dependency loops, layer boundary violations (e.g. database logic imported directly inside client UI components), and unused exports accumulate silently over time.
- **High Onboarding Friction**: New engineers waste days tracing root layout entry points, auth flows, and core domain schemas across hundreds of directory trees.
- **AI Coding Assistant Noise**: Passing entire unindexed raw file trees into LLMs (ChatGPT, Claude, Cursor) wastes token budgets, introduces noise, and triggers hallucinated code references.

**RepoLens solves this** by executing deterministic Abstract Syntax Tree (AST) parsing, cross-file symbol mapping, dependency graph resolution, and Martin's Instability Index analytics locally — delivering 100% fact-grounded intelligence.

---

## 🏗️ High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Interface (Next.js App Router)"]
        UI["Dashboard & Repository Intelligence UI"]
        Visualizer["Interactive Canvas Visualizer"]
        Search["AST Codebase Search (Ctrl+K)"]
        Advisor["Refactoring & Onboarding Advisor"]
    end

    subgraph Server ["Next.js Server Actions & API Pipeline"]
        IngestionEngine["1. GitHub Source Code Ingestor"]
        AstExtractor["2. TS/JS & Python AST Extractor"]
        GraphBuilder["3. Cross-Module Dependency Resolver"]
        SymbolMapper["4. Cross-File Symbol Definition Engine"]
        HealthEvaluator["5. Architecture & Instability Evaluator"]
    end

    subgraph Storage ["Supabase PostgreSQL + Row-Level Security"]
        RepoTable[("public.repositories")]
        FileTable[("public.repository_files")]
        ContentTable[("public.repository_file_contents")]
        AnalysisTable[("public.repository_file_analysis")]
        GraphTable[("public.repository_dependency_graphs")]
        SymbolsTable[("public.repository_symbols")]
        ScoreTable[("public.repository_architecture_scores")]
    end

    UI -->|"GitHub Ingestion & Trigger"| IngestionEngine
    IngestionEngine -->|"Store Raw Code & Trees"| Storage
    IngestionEngine --> AstExtractor
    AstExtractor -->|"Extract Structural Facts"| Storage
    AstExtractor --> GraphBuilder
    GraphBuilder -->|"Build Directed Edge Graph"| Storage
    GraphBuilder --> SymbolMapper
    SymbolMapper -->|"Map Definitions & References"| Storage
    SymbolMapper --> HealthEvaluator
    HealthEvaluator -->|"Compute Instability & Coupling Scores"| Storage
    Storage -->|"Server Action Data Hydration"| UI
```

---

## 🔄 5-Step Pipeline Data Flow

RepoLens operates through a 5-step sequential intelligence pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant UI as Repository Dashboard UI
    participant Server as Next.js Server Actions
    participant GitHub as GitHub REST API
    participant AST as TS Compiler / Python Parser
    participant DB as Supabase PostgreSQL

    Dev->>UI: Connect GitHub Repository
    UI->>Server: fetchRepositoryTreeAction(repoId)
    Server->>GitHub: GET /repos/{owner}/{repo}/git/trees/main?recursive=1
    GitHub-->>Server: File Tree JSON
    Server->>DB: Store in public.repository_files
    
    Dev->>UI: 1. Ingest Source Code
    UI->>Server: ingestFileContentsAction(repoId)
    Server->>GitHub: GET /repos/{owner}/{repo}/contents/{path}
    GitHub-->>Server: Raw Source Text
    Server->>DB: Store in public.repository_file_contents

    Dev->>UI: 2. Run AST Analysis
    UI->>Server: analyzeFileAstAction(fileId)
    Server->>AST: parseTypeScriptSource() / extractPythonFacts()
    AST-->>Server: Structural Facts (Imports, Exports, Functions, Classes)
    Server->>DB: Store in public.repository_file_analysis

    Dev->>UI: 3. Build Dependency Graph
    UI->>Server: buildDependencyGraphAction(repoId)
    Server->>Server: Resolve Relative Paths, Aliases & Circular Cycles (Tarjan's SCC)
    Server->>DB: Store in public.repository_dependency_graphs

    Dev->>UI: 4. Map Symbol Definitions & References
    UI->>Server: buildRepositorySymbolsAction(repoId)
    Server->>Server: Cross-link Definitions -> Usage References & Flag Unused Exports
    Server->>DB: Store in public.repository_symbols & references

    Dev->>UI: 5. Calculate Health Score
    UI->>Server: scoreRepositoryArchitectureAction(repoId)
    Server->>Server: Compute Coupling, Cohesion, Modularity & Martin's Instability Index
    Server->>DB: Store in public.repository_architecture_scores
    Server-->>UI: Hydrate Dashboard Cards & Interactive Canvas
```

---

## 🗄️ Database Design & Supabase RLS Schema

RepoLens leverages Supabase PostgreSQL with strict Row-Level Security (RLS) policies guaranteeing total multi-tenant user data isolation:

| Database Table | Primary Responsibility | Key Foreign Keys & Indexes |
| :--- | :--- | :--- |
| `public.profiles` | User profile metadata (username, avatar, GitHub ID) | `id` &rarr; `auth.users.id` |
| `public.repositories` | Connected GitHub repositories & branch metadata | `user_id` &rarr; `auth.users.id` |
| `public.repository_files` | Hierarchical file tree records (`path`, `type`, `size`) | `repository_id` &rarr; `repositories.id` |
| `public.repository_file_contents` | Compressed raw source code text | `repository_file_id` &rarr; `repository_files.id` |
| `public.repository_file_analysis` | Deterministic AST JSON facts (imports, exports, functions) | `repository_file_id` &rarr; `repository_files.id` |
| `public.repository_dependency_graphs` | Graph topology, nodes array, directed edge pairs | `repository_id` &rarr; `repositories.id` |
| `public.repository_symbols` | Unique symbol definitions (functions, components, classes) | `defining_file_id` &rarr; `repository_files.id` |
| `public.repository_symbol_references` | Cross-file symbol consumption links | `symbol_id` &rarr; `repository_symbols.id` |
| `public.repository_architecture_scores` | Coupling, cohesion, modularity, and instability metrics | `repository_id` &rarr; `repositories.id` |

---

## ⚡ Core Platform Features

1. **📊 Overview & Health Dashboard**:
   - Pipeline Stepper status bar.
   - Interactive sub-score cards for **Coupling**, **Cohesion**, **Modularity**, and **Martin's Instability Index** ($I = \frac{C_e}{C_a + C_e}$) with 1-click mathematical definition modals.

2. **🕸️ Dependency Network Canvas**:
   - High-performance interactive SVG dependency graph visualizer.
   - Fan-In / Fan-Out metrics, ring/column layout modes, and live node selection.

3. **🧩 Symbols & AI Refactoring Advisor**:
   - Cross-file symbol definition and usage mapping with unused export detection.
   - **Refactoring Advisor**: Ranks technical debt into `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` priorities.
   - **AI Context Payload Generator**: 1-click copyable noise-free AST context markdown formatted specifically for ChatGPT, Claude, and Cursor.

4. **📁 File Tree & Source Code Inspector**:
   - Tree navigator with syntax-highlighted source viewer and line numbers.
   - **Change Impact & Blast Radius Analyzer**: Calculates exact affected files and downstream risks before making code changes.

5. **🔍 Command Bar Search (`Ctrl + K`)**:
   - Instant AST-aware symbol and codebase search with kind filter pills (`all`, `function`, `component`, `class`, `variable`, `exportedOnly`).

6. **🧭 5-Minute Guided Repository Onboarding Tour**:
   - Step-by-step tour highlighting central entry points, domain schemas, auth engines, and server actions.

---

## 🛡️ Security & Privacy Assurance

- **100% Tenant Isolation**: Supabase Row-Level Security (RLS) policies enforce that users can only query and mutate repositories associated with their authenticated `auth.uid()`.
- **Token Protection**: GitHub OAuth provider tokens are handled exclusively inside server-side Next.js Server Actions and never exposed to client-side DOM bundles.
- **Graceful Rate Limiting**: Automatic fallback to unauthenticated public REST endpoints when GitHub API rate limits are approached.

---

## ⚠️ Known Limitations & Future Scope

### Current Limitations
- **Language Support**: Native AST parsing is fully optimized for TypeScript, JavaScript, JSX, TSX, and Python (`.py`). Other languages (Rust, Go, C++) use lightweight structural pattern matching.
- **Monorepo Workspaces**: Multi-package monorepo root aliases (lerna, pnpm workspaces) are resolved as external modules unless explicit relative paths are defined.

### Future Scope & Roadmap
- [ ] **Tree-Sitter WebAssembly Parser**: Multi-language AST parsing engine for Rust, Go, Java, and C++.
- [ ] **Automated GitHub PR Bot**: Comment change-impact analysis reports directly on GitHub Pull Requests.
- [ ] **Git History Instability Heatmaps**: Overlay Git commit churn frequency against architectural instability scores.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
