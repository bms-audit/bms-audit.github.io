async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 10e6 ? 1 : 2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// ---------------- stat strips ----------------
function buildOverviewStats(stats, rq2) {
  const strip = document.getElementById('overview-stats');
  const items = [
    { num: fmtNum(stats.overview.post_labels_collected), lbl: 'post labels analyzed' },
    { num: '13', lbl: 'label categories' },
    { num: rq2.overview.precision, lbl: 'precision (labeled set)' },
    { num: rq2.overview.recall, lbl: 'recall (random firehose)' },
  ];
  items.forEach(it => {
    const s = el('div', 'stat', `<div class="num">${it.num}</div><div class="lbl">${it.lbl}</div>`);
    strip.appendChild(s);
  });
}

function buildHiveStats(fig3) {
  const strip = document.getElementById('hive-stats');
  const v = fig3.validation;
  const unflaggedPct = (100 - v.automod_flagged_unlabeled_pct).toFixed(1);
  const items = [
    { num: v.automod_flagged_labeled_pct + '%', lbl: `Automod reproduces BMS's own labeling decisions (${v.automod_flagged_labeled}/${v.labeled_posts_total}) &mdash; a validated stand-in for BMS` },
    { num: unflaggedPct + '%', lbl: `of near-duplicate posts stayed unflagged by BMS's pipeline (${v.unflagged_by_both}/${v.unlabeled_matches_total})` },
    { num: fig3.metadata.n_unsafe, lbl: `of those ${fig3.metadata.total_annotated} unflagged posts were manually judged unsafe` },
    { num: v.manual_unsafe_pct_of_336 + '%', lbl: 'of all 336 &mdash; a concrete lower bound on missed harmful content' },
  ];
  items.forEach(it => {
    const s = el('div', 'stat', `<div class="num">${it.num}</div><div class="lbl">${it.lbl}</div>`);
    strip.appendChild(s);
  });

  const box = document.getElementById('hive-recall-box');
  box.innerHTML = `<b>Finding.</b> Restricting to the ${fig3.metadata.total_annotated} nearest-neighbor posts that both BMS and our Automod proxy left unflagged, ${fig3.metadata.n_unsafe} (${(100*fig3.metadata.n_unsafe/336).toFixed(1)}% of the original 336) were manually judged unsafe &mdash; a concrete lower bound on recall loss in the automated pipeline. ${fig3.hypothesis_counts.H1} of these (61%) score in the near-miss zone on a class Automod already reads; the remaining ${fig3.hypothesis_counts.H2} (39%) score highly on classes Automod's rule set never checks at all.`;
}

// ---------------- RQ3 cluster explorer ----------------
const CLUSTER_LABELS = [
  { slug: 'intolerant', display: 'intolerant' },
  { slug: 'rude', display: 'rude' },
  { slug: 'threat', display: 'threat' },
  { slug: 'self-harm', display: 'self-harm' },
  { slug: 'graphic-media', display: 'graphic-media' },
  { slug: 'porn', display: 'porn' },
  { slug: 'sexual', display: 'sexual' },
  { slug: 'nudity', display: 'nudity' },
  { slug: 'sexual-figurative', display: 'sexual-figurative' },
  { slug: 'spam', display: 'spam' },
  { slug: 'hide', display: '!hide' },
  { slug: 'warn', display: '!warn' },
  { slug: 'takedown', display: '!takedown' },
  { slug: 'country_hide', display: '!hide (country-specific)' },
];

const _clusterCache = {};
async function loadClusterLabel(slug) {
  if (_clusterCache[slug]) return _clusterCache[slug];
  const data = await getJSON(`data/clusters/${slug}.json`);
  _clusterCache[slug] = data;
  return data;
}

function setupClusterExplorer() {
  const tagrow = document.getElementById('cluster-tags');
  CLUSTER_LABELS.forEach((l, i) => {
    const li = document.createElement('li');
    li.className = i === 0 ? 'is-active' : '';
    li.dataset.slug = l.slug;
    const a = el('a', null, `<code>${l.display}</code>`);
    a.addEventListener('click', (e) => { e.preventDefault(); selectClusterLabel(l.slug); });
    li.appendChild(a);
    tagrow.appendChild(li);
  });
  selectClusterLabel(CLUSTER_LABELS[0].slug);
}

async function selectClusterLabel(slug) {
  document.querySelectorAll('#cluster-tags li').forEach(t => t.classList.toggle('is-active', t.dataset.slug === slug));
  const meta = CLUSTER_LABELS.find(l => l.slug === slug);
  document.getElementById('cluster-title').innerHTML = `Clusters within <code>${meta.display}</code>`;
  document.getElementById('chart-clusters').style.opacity = 0.4;
  try {
    const data = await loadClusterLabel(slug);
    renderClusterScatter(data);
    renderClusterLegend(data);
  } catch (e) {
    document.getElementById('cluster-note').textContent = 'Cluster data unavailable for this label.';
    console.error(e);
  } finally {
    document.getElementById('chart-clusters').style.opacity = 1;
  }
}

// ---------------- nav + misc chrome ----------------
function setupNav() {
  const sections = [...document.querySelectorAll('section[id]')];
  const links = [...document.querySelectorAll('#navMenu a.navbar-item')];
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => io.observe(s));

  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMenu');
  burger.addEventListener('click', () => {
    burger.classList.toggle('is-active');
    menu.classList.toggle('is-active');
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('is-active');
    menu.classList.remove('is-active');
  }));
}

function setupBibtexCopy() {
  const btn = document.getElementById('copybib');
  btn.addEventListener('click', async () => {
    const text = document.getElementById('bibtex-text').textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    } catch (e) { /* clipboard may be unavailable; silently ignore */ }
  });
}

// ---------------- boot ----------------
(async function init() {
  setupNav();
  setupBibtexCopy();

  const [stats, rq2, fig1a, fig1b, fig1c, fig6a, fig3] = await Promise.all([
    getJSON('data/stats.json'),
    getJSON('data/rq2.json'),
    getJSON('data/fig1a_delay_vs_volume.json'),
    getJSON('data/fig1b_cdf_automated.json'),
    getJSON('data/fig1c_cdf_human.json'),
    getJSON('data/fig6a_redressal.json'),
    getJSON('data/fig3_hive_blindspots.json'),
  ]);

  buildOverviewStats(stats, rq2);
  buildHiveStats(fig3);

  renderFig1a(fig1a);
  renderCdfPanel('chart-1b', fig1b);
  renderCdfPanel('chart-1c', fig1c);
  renderFig6a(fig6a);
  renderPR(rq2);
  renderHiveViolin('chart-h1', fig3.h1, { showThresholdLine: true, xrange: [0.4, 1.02] });
  renderHiveViolin('chart-h2', fig3.h2, { refLine: 0.80, xrange: [0.75, 1.02] });

  setupClusterExplorer();
})();
