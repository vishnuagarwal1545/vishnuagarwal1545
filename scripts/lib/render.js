import { getIconPath } from './icons.js';

function fmt(n) {
  return Number(n.toFixed(4));
}

// Builds the fill-color keyframe list for one cell across the full loop.
// Snake occupancy is derived purely from pathIndex (head at step==pathIndex,
// body trailing 1..snakeLength-1 steps after). Badge state (if any) takes
// priority before the snake arrives.
function buildFillTimeline(cell, sim, palette, baseColor) {
  const { totalSteps, snakeLength } = sim;
  const { pathIndex, badge } = cell;
  const entries = [{ step: 0, color: baseColor }];

  const push = (step, color) => {
    if (step < 0 || step >= totalSteps) return;
    const last = entries[entries.length - 1];
    if (last.step === step) { last.color = color; return; }
    if (last.color !== color) entries.push({ step, color });
  };

  if (badge) push(badge.spawnStep, palette.badgeBg);
  push(pathIndex, palette.snake);
  for (let i = 1; i < snakeLength; i++) {
    push(pathIndex + i, palette.snake); // color stays snake; opacity handles falloff on head cell only
  }
  push(pathIndex + snakeLength, baseColor);

  return entries;
}

function toAnimate(entries, totalSteps, loopMs) {
  const keyTimes = entries.map(e => fmt(e.step / totalSteps));
  const values = entries.map(e => e.color);
  if (keyTimes[0] !== 0) { keyTimes.unshift(0); values.unshift(values[0]); }
  keyTimes.push(1);
  values.push(values[0]); // loop seam: end value matches start value
  return `<animate attributeName="fill" dur="${loopMs}ms" repeatCount="indefinite" ` +
    `keyTimes="${keyTimes.join(';')}" values="${values.join(';')}" calcMode="discrete" />`;
}

function renderBadgeGroup(cell, palette, cellSize, sim) {
  if (!cell.badge) return '';
  const { spawnStep, eatStep, tech } = cell.badge;
  const { totalSteps, loopMs } = sim;
  const iconPath = getIconPath(tech.icon);
  const r = cellSize / 2;

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

  return `<g opacity="0">
    ${animate}
    <circle cx="${r}" cy="${r}" r="${r}" fill="${palette.badgeBg}" />
    <g transform="translate(${r * 0.3}, ${r * 0.3}) scale(${(cellSize * 0.4) / 24})">
      <path d="${iconPath}" fill="currentColor" />
    </g>
  </g>`;
}

export function renderSvg(sim, palette, gridConfig) {
  const { cols, rows, cell, gap } = gridConfig;
  const width = cols * (cell + gap) - gap;
  const height = rows * (cell + gap) - gap;

  const rects = [];
  for (const [cellIndex, cellData] of sim.cells) {
    const row = Math.floor(cellIndex / cols);
    const col = cellIndex % cols;
    const x = col * (cell + gap);
    const y = row * (cell + gap);
    const baseColorIdx = cellIndex % palette.base.length; // deterministic, not random — see Task 5 self-review note
    const baseColor = palette.base[baseColorIdx];
    const timeline = buildFillTimeline(cellData, sim, palette, baseColor);
    const animate = toAnimate(timeline, sim.totalSteps, sim.loopMs);

    rects.push(`<g transform="translate(${x},${y})">
      <rect width="${cell}" height="${cell}" rx="2" fill="${baseColor}">${animate}</rect>
      ${renderBadgeGroup(cellData, palette, cell, sim)}
    </g>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${rects.join('\n')}
</svg>`;
}
