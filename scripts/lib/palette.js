// Matches the amber/navy tokens from the GitHub-profile artifact (--accent,
// --grid-0..4) so the README snake and the profile card read as one system.
export const PALETTES = {
  light: {
    base: ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'],
    snake: '#C9862E',
    badgeBg: '#FFF3CD',
    iconFg: '#24292F',
  },
  dark: {
    base: ['rgba(255,255,255,0.05)', '#123524', '#1C5C3A', '#2EA866', '#4ADE80'],
    snake: '#F2B85C',
    badgeBg: '#2D2200',
    iconFg: '#F0F6FC',
  },
};

// Static pill-chip palette for the tech-stack asset — solid panels (no
// backdrop-filter available outside CSS) tinted to the artifact's dark/light grounds.
export const CHIP_PALETTES = {
  light: { bg: '#EEF2F7', border: '#D7DEEA', text: '#333B47' },
  dark: { bg: '#1C2130', border: '#2A3040', text: '#DDE1E9' },
};
