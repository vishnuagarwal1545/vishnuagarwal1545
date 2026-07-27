import { mulberry32 } from './rng.js';

function shuffle(list, rng) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Assigns each shuffled tech-stack entry to a path index ("eatStep"), with a
// randomized 10-30 step lead-in before it's eaten, spaced so at most ~2 badges
// are ever active at once.
// ponytail: spacing is a heuristic gap, not a strict overlap solver — fine for
// an ambient background animation; tighten if badges visibly stack.
function scheduleBadges(pathLength, techStack, rng) {
  const shuffled = shuffle(techStack, rng);
  const badges = [];
  let cursor = 20 + Math.floor(rng() * 10);
  for (const tech of shuffled) {
    if (cursor >= pathLength) break;
    const lead = 10 + Math.floor(rng() * 21); // 10-30
    const spawnStep = Math.max(0, cursor - lead);
    badges.push({ tech, eatPathIndex: cursor, spawnStep });
    cursor += lead + 15 + Math.floor(rng() * 20);
  }
  return badges;
}

export function simulate({ path, techStack, seed = 1, snakeLength = 5, stepMs = 180, levels = null }) {
  const rng = mulberry32(seed);
  const badges = scheduleBadges(path.length, techStack, rng);
  const badgeByPathIndex = new Map(badges.map(b => [b.eatPathIndex, b]));

  const cells = new Map();
  path.forEach((cellIndex, pathIndex) => {
    const scheduled = badgeByPathIndex.get(pathIndex);
    cells.set(cellIndex, {
      cellIndex,
      pathIndex,
      badge: scheduled
        ? { tech: scheduled.tech, spawnStep: scheduled.spawnStep, eatStep: pathIndex }
        : null,
    });
  });

  return {
    stepMs,
    totalSteps: path.length,
    loopMs: path.length * stepMs,
    cells,
    snakeLength,
    levels,
  };
}
