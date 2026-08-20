import { Chess, type Square } from "chess.js";

/**
 * Arbre de variantes depuis une position de la ligne principale (revue).
 * Chaque nœud = un coup UCI ; `children` = coups possibles depuis la position
 * après ce coup (lignes parallèles et suites).
 */
export type ExplorationVarNode = {
  id: string;
  uci: string;
  children: ExplorationVarNode[];
};

export type ExplorationForest = {
  version: 1;
  branchMainlinePly: number;
  roots: ExplorationVarNode[];
  note: string;
};

export function newExplorationForest(branchMainlinePly: number): ExplorationForest {
  return { version: 1, branchMainlinePly, roots: [], note: "" };
}

export function genExplorationNodeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ex-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Clone profond sans structuredClone (évite échecs navigateurs / données non clonables). */
export function cloneExplorationForest(f: ExplorationForest): ExplorationForest {
  try {
    return JSON.parse(JSON.stringify(f)) as ExplorationForest;
  } catch {
    return {
      version: 1,
      branchMainlinePly: f.branchMainlinePly,
      roots: f.roots,
      note: f.note,
    };
  }
}

function applyUci(game: Chess, uci: string): boolean {
  try {
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion =
      uci.length >= 5 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
    const m = game.move({
      from,
      to,
      ...(promotion ? { promotion } : {}),
    });
    return !!m;
  } catch {
    return false;
  }
}

export function walkPath(
  forest: ExplorationForest,
  path: number[]
): ExplorationVarNode[] {
  const chain: ExplorationVarNode[] = [];
  let level = forest.roots;
  for (let d = 0; d < path.length; d++) {
    const node = level[path[d]];
    if (!node) break;
    chain.push(node);
    level = node.children;
  }
  return chain;
}

export function fenAfterPath(
  baseFen: string,
  forest: ExplorationForest,
  path: number[]
): string {
  let g: Chess;
  try {
    g = new Chess(baseFen);
  } catch {
    try {
      return new Chess().fen();
    } catch {
      return baseFen;
    }
  }
  for (const node of walkPath(forest, path)) {
    if (!applyUci(g, node.uci)) {
      return g.fen();
    }
  }
  return g.fen();
}

/** Dernier nœud du chemin, ou null si chemin invalide / vide. */
export function nodeAtPathEnd(
  forest: ExplorationForest,
  path: number[]
): ExplorationVarNode | null {
  const chain = walkPath(forest, path);
  return chain.length === path.length && path.length > 0
    ? chain[chain.length - 1]
    : null;
}

/** Parent du dernier nœud du chemin (pour ajouter une variante sœur). */
export function parentContext(
  forest: ExplorationForest,
  path: number[]
): { list: ExplorationVarNode[]; index: number } | null {
  if (path.length === 0) return null;
  if (path.length === 1) {
    return { list: forest.roots, index: path[0] };
  }
  const chain = walkPath(forest, path.slice(0, -1));
  const parent = chain[chain.length - 1];
  if (!parent) return null;
  return { list: parent.children, index: path[path.length - 1] };
}

/**
 * Ajoute un coup en prolongeant la ligne : nouveau fils du nœud feuille du chemin.
 * Si le feuille a déjà des enfants, par défaut on ajoute un nouveau fils (fork implicite).
 */
export function appendMoveOnPath(
  forest: ExplorationForest,
  path: number[],
  uci: string,
  mode: "line" | "sibling"
): { forest: ExplorationForest; newPath: number[] } {
  const next = cloneExplorationForest(forest);
  const id = genExplorationNodeId();
  const newNode: ExplorationVarNode = { id, uci, children: [] };

  if (path.length === 0) {
    next.roots.push(newNode);
    return { forest: next, newPath: [next.roots.length - 1] };
  }

  const chain = walkPath(next, path);
  if (chain.length !== path.length) {
    return { forest: next, newPath: path };
  }

  const leaf = chain[chain.length - 1];

  if (mode === "sibling") {
    if (path.length === 0) {
      next.roots.push(newNode);
      return { forest: next, newPath: [next.roots.length - 1] };
    }
    const pc = parentContext(next, path);
    if (!pc) {
      next.roots.push(newNode);
      return { forest: next, newPath: [next.roots.length - 1] };
    }
    pc.list.splice(pc.index + 1, 0, newNode);
    const parentPath = path.slice(0, -1);
    return {
      forest: next,
      newPath: [...parentPath, pc.index + 1],
    };
  }

  // mode === "line"
  leaf.children.push(newNode);
  return { forest: next, newPath: [...path, leaf.children.length - 1] };
}

export function removeLastNodeOnPath(
  forest: ExplorationForest,
  path: number[]
): { forest: ExplorationForest; newPath: number[] } {
  if (path.length === 0) return { forest, newPath: [] };
  const next = cloneExplorationForest(forest);
  const pc =
    path.length === 1
      ? { list: next.roots, index: path[0] }
      : parentContext(next, path);
  if (!pc || pc.index < 0 || pc.index >= pc.list.length) {
    return { forest: next, newPath: path.slice(0, -1) };
  }
  pc.list.splice(pc.index, 1);
  return { forest: next, newPath: path.slice(0, -1) };
}

export function clearForest(forest: ExplorationForest): ExplorationForest {
  return { ...forest, roots: [], note: "" };
}

/** SAN séparés par des espaces le long du chemin. */
export function sanLineFromPath(
  baseFen: string,
  forest: ExplorationForest,
  path: number[]
): string {
  let g: Chess;
  try {
    g = new Chess(baseFen);
  } catch {
    return "";
  }
  const parts: string[] = [];
  for (const node of walkPath(forest, path)) {
    if (!applyUci(g, node.uci)) break;
    const h = g.history({ verbose: true });
    const last = h[h.length - 1];
    if (last) parts.push(last.san);
  }
  return parts.join(" ");
}

function collectLines(
  baseFen: string,
  node: ExplorationVarNode,
  prefix: string[]
): string[][] {
  let g: Chess;
  try {
    g = new Chess(baseFen);
  } catch {
    return [];
  }
  let m = null;
  try {
    const from = node.uci.slice(0, 2) as Square;
    const to = node.uci.slice(2, 4) as Square;
    const promotion =
      node.uci.length >= 5 ? (node.uci[4] as "q" | "r" | "b" | "n") : undefined;
    m = g.move({
      from,
      to,
      ...(promotion ? { promotion } : {}),
    });
  } catch {
    return [];
  }
  if (!m) return [];
  const nextPrefix = [...prefix, m.san];
  const lines: string[][] = [];
  if (node.children.length === 0) {
    lines.push(nextPrefix);
  } else {
    for (const ch of node.children) {
      lines.push(...collectLines(g.fen(), ch, nextPrefix));
    }
  }
  return lines;
}

/** Toutes les lignes terminées (feuilles), en notation SAN. */
export function allLeafSanLines(
  baseFen: string,
  forest: ExplorationForest
): string[][] {
  const out: string[][] = [];
  for (const r of forest.roots) {
    out.push(...collectLines(baseFen, r, []));
  }
  return out;
}

/** Export PGN fragment : ligne principale = première feuille DFS ; autres en parenthèses. */
export function forestToPgnSnippet(
  baseFen: string,
  forest: ExplorationForest
): string {
  if (forest.roots.length === 0) return "";

  const emitNode = (fen: string, node: ExplorationVarNode): string => {
    let g: Chess;
    try {
      g = new Chess(fen);
    } catch {
      return "";
    }
    let m = null;
    try {
      const from = node.uci.slice(0, 2) as Square;
      const to = node.uci.slice(2, 4) as Square;
      const promotion =
        node.uci.length >= 5 ? (node.uci[4] as "q" | "r" | "b" | "n") : undefined;
      m = g.move({
        from,
        to,
        ...(promotion ? { promotion } : {}),
      });
    } catch {
      return "";
    }
    if (!m) return "";
    const s = m.san;
    const nextFen = g.fen();
    if (node.children.length === 0) return s;
    const rest = node.children
      .map((ch) => `(${emitNode(nextFen, ch)})`)
      .join(" ");
    return `${s} ${rest}`.trim();
  };

  const main = emitNode(baseFen, forest.roots[0]);
  const alts = forest.roots
    .slice(1)
    .map((r) => `(${emitNode(baseFen, r)})`)
    .join(" ");
  return [main, alts].filter(Boolean).join(" ").trim();
}

export function forestToJson(forest: ExplorationForest): string {
  return JSON.stringify(forest, null, 2);
}

/** Tous les chemins (préfixes), du premier coup jusqu’à chaque nœud — navigation dans l’arbre. */
export function enumerateAllPathsInTree(forest: ExplorationForest): number[][] {
  const out: number[][] = [];
  function dfs(nodes: ExplorationVarNode[], prefix: number[]) {
    for (let i = 0; i < nodes.length; i++) {
      const p = [...prefix, i];
      out.push(p);
      dfs(nodes[i].children, p);
    }
  }
  dfs(forest.roots, []);
  return out;
}

/** Chemins d’indices menant à chaque feuille (dernier coup d’une ligne terminée). */
export function enumerateLeafPaths(forest: ExplorationForest): number[][] {
  const out: number[][] = [];
  function dfs(nodes: ExplorationVarNode[], prefix: number[]) {
    for (let i = 0; i < nodes.length; i++) {
      const p = [...prefix, i];
      const n = nodes[i];
      if (n.children.length === 0) out.push(p);
      else dfs(n.children, p);
    }
  }
  dfs(forest.roots, []);
  return out;
}

export function parseExplorationForestJson(raw: string): ExplorationForest | null {
  try {
    const o = JSON.parse(raw) as ExplorationForest;
    if (o?.version !== 1 || !Array.isArray(o.roots)) return null;
    return {
      version: 1,
      branchMainlinePly: typeof o.branchMainlinePly === "number" ? o.branchMainlinePly : 0,
      roots: o.roots,
      note: typeof o.note === "string" ? o.note : "",
    };
  } catch {
    return null;
  }
}

/** Import depuis l’ancien format liste plate d’UCI (rétrocompat). */
export function forestFromLinearUcis(
  branchMainlinePly: number,
  ucis: string[],
  note: string
): ExplorationForest {
  if (ucis.length === 0) {
    return { version: 1, branchMainlinePly, roots: [], note };
  }
  let cur: ExplorationVarNode | null = null;
  const roots: ExplorationVarNode[] = [];
  for (const uci of ucis) {
    const n: ExplorationVarNode = {
      id: genExplorationNodeId(),
      uci,
      children: [],
    };
    if (!cur) {
      roots.push(n);
      cur = n;
    } else {
      cur.children = [n];
      cur = n;
    }
  }
  return { version: 1, branchMainlinePly, roots, note };
}
