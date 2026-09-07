// Central palette used by every Plotly chart, sourced from CSS custom properties
// so charts automatically match light/dark mode.
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartTheme() {
  return {
    text: cssVar('--text'),
    textDim: cssVar('--text-dim'),
    textFaint: cssVar('--text-faint'),
    border: cssVar('--border'),
    bg: cssVar('--bg-card'),
    accent: cssVar('--accent'),
    accent2: cssVar('--accent2'),
    accent3: cssVar('--accent3'),
    warn: cssVar('--warn'),
    font: "'Source Sans 3', sans-serif",
  };
}

// Categorical palette for cluster scatter plots (works in both themes).
const CLUSTER_PALETTE = [
  '#3273dc', '#d1476b', '#0d8f8f', '#e0a94a', '#7957d5',
  '#c65bd8', '#43a047', '#e0574a', '#00838f', '#8d6e63',
  '#7cb342', '#f4511e', '#3949ab', '#00acc1', '#c0ca33',
  '#8e24aa', '#6d4c41', '#546e7a', '#d81b60', '#1e88e5',
  '#fb8c00', '#039be5', '#7e57c2', '#26a69a', '#ec407a',
];

function baseLayout(theme, overrides) {
  const t = theme || chartTheme();
  const layout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: t.font, color: t.text, size: 13 },
    margin: { l: 64, r: 20, t: 10, b: 54 },
    hoverlabel: { bgcolor: t.bg, bordercolor: t.border, font: { color: t.text, family: t.font, size: 13 } },
    legend: { font: { color: t.text, size: 13, weight: 600 } },
    xaxis: { gridcolor: t.border, zerolinecolor: t.border, linecolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
    yaxis: { gridcolor: t.border, zerolinecolor: t.border, linecolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
  };
  return Object.assign(layout, overrides || {});
}

const PLOTLY_CONFIG = { displayModeBar: false, responsive: true };

// Re-render all charts registered here when the OS theme flips, so colors stay in sync.
const _themeRerenderFns = [];
function onThemeRerender(fn) { _themeRerenderFns.push(fn); }
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    _themeRerenderFns.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  });
}
