# DEPLOY — TV Energy Australia (COS30045)

## Links
- **GitHub repo:** https://github.com/hung7405/COS30045-Data-Viz-week4-demo-
- **Live site (Mercury, Swinburne):** https://mercury.swin.edu.au/cos30045/s104775470/Appliance-Energy/ (requires Swinburne login — 401 for guests is normal).

## A. GitHub Pages (2 clicks, do once)
1. Open the repo → **Settings** → **Pages**.
2. **Source:** Deploy from a branch → **Branch:** `main`, folder `/ (root)` → **Save**.
3. Wait 1–2 minutes → open the Live site URL above. Hard-refresh (Ctrl+F5) on first visit.
4. Every later `git push` to `main` redeploys automatically. No build step, no backend:
   the site is static HTML/CSS/JS + CSV (all paths relative, D3 vendored in `js/`).

## B. Mercury via WinSCP (school server)
1. Open **WinSCP** → New session → **File protocol: SFTP**.
2. **Host:** `mercury.swin.edu.au` (if that fails, use the host in your unit outline) →
   username/password = your Swinburne student login.
3. Navigate to your web folder (usually `public_html/` or the COS30045 folder named in the outline).
4. Drag-drop the **contents** of this repo folder (`index.html`, `style.css`, `data.js`,
   `app.js`, `js/`, `knime_output/`, `images/`, `data/`) — keep the folder structure as-is.
   Do NOT upload `.git/`, `*.backup.*`, or `app.ext.js` (reference only).
5. Open the Mercury URL in a browser → done. CSVs load over plain HTTP, no server code needed.

## C. Run locally (demo / marking on your laptop)
```
cd Appliance-Energy
py serve.py
```
Open http://localhost:8000 (NOT file:// — browsers block CSV loading from file://).

## Deploy checklist (before you submit links)
- [ ] GitHub Pages shows the dark 4-scene site (not a 404 / README page).
- [ ] Story chapter 4 defaults to **Balanced**, boxes visible with CI ticks.
- [ ] Finder returns 4,508 models with no filter.
- [ ] Method scene funnel reads 4,724 → 4,508.
- [ ] Mercury URL opens the same site.
