import { getIconPath } from './icons.js';

function fmt(n) {
  return Number(n.toFixed(4));
}

function parseHex(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Fades from `a` to `b`; falls back to a hard switch at the midpoint for
// non-hex colors (e.g. the dark theme's `rgba(...)` base-0 tone).
function lerpColor(a, b, t) {
  const pa = parseHex(a), pb = parseHex(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const mix = pa.map((c, i) => Math.round(c + (pb[i] - c) * t));
  return `#${mix.map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

// Collapses entries sharing the same step (keeps the last) — SMIL keyTimes
// must be strictly increasing after the first value.
function dedupeByStep(entries) {
  const out = [];
  for (const entry of entries) {
    if (out.length && out[out.length - 1].step === entry.step) out[out.length - 1] = entry;
    else out.push(entry);
  }
  return out;
}

function buildDiscreteAnimate(attributeName, rawEntries, totalSteps, loopMs) {
  const entries = dedupeByStep(rawEntries);
  const keyTimes = entries.map(e => fmt(e.step / totalSteps));
  const values = entries.map(e => e.value);
  if (keyTimes[0] !== 0) { keyTimes.unshift(0); values.unshift(values[0]); }
  keyTimes.push(1);
  values.push(values[0]); // loop seam: end value matches start value
  return `<animate attributeName="${attributeName}" dur="${loopMs}ms" repeatCount="indefinite" ` +
    `keyTimes="${keyTimes.join(';')}" values="${values.join(';')}" calcMode="discrete" />`;
}

const SNAKE_HEAD_RADIUS_RATIO = 0.5; // full cell radius at the head
const SNAKE_TAIL_RADIUS_RATIO = 0.28; // tapers down towards the tail

// A round snake body segment drawn on top of the (square) background cell.
// Head is largest/brightest; each trailing segment shrinks and fades toward
// the cell's own base color, giving a real head-and-tapering-tail look
// instead of a uniform block of colored squares.
function renderSnakeSegment(cell, sim, palette, cellSize, baseColor) {
  const { totalSteps, snakeLength, loopMs } = sim;
  const { pathIndex } = cell;
  const cx = cellSize / 2;
  const cy = cellSize / 2;

  const opacityEntries = [{ step: Math.max(0, pathIndex - 0.001), value: 0 }];
  const radiusEntries = [];
  const fillEntries = [];

  for (let i = 0; i < snakeLength; i++) {
    const step = pathIndex + i;
    if (step >= totalSteps) break;
    const t = snakeLength > 1 ? i / (snakeLength - 1) : 0;
    opacityEntries.push({ step, value: 1 });
    radiusEntries.push({ step, value: fmt(cellSize * (SNAKE_HEAD_RADIUS_RATIO - (SNAKE_HEAD_RADIUS_RATIO - SNAKE_TAIL_RADIUS_RATIO) * t)) });
    fillEntries.push({ step, value: lerpColor(palette.snake, baseColor, t) });
  }
  const endStep = pathIndex + snakeLength;
  if (endStep < totalSteps) opacityEntries.push({ step: endStep, value: 0 });

  return `<circle cx="${cx}" cy="${cy}" r="${cellSize * SNAKE_HEAD_RADIUS_RATIO}" fill="${palette.snake}" opacity="0">
    ${buildDiscreteAnimate('opacity', opacityEntries, totalSteps, loopMs)}
    ${buildDiscreteAnimate('r', radiusEntries, totalSteps, loopMs)}
    ${buildDiscreteAnimate('fill', fillEntries, totalSteps, loopMs)}
  </circle>`;
}

const BADGE_SIZE_RATIO = 1.5; // badge diameter relative to a background cell

function renderBadgeGroup(cell, palette, cellSize, sim) {
  if (!cell.badge) return '';
  const { spawnStep, eatStep, tech } = cell.badge;
  const { totalSteps, loopMs } = sim;
  const iconPath = getIconPath(tech.icon);
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const r = (cellSize * BADGE_SIZE_RATIO) / 2;

  // Build opacity keyframe timeline: 0 (before spawn) -> 1 (during badge) -> 0 (after eat)
  const entries = [
    { step: 0, opacity: 0 },
    { step: spawnStep, opacity: 0 },
    { step: spawnStep + 0.001, opacity: 1 },
    { step: eatStep - 0.001, opacity: 1 },
    { step: eatStep, opacity: 0 }
  ];

  const keyTimes = entries.map(e => fmt(e.step / totalSteps));
  const values = entries.map(e => e.opacity);
  if (keyTimes[0] !== 0) { keyTimes.unshift(0); values.unshift(values[0]); }
  keyTimes.push(1);
  values.push(values[0]); // loop seam: end value matches start value

  const animate = `<animate attributeName="opacity" dur="${loopMs}ms" repeatCount="indefinite" ` +
    `keyTimes="${keyTimes.join(';')}" values="${values.join(';')}" calcMode="discrete" />`;

  const iconDrawSize = cellSize * 0.64 * BADGE_SIZE_RATIO;
  const iconOffset = iconDrawSize / 2;

  return `<g opacity="0">
    ${animate}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette.badgeBg}" />
    <g transform="translate(${cx - iconOffset}, ${cy - iconOffset}) scale(${iconDrawSize / 24})">
      <path d="${iconPath}" fill="${palette.iconFg}" />
    </g>
  </g>`;
}

const MONTH_LABEL_HEIGHT = 20;

export function renderSvg(sim, palette, gridConfig, monthLabels = []) {
  const { cols, rows, cell, gap } = gridConfig;
  const width = cols * (cell + gap) - gap;
  const gridHeight = rows * (cell + gap) - gap;
  const labelHeight = monthLabels.length ? MONTH_LABEL_HEIGHT : 0;
  const height = gridHeight + labelHeight;

  const labels = monthLabels.map(({ col, text }) =>
    `<text x="${col * (cell + gap)}" y="${labelHeight - 6}" font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" fill="${palette.iconFg}">${text}</text>`
  );

  // Three z-order passes so the round snake segments and enlarged badges
  // always sit on top of every square background cell, regardless of the
  // (Hamiltonian, not raster-order) order cells were visited in.
  const baseCells = [];
  const snakeSegments = [];
  const badges = [];

  for (const [cellIndex, cellData] of sim.cells) {
    const row = Math.floor(cellIndex / cols);
    const col = cellIndex % cols;
    const x = col * (cell + gap);
    const y = row * (cell + gap) + labelHeight;
    const level = sim.levels ? sim.levels[cellIndex] : cellIndex % palette.base.length;
    const baseColor = palette.base[level];

    baseCells.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${baseColor}" />`);
    snakeSegments.push(`<g transform="translate(${x},${y})">${renderSnakeSegment(cellData, sim, palette, cell, baseColor)}</g>`);
    if (cellData.badge) {
      badges.push(`<g transform="translate(${x},${y})">${renderBadgeGroup(cellData, palette, cell, sim)}</g>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${labels.join('\n')}
${baseCells.join('\n')}
${snakeSegments.join('\n')}
${badges.join('\n')}
</svg>`;
}
