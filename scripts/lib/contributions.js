// Turns a GitHub contributionCalendar (weeks -> days) into a flat per-cell
// level array matching path.js's cellIndex = row * cols + col layout.
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// One label per calendar month that starts within the visible weeks, placed
// at the column of its first day — same layout GitHub's own calendar uses.
function monthLabelsFromWeeks(weeks) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const firstDay = week.contributionDays[0]?.date;
    if (!firstDay) return;
    const month = new Date(firstDay).getUTCMonth();
    if (month !== lastMonth) {
      labels.push({ col, text: MONTH_ABBR[month] });
      lastMonth = month;
    }
  });
  return labels;
}

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

  return { cols, rows, levels, monthLabels: monthLabelsFromWeeks(weeks) };
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
              weeks { contributionDays { contributionCount weekday date } }
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
