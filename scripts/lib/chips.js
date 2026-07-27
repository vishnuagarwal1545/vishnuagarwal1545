import { getIconPath } from './icons.js';

// ponytail: monospace char width is a fixed ratio of font size (~0.6 for
// Menlo/Consolas), not measured — good enough for a static asset; swap for
// real text-metrics if labels ever look clipped.
const CHAR_WIDTH_RATIO = 0.6;
const ICON_SCALE_RATIO = 0.72; // fraction of iconSize the icon glyph is drawn at
const GROUP_HEADING_HEIGHT = 26;
const GROUP_GAP_Y = 18;

function textWidth(text, fontSize) {
  return text.length * fontSize * CHAR_WIDTH_RATIO;
}

// Wraps chips left-to-right into rows under maxWidth. Pure/testable —
// no SVG string-building here.
export function layoutChips(techList, opts = {}) {
  const {
    maxWidth = 880,
    chipHeight = 44,
    iconSize = 30,
    fontSize = 14,
    paddingX = 16,
    iconTextGap = 10,
    gapX = 10,
    gapY = 12,
  } = opts;

  const chips = [];
  let x = 0;
  let y = 0;
  let rowMaxHeight = chipHeight;

  for (const tech of techList) {
    const width = paddingX + iconSize + iconTextGap + textWidth(tech.name, fontSize) + paddingX;
    if (x > 0 && x + width > maxWidth) {
      x = 0;
      y += rowMaxHeight + gapY;
    }
    chips.push({ tech, x, y, width, height: chipHeight });
    x += width + gapX;
    rowMaxHeight = Math.max(rowMaxHeight, chipHeight);
  }

  const height = chips.length ? chips[chips.length - 1].y + chipHeight : 0;
  return { chips, width: maxWidth, height, iconSize, fontSize, paddingX, iconTextGap };
}

function groupByCategory(techList) {
  const groups = new Map();
  for (const tech of techList) {
    const category = tech.category ?? 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(tech);
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

function renderChipGroup(techList, palette, opts, yOffset) {
  const layout = layoutChips(techList, opts);
  const { iconSize, fontSize, paddingX, iconTextGap } = layout;

  const groups = layout.chips.map(({ tech, x, y, width, height }) => {
    const r = height / 2;
    const iconR = iconSize / 2;
    const iconCx = x + paddingX + iconR;
    const iconCy = y + yOffset + r;
    const iconPath = getIconPath(tech.slug);
    const iconDrawSize = iconSize * ICON_SCALE_RATIO;
    const iconScale = iconDrawSize / 24;
    const iconOffset = iconDrawSize / 2;

    return `<g>
      <rect x="${x}" y="${y + yOffset}" width="${width}" height="${height}" rx="${r}" fill="${palette.bg}" stroke="${palette.border}" />
      <circle cx="${iconCx}" cy="${iconCy}" r="${iconR}" fill="${tech.color}" />
      <g transform="translate(${iconCx - iconOffset}, ${iconCy - iconOffset}) scale(${iconScale})">
        <path d="${iconPath}" fill="${tech.textColor}" />
      </g>
      <text x="${x + paddingX + iconSize + iconTextGap}" y="${y + yOffset + r}" dominant-baseline="central" font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" fill="${palette.text}">${tech.name}</text>
    </g>`;
  });

  return { svg: groups.join('\n'), height: layout.height };
}

export function renderStackSvg(techList, palette, opts = {}) {
  const maxWidth = opts.maxWidth ?? 880;
  const groups = groupByCategory(techList);

  const sections = [];
  let y = 0;

  for (const { category, items } of groups) {
    const headingSvg = `<text x="0" y="${y + GROUP_HEADING_HEIGHT - 8}" font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="${palette.text}">${category}</text>`;
    y += GROUP_HEADING_HEIGHT;

    const { svg, height } = renderChipGroup(items, palette, { ...opts, maxWidth }, y);
    sections.push(headingSvg, svg);
    y += height + GROUP_GAP_Y;
  }

  const totalHeight = groups.length ? y - GROUP_GAP_Y : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxWidth} ${totalHeight}" width="${maxWidth}" height="${totalHeight}">
${sections.join('\n')}
</svg>`;
}
