/* DATA layer — builds the app's DATA object live from KNIME-cleaned CSVs.
   Re-run the KNIME workflow, overwrite knime_output/*.csv, refresh. No embedded snapshot. */
'use strict';
const TECHS = ['LCD (LED)', 'LCD', 'OLED'];

function buildDATA(rows) {
  const brands = [...new Set(rows.map(r => r.brand))].sort();
  const countries = [...new Set(rows.flatMap(r => r.c))].sort();
  const bi = new Map(brands.map((b, i) => [b, i]));
  const ci = new Map(countries.map((c, i) => [c, i]));
  return {
    techs: TECHS.slice(),
    brands,
    countries,
    funnel: { total: 4724, unavailable: 14, final: 4508 },
    rows: rows.map(r => [bi.get(r.brand), r.model, TECHS.indexOf(r.t), r.i, r.w, r.s, r.r, r.k, r.sb, r.c.map(c => ci.get(c)), r.o ? 1 : 0])
  };
}

function parseRow(d) {
  const cc = String(d.Country || '').split(',').map(s => s.trim()).filter(Boolean);
  return {
    brand: (d.Brand_clean || d.Brand_Reg || 'UNKNOWN').trim(),
    model: d.Model_No || '',
    t: (d.Screen_Tech || '').trim(),
    i: +d.screensize_inch, w: +d.Avg_mode_power, s: +d.Star2,
    r: +d['Star Rating Index'], k: +d['Labelled energy consumption (kWh/year)'],
    sb: +d.sb_W, c: cc.length ? cc : ['Unknown'],
    o: String(d.is_outlier_IQR).toUpperCase() === 'TRUE'
  };
}

window.__dataload = Promise.all([
  d3.csv('knime_output/SizeTech_clean.csv'),
  d3.csv('knime_output/SizeTech_equal_sampled.csv')
]).then(([raw, bal]) => {
  const R = raw.map(parseRow).filter(d => d.i > 0 && d.w > 0 && TECHS.includes(d.t));
  const B = bal.map(parseRow).filter(d => d.i > 0 && d.w > 0 && TECHS.includes(d.t));
  window.DATA = buildDATA(R);
  window.DATA_BAL = buildDATA(B);
  if (typeof window.bootApp === 'function') window.bootApp();
  else document.addEventListener('DOMContentLoaded', () => window.bootApp && window.bootApp());
  return window.DATA;
}).catch(err => {
  const b = document.querySelector('#boot .bootlbl');
  if (b) b.textContent = 'Could not load knime_output/*.csv — serve this folder over http (py serve.py), not file://.';
  console.error(err);
});
