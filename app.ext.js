(function () {
'use strict';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dur = ms => RM ? 0 : ms;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = d3.format(',');
const TC = ['#56B4E9', '#2fd0a0', '#e58fc0'];
const TN = DATA.techs;
const CLS = ['small', 'medium', 'large'];
const CLSN = { small: 'Small', medium: 'Medium', large: 'Large' };
const CLSR = { small: 'under 43″', medium: '43–65″', large: 'over 65″' };

/* ---------- model objects ---------- */
const M = DATA.rows.map((r, i) => ({ id: i, brand: DATA.brands[r[0]], model: r[1], t: r[2], i: r[3], w: r[4], s: r[5], r: r[6], k: r[7], sb: r[8], c: r[9].map(x => DATA.countries[x]) }));
const cls = i => i < 43 ? 'small' : (i <= 65 ? 'medium' : 'large');
M.forEach(m => m.cls = cls(m.i));
const bn = b => b.length <= 3 ? b : b[0] + b.slice(1).toLowerCase();

/* size-fair index: power ÷ median power of TVs within ±2 inches, × 100 */
const byBin = d3.group(M, m => Math.round(m.i));
const expW = {};
for (let b = 14; b <= 117; b++) {
  let k = 2, arr;
  do { arr = []; for (let j = b - k; j <= b + k; j++) { const g = byBin.get(j); if (g) g.forEach(m => arr.push(m.w)); } k++; } while (arr.length < 8 && k < 12);
  if (arr.length) expW[b] = d3.median(arr);
}
M.forEach(m => { m.exp = expW[Math.round(m.i)] || m.w; m.idx = m.w / m.exp * 100; });

/* ---------- stats ---------- */
const S = {};
S.n = M.length;
S.techN = [0, 1, 2].map(t => M.filter(m => m.t === t).length);
S.ledShare = Math.round(S.techN[0] / S.n * 100);
S.techInch = [0, 1, 2].map(t => d3.mean(M.filter(m => m.t === t), m => m.i));
S.clsN = CLS.map(c => M.filter(m => m.cls === c).length);
S.clsMean = CLS.map(c => d3.mean(M.filter(m => m.cls === c), m => m.w));
S.clsMedInch = CLS.map(c => Math.round(d3.median(M.filter(m => m.cls === c), m => m.i)));
S.ratio = S.clsMean[2] / S.clsMean[0];
S.medIdx = [0, 1, 2].map(t => d3.median(M.filter(m => m.t === t), m => m.idx));
const brandAll = d3.rollups(M, v => ({ n: v.length, idx: d3.mean(v, m => m.idx), sri: d3.median(v, m => m.r) }), m => m.brand)
  .map(([brand, o]) => Object.assign({ brand }, o)).sort((a, b) => b.n - a.n);
S.brands = brandAll;
S.top12 = brandAll.slice(0, 12);
const big = brandAll.filter(b => b.n >= 50);
S.lean = big.reduce((a, b) => b.idx < a.idx ? b : a);
S.hungry = big.reduce((a, b) => b.idx > a.idx ? b : a);
S.brandSpread = Math.round(S.hungry.idx - S.lean.idx);
S.top3 = Math.round(d3.sum(brandAll.slice(0, 3), b => b.n) / S.n * 100);
const bins = d3.rollups(M, v => v.length, m => Math.round(m.i)).sort((a, b) => b[1] - a[1]);
S.peaks = []; bins.forEach(([b, n]) => { if (S.peaks.length < 3 && S.peaks.every(p => Math.abs(p.b - b) > 4)) S.peaks.push({ b, n }); });
S.over85 = M.filter(m => m.i > 85).length;
function ols(xs, ys) { const mx = d3.mean(xs), my = d3.mean(ys); let sxy = 0, sxx = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; }); return { slope: sxy / sxx, r: sxy / Math.sqrt(sxx * syy) }; }
S.fitW = ols(M.map(m => m.i), M.map(m => m.w));
S.fitR = ols(M.map(m => m.i), M.map(m => m.r));
S.s5 = M.filter(m => m.s >= 5).length / S.n;
S.s6 = M.filter(m => m.s >= 6).length / S.n;
S.s7 = M.filter(m => m.s >= 7).length;
S.medStar = CLS.map(c => d3.median(M.filter(m => m.cls === c), m => m.s));
S.large6 = d3.mean(M.filter(m => m.cls === 'large' && m.s >= 6), m => m.w);
S.small5 = d3.mean(M.filter(m => m.cls === 'small' && m.s >= 5 && m.s < 6), m => m.w);
const sbv = M.filter(m => m.sb >= 0);
S.sbN = sbv.length; S.sbMed = d3.median(sbv, m => m.sb);
S.sbLow = sbv.filter(m => m.sb <= .5).length / sbv.length;
S.sbMiss = 1 - sbv.length / S.n;
S.labelH = d3.median(M, m => m.k / m.w) / 3.65 * 10;
const cc = {}; M.forEach(m => m.c.forEach(c => cc[c] = (cc[c] || 0) + 1));
S.ctry = Object.entries(cc).map(([c, n]) => ({ c, n, sri: d3.median(M.filter(m => m.c.includes(c)), m => m.r) })).sort((a, b) => b.n - a.n);
S.cnVn = M.filter(m => m.c.includes('China') || m.c.includes('Vietnam')).length / S.n;

/* ---------- state shared by calculator, hero, finder ---------- */
const U = { h: 5, c: 32, preset: 'medium', w: +S.clsMean[1].toFixed(1) };
const cost = w => w * U.h * 365 / 1000 * U.c / 100;
const money = v => '$' + (v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 0 : 1));

/* ---------- tooltip ---------- */
const tt = $('#tt');
const tip = {
  show(e, html) {
    tt.innerHTML = html; tt.classList.add('on');
    const r = tt.getBoundingClientRect(); let x = e.clientX + 16, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 16;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 12;
    tt.style.left = Math.max(8, x) + 'px'; tt.style.top = Math.max(8, y) + 'px';
  },
  hide() { tt.classList.remove('on'); }
};

/* ---------- chart registry (draws when visible, redraws on resize) ---------- */
const CH = {};
function reg(id, draw) {
  const el = document.getElementById(id);
  const c = { el, draw, done: false, vis: false, w: 0 };
  c.redraw = (a = true) => { if (el.clientWidth > 0) { c.w = el.clientWidth; c.done = true; draw(el, a && !RM); } };
  new IntersectionObserver(es => { c.vis = es[0].isIntersecting; if (c.vis && !c.done && el.clientWidth > 0) c.redraw(true); }, { threshold: .15 }).observe(el);
  new ResizeObserver(() => { const w = el.clientWidth; if (!w || Math.abs(w - c.w) < 3) return; if (c.done) c.redraw(false); else if (c.vis) c.redraw(true); }).observe(el);
  CH[id] = c; return c;
}
function mkSvg(el, h, m) {
  el.innerHTML = '';
  const w = el.clientWidth;
  const s = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('width', '100%').attr('height', h).attr('role', 'img');
  return { s, w, h, m, iw: w - m.l - m.r, ih: h - m.t - m.b, g: s.append('g').attr('transform', `translate(${m.l},${m.t})`) };
}
const ax = g => { g.attr('class', 'axis'); return g; };
const techLegend = () => `<div class="legend">${TN.map((n, i) => `<span style="display:inline-flex;align-items:center;gap:7px"><i style="background:${TC[i]}"></i>${n}</span>`).join('')}</div>`;
function seg(id, opts, active, fn) {
  const el = document.getElementById(id);
  el.innerHTML = opts.map(([v, l]) => `<button data-v="${v}" aria-pressed="${v === active}">${l}</button>`).join('');
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); fn(b.dataset.v);
  });
}
const pct = (v, d = 0) => (v * 100).toFixed(d) + '%';
/* =====================================================================
   CHARTS (all flat 2D)
   ===================================================================== */

/* ---- 1a. waffle: tech share ---- */
function waffle(el, anim) {
  el.innerHTML = '';
  const size = Math.min(el.clientWidth, 250), gap = 4, cs = (size - gap * 9) / 10;
  const svg = d3.select(el).append('svg').attr('width', size).attr('height', size).attr('role', 'img')
    .attr('aria-label', 'Waffle chart of screen technology share: ' + TN.map((n, i) => `${n} ${pct(S.techN[i] / S.n)}`).join(', '));
  const raw = S.techN.map(n => n / S.n * 100), base = raw.map(Math.floor);
  let rem = 100 - d3.sum(base);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).slice(0, rem).forEach(([, i]) => base[i]++);
  const cells = []; base.forEach((n, t) => { for (let k = 0; k < n; k++) cells.push(t); });
  const r = svg.selectAll('rect').data(cells).join('rect')
    .attr('x', (d, i) => (i % 10) * (cs + gap)).attr('y', (d, i) => (9 - Math.floor(i / 10)) * (cs + gap))
    .attr('width', cs).attr('height', cs).attr('rx', 4).attr('fill', d => TC[d]).attr('opacity', anim ? 0 : 1)
    .on('pointermove', (e, d) => tip.show(e, `<b>${TN[d]}</b><br><span class="k">${fmt(S.techN[d])} models · ${pct(S.techN[d] / S.n, 1)}</span>`))
    .on('pointerleave', tip.hide);
  if (anim) r.transition().delay((d, i) => i * 9).duration(300).attr('opacity', 1);
  el.__hl = t => r.attr('opacity', d => t == null || d === t ? 1 : .18);
}
/* ---- 1b. lollipop: average size by tech ---- */
function techSize(el, anim) {
  const o = mkSvg(el, 150, { t: 26, r: 24, b: 28, l: 78 }), { g, iw, ih } = o;
  const x = d3.scaleLinear([0, 80], [0, iw]), y = d3.scaleBand([0, 1, 2], [0, ih]).paddingInner(.3);
  g.append('g').attr('class', 'grid').call(d3.axisBottom(x).ticks(5).tickSize(ih).tickFormat(''));
  ax(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => d + '″')));
  [43, 65].forEach((v, k) => {
    g.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', -6).attr('y2', ih).attr('stroke', '#f5c542').attr('stroke-dasharray', '3 4').attr('opacity', .7);
    g.append('text').attr('x', x(v)).attr('y', -10).attr('text-anchor', 'middle').attr('fill', '#f5c542').style('font-size', '11px').text(k ? 'large starts 65″' : 'medium starts 43″');
  });
  [0, 1, 2].forEach(t => {
    const yy = y(t) + y.bandwidth() / 2, v = S.techInch[t];
    g.append('text').attr('x', -10).attr('y', yy + 4).attr('text-anchor', 'end').text(TN[t]);
    const ln = g.append('line').attr('x1', 0).attr('y1', yy).attr('y2', yy).attr('x2', anim ? 0 : x(v)).attr('stroke', TC[t]).attr('stroke-width', 3.5).attr('stroke-linecap', 'round');
    const dot = g.append('circle').attr('cy', yy).attr('cx', anim ? 0 : x(v)).attr('r', 8).attr('fill', TC[t]);
    const lb = g.append('text').attr('y', yy + 4).attr('x', (anim ? 0 : x(v)) + 14).attr('fill', '#fff').style('font-weight', 700).text(v.toFixed(1) + '″');
    if (anim) { const tr = d3.transition().delay(300 + t * 150).duration(900).ease(d3.easeCubicOut); ln.transition(tr).attr('x2', x(v)); dot.transition(tr).attr('cx', x(v)); lb.transition(tr).attr('x', x(v) + 14); }
    g.append('rect').attr('x', 0).attr('y', y(t)).attr('width', iw).attr('height', y.bandwidth()).attr('fill', 'transparent')
      .on('pointermove', e => tip.show(e, `<b>${TN[t]}</b><br><span class="k">average size ${v.toFixed(1)}″ across ${fmt(S.techN[t])} models</span>`)).on('pointerleave', tip.hide);
  });
}

/* ---- 2. stacked histogram of sizes ---- */
function sizes(el, anim) {
  const o = mkSvg(el, 380, { t: 40, r: 10, b: 40, l: 44 }), { g, iw, ih } = o;
  const data = d3.range(15, 117).map(b => ({ b, c: [0, 0, 0], n: 0 }));
  M.forEach(m => { const b = Math.round(m.i); if (b >= 15 && b <= 116) { data[b - 15].c[m.t]++; data[b - 15].n++; } });
  const x = d3.scaleLinear([14.5, 116.5], [0, iw]), y = d3.scaleLinear([0, d3.max(data, d => d.n) * 1.15]).nice().range([ih, 0]);
  const bw = Math.max(2, iw / 102 * .78);
  [[14.5, 42.5, 'small'], [42.5, 65.5, 'medium'], [65.5, 116.5, 'large']].forEach(([a, b, c], k) => {
    g.append('rect').attr('x', x(a)).attr('width', x(b) - x(a)).attr('y', 0).attr('height', ih).attr('fill', k === 1 ? 'rgba(245,197,66,.06)' : 'rgba(255,255,255,.025)');
    g.append('text').attr('x', x(a) + 8).attr('y', -22).style('font-weight', 700).attr('fill', '#eef5fc').text(CLSN[c]);
    g.append('text').attr('x', x(a) + 8).attr('y', -8).style('font-size', '11.5px').text(`${CLSR[c]} · ${fmt(S.clsN[k])} models · ${pct(S.clsN[k] / S.n)}`);
  });
  g.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(''));
  ax(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickValues(d3.range(20, 116, 10)).tickFormat(d => d + '″')));
  ax(g.append('g').call(d3.axisLeft(y).ticks(5)));
  const layers = [0, 1, 2].map(t => data.map(d => { const y0 = d3.sum(d.c.slice(0, t)); return { d, t, y0, y1: y0 + d.c[t] }; }));
  layers.forEach((L, t) => {
    const r = g.selectAll('.l' + t).data(L).join('rect').attr('x', d => x(d.d.b) - bw / 2).attr('width', bw).attr('fill', TC[t]).attr('rx', 1.5)
      .attr('y', anim ? ih : d => y(d.y1)).attr('height', anim ? 0 : d => y(d.y0) - y(d.y1));
    if (anim) r.transition().delay(d => (d.d.b - 15) * 9).duration(700).ease(d3.easeCubicOut).attr('y', d => y(d.y1)).attr('height', d => y(d.y0) - y(d.y1));
  });
  S.peaks.forEach(p => {
    const d = data[p.b - 15], gp = g.append('g').attr('opacity', anim ? 0 : 1);
    gp.append('text').attr('x', x(p.b)).attr('y', y(d.n) - 8).attr('text-anchor', 'middle').attr('fill', '#f5c542').style('font-weight', 700).text(`${p.b}″ · ${p.n}`);
    if (anim) gp.transition().delay(1400).duration(500).attr('opacity', 1);
  });
  const hl = g.append('rect').attr('y', 0).attr('height', ih).attr('width', bw + 4).attr('fill', 'rgba(255,255,255,.12)').attr('opacity', 0).attr('pointer-events', 'none');
  g.selectAll('.hit').data(data).join('rect').attr('x', d => x(d.b) - iw / 204).attr('width', iw / 102).attr('y', 0).attr('height', ih).attr('fill', 'transparent')
    .on('pointermove', (e, d) => { hl.attr('x', x(d.b) - bw / 2 - 2).attr('opacity', 1); tip.show(e, `<b>${d.b}″</b> · ${d.n} models<br>${[0, 1, 2].map(t => `<span style="color:${TC[t]}">■</span> ${TN[t]} <b>${d.c[t]}</b>`).join('<br>')}`); })
    .on('pointerleave', () => { hl.attr('opacity', 0); tip.hide(); });
}

/* ---- 3. brand scorecard with 3 metrics ---- */
let brandMetric = 'n';
function brands(el, anim) {
  const o = mkSvg(el, 440, { t: 8, r: 118, b: 38, l: 92 }), { g, iw, ih } = o;
  const k = brandMetric, rows = S.top12;
  const sorted = [...rows].sort((a, b) => k === 'idx' ? a.idx - b.idx : b[k] - a[k]);
  const y = d3.scaleBand(sorted.map(d => d.brand), [0, ih]).padding(.28);
  let x, base = 0;
  if (k === 'n') x = d3.scaleLinear([0, d3.max(rows, d => d.n)], [0, iw]).nice();
  else if (k === 'idx') { base = 100; const r = Math.ceil(d3.max(rows, d => Math.abs(d.idx - 100)) * 1.2 / 5) * 5; x = d3.scaleLinear([100 - r, 100 + r], [0, iw]); }
  else x = d3.scaleLinear([0, 7], [0, iw]);
  g.append('g').attr('class', 'grid').call(d3.axisBottom(x).ticks(5).tickSize(ih).tickFormat(''));
  ax(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5).tickFormat(k === 'idx' ? d => d : d3.format(',~g'))));
  g.append('text').attr('x', iw / 2).attr('y', ih + 33).attr('text-anchor', 'middle').text({ n: 'Number of models on sale', idx: 'Size-fair power index · 100 = typical for the size · left is leaner', sri: 'Median star rating index · higher is more efficient for its size' }[k]);
  if (k === 'idx') g.append('line').attr('x1', x(100)).attr('x2', x(100)).attr('y1', 0).attr('y2', ih).attr('stroke', '#fff').attr('opacity', .6);
  const prev = el.__py || {}; el.__py = {};
  const best = k === 'idx' ? sorted[0] : sorted[0];
  const col = d => k === 'idx' ? (d.idx < 100 ? '#3ddc97' : '#ff8a65') : (d === best ? '#f5c542' : '#4f9fd8');
  const val = d => k === 'n' ? fmt(d.n) : k === 'idx' ? (d.idx >= 100 ? '+' : '−') + Math.abs(d.idx - 100).toFixed(0) + '%' : d.sri.toFixed(1);
  const v = d => k === 'n' ? d.n : d.idx === undefined ? 0 : (k === 'idx' ? d.idx : d.sri);
  sorted.forEach((d, i) => {
    const yy = y(d.brand); el.__py[d.brand] = yy;
    const row = g.append('g').attr('transform', `translate(0,${anim && prev[d.brand] != null ? prev[d.brand] : yy})`);
    if (anim) row.transition().duration(800).ease(d3.easeCubicInOut).attr('transform', `translate(0,${yy})`);
    row.append('text').attr('x', -10).attr('y', y.bandwidth() / 2 + 4).attr('text-anchor', 'end').style('font-weight', 600).attr('fill', '#eef5fc').text(bn(d.brand));
    const val0 = k === 'n' ? d.n : k === 'idx' ? d.idx : d.sri;
    const x0 = Math.min(x(base), x(val0)), w0 = Math.abs(x(val0) - x(base));
    const rc = row.append('rect').attr('height', y.bandwidth()).attr('rx', 5).attr('fill', col(d)).attr('x', anim ? x(base) : x0).attr('width', anim ? 0 : w0).attr('y', 0);
    if (anim) rc.transition().delay(150 + i * 30).duration(800).ease(d3.easeCubicOut).attr('x', x0).attr('width', w0);
    row.append('text').attr('x', iw + 10).attr('y', y.bandwidth() / 2 + 4).style('font-weight', 700).attr('fill', '#fff').text(val(d));
    if (k !== 'n') row.append('text').attr('x', iw + 62).attr('y', y.bandwidth() / 2 + 4).style('font-size', '11.5px').attr('fill', '#7590ad').text('n=' + fmt(d.n));
    row.append('rect').attr('x', -92).attr('width', iw + 118 + 92).attr('height', y.bandwidth()).attr('fill', 'transparent')
      .on('pointermove', e => tip.show(e, `<b>${bn(d.brand)}</b> · ${fmt(d.n)} models<br><span class="k">power vs same-size TVs</span> <b>${d.idx >= 100 ? '+' : '−'}${Math.abs(d.idx - 100).toFixed(0)}%</b><br><span class="k">median star index</span> <b>${d.sri.toFixed(1)}</b>`)).on('pointerleave', tip.hide);
  });
}

/* ---- 4. boxplots: same size, which tech? ---- */
let boxMetric = 'w';
const BX = {
  w: { lab: 'Watts in use', acc: m => m.w, best: 'min', f: v => Math.round(v) + ' W' },
  idx: { lab: 'Size-fair index (100 = typical for that size)', acc: m => m.idx, best: 'min', f: v => v.toFixed(0) },
  r: { lab: 'Star rating index (higher = more efficient for its size)', acc: m => m.r, best: 'max', f: v => v.toFixed(1) },
  k: { lab: 'Labelled energy, kWh per year', acc: m => m.k, best: 'min', f: v => Math.round(v) + ' kWh' }
};
function boxes(el, anim) {
  const cfg = BX[boxMetric];
  const o = mkSvg(el, 430, { t: 22, r: 12, b: 62, l: 54 }), { g, iw, ih } = o;
  const cells = [];
  CLS.forEach(c => [0, 1, 2].forEach(t => {
    const arr = M.filter(m => m.cls === c && m.t === t), vals = arr.map(cfg.acc).sort(d3.ascending), n = vals.length;
    const mean = d3.mean(vals), sd = d3.deviation(vals) || 0;
    cells.push({ c, t, n, q1: d3.quantileSorted(vals, .25), med: d3.quantileSorted(vals, .5), q3: d3.quantileSorted(vals, .75), p10: d3.quantileSorted(vals, .1), p90: d3.quantileSorted(vals, .9), mean, ci: 1.96 * sd / Math.sqrt(n), inch: d3.mean(arr, m => m.i), flag: n < 30 });
  }));
  const hi = d3.max(cells, d => d.p90) * 1.12, lo = boxMetric === 'idx' ? Math.floor(d3.min(cells, d => d.p10) / 10) * 10 - 10 : 0;
  const y = d3.scaleLinear([lo, hi]).nice().range([ih, 0]);
  const x0 = d3.scaleBand(CLS, [0, iw]).paddingInner(.18).paddingOuter(.04);
  const x1 = d3.scaleBand([0, 1, 2], [0, x0.bandwidth()]).padding(.22);
  g.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(6).tickSize(-iw).tickFormat(''));
  ax(g.append('g').call(d3.axisLeft(y).ticks(6)));
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -40).attr('text-anchor', 'middle').text(cfg.lab.length > 44 ? cfg.lab.split(' (')[0] : cfg.lab);
  if (boxMetric === 'idx') g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(100)).attr('y2', y(100)).attr('stroke', '#fff').attr('stroke-dasharray', '4 4').attr('opacity', .5);
  CLS.forEach((c, ci) => {
    const gx = x0(c);
    g.append('text').attr('x', gx + x0.bandwidth() / 2).attr('y', ih + 46).attr('text-anchor', 'middle').attr('fill', '#eef5fc').style('font-weight', 700).text(`${CLSN[c]} (${CLSR[c]})`);
    const grp = cells.filter(d => d.c === c && !d.flag);
    const winner = grp.length ? grp.reduce((a, b) => (cfg.best === 'min' ? b.med < a.med : b.med > a.med) ? b : a) : null;
    cells.filter(d => d.c === c).forEach(d => {
      const cx = gx + x1(d.t) + x1.bandwidth() / 2, w = x1.bandwidth();
      const G = g.append('g').attr('opacity', d.flag ? .55 : 1);
      const wh = G.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(d.p10)).attr('y2', y(d.p90)).attr('stroke', TC[d.t]).attr('stroke-width', 2);
      [d.p10, d.p90].forEach(v => G.append('line').attr('x1', cx - w * .22).attr('x2', cx + w * .22).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', TC[d.t]).attr('stroke-width', 2));
      const bx = G.append('rect').attr('x', cx - w / 2).attr('width', w).attr('rx', 4).attr('fill', TC[d.t]).attr('fill-opacity', d.flag ? .08 : .32).attr('stroke', TC[d.t]).attr('stroke-width', 2).attr('stroke-dasharray', d.flag ? '5 4' : null)
        .attr('y', anim ? y(d.med) : y(d.q3)).attr('height', anim ? 0 : y(d.q1) - y(d.q3));
      const md = G.append('line').attr('x1', cx - w / 2).attr('x2', cx + w / 2).attr('y1', y(d.med)).attr('y2', y(d.med)).attr('stroke', '#fff').attr('stroke-width', 3);
      const dm = G.append('path').attr('d', d3.symbol(d3.symbolDiamond, 70)()).attr('transform', `translate(${cx},${y(d.mean)})`).attr('fill', '#07182b').attr('stroke', '#fff').attr('stroke-width', 1.6);
      if (anim) { bx.transition().delay(200 + ci * 150).duration(800).ease(d3.easeCubicOut).attr('y', y(d.q3)).attr('height', y(d.q1) - y(d.q3)); [wh, md, dm].forEach(s => s.attr('opacity', 0).transition().delay(700 + ci * 150).duration(500).attr('opacity', 1)); }
      G.append('text').attr('x', cx).attr('y', ih + 16).attr('text-anchor', 'middle').style('font-size', '11.5px').attr('fill', d.flag ? '#ff8a65' : '#7590ad').text('n=' + fmt(d.n));
      if (d.flag) G.append('text').attr('x', cx).attr('y', y(d.p90) - 8).attr('text-anchor', 'middle').attr('fill', '#ff8a65').style('font-size', '11.5px').text('too few to rank');
      if (winner === d) G.append('text').attr('x', cx).attr('y', y(d.p90) - 8).attr('text-anchor', 'middle').attr('fill', '#f5c542').style('font-size', '17px').text('★');
      G.append('rect').attr('x', cx - w / 2 - 4).attr('width', w + 8).attr('y', 0).attr('height', ih).attr('fill', 'transparent')
        .on('pointermove', e => tip.show(e, `<b>${TN[d.t]} · ${CLSN[c]}</b><br><span class="k">median</span> <b>${cfg.f(d.med)}</b> · <span class="k">mean</span> <b>${cfg.f(d.mean)}</b> ±${cfg.f(d.ci).replace(/[^\d.]/g, '')}<br><span class="k">middle half</span> ${cfg.f(d.q1)} to ${cfg.f(d.q3)}<br><span class="k">10th–90th pct</span> ${cfg.f(d.p10)} to ${cfg.f(d.p90)}<br><span class="k">models</span> ${fmt(d.n)} · <span class="k">avg size</span> ${d.inch.toFixed(1)}″`)).on('pointerleave', tip.hide);
    });
  });
}

/* ---- 5. scatter engine (canvas points + svg overlay), shared with the finder ---- */
const ORDER = (() => { const a = d3.range(M.length); let s = 7; for (let i = a.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
function drawScatter(el, anim, cfg) {
  el.innerHTML = '';
  const w = el.clientWidth, h = cfg.height; el.style.height = h + 'px';
  const m = { t: 22, r: 16, b: 42, l: 50 }, iw = w - m.l - m.r, ih = h - m.t - m.b, dpr = Math.min(devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas'); cv.width = iw * dpr; cv.height = ih * dpr;
  cv.style.cssText = `left:${m.l}px;top:${m.t}px;width:${iw}px;height:${ih}px`; el.appendChild(cv);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const svg = d3.select(el).append('svg').attr('width', w).attr('height', h).attr('role', 'img').attr('aria-label', cfg.aria || 'Scatter plot of screen size against power');
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  const yk = cfg.yKey(), acc = d => d[yk];
  const x = d3.scaleLinear([14, 118], [0, iw]);
  const sorted = M.map(acc).sort(d3.ascending);
  const ymax = yk === 'r' ? 9 : d3.quantileSorted(sorted, .997) * 1.06;
  const y = d3.scaleLinear([0, ymax], [ih, 0]).nice();
  g.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(6).tickSize(-iw).tickFormat(''));
  ax(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickValues(d3.range(20, 116, 10)).tickFormat(d => d + '″')));
  ax(g.append('g').call(d3.axisLeft(y).ticks(6)));
  g.append('text').attr('x', iw / 2).attr('y', ih + 36).attr('text-anchor', 'middle').text('Screen size (inches)');
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -38).attr('text-anchor', 'middle').text(yk === 'r' ? 'Star rating index (higher = better)' : 'Power in use (W)');
  [[43, 'medium →'], [65.5, 'large →']].forEach(([v, t]) => {
    g.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', -8).attr('y2', ih).attr('stroke', '#f5c542').attr('stroke-dasharray', '3 5').attr('opacity', .55);
    g.append('text').attr('x', x(v) + 5).attr('y', -9).attr('fill', '#f5c542').style('font-size', '11px').text(t);
  });
  g.append('text').attr('x', 4).attr('y', -9).attr('fill', '#f5c542').style('font-size', '11px').text('small');
  const px = M.map(d => x(d.i)), py = M.map(d => y(Math.min(acc(d), y.domain()[1])));
  const trendG = g.append('g'), overG = g.append('g');
  const ring = overG.append('circle').attr('r', 8).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 2).attr('opacity', 0).attr('pointer-events', 'none');
  const pin = overG.append('circle').attr('r', 9).attr('fill', 'none').attr('stroke', '#f5c542').attr('stroke-width', 3).attr('opacity', 0).attr('pointer-events', 'none');
  const pinT = overG.append('text').attr('fill', '#f5c542').style('font-weight', 700).attr('pointer-events', 'none');
  let del = null, vis = [];
  function render(frac) {
    ctx.clearRect(0, 0, iw, ih);
    const on = cfg.techOn(), mask = cfg.getMask ? cfg.getMask() : null, cnt = Math.floor(M.length * frac);
    const dim = [], sel = [[], [], []];
    for (let k = 0; k < cnt; k++) { const i = ORDER[k], d = M[i]; if (!on[d.t]) continue; (mask && !mask(d) ? dim : sel[d.t]).push(i); }
    ctx.globalAlpha = .1; ctx.fillStyle = '#9db4cc'; ctx.beginPath(); dim.forEach(i => { ctx.moveTo(px[i] + 2.2, py[i]); ctx.arc(px[i], py[i], 2.2, 0, 6.2832); }); ctx.fill();
    ctx.globalAlpha = .62;
    sel.forEach((arr, t) => { ctx.fillStyle = TC[t]; ctx.beginPath(); arr.forEach(i => { ctx.moveTo(px[i] + 2.6, py[i]); ctx.arc(px[i], py[i], 2.6, 0, 6.2832); }); ctx.fill(); });
    ctx.globalAlpha = 1;
  }
  function overlays(animate) {
    const on = cfg.techOn(), mask = cfg.getMask ? cfg.getMask() : null;
    vis = M.filter(d => on[d.t] && (!mask || mask(d)));
    del = vis.length ? d3.Delaunay.from(vis, d => px[d.id], d => py[d.id]) : null;
    trendG.selectAll('*').remove();
    if (cfg.trend) {
      [0, 1, 2].forEach(t => {
        if (!on[t]) return;
        const pts = []; const arr = vis.filter(d => d.t === t);
        for (let c = 17; c <= 113; c += 2) { const win = arr.filter(d => Math.abs(d.i - c) <= 3.5); if (win.length >= 6) pts.push([c, d3.median(win, acc)]); }
        const p = trendG.append('path').datum(pts).attr('d', d3.line().x(d => x(d[0])).y(d => y(Math.min(d[1], y.domain()[1]))).curve(d3.curveMonotoneX)).attr('fill', 'none').attr('stroke', '#07182b').attr('stroke-width', 5.5).attr('stroke-linecap', 'round').attr('opacity', .8);
        const q = trendG.append('path').datum(pts).attr('d', p.attr('d')).attr('fill', 'none').attr('stroke', TC[t]).attr('stroke-width', 2.6).attr('stroke-linecap', 'round');
        if (animate) [p, q].forEach(s => { const L = s.node().getTotalLength(); s.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().delay(900).duration(1300).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0); });
      });
    }
    if (cfg.frontier && vis.length) {
      const fr = []; for (let c = 15; c <= 117; c += 4) { const win = vis.filter(d => d.i >= c - 2 && d.i < c + 2); if (win.length) { const b = win.reduce((a, d) => (yk === 'r' ? acc(d) > acc(a) : acc(d) < acc(a)) ? d : a); fr.push(b); } }
      trendG.append('path').datum(fr).attr('d', d3.line().x(d => px[d.id]).y(d => py[d.id])).attr('fill', 'none').attr('stroke', '#f5c542').attr('stroke-width', 2).attr('stroke-dasharray', '6 5');
      trendG.selectAll('.fp').data(fr).join('circle').attr('cx', d => px[d.id]).attr('cy', d => py[d.id]).attr('r', 3.6).attr('fill', '#f5c542');
    }
    const pm = cfg.pinned && cfg.pinned();
    if (pm && on[pm.t]) { pin.attr('cx', px[pm.id]).attr('cy', py[pm.id]).attr('opacity', 1); pinT.attr('x', Math.min(px[pm.id] + 12, iw - 120)).attr('y', py[pm.id] - 14).text(bn(pm.brand) + ' ' + pm.model.slice(0, 14)); }
    else { pin.attr('opacity', 0); pinT.text(''); }
  }
  g.append('rect').attr('width', iw).attr('height', ih).attr('fill', 'transparent').style('cursor', 'crosshair')
    .on('pointermove', e => {
      if (!del) return; const [mx, my] = d3.pointer(e, g.node()), i = del.find(mx, my), d = vis[i];
      if (!d || Math.hypot(px[d.id] - mx, py[d.id] - my) > 18) { ring.attr('opacity', 0); tip.hide(); return; }
      ring.attr('cx', px[d.id]).attr('cy', py[d.id]).attr('opacity', 1);
      tip.show(e, `<b>${bn(d.brand)} ${d.model}</b><br><span style="color:${TC[d.t]}">■</span> ${TN[d.t]} · ${d.i.toFixed(0)}″<br><span class="k">power</span> <b>${d.w} W</b> · <span class="k">stars</span> <b>${d.s}</b><br><span class="k">vs same size</span> <b>${d.idx >= 100 ? '+' : '−'}${Math.abs(d.idx - 100).toFixed(0)}%</b> · <span class="k">per year</span> <b>${money(cost(d.w))}</b>`);
    })
    .on('pointerleave', () => { ring.attr('opacity', 0); tip.hide(); })
    .on('click', e => { const [mx, my] = d3.pointer(e, g.node()); if (!del) return; const d = vis[del.find(mx, my)]; if (d && Math.hypot(px[d.id] - mx, py[d.id] - my) <= 18 && cfg.onPick) cfg.onPick(d); });
  el.__refresh = () => { render(1); overlays(false); };
  if (anim) {
    overlays(true); const t0 = performance.now();
    (function f(t) { const p = Math.min(1, (t - t0) / 1100); render(1 - Math.pow(1 - p, 3)); if (p < 1) requestAnimationFrame(f); })(t0);
  } else { render(1); overlays(false); }
}
let scY = 'w'; const scOn = [true, true, true];
const sc5cfg = { height: 440, yKey: () => scY, techOn: () => scOn, trend: true, aria: 'Scatter of every model: screen size against power in use, coloured by technology, with median trend lines' };

/* ---- 6. heatmap: star distribution by size class ---- */
let heatTech = 'all';
function heat(el, anim) {
  const STARS = [...new Set(M.map(m => m.s))].sort(d3.ascending);
  const o = mkSvg(el, 270, { t: 24, r: 70, b: 52, l: 120 }), { g, iw, ih } = o;
  const x = d3.scaleBand(STARS, [0, iw]).padding(.06), y = d3.scaleBand(CLS, [0, ih]).padding(.1);
  const pool = M.filter(m => heatTech === 'all' || m.t === +heatTech);
  const rows = CLS.map(c => { const arr = pool.filter(m => m.cls === c), n = arr.length; return { c, n, med: d3.median(arr, m => m.s), cells: STARS.map(s => ({ s, v: n ? arr.filter(m => m.s === s).length / n : 0, k: arr.filter(m => m.s === s).length })) }; });
  const mx = d3.max(rows, r => d3.max(r.cells, c => c.v)) || .01;
  const col = v => d3.interpolateRgb('#0e2a48', '#f5c542')(Math.pow(v / mx, .75));
  rows.forEach(r => {
    g.append('text').attr('x', -12).attr('y', y(r.c) + y.bandwidth() / 2 - 3).attr('text-anchor', 'end').attr('fill', '#eef5fc').style('font-weight', 700).text(CLSN[r.c]);
    g.append('text').attr('x', -12).attr('y', y(r.c) + y.bandwidth() / 2 + 12).attr('text-anchor', 'end').style('font-size', '11.5px').attr('fill', r.n < 30 ? '#ff8a65' : '#7590ad').text(r.n < 30 ? `n=${r.n} · read with care` : `n=${fmt(r.n)}`);
    g.append('text').attr('x', iw + 12).attr('y', y(r.c) + y.bandwidth() / 2 + 5).attr('fill', '#fff').style('font-weight', 700).text(r.n ? r.med + '★' : '–');
    const cell = g.selectAll('.c' + r.c).data(r.cells).join('g').attr('transform', d => `translate(${x(d.s)},${y(r.c)})`);
    cell.append('rect').attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 5).attr('fill', d => col(d.v)).attr('opacity', anim ? 0 : 1)
      .transition().delay((d, i) => anim ? i * 40 + CLS.indexOf(r.c) * 90 : 0).duration(anim ? 400 : 0).attr('opacity', 1);
    cell.append('text').attr('x', x.bandwidth() / 2).attr('y', y.bandwidth() / 2 + 4).attr('text-anchor', 'middle').style('font-size', '11.5px').style('font-weight', 700).attr('fill', d => d.v / mx > .55 ? '#07182b' : '#cfe0f2').text(d => d.v >= .035 ? Math.round(d.v * 100) + '%' : '');
    cell.append('rect').attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('fill', 'transparent')
      .on('pointermove', (e, d) => tip.show(e, `<b>${CLSN[r.c]} · ${d.s}★</b><br>${d.k} models · ${(d.v * 100).toFixed(1)}% of ${CLSN[r.c].toLowerCase()} TVs`)).on('pointerleave', tip.hide);
  });
  ax(g.append('g').attr('transform', `translate(0,${ih + 4})`).call(d3.axisBottom(x).tickSize(0).tickFormat(d => d))).select('.domain').remove();
  g.append('text').attr('x', iw / 2).attr('y', ih + 40).attr('text-anchor', 'middle').text('Star rating (Star2) · each row adds up to 100%');
  g.append('text').attr('x', iw + 12).attr('y', -8).style('font-size', '11.5px').text('median');
}

/* ---- 7. standby ECDF ---- */
function standby(el, anim) {
  const o = mkSvg(el, 340, { t: 16, r: 18, b: 44, l: 52 }), { g, iw, ih } = o;
  const x = d3.scaleLinear([0, 1.1], [0, iw]), y = d3.scaleLinear([0, 1], [ih, 0]);
  g.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(''));
  ax(g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(6).tickFormat(d => d + ' W')));
  ax(g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%'))));
  g.append('text').attr('x', iw / 2).attr('y', ih + 38).attr('text-anchor', 'middle').text('Passive standby power');
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -38).attr('text-anchor', 'middle').text('Share of models at or below');
  const series = [0, 1, 2].map(t => { const v = sbv.filter(m => m.t === t).map(m => m.sb).sort(d3.ascending); return { t, v, pts: [[0, 0], ...v.map((s, i) => [s, (i + 1) / v.length])] }; });
  series.forEach(s => {
    const p = g.append('path').datum(s.pts).attr('d', d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveStepAfter)).attr('fill', 'none').attr('stroke', TC[s.t]).attr('stroke-width', 3).attr('stroke-linejoin', 'round');
    if (anim) { const L = p.node().getTotalLength(); p.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().delay(s.t * 200).duration(1500).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0); }
    const md = d3.median(s.v); g.append('circle').attr('cx', x(md)).attr('cy', y(.5)).attr('r', 5.5).attr('fill', '#07182b').attr('stroke', TC[s.t]).attr('stroke-width', 2.5).attr('opacity', anim ? 0 : 1).transition().delay(anim ? 1700 : 0).duration(300).attr('opacity', 1);
  });
  g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(.5)).attr('y2', y(.5)).attr('stroke', '#fff').attr('stroke-dasharray', '3 5').attr('opacity', .35);
  g.append('text').attr('x', iw - 4).attr('y', y(.5) - 6).attr('text-anchor', 'end').style('font-size', '11.5px').text('half of models (dots = median)');
  const cur = g.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', '#fff').attr('opacity', 0).attr('pointer-events', 'none');
  g.append('rect').attr('width', iw).attr('height', ih).attr('fill', 'transparent').on('pointermove', e => {
    const [mx] = d3.pointer(e, g.node()), v = x.invert(mx); cur.attr('x1', mx).attr('x2', mx).attr('opacity', .6);
    tip.show(e, `<b>${v.toFixed(2)} W or less</b><br>${series.map(s => `<span style="color:${TC[s.t]}">■</span> ${TN[s.t]} <b>${pct(d3.bisectRight(s.v, v) / s.v.length)}</b>`).join('<br>')}`);
  }).on('pointerleave', () => { cur.attr('opacity', 0); tip.hide(); });
}

/* ---- 8. origin: models built per country + median star index ---- */
function origin(el, anim) {
  const rows = S.ctry.slice(0, 8);
  const o = mkSvg(el, 360, { t: 34, r: 24, b: 12, l: 104 }), { g, iw, ih } = o;
  const split = Math.round(iw * .56), x = d3.scaleLinear([0, rows[0].n], [0, split - 56]), xs = d3.scaleLinear([3, 7], [split + 20, iw]);
  const y = d3.scaleBand(rows.map(d => d.c), [0, ih]).padding(.3);
  g.append('text').attr('x', 0).attr('y', -16).attr('class', 'ttl').text('Models built (a model made in two countries counts in both)');
  g.append('text').attr('x', split + 20).attr('y', -16).attr('class', 'ttl').text('Median star index');
  g.append('line').attr('x1', xs(5)).attr('x2', xs(5)).attr('y1', -4).attr('y2', ih).attr('stroke', 'rgba(255,255,255,.2)').attr('stroke-dasharray', '3 5');
  rows.forEach((d, i) => {
    const yy = y(d.c) + y.bandwidth() / 2, G = g.append('g');
    G.append('text').attr('x', -10).attr('y', yy + 4).attr('text-anchor', 'end').attr('fill', '#eef5fc').style('font-weight', 600).text(d.c);
    const b = G.append('rect').attr('x', 0).attr('y', y(d.c)).attr('height', y.bandwidth()).attr('rx', 5).attr('fill', i < 2 ? '#f5c542' : '#4f9fd8').attr('width', anim ? 0 : x(d.n));
    if (anim) b.transition().delay(i * 70).duration(800).ease(d3.easeCubicOut).attr('width', x(d.n));
    G.append('text').attr('x', x(d.n) + 8).attr('y', yy + 4).attr('fill', '#fff').style('font-weight', 700).text(fmt(d.n));
    if (d.n >= 30) {
      G.append('line').attr('x1', xs(5)).attr('x2', xs(d.sri)).attr('y1', yy).attr('y2', yy).attr('stroke', d.sri >= 5 ? '#3ddc97' : '#ff8a65').attr('stroke-width', 3);
      G.append('circle').attr('cx', xs(d.sri)).attr('cy', yy).attr('r', 7).attr('fill', d.sri >= 5 ? '#3ddc97' : '#ff8a65');
      G.append('text').attr('x', xs(d.sri) + (d.sri >= 5 ? 12 : -12)).attr('y', yy + 4).attr('text-anchor', d.sri >= 5 ? 'start' : 'end').attr('fill', '#fff').style('font-weight', 700).text(d.sri.toFixed(1));
    } else G.append('text').attr('x', xs(5)).attr('y', yy + 4).attr('text-anchor', 'middle').attr('fill', '#7590ad').style('font-size', '11.5px').text('n<30');
    G.append('rect').attr('x', -104).attr('y', y(d.c)).attr('width', iw + 104).attr('height', y.bandwidth()).attr('fill', 'transparent')
      .on('pointermove', e => tip.show(e, `<b>${d.c}</b><br>${fmt(d.n)} models · ${pct(d.n / S.n)} of the market<br>median star index <b>${d.sri.toFixed(2)}</b>`)).on('pointerleave', tip.hide);
  });
}
/* =====================================================================
   STORY CHAPTERS
   ===================================================================== */
const signed = v => (v >= 100 ? '+' : '−') + Math.abs(v - 100).toFixed(0) + '%';
const CHAP = [
  { id: 'c1', title: 'Market', q: 'What are Australians actually choosing from?',
    big: `${S.ledShare}% of models are LCD (LED)`,
    li: [`<b>${fmt(S.techN[0])}</b> LCD (LED), <b>${fmt(S.techN[1])}</b> LCD and <b>${fmt(S.techN[2])}</b> OLED.`, `OLED TVs average <b>${S.techInch[2].toFixed(1)}″</b>; LCD TVs average <b>${S.techInch[1].toFixed(1)}″</b>. OLED sits in bigger sizes, so raw averages across technologies mislead.`],
    so: 'Treat LCD (LED) as the market. Compare technologies only at the same size.',
    panel: `<div class="panel-head"><h3>Share of ${fmt(S.n)} models · 1 square = 1%</h3></div><div class="waffle-wrap"><div class="chart" id="c1a"></div><ul class="legend-list" id="c1leg"></ul></div><div class="panel-head"><h3>Average screen size by technology</h3></div><div class="chart" id="c1b"></div>` },
  { id: 'c2', title: 'Sizes', q: 'Which screen sizes dominate the shelves?',
    big: `Demand peaks at ${S.peaks.map(p => p.b + '″').slice(0, 2).join(' and ')}`,
    li: [`Busiest sizes: ${S.peaks.map(p => `<b>${p.b}″</b> (${p.n} models)`).join(', ')}.`, `Medium TVs (43–65″) are <b>${pct(S.clsN[1] / S.n)}</b> of models, small <b>${pct(S.clsN[0] / S.n)}</b>, large <b>${pct(S.clsN[2] / S.n)}</b>.`, `Above 85″ there are only <b>${S.over85}</b> models: a long, thin tail.`],
    so: 'The 55–65″ band is where most households shop, so that is where efficiency advice has the widest reach.',
    panel: `<div class="panel-head"><h3>Models by screen size · 1″ steps</h3>${techLegend()}</div><div class="chart" id="c2"></div><p class="note">Shaded zones are the three size classes used throughout this site.</p>` },
  { id: 'c3', title: 'Brands', q: 'Who fills the shelves, and who runs leanest?',
    big: `Top 3 brands hold ${S.top3}% of models`,
    li: [`<b>${bn(S.top12[0].brand)}</b> ${fmt(S.top12[0].n)}, <b>${bn(S.top12[1].brand)}</b> ${fmt(S.top12[1].n)}, <b>${bn(S.top12[2].brand)}</b> ${fmt(S.top12[2].n)}; ${DATA.brands.length - 3} other brands share the rest.`, `At the same size, brands with 50+ models range from <b>${bn(S.lean.brand)} (${signed(S.lean.idx)})</b> to <b>${bn(S.hungry.brand)} (${signed(S.hungry.idx)})</b> power draw.`, `The biggest brand, ${bn(S.top12[0].brand)}, draws <b>${signed(S.top12[0].idx)}</b> versus same-size TVs. Premium panels are brighter, so this is association, not proof of waste.`],
    so: 'Shelf share and efficiency are different things. Switch the chart to the size-fair index before you trust a brand name.',
    panel: `<div class="panel-head"><h3>Top 12 brands</h3><div class="seg" id="seg-c3"></div></div><div class="chart" id="c3"></div><p class="note">Size-fair index = a model's power ÷ the median of TVs within 2″ of its size. Averaged per brand.</p>` },
  { id: 'c4', title: 'Like for like', q: 'At the same size, which technology uses the least power?',
    big: 'Size-fair, technology barely matters',
    li: [`Raw watts say LCD is lowest in every class, but large LCDs average <b>${d3.mean(M.filter(m => m.cls === 'large' && m.t === 1), m => m.i).toFixed(1)}″</b> against <b>${d3.mean(M.filter(m => m.cls === 'large' && m.t === 0), m => m.i).toFixed(1)}″</b> for LED and <b>${d3.mean(M.filter(m => m.cls === 'large' && m.t === 2), m => m.i).toFixed(1)}″</b> for OLED. Part of that “win” is just smaller screens.`, `Compared at the <b>exact same size</b>, median power is ${TN.map((n, i) => `${n} <b>${S.medIdx[i].toFixed(0)}</b>`).join(', ')} (100 = typical). The gap is about <b>${(d3.max(S.medIdx) - d3.min(S.medIdx)).toFixed(0)} point${(d3.max(S.medIdx) - d3.min(S.medIdx)) < 1.5 ? '' : 's'}</b>.`, `Small OLED has only <b>${M.filter(m => m.cls === 'small' && m.t === 2).length}</b> models, too few to rank.`],
    so: 'Pick technology for picture quality, not for the power bill. Size and brand move the bill far more.',
    panel: `<div class="panel-head"><h3>Distribution by size class and technology</h3><div class="seg" id="seg-c4"></div></div>${techLegend()}<div class="chart" id="c4"></div><p class="note">Box = middle half of models · white line = median · whiskers = 10th to 90th percentile · ◆ = mean · ★ = best median in the group (groups under 30 models are dashed and not ranked).</p>` },
  { id: 'c5', title: 'Size and power', q: 'How fast does the bill grow with screen size?',
    big: `Every extra inch adds about ${S.fitW.slope.toFixed(1)} W`,
    li: [`Size explains most of the spread: correlation between inches and watts is <b>${S.fitW.r.toFixed(2)}</b>.`, `Star rating index barely moves with size (correlation <b>${S.fitR.r.toFixed(2)}</b>) because stars are judged against size.`, `Click a technology in the legend to hide it; the lines are median power for each.`],
    so: 'Choose the smallest screen you will enjoy. Then pick the best stars within that size.',
    panel: `<div class="panel-head"><h3>Every model, ${fmt(S.n)} dots</h3><div class="seg" id="seg-c5"></div></div><div class="legend" id="leg5"></div><div class="sc" id="c5"></div><p class="note">Hover a dot for the model. Dashed gold lines mark the size classes; solid lines are rolling medians.</p>` },
  { id: 'c6', title: 'Stars', q: 'Do bigger TVs earn fewer stars?',
    big: `Median ${S.medStar.map(v => v + '★').join(' · ')}`,
    li: [`Median stars are ${CLS.map((c, i) => `${CLSN[c].toLowerCase()} <b>${S.medStar[i]}★</b>`).join(', ')}: stars are relative to size, not absolute.`, `<b>${pct(S.s5)}</b> of models carry 5★ or more; only <b>${pct(S.s6)}</b> reach 6★; <b>${S.s7}</b> hit 7★ or 8★.`, `A large 6★ TV still draws <b>${Math.round(S.large6)} W</b> on average, against <b>${Math.round(S.small5)} W</b> for a small 5★ one.`],
    so: 'Use stars to compare TVs of the same size. Use watts or dollars to compare across sizes.',
    panel: `<div class="panel-head"><h3>Share of each size class at each star level</h3><div class="seg" id="seg-c6"></div></div><div class="chart" id="c6"></div>` },
  { id: 'c7', title: 'Standby', q: 'Does leaving a TV on standby matter?',
    big: `Standby adds only ${pct(S.sbMed * 19 / (S.clsMean[1] * 5), 1)} to a medium TV's energy`,
    li: [`Median passive standby is <b>${S.sbMed.toFixed(2)} W</b>; <b>${pct(S.sbLow)}</b> of reporting models stay at or below 0.5 W.`, `<span data-live="sb"></span>`, `<b>${pct(S.sbMiss, 1)}</b> of models (${fmt(Math.round(S.sbMiss * S.n))}) report no standby figure and are left out, never counted as zero.`],
    so: 'Do not worry about standby. Screen size and viewing hours decide the bill.',
    panel: `<div class="panel-head"><h3>Passive standby power, cumulative share</h3></div>${techLegend()}<div class="chart" id="c7"></div><p class="note">Step lines: how many models sit at or below each wattage. Hover to read all three at once.</p>` },
  { id: 'c8', title: 'Origin', q: 'Where are these TVs made, and does it matter?',
    big: `${pct(S.cnVn)} come from China or Vietnam`,
    li: [`${S.ctry.slice(0, 3).map(d => `<b>${d.c}</b> ${fmt(d.n)}`).join(', ')} lead the register.`, `Median star index by country sits between <b>${d3.min(S.ctry.filter(d => d.n >= 30), d => d.sri).toFixed(1)}</b> and <b>${d3.max(S.ctry.filter(d => d.n >= 30), d => d.sri).toFixed(1)}</b>: origin tells you less than size does.`],
    so: 'Country of manufacture is not a buying signal for energy. Brands choose factories, and one brand often spans several.',
    panel: `<div class="panel-head"><h3>Top 8 countries of manufacture</h3></div><div class="chart" id="c8"></div>` }
];
$('#chapters').innerHTML = CHAP.map((c, i) => `
<article class="chapter" id="ch-${c.id}" data-title="${c.title}">
  <div class="ch-text" data-reveal><div class="ch-no">Chapter ${i + 1}</div><h2>${c.q}</h2><div class="ch-big">${c.big}</div><ul>${c.li.map(l => `<li>${l}</li>`).join('')}</ul><div class="sowhat"><b>So what?</b> ${c.so}</div></div>
  <div class="panel chart-panel" data-reveal style="--d:.1s">${c.panel}</div>
</article>`).join('');
$('#endList').innerHTML = [
  `<li><b>Size first.</b> A large TV draws about ${S.ratio.toFixed(1)}× a small one. Dropping from large to medium saves roughly <span data-live="drop"></span> a year at your usage.</li>`,
  `<li><b>Brand before technology.</b> Brands differ by up to ${S.brandSpread} points at the same size; technologies by about ${(d3.max(S.medIdx) - d3.min(S.medIdx)).toFixed(0)}.</li>`,
  `<li><b>Read stars within a size.</b> A big 6★ TV still costs more to run than a small 5★ one.</li>`].join('');

/* legend for chapter 1 + hooks for each chart */
$('#c1leg').innerHTML = TN.map((n, i) => `<li data-t="${i}"><i style="background:${TC[i]}"></i><div><b>${n}</b><br><span>avg ${S.techInch[i].toFixed(1)}″</span></div><span>${fmt(S.techN[i])} · ${pct(S.techN[i] / S.n)}</span></li>`).join('');
$$('#c1leg li').forEach(li => { li.addEventListener('mouseenter', () => $('#c1a').__hl && $('#c1a').__hl(+li.dataset.t)); li.addEventListener('mouseleave', () => $('#c1a').__hl && $('#c1a').__hl(null)); });
reg('c1a', waffle); reg('c1b', techSize); reg('c2', sizes); reg('c3', brands); reg('c4', boxes);
reg('c5', (el, a) => drawScatter(el, a, sc5cfg)); reg('c6', heat); reg('c7', standby); reg('c8', origin);
seg('seg-c3', [['n', 'Models'], ['idx', 'Size-fair power'], ['sri', 'Median stars']], 'n', v => { brandMetric = v; CH.c3.redraw(true); });
seg('seg-c4', [['w', 'Watts'], ['idx', 'Size-fair'], ['r', 'Star index'], ['k', 'kWh / year']], 'w', v => { boxMetric = v; CH.c4.redraw(true); });
seg('seg-c5', [['w', 'Watts'], ['r', 'Star index']], 'w', v => { scY = v; CH.c5.redraw(false); });
seg('seg-c6', [['all', 'All'], ['0', 'LCD (LED)'], ['1', 'LCD'], ['2', 'OLED']], 'all', v => { heatTech = v; CH.c6.redraw(true); });
$('#leg5').innerHTML = TN.map((n, i) => `<button data-t="${i}" aria-pressed="true"><i style="background:${TC[i]}"></i>${n}</button>`).join('');
$('#leg5').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const t = +b.dataset.t; scOn[t] = !scOn[t]; b.setAttribute('aria-pressed', scOn[t]); $('#c5').__refresh && $('#c5').__refresh(); });

/* live text that depends on the usage sliders */
const LIVE = {
  sb: () => { const sbC = S.sbMed * (24 - U.h) * 365 / 1000 * U.c / 100, onC = cost(S.clsMean[1]); return `Standby for the other ${24 - U.h} hours costs about <b>${money(sbC)}</b> a year, against <b>${money(onC)}</b> for watching on a medium TV.`; },
  drop: () => `<b>${money(cost(S.clsMean[2]) - cost(S.clsMean[1]))}</b>`
};
function liveUpdate() { $$('[data-live]').forEach(e => e.innerHTML = LIVE[e.dataset.live]()); }

/* =====================================================================
   SCENES (3D transitions)
   ===================================================================== */
const ORDERS = ['home', 'story', 'finder', 'method'];
let cur = ORDERS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home', busy = false;
function movePill() { const b = $(`nav.tabs button[data-go="${cur}"]`), p = $('#tabPill'); if (!b) return; p.style.width = b.offsetWidth + 'px'; p.style.transform = `translateX(${b.offsetLeft}px)`; $$('nav.tabs button').forEach(x => x.removeAttribute('aria-current')); b.setAttribute('aria-current', 'page'); }
function go(id) {
  if (id === cur || busy) return; busy = true;
  const from = $('#s-' + cur), to = $('#s-' + id), fwd = ORDERS.indexOf(id) > ORDERS.indexOf(cur);
  const w = $('#wipe'); w.className = fwd ? '' : 'back'; void w.offsetWidth; w.classList.add('run');
  from.classList.add(fwd ? 'leave-fwd' : 'leave-back');
  setTimeout(() => {
    from.hidden = true; from.classList.remove('leave-fwd', 'leave-back'); cur = id; to.hidden = false; window.scrollTo({ top: 0, behavior: 'instant' });
    to.classList.add(fwd ? 'enter-fwd' : 'enter-back'); movePill(); history.replaceState(null, '', '#' + id);
    $('#rail').hidden = id !== 'story';
    setTimeout(() => { to.classList.remove('enter-fwd', 'enter-back'); busy = false; w.classList.remove('run'); }, dur(800));
  }, dur(440));
  if (RM) busy = false;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
ORDERS.forEach(id => { if (id !== cur) $('#s-' + id).hidden = true; });
$('#s-' + cur).hidden = false; $('#rail').hidden = cur !== 'story';
addEventListener('resize', movePill);
document.fonts && document.fonts.ready.then(movePill); movePill();
addEventListener('scroll', () => { const h = document.documentElement; $('#progress').style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - innerHeight)})`; }, { passive: true });

/* chapter rail */
$('#rail').innerHTML = CHAP.map((c, i) => `<button data-i="${i}" aria-label="Chapter ${i + 1}: ${c.title}"><span>${i + 1} · ${c.title}</span></button>`).join('');
$('#rail').addEventListener('click', e => { const b = e.target.closest('button'); if (b) $('#ch-' + CHAP[+b.dataset.i].id).scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); });
const railIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const i = CHAP.findIndex(c => 'ch-' + c.id === e.target.id); $$('#rail button').forEach((b, k) => b.classList.toggle('on', k === i)); } }), { rootMargin: '-45% 0px -45% 0px' });
$$('.chapter').forEach(c => railIO.observe(c));

/* reveal + count up */
function countUp(el) {
  const to = +(el.dataset.to != null ? el.dataset.to : S[el.dataset.bindto]), dec = +(el.dataset.dec || 0), f = v => v.toLocaleString('en-AU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (RM) { el.textContent = f(to); return; }
  const t0 = performance.now(); (function s(t) { const p = Math.min(1, (t - t0) / 1400); el.textContent = f(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(s); })(t0);
}
const revIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); $$('[data-count]', e.target).forEach(countUp); revIO.unobserve(e.target); } }), { threshold: .12 });
$$('[data-reveal]').forEach(e => revIO.observe(e));
$$('[data-bind="n"]').forEach(e => e.textContent = fmt(S.n));
document.addEventListener('pointermove', e => { const p = e.target.closest && e.target.closest('.panel'); if (p) { const r = p.getBoundingClientRect(); p.style.setProperty('--mx', (e.clientX - r.left) + 'px'); p.style.setProperty('--my', (e.clientY - r.top) + 'px'); } });

/* =====================================================================
   HOME: hero TV, calculator, verdict
   ===================================================================== */
const PRE = CLS.map((c, i) => ({ k: c, w: +S.clsMean[i].toFixed(1), inch: S.clsMedInch[i] }));
$('#presets').innerHTML = PRE.map(p => `<button data-p="${p.k}" aria-pressed="false"><b>${p.inch}″ ${CLSN[p.k].toLowerCase()}</b><span>${Math.round(p.w)} W average</span></button>`).join('');
const paint = i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%');
const arcLen = Math.PI * 160;
$('#gBg').setAttribute('d', 'M40 200 A160 160 0 0 1 360 200'); $('#gFg').setAttribute('d', 'M40 200 A160 160 0 0 1 360 200');
$('#gFg').style.strokeDasharray = arcLen; $('#gFg').style.strokeDashoffset = arcLen; $('#gFg').style.transition = RM ? 'none' : 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)';
$('#cmp').innerHTML = PRE.map(p => `<div class="row" data-p="${p.k}"><span>${p.inch}″ ${CLSN[p.k].toLowerCase()}</span><div class="trk"><div class="fill"></div></div><b></b></div>`).join('');
let tvTarget = 340, tvShown = false;
function renderU(src) {
  const kwh = U.w * U.h * 365 / 1000, yr = kwh * U.c / 100;
  $('#oW').textContent = Math.round(U.w) + ' W'; $('#oH').textContent = U.h + ' h'; $('#oC').textContent = U.c + '¢/kWh';
  $('#rW').value = U.w; $('#rH').value = U.h; $('#rC').value = U.c; $('#uH').value = U.h; $('#uC').value = U.c;
  $('#uHo').textContent = U.h + ' h'; $('#uCo').textContent = U.c + '¢/kWh';
  [$('#rW'), $('#rH'), $('#rC'), $('#uH'), $('#uC')].forEach(paint);
  $$('#presets button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === U.preset)); $$('#heroSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === U.preset));
  const gmax = Math.max(300, Math.ceil(yr / 100) * 100);
  $('#gMax').textContent = '$' + gmax; $('#gFg').style.strokeDashoffset = arcLen * (1 - Math.min(1, yr / gmax));
  $('#cYear').textContent = money(yr); $('#cMonth').textContent = money(yr / 12); $('#cKwh').textContent = Math.round(kwh) + ' kWh'; $('#cHour').textContent = (U.w * U.c / 1000).toFixed(1) + '¢';
  const mx = Math.max(...PRE.map(p => cost(p.w)), yr, 1);
  $$('#cmp .row').forEach((r, i) => { const v = cost(PRE[i].w); r.querySelector('.fill').style.width = (v / mx * 100) + '%'; r.querySelector('b').textContent = money(v); r.classList.toggle('on', U.preset === PRE[i].k); });
  $('#cFormula').textContent = `${Math.round(U.w)} W × ${U.h} h × 365 ÷ 1000 = ${kwh.toFixed(0)} kWh × $${(U.c / 100).toFixed(2)}`;
  $('#labelNote').textContent = `The official label's kWh per year assumes about ${S.labelH.toFixed(0)} hours of viewing a day. At ${U.h} h your real energy use is about ${Math.round(U.h / S.labelH * 100)}% of what the label shows.`;
  $('#fW').textContent = Math.round(U.w); $('#fC').textContent = money(yr); $('#fCs').textContent = `${U.h} h a day · ${U.c}¢/kWh`;
  const pr = PRE.find(p => p.k === U.preset); $('#fS').textContent = pr ? `${pr.inch}″ ${CLSN[pr.k].toLowerCase()}` : 'custom power';
  const stageW = $('#tvStage').clientWidth || 520, k = Math.min(1, stageW / 640);
  tvTarget = (300 + 250 * Math.sqrt(Math.max(0, (U.w - 20)) / 380)) * k; $('#tv').style.setProperty('--tvw', tvTarget + 'px');
  const lv = Math.min(1, U.w / 220); $('#tvGlow').style.setProperty('--gc', `rgba(${Math.round(86 + 160 * lv)},${Math.round(180 + 17 * lv)},${Math.round(233 - 167 * lv)},.45)`);
  liveUpdate(); if (typeof finderRefresh === 'function') finderRefresh(true);
}
function setPreset(p) { const x = PRE.find(q => q.k === p); U.preset = p; U.w = x.w; renderU(); }
$('#presets').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setPreset(b.dataset.p); });
$('#heroSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setPreset(b.dataset.p); });
$('#rW').addEventListener('input', e => { U.w = +e.target.value; U.preset = 'custom'; renderU(); });
['rH', 'uH'].forEach(id => $('#' + id).addEventListener('input', e => { U.h = +e.target.value; renderU(); }));
['rC', 'uC'].forEach(id => $('#' + id).addEventListener('input', e => { U.c = +e.target.value; renderU(); }));
addEventListener('resize', () => renderU());

/* TV screen animation + mouse tilt */
const cv = $('#tvCanvas'), cx = cv.getContext('2d'); let rxT = 6, ryT = -18, rx = 6, ry = -18;
$('#s-home').addEventListener('pointermove', e => { const r = $('#tvStage').getBoundingClientRect(); ryT = -14 + Math.max(-1.3, Math.min(1.3, (e.clientX - (r.left + r.width / 2)) / r.width)) * 34; rxT = 6 - Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height)) * 12; });
function tvFrame(t) {
  if (cur === 'home' && !document.hidden) {
    const L = Math.max(.14, Math.min(1, U.w / 220)), W = 640, H = 360;
    const bg = cx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0a2748'); bg.addColorStop(1, '#030c18'); cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
    const N = 44, bw = W / N;
    for (let i = 0; i < N; i++) {
      const n = .5 + .5 * Math.sin(t / 650 + i * .5 + Math.sin(t / 1100 + i * .21) * 2), h = H * (.08 + .8 * L * n * (.55 + .45 * Math.sin(i * .35 + 1)));
      const gr = cx.createLinearGradient(0, H - h, 0, H); gr.addColorStop(0, L > .55 ? '#f5c542' : '#8fd3f7'); gr.addColorStop(1, L > .55 ? '#ff8a65' : '#2f8fd6');
      cx.fillStyle = gr; cx.globalAlpha = .9; cx.fillRect(i * bw + 3, H - h, bw - 6, h);
    }
    cx.globalAlpha = 1; cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.lineWidth = 2.5; cx.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = H * .3 + Math.sin(x / 55 + t / 420) * 22 * L + Math.sin(x / 23 - t / 300) * 6; x ? cx.lineTo(x, y) : cx.moveTo(x, y); } cx.stroke();
    cx.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H; y += 4) cx.fillRect(0, y, W, 1.5);
    cx.fillStyle = '#fff'; cx.font = '700 22px Bricolage Grotesque, sans-serif'; cx.fillText(Math.round(U.w) + ' W', 22, 40);
    rx += (rxT - rx) * .07; ry += (ryT - ry) * .07;
    const pxo = ry + 14, pyo = rx - 6; $('.f-w').style.transform = `translate(${pxo * 1.2}px,${pyo * 1.4}px)`; $('.f-c').style.transform = `translate(${-pxo * .9}px,${-pyo * 1.1}px)`; $('.f-s').style.transform = `translate(${pxo * .6}px,${-pyo * 1.6}px)`;
    $('#tvRig').style.transform = `rotateX(${rx + Math.sin(t / 2400) * 1.5}deg) rotateY(${ry + Math.sin(t / 3100) * 3}deg)`;
  }
  requestAnimationFrame(tvFrame);
}
if (RM) { rx = 6; ry = -16; } requestAnimationFrame(tvFrame);

/* verdict flip cards */
const VC = [
  { n: '1', h: 'Size first', p: `A large TV draws ${S.ratio.toFixed(1)}× the power of a small one.`, b: () => `<div class="num">${Math.round(S.clsMean[0])} → ${Math.round(S.clsMean[2])} W</div><p>Small to large average. Dropping from large to medium saves about <b>${money(cost(S.clsMean[2]) - cost(S.clsMean[1]))}</b> a year at your usage.</p>` },
  { n: '2', h: 'Brand, then technology', p: `Brands differ by up to ${S.brandSpread} points at one size. Technologies differ by about ${(d3.max(S.medIdx) - d3.min(S.medIdx)).toFixed(0)}.`, b: () => `<div class="num">${bn(S.lean.brand)} ${signed(S.lean.idx)}</div><p>to ${bn(S.hungry.brand)} ${signed(S.hungry.idx)} for brands with 50+ models, at the same screen size.</p>` },
  { n: '3', h: 'Stars within a size', p: 'Stars rate efficiency for the size, so they cannot compare a 32″ with a 75″.', b: () => `<div class="num">${Math.round(S.large6)} W vs ${Math.round(S.small5)} W</div><p>A large 6★ TV against a small 5★ TV, on average. Compare stars only inside one size class.</p>` }
];
$('#verdict').innerHTML = VC.map((v, i) => `<div data-reveal style="--d:${i * .12}s"><button class="vcard" aria-label="${v.h}. Press to flip."><div class="face a"><div><div class="num">${v.n}</div><h3>${v.h}</h3></div><p>${v.p}</p><span class="hint">hover or tap for the evidence</span></div><div class="face b"><div>${v.b()}</div><span class="hint">tap to flip back</span></div></button></div>`).join('');
$$('#verdict > div').forEach(c => revIO.observe(c));
$$('.vcard').forEach(c => c.addEventListener('click', () => c.classList.toggle('flipped')));
/* =====================================================================
   FINDER
   ===================================================================== */
const F0 = { min: 15, max: 115, tech: [true, true, true], brand: '', star: 1, sort: 'idx', shown: 10, pin: null };
const F = Object.assign({}, F0, { tech: [true, true, true] });
const fm = d => d.i >= F.min - .5 && d.i <= F.max + .5 && F.tech[d.t] && (!F.brand || d.brand === F.brand) && d.s >= F.star;
$('#fBrand').innerHTML = '<option value="">All brands</option>' + [...S.brands].sort((a, b) => a.brand.localeCompare(b.brand)).map(b => `<option value="${b.brand}">${bn(b.brand)} (${b.n})</option>`).join('');
$('#fTech').innerHTML = TN.map((n, i) => `<button class="chip" data-t="${i}" aria-pressed="true"><i style="background:${TC[i]}"></i>${n}</button>`).join('');
$('#fCls').innerHTML = [['small', 15, 43], ['medium', 43, 65], ['large', 65, 115]].map(([c, a, b]) => `<button class="chip" data-a="${a}" data-b="${b}">${CLSN[c]}</button>`).join('');
$('#finderLegend').innerHTML = TN.map((n, i) => `<span style="display:inline-flex;align-items:center;gap:7px"><i style="background:${TC[i]};width:12px;height:12px;border-radius:4px;display:inline-block"></i>${n}</span>`).join('') + `<span style="display:inline-flex;align-items:center;gap:7px"><i style="background:#f5c542;width:18px;height:3px;display:inline-block"></i>leanest at each size</span>`;
const fcfg = { height: 440, yKey: () => 'w', techOn: () => F.tech, getMask: () => fm, pinned: () => F.pin, frontier: true, aria: 'Scatter of all models; models matching the filters are bright',
  onPick: m => { F.pin = m; finderRefresh(); $('#detail').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'nearest' }); } };
reg('finderSc', (el, a) => drawScatter(el, a, fcfg));
['c5', 'finderSc'].forEach(id => $('#' + id).style.height = '440px');

function finderRefresh() {
  const list = M.filter(fm), n = list.length;
  const key = F.sort, sorted = list.slice().sort((a, b) => key === 'idx' ? a.idx - b.idx : key === 'w' ? a.w - b.w : (b.r - a.r || a.w - b.w));
  const medW = n ? d3.median(list, d => d.w) : 0, top = sorted[0];
  $('#resTop').innerHTML = [['Models match', `${fmt(n)}<span style="font-size:.5em;color:var(--ink2)"> of ${fmt(S.n)}</span>`], ['Median power', n ? Math.round(medW) + ' W' : '–'], ['Median cost per year', n ? money(cost(medW)) : '–'], ['Top pick', top ? `<span style="font-size:.62em;line-height:1.2;display:block;margin-top:4px">${bn(top.brand)} ${top.model.slice(0, 18)}</span>` : '–']].map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('');
  $('#tbody').innerHTML = n ? sorted.slice(0, F.shown).map(d => `<tr data-id="${d.id}" class="${F.pin && F.pin.id === d.id ? 'pin' : ''}" tabindex="0"><td><b>${bn(d.brand)}</b> <span style="color:var(--ink2)">${d.model}</span></td><td class="r">${d.i.toFixed(0)}″</td><td><span class="dot" style="background:${TC[d.t]}"></span>${TN[d.t]}</td><td class="r">${d.w}</td><td class="r">${d.s}★</td><td class="r">${money(cost(d.w))}</td><td class="r"><span class="${d.idx < 95 ? 'good' : d.idx > 105 ? 'bad' : ''}">${signed(d.idx)}</span></td></tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:34px;color:var(--ink2)">No TV matches these filters. Widen the size range or lower the minimum stars.</td></tr>`;
  $('#more').hidden = n <= F.shown;
  const dt = $('#detail');
  if (F.pin) {
    const m = F.pin, mine = cost(m.w), typ = cost(m.exp), diff = typ - mine;
    dt.hidden = false;
    dt.innerHTML = `<div><h3>${bn(m.brand)} ${m.model}</h3><div style="color:var(--ink2)">${TN[m.t]} · ${m.i.toFixed(0)}″ · ${CLSN[m.cls].toLowerCase()} class</div><dl><div><dt>Power in use</dt><dd>${m.w} W</dd></div><div><dt>Stars</dt><dd>${m.s}★</dd></div><div><dt>Star index</dt><dd>${m.r.toFixed(2)}</dd></div><div><dt>Label energy</dt><dd>${m.k} kWh/yr</dd></div><div><dt>Standby</dt><dd>${m.sb >= 0 ? m.sb + ' W' : 'not reported'}</dd></div><div><dt>Made in</dt><dd style="font-size:15px">${m.c.join(', ')}</dd></div></dl></div>
    <div class="save"><b>${Math.abs(diff) < .5 ? 'About typical' : money(Math.abs(diff)) + (diff > 0 ? ' a year cheaper' : ' a year dearer')}</b>than a typical ${Math.round(m.i)}″ TV (${Math.round(m.exp)} W). This one costs <strong>${money(mine)}</strong> a year at ${U.h} h a day and ${U.c}¢/kWh.<br><button class="mini-btn" id="unpin">Clear selection</button></div>`;
    $('#unpin').onclick = () => { F.pin = null; finderRefresh(); };
  } else dt.hidden = true;
  const sc = $('#finderSc'); if (sc.__refresh) sc.__refresh();
}
$('#tbody').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) { F.pin = M[+tr.dataset.id]; finderRefresh(); } });
$('#tbody').addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-id]'); if (tr) { F.pin = M[+tr.dataset.id]; finderRefresh(); } } });
$('#more').addEventListener('click', () => { F.shown += 10; finderRefresh(); });
function fSync() { $('#fMin').value = F.min; $('#fMax').value = F.max; $('#fSize').textContent = F.min + '–' + F.max + '″'; $('#oStar').textContent = F.star > 1 ? '≥ ' + F.star + '★' : 'any'; $('#fStar').value = F.star; $('#fBrand').value = F.brand; $('#fSort').value = F.sort; paint($('#fStar')); paint($('#fMin')); paint($('#fMax'));
  $$('#fTech .chip').forEach(b => b.setAttribute('aria-pressed', F.tech[+b.dataset.t])); }
$('#fMin').addEventListener('input', e => { F.min = +e.target.value; if (F.min > F.max) F.max = F.min; F.shown = 10; fSync(); finderRefresh(); });
$('#fMax').addEventListener('input', e => { F.max = +e.target.value; if (F.max < F.min) F.min = F.max; F.shown = 10; fSync(); finderRefresh(); });
$('#fCls').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { F.min = +b.dataset.a; F.max = +b.dataset.b; F.shown = 10; fSync(); finderRefresh(); } });
$('#fTech').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { F.tech[+b.dataset.t] = !F.tech[+b.dataset.t]; F.shown = 10; fSync(); finderRefresh(); } });
$('#fBrand').addEventListener('change', e => { F.brand = e.target.value; F.shown = 10; finderRefresh(); });
$('#fStar').addEventListener('input', e => { F.star = +e.target.value; F.shown = 10; fSync(); finderRefresh(); });
$('#fSort').addEventListener('change', e => { F.sort = e.target.value; finderRefresh(); });
$('#fReset').addEventListener('click', () => { Object.assign(F, F0, { tech: [true, true, true], pin: null }); fSync(); finderRefresh(); });

/* =====================================================================
   METHOD
   ===================================================================== */
const fn = DATA.funnel;
$('#funnel').innerHTML = [['All rows in the file', fn.total], ['Available to buy', fn.total - fn.unavailable], ['Sold in Australia', fn.final]].map(([l, v]) => `<div class="fr"><span>${l}</span><div class="trk"><div class="fill" data-w="${v / fn.total * 100}"></div></div><b>${fmt(v)}</b></div>`).join('');
new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { $$('#funnel .fill').forEach((f, i) => setTimeout(() => f.style.width = f.dataset.w + '%', i * 250)); o.disconnect(); } }, { threshold: .4 }).observe($('#funnel'));
const USED = ['Brand_Reg', 'Model_No', 'SoldIn', 'Country', 'screensize', 'Screen_Tech', 'Pasv_stnd_power', 'Avg_mode_power', 'Star2', 'Star Rating Index', 'Labelled energy consumption (kWh/year)', 'Availability Status'];
const UNUSED = ['Submit_ID', 'Family Name', 'Screen_Area', 'Act_stnd_power', 'Act_stnd_time', 'Star', 'SRI', 'SubmitStatus', 'ExpDate', 'GrandDate', 'Product Class', 'Product Website', 'Representative Brand URL', 'Star Image Large', 'Star Image Small', 'Power supply', 'Tuner Type', 'What test standard was used', 'Registration Number', 'Regulatory Standard'];
$('#cols').innerHTML = USED.map(c => `<span class="u">${c}</span>`).join('') + UNUSED.map(c => `<span>${c}</span>`).join('');

/* =====================================================================
   BOOT + INIT
   ===================================================================== */
const boot = $('#boot');
function endBoot() { if (!boot.isConnected || boot.classList.contains('go')) return; boot.classList.add('go'); setTimeout(() => document.body.classList.remove('booting'), 350); setTimeout(() => boot.remove(), 1000); }
if (RM) { boot.remove(); } else { document.body.classList.add('booting'); setTimeout(endBoot, 1000); boot.addEventListener('click', endBoot); addEventListener('keydown', endBoot, { once: true }); }
fSync(); renderU(); finderRefresh();
window.__tv = { S, M, go, CH };
})();
