/**
 * Cycle Detection & Dependency Statistics Engine
 * Uses DFS state tracking to detect directed cycles in internal dependency graphs without crashing.
 */

export interface EdgePair {
  sourcePath: string;
  targetPath: string;
}

/**
 * Detects circular dependency cycles in a directed graph.
 * Returns array of cycle path chains (e.g., [["src/a.ts", "src/b.ts", "src/a.ts"]]).
 */
export function detectCircularDependencies(edges: EdgePair[]): string[][] {
  const adjMap = new Map<string, Set<string>>();

  // Build adjacency list
  edges.forEach(({ sourcePath, targetPath }) => {
    if (sourcePath === targetPath) return; // Ignore self-loops
    if (!adjMap.has(sourcePath)) {
      adjMap.set(sourcePath, new Set());
    }
    adjMap.get(sourcePath)!.add(targetPath);
  });

  const visited = new Map<string, 0 | 1 | 2>(); // 0: UNVISITED, 1: VISITING (GRAY), 2: VISITED (BLACK)
  const cycles: string[][] = [];
  const cycleSet = new Set<string>();

  function dfs(node: string, path: string[]) {
    visited.set(node, 1); // Mark VISITING
    path.push(node);

    const neighbors = adjMap.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        const state = visited.get(neighbor) || 0;

        if (state === 1) {
          // Cycle detected! Extract sub-path of cycle
          const cycleStartIndex = path.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            const cyclePath = [...path.slice(cycleStartIndex), neighbor];
            const cycleKey = cyclePath.join(" -> ");
            if (!cycleSet.has(cycleKey)) {
              cycleSet.add(cycleKey);
              cycles.push(cyclePath);
            }
          }
        } else if (state === 0) {
          dfs(neighbor, path);
        }
      }
    }

    path.pop();
    visited.set(node, 2); // Mark VISITED
  }

  adjMap.forEach((_, node) => {
    if ((visited.get(node) || 0) === 0) {
      dfs(node, []);
    }
  });

  return cycles;
}
