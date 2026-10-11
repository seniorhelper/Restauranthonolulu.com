# Restaurant Honolulu

Visitor-first guide to restaurants in Honolulu, Waikīkī and Oʻahu.
Published by [Eye To Ad Media](https://www.eyetoad.com). Live: https://restauranthonolulu.com

## How it works

Every page is generated from data by a dependency-free Node script and served as static HTML by GitHub Pages.

| Path | What it is |
|---|---|
| `data/restaurants.json` | One record per restaurant (open and closed). The source of truth. |
| `data/hale-aina.json` | Hale ʻAina Award results by year and category. |
| `data/photos.json` | Topic photos. Entries with `base` + `hero`/`card` sizes render as `<picture>` (AVIF + WebP) from `images/photos/`. Food photos are Pexels-licensed stock (no attribution needed), always representative; topics without a file render no image. |
| `src/assets/tools.js` | Meal planner, near-my-hotel finder and map (loaded only on those pages). Reads the generated `restaurants.json`. |
| `assets/vendor/leaflet-1.9.4/` | Self-hosted Leaflet (BSD-2), loaded only when a visitor presses "Show map". Tiles come from OpenStreetMap. |
| `src/config.mjs` | Neighborhoods, cuisines, "Best of" lists, guides, plans and the Pop-up Domination offer. |
| `src/content.mjs` | Hand-written pages (home, FAQ, guides, advertise, claim…). `{r:slug}` links a restaurant; the build fails if it's missing or closed. |
| `src/build.mjs` | The generator. Writes HTML, `search-index.json`, `restaurants.json` (public open data), `ads.txt`, `sitemap.xml` and `llms.txt` into the repo root. Fails if a title is over 60 characters or a description over 158. |
| `src/assets/` | `site.css` and `app.js` (search, filters, open-now). |

```sh
npm run build   # regenerate everything
npm run check   # fail if generated files are stale; check links and JSON-LD
```

The build refuses to publish a page that shows a restaurant count (`N restaurants`), references a closed restaurant from hand-written copy, or has broken internal links.

## Editing restaurants

Edit `data/restaurants.json` (schema: see any record). Keep `verified` current and list `sources`. Use `"hours": null` when hours aren't confirmed — the page then says so instead of guessing. To close a restaurant, set `"status": "closed"`, `closed_date` and `closed_note`; it moves to `/closed/` and its page points to open alternatives.

Paid placement: set `"sponsored": true` (and optional `sponsor_keywords`). Sponsored listings are always labeled.

## Deploy

A GitHub Action checks every pull request, rebuilds on pushes to `main`, and rebuilds daily so date-based content (like the promo end date) stays correct.
