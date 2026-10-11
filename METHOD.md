# METHOD — TV Energy Australia (COS30045)

Source pinned: `tv_2026_02_15.csv` (4,724 rows × 32 cols, GEMS registry snapshot Feb-2026, via data.gov.au).

Site architecture (dark story, 4 scenes): `index.html` (layout) + `style.css` (design system) + `js/d3.min.js` (vendored D3 v7) + `data.js` (CSV → DATA builder) + `app.js` (chapters, charts, finder, calculator). No embedded data snapshot: every number is computed live from `knime_output/*.csv`; re-run KNIME → overwrite CSVs → refresh.

## 1. Scope / filter (must reproduce exactly)
- Keep: `Availability Status = "Available"` AND `SoldIn MATCHES ".*Australia.*"` (contains, NOT equals).
- Result: **4,508 rows** = 2,953 (AU+FJ+NZ) + 1,188 (AU+NZ) + 335 (AU only) + 32 (AU+FJ).
- Excluded: 202 NZ/Fiji-only + 14 expired (Unavailable). `Country` = manufacture location, never used for market filtering.

## 2. Cleaning (KNIME Ex1)
- `Brand_Reg` → UPPER, trim, collapse spaces → `Brand_clean`; mapping table: SAMSUNG ELECTRONICS→SAMSUNG, Q.BELL→QBELL, S VISION→SVISION.
- Result: 74 brands; Top-3 SAMSUNG 1,096 / KOGAN 788 / LG 677 (>50%).

## 3. Derived (KNIME Ex2)
- `screensize_inch = screensize / 2.54`
- `size_category`: small <43" / medium ≤65" / large (>66")
- `W_per_sqcm = Avg_mode_power / Screen_Area`
- Crosstab Tech×Size: LCD 236/215/111; LCD(LED) 854/1661/1143; OLED **17**/173/98.

## 4. Statistics (story chapter 4, boxplots)
- Per Tech×Size the boxplot computes median, quartiles, 10th/90th percentiles, mean ◆ and 95% CI ticks (1.96·sd/√n) live from the models.
- Cells with **n<30 are dashed and not ranked** (OLED-small n=17) — the chart enforces this itself.
- Balanced check (teacher's rule — downsample each size block to its minimum, stratified random, seed 2026): small 17/tech, medium 173/tech, large 98/tech → `SizeTech_equal_sampled.csv` (864 rows). Seed 2026 most representative of 5 tested (max |sample−population| = 2.8W); ranking LCD-lowest holds under ALL tested seeds. Chapter-4 seg switch redraws the same boxplots on the balanced twin.

## 5. Outliers (Tukey IQR per size-class, red rings on the story scatter)
- Thresholds: small >93.4W / medium >175.0W / large >350.1W → `is_outlier_IQR` column (149 rows).
- Named clusters: Sylvox 43" 107.8W + 3× Samsung 43" 99W; Samsung 65" 8K 282–310W (Star 1.0); TCL 115" 600W; 5× Spark 86" 482.4W (identical — suspected duplicated submissions); Kogan 100" OLED 446.3W; low-end 10–15W = 15–24" hospitality segment.
- Star: corr(power, Star2) ≈ −0.77/−0.77/−0.61 within large/medium/small; zero models with Star≥9 above class mean.

## 6. Limitations (read before citing)
- No sales / price / date-sold columns → popularity = shelf share; **no time-series claims** from this file.
- `ExpDate` = registration expiry (admin cycle), not demand.
- `Submit_ID` duplicates (~1,941) → unit = registration listing unless deduped.
- Star is a size-adjusted ordinal index → median/boxplot, never mean-Star across sizes.

## 8. Audit trail (11-Oct-2026, professor double-check)
- Raw 4,724 → filtered 4,508 ✔. Web `SizeTech_clean.csv` mean power 116.86 = raw-filtered 116.86 ✔ (no row lost in cleaning).
- Pivot table re-computed independently — all 9 cells match to 0.1W ✔.
- KNIME node states verified from `settings.xml`: Row Filter (#6) EXECUTED 4,710 ✔; Rule-based Row Filter (#7) EXECUTED 4,508 ✔ with rule `$SoldIn$ LIKE "*Australia*"` — LIKE with `*` wildcards IS valid KNIME Rule Engine syntax (earlier review note claiming otherwise was wrong, corrected).
- ⚠ Equal Size Sampling (#15) in Ex1 is IDLE/unconfigured — configure (seed 2026, per-size blocks) or disconnect before demo; a grey unconfigured node invites questions.

## 9. Time-cohort check (why there is NO time-series chart)
- `ExpDate` year cohorts 2026–2031 (n = 502/830/806/875/1250/245).
- Within medium class: median inch frozen at 54.6", median power 92–105W with no monotonic direction; tech-mix % oscillates (OLED 3.6–10.6%, no trend).
- Verdict: expiry cohorts carry no demand signal — a trend line here would be fabrication. Deliberately no time-series chart; this check is the evidence.

## 10. KNIME → Web mapping
| KNIME output | Web consumer |
|---|---|
| `SizeTech_clean.csv` (18 cols incl. inch, cat, Brand_clean, standby, SRI, outlier flag) | Everything: chapters 1–8, finder, calculator, KPIs |
| `SizeTech_equal_sampled.csv` (864 rows, seed 2026) | Chapter-4 Balanced mode |
| `BrandCount_clean.csv` (74 brands) | Cross-check (chapters compute counts live from the same CSV) |
