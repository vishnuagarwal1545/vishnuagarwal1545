// Turns a GitHub contributionCalendar (weeks -> days) into a flat per-cell
// level array matching path.js's cellIndex = row * cols + col layout.
export function levelsFromWeeks(weeks) {
  const cols = weeks.length;
  const rows = 7;
  const counts = new Array(cols * rows).fill(0);

  weeks.forEach((week, col) => {
    week.contributionDays.forEach(day => {
      counts[day.weekday * cols + col] = day.contributionCount;
    });
  });

  const max = Math.max(1, ...counts);
  // ponytail: quartile-of-max heuristic, not GitHub's own bucketing algorithm —
  // upgrade to their exact quartile-of-nonzero-days method if levels look off.
  const levels = counts.map(c => (c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4))));

  return { cols, rows, levels };
}

export async function fetchContributionWeeks(login, token) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              weeks { contributionDays { contributionCount weekday } }
            }
          }
        }
      }`,
      variables: { login },
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub GraphQL request failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(body.errors)}`);
  }

  const weeks = body.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) {
    throw new Error(
      'No contributionCalendar returned — the token needs at least public read access to the user. ' +
      'If GITHUB_TOKEN keeps failing, add a classic PAT with the read:user scope as a repo secret ' +
      '(e.g. PROFILE_GH_TOKEN) and point the workflow at it.'
    );
  }
  return weeks;
}
