import { getIconPath } from './icons.js';

// ponytail: monospace char width is a fixed ratio of font size (~0.6 for
// Menlo/Consolas), not measured — good enough for a static asset; swap for
// real text-metrics if labels ever look clipped.
const CHAR_WIDTH_RATIO = 0.6;

function textWidth(text, fontSize) {
  return text.length * fontSize * CHAR_WIDTH_RATIO;
}

// Wraps chips left-to-right into rows under maxWidth. Pure/testable —
// no SVG string-building here.
export function layoutChips(techList, opts = {}) {
  const {
    maxWidth = 880,
    chipHeight = 34,
    iconSize = 22,
    fontSize = 13,
    paddingX = 14,
    iconTextGap = 9,
    gapX = 10,
    gapY = 10,
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

export function renderStackSvg(techList, palette, opts = {}) {
  const layout = layoutChips(techList, opts);
  const { iconSize, fontSize, paddingX, iconTextGap } = layout;

  const groups = layout.chips.map(({ tech, x, y, width, height }) => {
    const r = height / 2;
    const iconR = iconSize / 2;
    const iconCx = x + paddingX + iconR;
    const iconCy = y + r;
    const iconPath = getIconPath(tech.slug);
    const iconScale = (iconSize * 0.6) / 24;
    const iconOffset = iconSize * 0.2;

    return `<g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${r}" fill="${palette.bg}" stroke="${palette.border}" />
      <circle cx="${iconCx}" cy="${iconCy}" r="${iconR}" fill="${tech.color}" />
      <g transform="translate(${iconCx - iconOffset}, ${iconCy - iconOffset}) scale(${iconScale})">
        <path d="${iconPath}" fill="${tech.textColor}" />
      </g>
      <text x="${x + paddingX + iconSize + iconTextGap}" y="${y + r}" dominant-baseline="central" font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" fill="${palette.text}">${tech.name}</text>
    </g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}">
${groups.join('\n')}
</svg>`;
}
