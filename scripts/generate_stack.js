import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { renderStackSvg } from './lib/chips.js';
import { CHIP_PALETTES } from './lib/palette.js';

const techStack = JSON.parse(readFileSync(new URL('../data/tech-stack-full.json', import.meta.url)));

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });

for (const [themeName, palette] of Object.entries(CHIP_PALETTES)) {
  const svg = renderStackSvg(techStack, palette);
  writeFileSync(new URL(`../assets/tech-stack-${themeName}.svg`, import.meta.url), svg);
  console.log(`wrote assets/tech-stack-${themeName}.svg (${svg.length} bytes)`);
}
