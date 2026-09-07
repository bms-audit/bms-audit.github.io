// Chart builders. Each function takes real data (loaded from /data/*.json) and
// renders into a target <div id>. All charts re-render on OS theme change.

const SECONDS_TICKS = [1, 10, 60, 600, 3600, 21600, 86400, 864000, 2592000];
const SECONDS_TICKTEXT = ['1s', '10s', '1min', '10min', '1hr', '6hr', '1d', '10d', '30d'];

// ---------------- Figure 1a: delay vs. volume scatter ----------------
function renderFig1a(data) {
  const t = chartTheme();
  const draw = () => {
    const auto = data.filter(d => d.group === 'automated');
    const human = data.filter(d => d.group === 'human');
    const mk = (arr, color, name) => ({
      x: arr.map(d => d.n),
      y: arr.map(d => d.median_s),
      text: arr.map(d => `<b>${d.label}</b><br>${d.n.toLocaleString()} posts<br>median ${d.median}<br>p25 ${d.p25} · p75 ${d.p75}<br>p95 ${d.p95}`),
      customdata: arr.map(d => d.label),
      mode: 'markers+text',
      type: 'scatter',
      textposition: 'top center',
      textfont: { size: 12, color: t.text, weight: 700 },
      texttemplate: '%{customdata}',
      hovertemplate: '%{text}<extra></extra>',
      marker: { size: 13, color, line: { width: 1.5, color: t.bg }, opacity: 0.92 },
      name,
    });
    const traces = [mk(auto, t.accent3, 'Automated (faster)'), mk(human, t.accent2, 'Human oversight (slower)')];
    const layout = baseLayout(t, {
      margin: { l: 60, r: 20, t: 10, b: 46 },
      xaxis: { title: { text: '# posts labeled (log scale)', font: { color: t.text, size: 15, weight: 700 } }, type: 'log', gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
      yaxis: { title: { text: 'Median labeling delay (log scale)', font: { color: t.text, size: 15, weight: 700 } }, type: 'log', tickvals: SECONDS_TICKS, ticktext: SECONDS_TICKTEXT, gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
      legend: { orientation: 'h', x: 0, y: 1.08, font: { color: t.text, size: 13, weight: 600 } },
    });
    Plotly.react('chart-1a', traces, layout, PLOTLY_CONFIG);
  };
  draw();
  onThemeRerender(draw);
}

// ---------------- Figure 1b / 1c: CDF panels ----------------
function renderCdfPanel(divId, panel) {
  const draw = () => {
    const t = chartTheme();
    const traces = panel.map((series, i) => ({
      x: series.points.map(p => p[0]),
      y: series.points.map(p => p[1]),
      mode: 'lines',
      type: 'scatter',
      line: { width: 2.4, color: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length] },
      name: `${series.embed} [n=${series.n.toLocaleString()}]`,
      hovertemplate: series.embed + '<br>%{x:.3g} hr · %{y:.0%}<extra></extra>',
    }));
    const layout = baseLayout(t, {
      xaxis: { title: { text: 'Label delay (hours, log scale)', font: { color: t.text, size: 15, weight: 700 }, standoff: 16 }, type: 'log', gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
      yaxis: { title: { text: 'Cumulative fraction', font: { color: t.text, size: 15, weight: 700 } }, range: [0, 1], tickformat: '.0%', gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
      legend: { orientation: 'h', x: 0, y: -0.5, font: { color: t.text, size: 13, weight: 600 } },
      margin: { l: 54, r: 16, t: 10, b: 190 },
    });
    Plotly.react(divId, traces, layout, PLOTLY_CONFIG);
  };
  draw();
  onThemeRerender(draw);
}

// ---------------- Figure 6a: redressal delay ----------------
function renderFig6a(data) {
  const draw = () => {
    const t = chartTheme();
    const sorted = [...data].sort((a, b) => a.p50 - b.p50);
    const trace = {
      x: sorted.map(d => d.p50),
      y: sorted.map(d => d.label),
      error_x: {
        type: 'data', symmetric: false,
        array: sorted.map(d => d.p75 - d.p50),
        arrayminus: sorted.map(d => d.p50 - d.p25),
        color: t.textFaint, thickness: 1.4, width: 3,
      },
      customdata: sorted.map(d => [d.n_posts, d.p25 / 24, d.p50 / 24, d.p75 / 24]),
      hovertemplate: '<b>%{y}</b><br>n=%{customdata[0]}<br>p25 %{customdata[1]:.1f}d · median %{customdata[2]:.1f}d · p75 %{customdata[3]:.1f}d<extra></extra>',
      mode: 'markers',
      type: 'scatter',
      marker: { size: 11, color: t.accent, line: { width: 1.5, color: t.bg } },
    };
    const layout = baseLayout(t, {
      xaxis: { title: { text: 'Removal delay (hours, log scale)', font: { color: t.text, size: 15, weight: 700 } }, type: 'log', gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
      yaxis: { automargin: true, gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
      margin: { l: 110, r: 20, t: 10, b: 46 },
    });
    Plotly.react('chart-6a', [trace], layout, PLOTLY_CONFIG);
  };
  draw();
  onThemeRerender(draw);
}

// ---------------- Figure 2: precision / recall ----------------
function renderPR(rq2) {
  const draw = () => {
    const t = chartTheme();
    const o = rq2.overview;
    const traces = [
      {
        x: ['Labeled set (n=1,000)', 'Random set (n=1,000)'],
        y: [o.labeled_flagged_pct, o.random_flagged_pct],
        name: 'BMS flagged',
        type: 'bar',
        marker: { color: t.accent },
        text: [o.labeled_flagged_pct + '%', o.random_flagged_pct + '%'],
        textposition: 'outside',
        textfont: { color: t.text },
      },
      {
        x: ['Labeled set (n=1,000)', 'Random set (n=1,000)'],
        y: [o.labeled_unsafe_pct, o.random_unsafe_pct],
        name: 'Human: unsafe',
        type: 'bar',
        marker: {
          color: 'rgba(0,0,0,0)',
          pattern: { shape: '/', fgcolor: t.accent2, bgcolor: 'rgba(0,0,0,0)', size: 7, solidity: 0.45 },
          line: { color: t.accent2, width: 2.5 },
        },
        text: [o.labeled_unsafe_pct + '%', o.random_unsafe_pct + '%'],
        textposition: 'outside',
        textfont: { color: t.accent2 },
      },
    ];
    const layout = baseLayout(t, {
      barmode: 'group',
      bargap: 0.35,
      yaxis: { title: { text: '% of set', font: { color: t.text, size: 15, weight: 700 } }, range: [0, 112], gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
      legend: { orientation: 'h', x: 0, y: 1.32, font: { color: t.text, size: 13, weight: 600 } },
      margin: { l: 54, r: 16, t: 66, b: 46 },
      annotations: [
        { x: 0, y: 1.1, xref: 'x', yref: 'paper', text: `Precision = <b>${o.precision}</b>`, showarrow: false, font: { color: t.text, size: 13 } },
        { x: 1, y: 1.1, xref: 'x', yref: 'paper', text: `Recall = <b>${o.recall}</b>`, showarrow: false, font: { color: t.text, size: 13 } },
      ],
    });
    Plotly.react('chart-pr', traces, layout, PLOTLY_CONFIG);
  };
  draw();
  onThemeRerender(draw);
}

// ---------------- Hive violin strips (Fig 3a / 3b) ----------------
function renderHiveViolin(divId, heads, opts) {
  const draw = () => {
    const t = chartTheme();
    const traces = heads.map((h, i) => ({
      x: h.values,
      y: heads.map(() => h.head).slice(0, h.values.length),
      type: 'violin',
      orientation: 'h',
      name: h.head,
      points: 'all',
      pointpos: 0,
      jitter: 0.35,
      box: { visible: false },
      meanline: { visible: false },
      line: { color: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length] },
      fillcolor: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length] + '33',
      marker: { size: 5, color: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length] },
      hovertemplate: h.head + '<br>score %{x:.3f}<extra></extra>',
      showlegend: false,
      scalemode: 'count',
      width: 0.8,
    }));
    const shapes = [];
    const annotations = [];
    if (opts.showThresholdLine) {
      const withThr = heads.filter(h => h.threshold != null);
      traces.push({
        x: withThr.map(h => h.threshold),
        y: withThr.map(h => h.head),
        mode: 'markers',
        type: 'scatter',
        marker: { symbol: 'diamond', size: 14, color: t.warn, line: { width: 2, color: '#ffffff' } },
        name: 'Automod threshold',
        hovertemplate: 'threshold %{x:.2f}<extra></extra>',
        showlegend: false,
      });
    }
    if (opts.refLine != null) {
      shapes.push({ type: 'line', x0: opts.refLine, x1: opts.refLine, xref: 'x', y0: 0, y1: 1, yref: 'paper', line: { color: t.warn, width: 2.5, dash: 'dash' } });
      annotations.push({ x: opts.refLine, y: 1, xref: 'x', yref: 'paper', text: `Score = ${opts.refLine}`, showarrow: false, yshift: 14, font: { color: t.warn, size: 13, weight: 700 } });
    }
    const layout = baseLayout(t, {
      xaxis: { title: { text: 'Hive score', font: { color: t.text, size: 15, weight: 700 } }, range: opts.xrange || [0, 1.02], gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } },
      yaxis: { automargin: true, gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 }, categoryorder: 'array', categoryarray: heads.map(h => h.head).slice().reverse() },
      margin: { l: 150, r: 20, t: 10, b: 46 },
      shapes, annotations,
      violingap: 0.15,
    });
    Plotly.react(divId, traces, layout, PLOTLY_CONFIG);
  };
  draw();
  onThemeRerender(draw);
}

// ---------------- RQ3 cluster explorer ----------------
function showClusterDetail(cluster) {
  document.getElementById('cluster-detail-name').textContent = cluster.name;
  document.getElementById('cluster-detail-stats').textContent =
    `${cluster.count.toLocaleString()} posts · ${cluster.pct}% of this label's clustered posts`;
  document.getElementById('cluster-detail-summary').textContent =
    cluster.summary || 'No cluster summary available.';
  document.querySelectorAll('#cluster-legend .li').forEach(li => {
    li.classList.toggle('active', Number(li.dataset.idx) === cluster._idx);
  });
}

function renderClusterScatter(labelData) {
  const draw = () => {
    const t = chartTheme();
    const traces = labelData.clusters.map((c, i) => ({
      x: c.points.map(p => p[0]),
      y: c.points.map(p => p[1]),
      mode: 'markers',
      type: 'scattergl',
      name: `${c.name} (${c.pct}%)`,
      marker: { size: 5, color: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length], opacity: 0.7, line: { width: 0 } },
      hovertemplate: `<b>${c.name}</b><br>${c.count.toLocaleString()} posts (${c.pct}%)<extra></extra>`,
    }));
    const layout = baseLayout(t, {
      xaxis: { title: { text: 'UMAP-0', font: { color: t.text, size: 15, weight: 700 } }, gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } , zeroline: false },
      yaxis: { title: { text: 'UMAP-1', font: { color: t.text, size: 15, weight: 700 } }, gridcolor: t.border, tickfont: { color: t.text, size: 13, weight: 600 } , zeroline: false },
      showlegend: false,
      margin: { l: 54, r: 16, t: 10, b: 46 },
    });
    Plotly.react('chart-clusters', traces, layout, PLOTLY_CONFIG).then(gd => {
      gd.removeAllListeners('plotly_click');
      gd.on('plotly_click', evt => {
        const idx = evt.points && evt.points[0] ? evt.points[0].curveNumber : null;
        if (idx != null && labelData.clusters[idx]) showClusterDetail({ ...labelData.clusters[idx], _idx: idx });
      });
    });
  };
  draw();
  onThemeRerender(draw);
}

function renderClusterLegend(labelData) {
  const el = document.getElementById('cluster-note');
  const total = labelData.total_posts.toLocaleString();
  el.innerHTML = `${total} posts · ${labelData.clusters.length} named clusters shown · click a point, or a legend swatch below, to inspect.`;
  const legend = document.createElement('div');
  legend.className = 'clusterlegend';
  labelData.clusters.forEach((c, i) => {
    const li = document.createElement('div');
    li.className = 'li';
    li.dataset.idx = i;
    li.innerHTML = `<span class="sw" style="background:${CLUSTER_PALETTE[i % CLUSTER_PALETTE.length]}"></span>${c.name} <span style="color:var(--text-faint)">(${c.pct}%)</span>`;
    li.addEventListener('click', () => showClusterDetail({ ...c, _idx: i }));
    legend.appendChild(li);
  });
  const old = document.getElementById('cluster-legend');
  if (old) old.remove();
  legend.id = 'cluster-legend';
  el.after(legend);
  showClusterDetail({ ...labelData.clusters[0], _idx: 0 });
}
