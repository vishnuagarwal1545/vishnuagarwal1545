import { mulberry32 } from './rng.js';

function neighbors(cellIndex, cols, rows) {
  const row = Math.floor(cellIndex / cols);
  const col = cellIndex % cols;
  const out = [];
  if (row > 0) out.push((row - 1) * cols + col);
  if (row < rows - 1) out.push((row + 1) * cols + col);
  if (col > 0) out.push(row * cols + col - 1);
  if (col < cols - 1) out.push(row * cols + col + 1);
  return out;
}

// Randomized Hamiltonian path over the grid graph: DFS + Warnsdorff's rule
// (visit the unvisited neighbor with the fewest remaining onward options
// first — the same heuristic used for knight's-tour solvers), seeded-RNG
// tie-break, backtracking on dead ends. Produces an organic, non-repeating
// route instead of a fixed boustrophedon, while still guaranteeing full
// coverage (grid graphs of this shape are always Hamiltonian-path-solvable).
function hamiltonianPath(cols, rows, rng) {
  const total = cols * rows;
  const visited = new Array(total).fill(false);
  const path = [0];
  visited[0] = true;

  function onwardOptions(cell) {
    return neighbors(cell, cols, rows).filter(n => !visited[n]).length;
  }

  function step() {
    if (path.length === total) return true;
    const current = path[path.length - 1];
    const candidates = neighbors(current, cols, rows)
      .filter(n => !visited[n])
      .map(n => ({ n, degree: onwardOptions(n) }))
      .sort((a, b) => a.degree - b.degree || rng() - 0.5);

    for (const { n } of candidates) {
      visited[n] = true;
      path.push(n);
      if (step()) return true;
      path.pop();
      visited[n] = false;
    }
    return false;
  }

  return step() ? path : null;
}

function boustrophedon(cols, rows) {
  const path = [];
  for (let col = 0; col < cols; col++) {
    const topToBottom = col % 2 === 0;
    for (let i = 0; i < rows; i++) {
      const row = topToBottom ? i : rows - 1 - i;
      path.push(row * cols + col);
    }
  }
  return path;
}

export function buildPath(cols, rows, seed = 1) {
  const rng = mulberry32(seed);
  return hamiltonianPath(cols, rows, rng) ?? boustrophedon(cols, rows);
}
