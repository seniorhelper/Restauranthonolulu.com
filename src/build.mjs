// Builds the whole static site from data/*.json into the repo root.
// Usage: node src/build.mjs            (write files)
//        node src/build.mjs --check    (fail if output differs from what's committed)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SITE, PROMO, PLANS, SEO_ADDON, NEIGHBORHOODS, AREAS, CUISINES, BEST, GUIDES, ANCHORS, ALIASES } from './config.mjs';
import { esc, DAY_ORDER, DAY_NAMES, hoursLines, fmtRange, fmtDays, fmtTime, isLate, latestClose, price$, PRICE_LABEL, miles, fmtDate, fold, mapsUrl, closeMin } from './lib.mjs';
import { layout } from './layout.mjs';
import { PAGES } from './content.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECK = process.argv.includes('--check');
const TODAY = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

// ---------- data ----------
const RAW = read('data/restaurants.json');
const HALE = read('data/hale-aina.json');
const PHOTOS = read('data/photos.json');

const HOODS = Object.fromEntries(NEIGHBORHOODS.map((n) => [n.slug, n]));
const CUIS = Object.fromEntries(CUISINES.map((c) => [c.slug, c]));

const errors = [];
const ALL = RAW.map(normalize).filter((r) => r.publish);
const OPEN = ALL.filter((r) => r.status === 'open').sort(byName);
const CLOSED = ALL.filter((r) => r.status !== 'open');
// Permanently closed, with a closure date and at least one source: listed (unlinked) on /closed/ only.
const GONE = RAW.filter(isGone).map((r) => ({ ...r, neighborhood_name: (HOODS[r.neighborhood] || {}).name || '' }));
const BY_SLUG = Object.fromEntries(ALL.map((r) => [r.slug, r]));
// Landmarks that borrow a listed restaurant's coordinates.
for (const [k, a] of Object.entries(ANCHORS)) {
  if (!a.from) { a.geo_source ||= 'unrecorded (in the site config before 2026-10-10)'; continue; }
  const r = BY_SLUG[a.from];
  if (!r || r.lat == null) { errors.push(`anchor ${k}: ${a.from} has no coordinates`); continue; }
  a.lat = r.lat; a.lng = r.lng; a.geo_source = `same point as ${r.name} (${r.address}); that restaurant's coordinates have no recorded source`;
}
const walkMin = (mi) => Math.max(1, Math.round((mi * 1609.34) / 80));

function normalize(r) {
  const x = { ...r };
  x.tags = { parking: null, kid_friendly: null, vegan_options: null, ocean_view: null, walk_in: null, reservations: null, takeout: null, ...(r.tags || {}) };
  x.dishes = r.dishes || [];
  x.awards = r.awards || [];
  x.cuisines = (r.cuisines || []).filter((c) => CUIS[c] || errors.push(`${r.slug}: unknown cuisine ${c}`));
  if (!HOODS[x.neighborhood]) errors.push(`${r.slug}: unknown neighborhood ${x.neighborhood}`);
  // Low-confidence records without an address stay in the data file but are not published.
  // Permanently closed restaurants are not published (owner, 2026-10-11); they stay in the data file and
  // appear only as plain text on the /closed/ tracker. Temporarily closed places keep their pages.
  x.publish = r.publish !== false && !isGone(r) && !(r.confidence === 'low' && !r.address && r.status === 'open');
  // Where coordinates came from. The original coordinates have no recorded source.
  if (x.lat != null && !x.geo_source) { x.geo_source = 'unrecorded (in the dataset before 2026-10-10)'; x.geo_precision = x.geo_precision || 'approx. 100 m'; }
  x.late = isLate(x);
  x.url = `/restaurants/${x.slug}/`;
  return x;
}
function byName(a, b) { return a.name.localeCompare(b.name); }
// "For sure" closed: permanently closed, at least one source, and not a low-confidence record.
function isGone(r) { return r.status === 'closed' && (r.sources || []).length > 0 && r.confidence !== 'low'; }

// Attach Hale ʻAina results to restaurants.
const BY_SLUG_ALL = Object.fromEntries(ALL.map((r) => [r.slug, r]));
const HALE_MATCH = [];
for (const ed of HALE.editions || []) for (const cat of ed.categories || []) for (const w of cat.winners || []) {
  const r = findWinner(w);
  if (w.slug && !r) errors.push(`hale-aina: unknown slug ${w.slug}`);
  HALE_MATCH.push({ year: ed.year, category: cat.category, rank: w.rank, name: w.name, r });
  if (r && !r.awards.some((a) => /hale/i.test(a.name) && a.year === ed.year && a.category === cat.category)) {
    r.awards.push({ name: 'Hale ʻAina Award', year: ed.year, category: cat.category, rank: w.rank });
  }
}
// Exact (accent/punctuation-insensitive) name match only; use "slug" in hale-aina.json for anything else.
function findWinner(w) {
  if (w.slug !== undefined) return w.slug ? BY_SLUG_ALL[w.slug] : null;
  const f = fold(w.name).replace(/[^a-z0-9]/g, '');
  return ALL.find((r) => fold(r.name).replace(/[^a-z0-9]/g, '') === f) || null;
}

for (const r of ALL) r.score = score(r);
function score(r) {
  let s = 0;
  for (const a of r.awards) s += /beard/i.test(a.name) ? 6 : /hale/i.test(a.name) ? ({ Gold: 5, Silver: 4, Bronze: 3 }[a.rank] || 2) * (a.year >= 2025 ? 1 : 0.6) : 2;
  const y = +String(r.opened || '').slice(0, 4);
  if (y && y < 1990) s += 3; else if (y && y < 2010) s += 1.5;
  s += { high: 2, medium: 1, low: 0 }[r.confidence] ?? 0;
  if (r.hours) s += 0.5;
  return s;
}
const ranked = (list) => [...list].sort((a, b) => b.score - a.score || byName(a, b));

// ---------- urls ----------
const hoodUrl = (s) => { const n = HOODS[s]; if (n.parent) return hoodUrl(n.parent); return n.legacy || `/neighborhoods/${s}/`; };
const cuisineUrl = (s) => CUIS[s].legacy || `/cuisine/${s}/`;
const bestUrl = (b) => b.path || `/best/${b.slug}/`;
const hoodLive = (s) => { const n = HOODS[HOODS[s].parent || s]; return OPEN.some((r) => inHood(r, n)); };
const cuisineLive = (s) => OPEN.some((r) => r.cuisines.includes(s));
const hoodLink = (s) => (hoodLive(s) ? `<a href="${hoodUrl(s)}">${esc(HOODS[s].name)}</a>` : esc(HOODS[s].name));
const cuisineLink = (s) => (cuisineLive(s) ? `<a href="${cuisineUrl(s)}">${esc(CUIS[s].name)}</a>` : esc(CUIS[s].name));
const inHood = (r, n) => r.neighborhood === n.slug || (n.includes || []).includes(r.neighborhood);

// ---------- photos ----------
// data/photos.json: { topic: { id, photographer, photographer_url, file } }. Only rendered if the
// optimized file exists locally, so no broken images if a photo hasn't been fetched yet.
// Entries with `base` + `hero`/`card` size lists get a <picture> with AVIF and WebP sources.
// Topics without a photo return '' (no more coloured placeholder blocks).
function photo(topic, { cls = '', eager = false, variant = 'hero', sizes } = {}) {
  let p = PHOTOS[topic];
  if (p && !hasFile(p) && p.fallback) p = PHOTOS[p.fallback];
  if (!hasFile(p)) return '';
  if (p.base && p[variant]) {
    const suf = variant === 'card' ? '-card' : '';
    const list = p[variant];
    const set = (ext) => list.map(([w]) => `/${p.base}${suf}-${w}.${ext} ${w}w`).join(', ');
    const sz = sizes || (variant === 'card' ? '(max-width: 800px) 50vw, 300px' : '100vw');
    const [fw, fh] = list[Math.min(1, list.length - 1)];
    return `<figure class="ph ${cls}"><picture><source type="image/avif" srcset="${set('avif')}" sizes="${sz}"><source type="image/webp" srcset="${set('webp')}" sizes="${sz}"><img src="/${p.base}${suf}-${fw}.webp" alt="${esc(p.alt || '')}" width="${fw}" height="${fh}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture></figure>`;
  }
  const credit = p.photographer ? `<figcaption>Photo: ${p.photographer_url ? `<a href="${esc(p.photographer_url)}?utm_source=restauranthonolulu&utm_medium=referral" rel="noopener">${esc(p.photographer)}</a>` : esc(p.photographer)}${p.id ? ` / <a href="https://unsplash.com/photos/${esc(p.id)}?utm_source=restauranthonolulu&utm_medium=referral" rel="noopener">Unsplash</a>` : ''}</figcaption>` : '';
  return `<figure class="ph ${cls}"><img src="/${esc(p.file)}" alt="${esc(p.alt || '')}" width="${p.w || 1200}" height="${p.h || 800}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${credit}</figure>`;
}

function hasFile(p) { return !!(p && p.file && fs.existsSync(path.join(ROOT, p.file))); }

// ---------- components ----------
const cuisineNames = (r) => r.cuisines.map((c) => CUIS[c].name).join(' · ');
const hoursAttr = (r) => (r.hours ? ` data-hours='${esc(JSON.stringify(r.hours))}'` : '');
const hhAttr = (r) => (r.happy_hour ? ` data-hh='${esc(JSON.stringify(r.happy_hour))}'` : '');

function flags(r) {
  const f = [];
  if (r.happy_hour) f.push('hh');
  if (r.late) f.push('late');
  if (r.tags.parking && r.tags.parking !== 'street') f.push('park');
  if (r.tags.kid_friendly) f.push('kids');
  if (r.tags.vegan_options || r.cuisines.includes('vegan-vegetarian')) f.push('vegan');
  if (r.tags.ocean_view) f.push('ocean');
  if (r.tags.walk_in) f.push('walkin');
  if (r.tags.reservations) f.push('resv');
  return f;
}
const FLAG_LABEL = { hh: 'Happy hour', late: 'Open late', park: 'Parking', kids: 'Kid-friendly', vegan: 'Vegan options', ocean: 'Ocean view', walkin: 'Walk-ins', resv: 'Reservations' };

function card(r, { note = '', sponsored = false } = {}) {
  const f = flags(r);
  const badge = r.sponsored || sponsored ? '<span class="spon">Sponsored</span>' : '';
  const verified = r.plan && r.plan !== 'claim' ? '<span class="ver" title="Details confirmed by the owner">✓ Owner verified</span>' : '';
  const award = r.awards.find((a) => /beard/i.test(a.name)) || r.awards.find((a) => /hale/i.test(a.name) && a.year >= 2025);
  return `<article class="rc${r.sponsored ? ' rc-spon' : ''}" data-n="${r.neighborhood}" data-c="${r.cuisines.join(' ')}" data-p="${r.price || ''}" data-f="${f.join(' ')}" data-q="${esc(fold([r.name, HOODS[r.neighborhood].name, cuisineNames(r), r.dishes.join(' ')].join(' ')))}"${hoursAttr(r)}>
<a href="${r.url}" class="rc-a">
<div class="rc-top"><span>${esc(HOODS[r.neighborhood].name)}</span><span class="rc-p" title="${PRICE_LABEL[r.price] || ''} per person">${price$(r.price)}</span></div>
<h3>${esc(r.name)}</h3>
<p class="rc-c">${esc(cuisineNames(r))}</p>
${r.summary ? `<p class="rc-s">${esc(r.summary)}</p>` : ''}
${note ? `<p class="rc-note">${note}</p>` : ''}
<div class="rc-b">${badge}${verified}${award ? `<span class="aw">${esc(awardShort(award))}</span>` : ''}<span class="open" aria-live="polite"></span>${f.filter((x) => ['hh', 'late', 'ocean'].includes(x)).map((x) => `<span class="tg">${FLAG_LABEL[x]}</span>`).join('')}</div>
</a></article>`;
}
function awardShort(a) {
  // Use the award's own name (the old default labelled every Beard mention "America’s Classic").
  if (/beard/i.test(a.name)) {
    if (/semifinalist/i.test(a.name)) return `James Beard semifinalist${a.year ? ' ' + a.year : ''}`;
    return `${a.name.replace(/\s*\(.*?\)\s*/g, '').replace(/America's Classics?/, 'America’s Classic').replace(/: Northwest & Pacific/, '')}${a.year ? ' ' + a.year : ''}`;
  }
  if (/hale/i.test(a.name)) return `Hale ʻAina ${a.year}${a.rank && a.rank !== 'Winner' ? ' ' + a.rank : ''}`;
  return `${a.name}${a.year ? ' ' + a.year : ''}`;
}
const grid = (list, opts) => (list.length ? `<div class="grid">${list.map((r) => card(r, opts?.(r))).join('')}</div>` : '<p class="muted">Nothing listed here yet.</p>');

// Sponsored slot: paid listings that match, else an unobtrusive house ad.
function sponsorSlot(match, where) {
  const s = OPEN.filter((r) => r.sponsored && match(r));
  if (s.length) return `<section class="spon-row" aria-label="Sponsored">${s.map((r) => card(r)).join('')}</section>`;
  // No house ad when there is no paid listing (keeps pages content-first; owners find /advertise/ in the nav).
  return '';
}

const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([u, t], i) => (i < items.length - 1 ? `<a href="${u}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`)).join(' <span aria-hidden="true">›</span> ')}</nav>`;
const crumbLd = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([u, t], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: SITE.url + u })) });
// ItemList of the restaurants on a list page (in page order). Each item points at our restaurant page's
// Restaurant entity (@id) and repeats only facts shown on the page. No ratings or reviews, ever.
const itemListLd = (list, name) => ({
  '@type': 'ItemList', ...(name ? { name } : {}), itemListOrder: 'https://schema.org/ItemListOrderAscending', numberOfItems: Math.min(list.length, 30),
  itemListElement: list.slice(0, 30).map((r, i) => ({
    '@type': 'ListItem', position: i + 1, url: SITE.url + r.url,
    item: JSON.parse(JSON.stringify({ '@type': 'Restaurant', '@id': `${SITE.url}${r.url}#restaurant`, name: r.name, url: SITE.url + r.url, servesCuisine: r.cuisines.map((c) => CUIS[c].name), priceRange: r.price ? price$(r.price) : undefined, address: addrLd(r) })),
  })),
});

function head({ kicker, h1, intro, photoTopic, crumbItems }) {
  return `<section class="phead">
${photoTopic ? photo(photoTopic, { cls: 'phead-img', eager: true }) : ''}
<div class="phead-in wrap">${crumbItems ? crumbs(crumbItems) : ''}${kicker ? `<p class="kick">${esc(kicker)}</p>` : ''}<h1>${h1}</h1>${intro ? `<p class="lead">${intro}</p>` : ''}</div>
</section>`;
}
const tips = (list) => (list && list.length ? `<aside class="tips"><h2>Good to know</h2><ul>${list.map((t) => `<li>${t}</li>`).join('')}</ul></aside>` : '');
const chips = (links) => `<nav class="chips">${links.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join('')}</nav>`;

// Token replacement for hand-written copy: {r:slug} → link to an OPEN restaurant (build fails otherwise).
function rich(s) {
  return s.replace(/\{r:([a-z0-9-]+)\}/g, (_, slug) => {
    const r = BY_SLUG[slug];
    if (!r) { errors.push(`content references missing restaurant ${slug}`); return slug; }
    if (r.status !== 'open') { errors.push(`content references closed restaurant ${slug}`); return esc(r.name); }
    return `<a href="${r.url}">${esc(r.name)}</a>`;
  });
}

// ---------- output ----------
const out = new Map();
const ASSETS_V = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, 'src/assets/site.css')) + fs.readFileSync(path.join(ROOT, 'src/assets/app.js')) + fs.readFileSync(path.join(ROOT, 'src/assets/tools.js'))).digest('hex').slice(0, 8);
const sitemap = [];
function page(p, opts) {
  if (out.has((p.endsWith('/') ? p + 'index.html' : p).replace(/^\//, ''))) errors.push(`duplicate page ${p}`);
  if (!opts.noindex && opts.title.length > 60) errors.push(`${p}: title over 60 chars (${opts.title.length}): ${opts.title}`);
  if (!opts.noindex && opts.description.length > 158) errors.push(`${p}: description over 158 chars (${opts.description.length})`);
  const html = layout({ path: p, assetsV: ASSETS_V, ...opts });
  out.set((p.endsWith('/') ? p + 'index.html' : p).replace(/^\//, ''), html);
  if (!opts.noindex && !opts.canonical) sitemap.push({ p, title: opts.sitemapTitle || opts.title.split(' | ')[0], group: opts.group || 'Pages' });
}
function redirect(from, to) {
  if (out.has((from + 'index.html').replace(/^\//, ''))) return;
  out.set((from + 'index.html').replace(/^\//, ''), `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="/images/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/images/apple-touch-icon.png"><title>Moved</title><link rel="canonical" href="${SITE.url}${to}"><meta name="robots" content="noindex, follow"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p><a href="${to}">Continue to ${SITE.url}${to}</a></p></body></html>\n`);
}
// Titles: add the brand only when the whole title still fits in 60 characters.
// Pass several candidates (longest first); the first that fits wins.
const T = (...cands) => {
  for (const t of cands) { if (`${t} | Restaurant Honolulu`.length <= 60) return `${t} | Restaurant Honolulu`; if (t.length <= 60) return t; }
  return cands[cands.length - 1];
};
// Descriptions: "start A, B, C and more. end" with as many names as fit in 158 characters.
const namesDesc = (start, list, end = '') => {
  for (let k = Math.min(4, list.length); k >= 0; k--) {
    const names = list.slice(0, k).map((r) => r.name);
    const s = `${start}${names.length ? names.join(', ') + (list.length > k ? ' and more' : '') + '.' : ''}${end ? ' ' + end : ''}`.trim();
    if (s.length <= 158) return s;
  }
  return start.slice(0, 158);
};

// ---------- restaurant detail ----------
function similar(r, n = 6) {
  return OPEN.filter((o) => o !== r).map((o) => {
    const shared = o.cuisines.filter((c) => r.cuisines.includes(c)).length;
    const d = miles(r, o);
    return { o, s: shared * 3 + (o.neighborhood === r.neighborhood ? 2 : 0) + Math.max(0, 4 - d) + (Math.abs((o.price || 2) - (r.price || 2)) === 0 ? 0.5 : 0), d };
  }).filter((x) => x.s > 2).sort((a, b) => b.s - a.s).slice(0, n);
}

// "Venue, 123 Street, Suite, City, HI 96815" → PostalAddress (venue names without a number are dropped
// from streetAddress when a numbered street part exists).
function addrLd(r) {
  if (!r.address) return undefined;
  const parts = r.address.split(',').map((s) => s.trim()).filter(Boolean);
  const hasState = /^HI\b/.test(parts[parts.length - 1] || '');
  const city = hasState && parts.length >= 2 ? parts[parts.length - 2] : 'Honolulu';
  let street = hasState ? parts.slice(0, -2) : parts;
  if (street.some((p) => /\d/.test(p))) street = street.slice(street.findIndex((p) => /\d/.test(p)));
  return { '@type': 'PostalAddress', streetAddress: street.join(', ') || undefined, addressLocality: city, addressRegion: 'HI', postalCode: (r.address.match(/\b96\d{3}\b/) || [])[0], addressCountry: 'US' };
}

function restaurantLd(r) {
  const ld = {
    '@type': 'Restaurant', '@id': `${SITE.url}${r.url}#restaurant`, name: r.name, url: SITE.url + r.url,
    address: addrLd(r),
    geo: r.lat != null ? { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng } : undefined,
    telephone: r.phone || undefined,
    servesCuisine: r.cuisines.map((c) => CUIS[c].name),
    priceRange: r.price ? price$(r.price) : undefined,
    sameAs: [r.website, r.instagram].filter(Boolean),
    award: r.awards.map(awardText),
    hasMap: mapsUrl(r),
    openingHoursSpecification: r.hours ? DAY_ORDER.flatMap((d) => r.hours[d].map(([o, c]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${DAY_NAMES[d]}`, opens: o, closes: c }))) : undefined,
    acceptsReservations: r.tags.reservations ?? undefined,
  };
  if (!ld.sameAs.length) delete ld.sameAs;
  if (!ld.award.length) delete ld.award;
  return JSON.parse(JSON.stringify(ld));
}
const awardText = (a) => [a.name, a.year, a.category, a.rank].filter(Boolean).join(' · ');

function detail(r) {
  const n = HOODS[r.neighborhood];
  const isOpen = r.status === 'open';
  const hl = hoursLines(r.hours);
  const near = similar(r);
  const t = r.tags;
  const facts = [
    ['Price', r.price ? `${price$(r.price)} <span class="muted">· ${PRICE_LABEL[r.price]} per person</span>` : '<span class="muted">Not confirmed</span>'],
    ['Neighborhood', hoodLink(r.neighborhood)],
    ['Cuisine', r.cuisines.map(cuisineLink).join(', ')],
    r.address && ['Address', `${esc(r.address)}<br><a href="${esc(mapsUrl(r))}" rel="noopener">Open in Google Maps ↗</a>`],
    r.phone && ['Phone', `<a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">${esc(r.phone)}</a>`],
    r.website && ['Website', `<a href="${esc(r.website)}" rel="noopener nofollow">${esc(r.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`],
    r.instagram && ['Instagram', `<a href="${esc(r.instagram)}" rel="noopener nofollow">${esc(r.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, ''))}</a>`],
    t.parking && ['Parking', { lot: 'Own lot', street: 'Street parking', valet: 'Valet', validated: 'Validated parking', garage: 'Garage' }[t.parking] || esc(t.parking)],
  ].filter(Boolean);
  const amen = [['walk_in', 'Walk-ins welcome', 'Reservation recommended'], ['reservations', 'Takes reservations', 'No reservations'], ['kid_friendly', 'Kid-friendly', null], ['vegan_options', 'Vegan options', null], ['ocean_view', 'Ocean view', null], ['takeout', 'Takeout', null]]
    .map(([k, yes, no]) => (t[k] === true ? yes : t[k] === false ? no : null)).filter(Boolean);
  if (r.late) amen.push('Open late');

  const body = `
<article class="wrap det" data-slug="${r.slug}">
${crumbs([['/', 'Home'], ['/restaurants/', 'Restaurants'], ...(hoodLive(r.neighborhood) ? [[hoodUrl(r.neighborhood), n.name]] : []), [r.url, r.name]])}
${!isOpen ? `<div class="closed-banner" role="status"><strong>${r.status === 'temporarily-closed' ? 'Temporarily closed' : 'Permanently closed'}${r.closed_date ? ` · ${fmtDate(r.closed_date)}` : ''}.</strong> ${esc(r.closed_note || '')} <a href="#near">See open alternatives nearby ↓</a></div>` : ''}
<header class="det-h">
  <p class="kick">${esc(cuisineNames(r))} · ${esc(n.name)}</p>
  <h1>${esc(r.name)}</h1>
  ${r.summary ? `<p class="lead">${esc(r.summary)}</p>` : ''}
  <div class="det-b">${r.sponsored ? '<span class="spon">Sponsored</span>' : ''}${r.plan && r.plan !== 'claim' ? '<span class="ver">✓ Owner verified</span>' : ''}${isOpen ? `<span class="open big"${hoursAttr(r)}></span>` : ''}${amen.map((a) => `<span class="tg">${a}</span>`).join('')}</div>
  <div class="det-cta">
    ${r.address || r.lat ? `<a class="btn" href="${esc(mapsUrl(r))}" rel="noopener">Directions</a>` : ''}
    ${r.phone && isOpen ? `<a class="btn btn-o" href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">Call</a>` : ''}
    ${r.website && isOpen ? `<a class="btn btn-o" href="${esc(r.website)}" rel="noopener nofollow">Website</a>` : ''}
  </div>
</header>
<div class="det-grid">
  <div>
    ${isOpen ? `<section class="box"><h2>Hours</h2>${hl.length ? `<table class="hours"${hoursAttr(r)}>${DAY_ORDER.map((d) => `<tr data-day="${d}"><th>${DAY_NAMES[d]}</th><td>${r.hours[d].length ? r.hours[d].map(fmtRange).join(', ') : 'Closed'}</td></tr>`).join('')}</table><p class="small muted">Hawaiʻi time. Holiday hours vary.</p>` : `<p>We haven’t confirmed current hours. Check the restaurant’s website or call before you go.${r.phone ? ` <a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">${esc(r.phone)}</a>` : ''}</p>`}</section>` : ''}
    ${r.happy_hour && isOpen ? `<section class="box hh"><h2>Happy hour</h2><p><strong>${fmtDays(r.happy_hour.days)}, ${fmtTime(r.happy_hour.start)}–${fmtTime(r.happy_hour.end)}</strong>${r.happy_hour.note ? ` · ${esc(r.happy_hour.note)}` : ''}</p></section>` : ''}
    ${r.photos?.length ? `<section class="box"><h2>Photos</h2><div class="gallery">${r.photos.map((p) => `<img src="/${esc(p.file)}" alt="${esc(p.alt)}" width="${p.w}" height="${p.h}" loading="lazy" decoding="async">`).join('')}</div><p class="small muted">Photos supplied by the restaurant.</p></section>` : ''}
    ${r.dishes.length ? `<section class="box"><h2>Known for</h2><ul class="dishes">${r.dishes.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></section>` : ''}
    ${(() => { if (r.lat == null || !isOpen) return ''; const a = Object.values(ANCHORS).filter((x) => x.lat != null).map((x) => ({ x, d: miles(x, r) })).sort((p, q) => p.d - q.d)[0]; if (!a || a.d > 3) return ''; return `<section class="box"><h2>Getting there</h2><p>About ${a.d < 0.1 ? 'a block' : `${a.d.toFixed(1)} mi`} from ${esc(a.x.short || a.x.name.split(' (')[0])}${a.d <= 1.5 ? `, roughly a ${walkMin(a.d)}-minute walk` : ', a short drive or ride'} (straight-line estimate).${r.tags.parking ? ` Parking: ${esc({ lot: 'own lot', street: 'street parking', valet: 'valet', validated: 'validated parking', garage: 'garage' }[r.tags.parking] || r.tags.parking)}.` : ''}</p><p class="small"><a href="/near-my-hotel/">Find more places near your hotel</a> · <a href="/map/">See it on the map</a></p></section>`; })()}
    ${r.awards.length ? `<section class="box"><h2>Awards</h2><ul class="awards">${r.awards.sort((a, b) => (b.year || 0) - (a.year || 0)).map((a) => `<li><strong>${esc(a.name)}</strong>${a.year ? ` · ${a.year}` : ''}${a.category ? ` · ${esc(a.category)}` : ''}${a.rank ? ` · ${esc(a.rank)}` : ''}</li>`).join('')}</ul>${r.awards.some((a) => /hale/i.test(a.name)) ? '<p class="small"><a href="/hale-aina-awards/">All Hale ʻAina winners →</a></p>' : ''}</section>` : ''}
  </div>
  <aside>
    <section class="box"><h2>Details</h2><dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>
    <section class="box verify">
      <p><strong>Last verified:</strong> ${fmtDate(r.verified)}</p>
      ${r.confidence !== 'high' ? '<p class="small muted">Some details come from listings we could not fully confirm. Call ahead.</p>' : ''}
      ${r.sources?.length ? `<details><summary>Sources</summary><ul>${r.sources.map((s) => `<li><a href="${esc(s)}" rel="noopener nofollow">${esc(s.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a></li>`).join('')}</ul></details>` : ''}
      <p class="small"><a href="/contact/?r=${r.slug}">Report a change</a></p>
    </section>
    <p class="small muted claim-line">Own ${esc(r.name)}? <a href="/claim/?r=${r.slug}">Claim this page free</a> to correct details.</p>
    <p class="small muted lr-claim">Want it kept current for you? <a href="https://linkrestaurants.com/claim/">Claim &amp; Optimize</a> from $9.99/mo.</p>
  </aside>
</div>
${near.length ? `<section id="near" class="near"><h2>${isOpen ? 'Similar nearby' : 'Open alternatives nearby'}</h2>${grid(near.map((x) => x.o), (o) => ({ note: Number.isFinite(miles(r, o)) ? `${miles(r, o).toFixed(1)} mi away` : '' }))}</section>` : ''}
</article>`;
  const desc = isOpen
    ? `${r.name}: ${cuisineNames(r)} in ${n.name}, Honolulu. ${r.hours ? 'Hours, ' : ''}price, ${r.happy_hour ? 'happy hour, ' : ''}map and similar places nearby.`
    : `${r.name} in ${n.name} is ${r.status === 'temporarily-closed' ? 'temporarily' : 'permanently'} closed${r.closed_date ? ` (${fmtDate(r.closed_date)})` : ''}. Open alternatives nearby.`;
  page(r.url, {
    title: isOpen ? T(`${r.name} – ${n.name}, ${n.area === 'town' ? 'Honolulu' : 'Oʻahu'}`, `${r.name} – ${n.name}`, `${r.name}, ${n.area === 'town' ? 'Honolulu' : 'Oʻahu'}`, r.name) : T(`${r.name} (Closed)`),
    description: desc,
    body,
    jsonld: [...(isOpen ? [restaurantLd(r)] : []), crumbLd([['/', 'Home'], ['/restaurants/', 'Restaurants'], [r.url, r.name]])],
    group: 'Restaurants', sitemapTitle: r.name + (isOpen ? '' : ' (closed)'),
  });
}

// ---------- directory ----------
function directory() {
  const usedHoods = NEIGHBORHOODS.filter((n) => OPEN.some((r) => r.neighborhood === n.slug));
  const usedCuis = CUISINES.filter((c) => OPEN.some((r) => r.cuisines.includes(c.slug)));
  const opt = (v, t) => `<option value="${v}">${esc(t)}</option>`;
  const body = `${head({ h1: 'Honolulu restaurants', intro: 'Filter by neighborhood, cuisine, price and what matters on the day. Hours are Hawaiʻi time.', crumbItems: [['/', 'Home'], ['/restaurants/', 'Restaurants']] })}
<div class="wrap">
<form class="filters" data-filters onsubmit="return false">
  <label class="f-q"><span class="sr">Search</span><input type="search" name="q" placeholder="Name, dish or neighborhood"></label>
  <label><span>Neighborhood</span><select name="n"><option value="">All</option>${Object.entries(AREAS).map(([a, t]) => { const hs = usedHoods.filter((n) => n.area === a); return hs.length ? `<optgroup label="${esc(t)}">${hs.map((n) => opt(n.slug, n.name)).join('')}</optgroup>` : ''; }).join('')}</select></label>
  <label><span>Cuisine</span><select name="c"><option value="">All</option>${usedCuis.map((c) => opt(c.slug, c.name)).join('')}</select></label>
  <label><span>Price</span><select name="p"><option value="">Any</option>${[1, 2, 3, 4].map((p) => opt(p, `${price$(p)} · ${PRICE_LABEL[p]}`)).join('')}</select></label>
  <fieldset><legend class="sr">Features</legend>
    ${[['now', 'Open now'], ['late', 'Open late'], ['hh', 'Happy hour'], ['park', 'Parking'], ['kids', 'Kid-friendly'], ['vegan', 'Vegan'], ['ocean', 'Ocean view'], ['walkin', 'Walk-in']].map(([v, t]) => `<label class="tog"><input type="checkbox" name="f" value="${v}"><span>${t}</span></label>`).join('')}
  </fieldset>
  <button type="reset" class="linkbtn" data-reset>Clear filters</button>
</form>
${OPEN.some((r) => r.sponsored) ? '' : sponsorSlot(() => false, 'in Honolulu')}
<div class="grid" data-list>${[...OPEN.filter((r) => r.sponsored), ...OPEN.filter((r) => !r.sponsored)].map((r) => card(r)).join('')}</div>
<p class="empty" data-empty hidden>No restaurants match those filters. <button type="button" class="linkbtn" data-reset>Clear filters</button></p>
<p class="small muted">Don’t see a place? <a href="/contact/">Tell us</a>. Restaurant owners can <a href="/claim/">add or claim a listing</a>.</p>
</div>`;
  page('/restaurants/', { title: T('Honolulu Restaurant Directory – Filter & Open Now'), description: 'Search and filter Honolulu and Oʻahu restaurants by neighborhood, cuisine, price, open now, happy hour, parking, kid-friendly, vegan, ocean view and walk-ins.', body, jsonld: [crumbLd([['/', 'Home'], ['/restaurants/', 'Restaurants']]), itemListLd(OPEN)], sitemapTitle: 'Restaurant directory' });
}

// ---------- list pages ----------
function listPage({ p, title, description, h1, intro, kicker, photoTopic, list, crumbItems, extra = '', tipList, sponsorMatch, sponsorWhere, group, sitemapTitle, related = [] }) {
  const body = `${head({ kicker, h1, intro, photoTopic, crumbItems })}
<div class="wrap">
${related.length ? chips(related) : ''}
${sponsorMatch ? sponsorSlot(sponsorMatch, sponsorWhere) : ''}
${grid(list)}
${extra}
${tips(tipList)}
</div>`;
  page(p, { title, description, body, jsonld: [crumbLd(crumbItems), itemListLd(list, title.split(' | ')[0])], group, sitemapTitle });
}

function neighborhoods() {
  for (const n of NEIGHBORHOODS) {
    if (n.parent) { redirect(`/neighborhoods/${n.slug}/`, hoodUrl(n.slug)); continue; }
    const list = ranked(OPEN.filter((r) => inHood(r, n)));
    const p = hoodUrl(n.slug);
    if (n.legacy) redirect(`/neighborhoods/${n.slug}/`, p);
    if (!list.length) continue;
    const cuisHere = [...new Set(list.flatMap((r) => r.cuisines))].slice(0, 8);
    const closedHere = CLOSED.filter((r) => inHood(r, n) && String(r.closed_date || '').startsWith('2026'));
    listPage({
      p, h1: `${esc(n.name)} restaurants`, kicker: AREAS[n.area], intro: esc(n.blurb),
      title: T(`${n.name} Restaurants – Where to Eat in ${n.name}`, `Where to Eat in ${n.name}, Honolulu`, `Where to Eat in ${n.name}`), description: namesDesc(`Where to eat in ${n.name}: `, list, 'Hours, prices and map links.'),
      list, crumbItems: [['/', 'Home'], ['/neighborhoods/', 'Neighborhoods'], [p, n.name]],
      related: [[`/restaurants/?n=${n.slug}`, 'Filter these'], ...cuisHere.map((c) => [cuisineUrl(c), CUIS[c].name])],
      tipList: n.tips, sponsorMatch: (r) => inHood(r, n), sponsorWhere: `in ${n.name}`, group: 'Neighborhoods', sitemapTitle: `${n.name} restaurants`,
      extra: closedHere.length ? `<p class="small muted">Closed in 2026: ${closedHere.map((r) => `<a href="${r.url}">${esc(r.name)}</a>`).join(', ')}. <a href="/closed/">Closures tracker</a></p>` : '',
    });
  }
  const body = `${head({ h1: 'Honolulu & Oʻahu neighborhoods', intro: 'Where to eat, area by area.', crumbItems: [['/', 'Home'], ['/neighborhoods/', 'Neighborhoods']] })}
<div class="wrap">${Object.entries(AREAS).map(([a, t]) => {
    const hs = NEIGHBORHOODS.filter((n) => n.area === a && !n.parent && OPEN.some((r) => inHood(r, n)));
    return hs.length ? `<section class="sec"><h2>${esc(t)}</h2><div class="tiles">${hs.map((n) => `<a class="tile" href="${hoodUrl(n.slug)}"><strong>${esc(n.name)}</strong><span>${esc(n.blurb)}</span><span class="tile-ex">${ranked(OPEN.filter((r) => inHood(r, n))).slice(0, 3).map((r) => esc(r.name)).join(' · ')}</span></a>`).join('')}</div></section>` : '';
  }).join('')}</div>`;
  page('/neighborhoods/', { title: T('Honolulu Dining Neighborhoods – Waikīkī to Kailua'), description: 'Where to eat in each Honolulu and Oʻahu neighborhood, from Waikīkī and Kakaʻako to Kaimukī, Chinatown, Kailua and the North Shore.', body, jsonld: [crumbLd([['/', 'Home'], ['/neighborhoods/', 'Neighborhoods']])], sitemapTitle: 'Neighborhoods' });
}

function cuisines() {
  const used = CUISINES.filter((c) => OPEN.some((r) => r.cuisines.includes(c.slug)));
  for (const c of CUISINES) {
    const list = ranked(OPEN.filter((r) => r.cuisines.includes(c.slug)));
    const p = cuisineUrl(c.slug);
    if (c.legacy) redirect(`/cuisine/${c.slug}/`, p);
    if (!list.length) continue;
    const hoodsHere = [...new Set(list.map((r) => r.neighborhood))].slice(0, 8);
    listPage({
      p, h1: `${esc(c.name)} in Honolulu`, intro: esc(c.blurb), photoTopic: c.photo,
      title: T(`Best ${c.name} in Honolulu & Oʻahu`, `Best ${c.name} in Honolulu`, `${c.name} in Honolulu`), description: namesDesc(`${c.name} in Honolulu and on Oʻahu: `, list, 'Hours, prices and maps.'),
      list, crumbItems: [['/', 'Home'], ['/cuisine/', 'Cuisines'], [p, c.name]],
      related: [[`/restaurants/?c=${c.slug}`, 'Filter these'], ...hoodsHere.map((h) => [hoodUrl(h), HOODS[h].name])],
      sponsorMatch: (r) => r.cuisines.includes(c.slug), sponsorWhere: `serving ${c.name.toLowerCase()}`, group: 'Cuisines', sitemapTitle: c.name,
    });
  }
  const body = `${head({ h1: 'Cuisines', intro: 'Browse Honolulu restaurants by what you want to eat.', crumbItems: [['/', 'Home'], ['/cuisine/', 'Cuisines']] })}
<div class="wrap"><div class="tiles">${used.map((c) => `<a class="tile" href="${cuisineUrl(c.slug)}"><strong>${esc(c.name)}</strong><span>${esc(c.blurb)}</span></a>`).join('')}</div></div>`;
  page('/cuisine/', { title: T('Honolulu Restaurants by Cuisine'), description: 'Hawaiian food, poke, plate lunch, sushi, ramen, dim sum, Korean, steak and more in Honolulu.', body, jsonld: [crumbLd([['/', 'Home'], ['/cuisine/', 'Cuisines']])], sitemapTitle: 'Cuisines' });
}

function bestPages() {
  for (const b of BEST) {
    const list = ranked(OPEN.filter(b.match)).slice(0, 24);
    const p = bestUrl(b);
    if (b.path) redirect(`/best/${b.slug}/`, p);
    listPage({
      p, h1: esc(b.h1), intro: esc(b.intro), photoTopic: b.photo, kicker: 'Best of',
      title: T(b.title), description: namesDesc(`${b.title}: `, list, 'Hours, prices and maps.'),
      list, crumbItems: [['/', 'Home'], ['/best/', 'Best of'], [p, b.h1]],
      sponsorMatch: b.match, sponsorWhere: 'that fits this list', group: 'Best of', sitemapTitle: b.title,
      extra: list.length ? '<p class="small muted">Ranked by awards, track record and how recently we verified details. Paid listings are labeled Sponsored and never affect this order.</p>' : '',
    });
  }
  const body = `${head({ h1: 'Best of Honolulu', intro: 'Short lists by craving and occasion.', crumbItems: [['/', 'Home'], ['/best/', 'Best of']] })}
<div class="wrap"><div class="tiles">${BEST.map((b) => { const l = ranked(OPEN.filter(b.match)); return l.length ? `<a class="tile" href="${bestUrl(b)}"><strong>${esc(b.h1)}</strong><span class="tile-ex">${l.slice(0, 3).map((r) => esc(r.name)).join(' · ')}</span></a>` : ''; }).join('')}</div></div>`;
  page('/best/', { title: T('Best Restaurants in Honolulu by Category'), description: 'The best breakfast, plate lunch, poke, ramen, shave ice, fine dining, date night and ocean-view restaurants in Honolulu.', body, jsonld: [crumbLd([['/', 'Home'], ['/best/', 'Best of']])], sitemapTitle: 'Best of' });
}

function happyHour() {
  const list = OPEN.filter((r) => r.happy_hour).sort((a, b) => a.happy_hour.start.localeCompare(b.happy_hour.start) || byName(a, b));
  const rows = list.map((r) => `<tr data-hh='${esc(JSON.stringify(r.happy_hour))}'><td><a href="${r.url}">${esc(r.name)}</a><span class="muted small"> · ${esc(HOODS[r.neighborhood].name)}</span></td><td>${fmtDays(r.happy_hour.days)}</td><td>${fmtTime(r.happy_hour.start)}–${fmtTime(r.happy_hour.end)}</td><td>${esc(r.happy_hour.note || '')}</td></tr>`).join('');
  const body = `${head({ h1: 'Happy hour in Honolulu', intro: 'Days, times and deals. Rows marked <span class="hh-now-key">Now</span> are on right now (Hawaiʻi time). Deals change — confirm with the bar.', photoTopic: 'happy-hour', crumbItems: [['/', 'Home'], ['/happy-hour-honolulu/', 'Happy hour']] })}
<div class="wrap">
${sponsorSlot((r) => !!r.happy_hour, 'with a happy hour')}
<label class="tog"><input type="checkbox" data-hh-now><span>Only show happy hours on now</span></label>
<div class="tbl-wrap"><table class="tbl" data-hh-table><thead><tr><th>Where</th><th>Days</th><th>Time</th><th>Deal</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="empty" data-hh-empty hidden>No happy hours running right now. Most start between 2 and 4 pm.</p>
${tips(['Waikīkī oceanfront bars run happy hour in the afternoon and often again late night.', 'Many deals are bar-seating only.'])}
</div>`;
  page('/happy-hour-honolulu/', { title: T('Happy Hour in Honolulu & Waikīkī – Times, Days & Deals'), description: `Honolulu and Waikīkī happy hours with days, times and deals, including ${list.slice(0, 3).map((r) => r.name).join(', ')}.`, body, jsonld: [crumbLd([['/', 'Home'], ['/happy-hour-honolulu/', 'Happy hour']]), itemListLd(list)], sitemapTitle: 'Happy hour' });
  redirect('/happy-hour/', '/happy-hour-honolulu/');
}

function openLate() {
  const list = OPEN.filter((r) => r.late).sort((a, b) => closeMin(latestClose(b)) - closeMin(latestClose(a)) || byName(a, b));
  listPage({
    p: '/open-late/', h1: 'Open late in Honolulu', intro: 'Kitchens open until 10 pm or later on at least one night. Use “Open now” in the <a href="/restaurants/?f=now">directory</a> for right this minute.',
    title: T('Late-Night Restaurants in Honolulu – Open After 10 pm'), description: 'Honolulu restaurants open late: ramen, izakaya, bars with kitchens and 24-hour spots, with closing times for every night.',
    list, crumbItems: [['/', 'Home'], ['/open-late/', 'Open late']], photoTopic: 'ramen', sitemapTitle: 'Open late',
    sponsorMatch: (r) => r.late, sponsorWhere: 'that stays open late',
    tipList: ['Closing times are kitchen hours where we have them; bars may stay open later.'],
  });
}

function newOpenings() {
  const list = OPEN.filter((r) => /^20(25|26)/.test(String(r.opened || ''))).sort((a, b) => String(b.opened).localeCompare(String(a.opened)) || byName(a, b));
  const body = `${head({ h1: 'New restaurant openings in Honolulu', intro: 'Opened in 2025 and 2026, newest first.', crumbItems: [['/', 'Home'], ['/new-openings/', 'New openings']] })}
<div class="wrap">${grid(list, (r) => ({ note: `Opened ${fmtDate(r.opened)}` }))}
<p class="small muted">Opening a restaurant? <a href="/claim/">Add it here</a>.</p></div>`;
  page('/new-openings/', { title: T('New Restaurant Openings in Honolulu (2025–2026)'), description: `New Honolulu restaurants opened in 2025 and 2026, including ${list.slice(0, 3).map((r) => r.name).join(', ')}.`, body, jsonld: [crumbLd([['/', 'Home'], ['/new-openings/', 'New openings']]), itemListLd(list)], sitemapTitle: 'New openings' });
}

function closedPage() {
  // Permanently closed places have no page any more: plain text with the closure date and a source.
  const sorted = [...GONE].sort((a, b) => String(b.closed_date || '0').localeCompare(String(a.closed_date || '0')) || byName(a, b));
  const groups = [['Closed in 2026', (r) => String(r.closed_date || '').startsWith('2026')], ['Closed in 2025', (r) => String(r.closed_date || '').startsWith('2025')], ['Earlier closures', (r) => !/^202[56]/.test(String(r.closed_date || ''))]];
  const host = (u) => u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  const row = (r) => `<li><strong>${esc(r.name)}</strong> <span class="muted">· ${esc(r.neighborhood_name)}${r.closed_date ? ` · closed ${fmtDate(r.closed_date)}` : ''}</span>${r.closed_note ? `<br><span class="small">${esc(r.closed_note)}</span>` : ''}<br><span class="small muted">Source: <a href="${esc(r.sources[0])}" rel="noopener nofollow">${esc(host(r.sources[0]))}</a></span></li>`;
  const temp = CLOSED.filter((r) => r.status === 'temporarily-closed' || r.status === 'closed');
  const body = `${head({ h1: 'Recently closed Honolulu restaurants', intro: 'Restaurants we have confirmed as permanently closed, with the date and a source, so you don’t make a wasted trip. They are no longer listed elsewhere in the guide.', crumbItems: [['/', 'Home'], ['/closed/', 'Closed']] })}
<div class="wrap">${groups.map(([t, f]) => { const l = sorted.filter(f); return l.length ? `<section class="sec"><h2>${t}</h2><ul class="closed-list">${l.map(row).join('')}</ul></section>` : ''; }).join('')}
${temp.length ? `<section class="sec"><h2>Temporarily closed or unconfirmed</h2><ul class="closed-list">${temp.map((r) => `<li><a href="${r.url}"><strong>${esc(r.name)}</strong></a> <span class="muted">· ${esc(HOODS[r.neighborhood].name)}${r.status === 'temporarily-closed' ? ' · temporarily closed' : ' · reported closed, not yet confirmed'}</span></li>`).join('')}</ul></section>` : ''}
<p class="small muted">Know of a closure or reopening? <a href="/contact/">Tell us</a>.</p></div>`;
  page('/closed/', { title: T('Recently Closed Restaurants in Honolulu'), description: namesDesc('Honolulu restaurants confirmed permanently closed, with dates and sources: ', sorted), body, jsonld: [crumbLd([['/', 'Home'], ['/closed/', 'Closed']])], sitemapTitle: 'Recently closed' });
}

function haleAina() {
  const eds = [...(HALE.editions || [])].sort((a, b) => b.year - a.year);
  const link = (w) => { const r = findWinner(w); return r ? `<a href="${r.url}">${esc(w.name)}</a>${r.status !== 'open' ? ' <span class="muted small">(closed)</span>' : ''}` : esc(w.name); };
  const body = `${head({ h1: 'Hale ʻAina Awards', intro: 'Results of Honolulu Magazine’s annual Hale ʻAina restaurant awards, voted by readers. Winners link to their pages here.', photoTopic: 'fine-dining', crumbItems: [['/', 'Home'], ['/hale-aina-awards/', 'Hale ʻAina Awards']] })}
<div class="wrap">${eds.map((ed) => `<section class="sec"><h2>${ed.year} winners</h2>${ed.notes ? `<p class="muted small">${esc(ed.notes)}</p>` : ''}
<div class="aw-grid">${ed.categories.map((c) => `<div class="box"><h3>${esc(c.category)}</h3><ol class="aw-list">${c.winners.map((w) => `<li><span class="rank rank-${esc((w.rank || '').toLowerCase())}">${esc(w.rank || '')}</span> ${link(w)}</li>`).join('')}</ol></div>`).join('')}</div>
${ed.source ? `<p class="small">Source: <a href="${esc(ed.source)}" rel="noopener">Honolulu Magazine</a>. Some categories are not shown here.</p>` : ''}</section>`).join('')}
<p class="small muted">The Hale ʻAina Awards are run by Honolulu Magazine. This page is not affiliated with Honolulu Magazine.</p></div>`;
  page('/hale-aina-awards/', { title: T('Hale ʻAina Awards 2026 – Winners List'), description: 'Hale ʻAina Award winners by category for 2026 and 2025, linked to restaurant pages with hours and maps.', body, jsonld: [crumbLd([['/', 'Home'], ['/hale-aina-awards/', 'Hale ʻAina Awards']])], sitemapTitle: 'Hale ʻAina Awards' });
}

function guides() {
  for (const g of GUIDES) {
    let list;
    if (g.anchor) {
      const a = ANCHORS[g.anchor];
      list = OPEN.map((r) => ({ r, d: miles(a, r) })).filter((x) => x.d <= g.radius).sort((x, y) => x.d - y.d).map((x) => x.r);
    } else list = ranked(OPEN.filter((r) => r.price === 1));
    const a = g.anchor && ANCHORS[g.anchor];
    const body = `${head({ kicker: 'Guide', h1: esc(g.h1), intro: esc(g.intro), photoTopic: g.photo, crumbItems: [['/', 'Home'], ['/guides/', 'Guides'], [g.path, g.h1]] })}
<div class="wrap">
${sponsorSlot(a ? (r) => miles(a, r) <= g.radius : (r) => r.price === 1, a ? 'near here' : 'under $15')}
${grid(list, (r) => ({ note: a ? `${miles(a, r).toFixed(1)} mi from ${a.short || a.name.split(' (')[0].replace('Daniel K. Inouye International Airport', 'the airport')}${g.walk ? ` · about ${walkMin(miles(a, r))} min walk` : ''}` : `${PRICE_LABEL[r.price]} per person` }))}
${a ? `<p class="small muted">Distances are straight-line from ${esc(a.name)}. ${a.from ? 'The starting point uses the coordinates of a listed restaurant in that building. ' : ''}Restaurant coordinates are approximate (about 100 m), and places without coordinates are not included.</p>` : ''}
${tips(g.tips)}
</div>`;
    page(g.path, { title: T(g.title), description: namesDesc(`${g.title}: `, list, 'Distances, hours and maps.'), body, jsonld: [crumbLd([['/', 'Home'], ['/guides/', 'Guides'], [g.path, g.h1]]), itemListLd(list)], group: 'Guides', sitemapTitle: g.title });
  }
}

// ---------- tools: public data file, meal planner, near-my-hotel finder, map ----------
// Groups used by the meal planner. Only groups with at least one open restaurant are shown.
const CRAVINGS = [
  ['local', 'Hawaiian & local', ['hawaiian', 'local-plate-lunch', 'poke', 'filipino']],
  ['seafood', 'Seafood & sushi', ['seafood', 'sushi', 'poke']],
  ['japanese', 'Japanese & ramen', ['japanese', 'ramen', 'udon-noodles', 'izakaya']],
  ['korean', 'Korean', ['korean']],
  ['chinese', 'Chinese & dim sum', ['chinese', 'dim-sum']],
  ['seasia', 'Thai & Vietnamese', ['thai', 'vietnamese']],
  ['steak', 'Steak & fine dining', ['steakhouse', 'fine-dining', 'hawaii-regional', 'french', 'pacific-rim']],
  ['italian', 'Italian & pizza', ['italian', 'pizza']],
  ['american', 'Burgers & American', ['american', 'burgers']],
  ['mexican', 'Tacos & Mexican', ['mexican']],
  ['med', 'Mediterranean & Indian', ['mediterranean', 'turkish', 'middle-eastern', 'indian']],
  ['breakfast', 'Breakfast & brunch', ['breakfast-brunch']],
  ['sweets', 'Sweets & coffee', ['bakery', 'shave-ice-dessert', 'coffee']],
  ['drinks', 'Drinks & pūpū', ['bar-pub', 'cocktail-bar', 'brewery']],
  ['plants', 'Vegan & farm-to-table', ['vegan-vegetarian', 'farm-to-table']],
];
const AREA_GROUPS = [
  ['waikiki', 'Waikīkī, Kapahulu & Diamond Head', ['waikiki', 'kapahulu', 'diamond-head']],
  ['midtown', 'Ala Moana, Kakaʻako & Mōʻiliʻili', ['ala-moana', 'kakaako', 'ward', 'mccully', 'moiliili', 'makiki', 'manoa']],
  ['downtown', 'Chinatown, Downtown, Kalihi & airport', ['downtown', 'chinatown', 'nuuanu', 'liliha', 'kalihi', 'airport', 'salt-lake']],
  ['east', 'Kaimukī, Kāhala & Hawaiʻi Kai', ['kaimuki', 'kahala', 'hawaii-kai']],
  ['windward', 'Kailua & the windward side', ['kailua', 'kaneohe', 'waimanalo']],
  ['north', 'North Shore & central Oʻahu', ['north-shore', 'wahiawa', 'mililani']],
  ['west', 'Pearl Harbor & the west side', ['aiea-pearl-city', 'waipahu', 'kapolei', 'ewa', 'waianae']],
];

function publicData() {
  const rec = (r) => ({
    slug: r.slug, name: r.name, url: SITE.url + r.url, path: r.url, status: r.status,
    neighborhood: r.neighborhood, neighborhood_name: HOODS[r.neighborhood].name, area: (AREA_GROUPS.find(([, , hs]) => hs.includes(r.neighborhood)) || [])[0] || null,
    address: r.address || null, lat: r.lat ?? null, lng: r.lng ?? null, geo_source: r.lat != null ? r.geo_source : null, geo_precision: r.lat != null ? r.geo_precision : null,
    phone: r.phone || null, website: r.website || null, instagram: r.instagram || null,
    cuisines: r.cuisines, cuisine_names: r.cuisines.map((c) => CUIS[c].name),
    price: r.price || null, price_label: PRICE_LABEL[r.price] || null,
    hours: r.hours || null, hours_source: r.hours ? (r.hours_source || null) : null, happy_hour: r.happy_hour || null,
    dishes: r.dishes, tags: r.tags, awards: r.awards.map(awardShort), summary: r.summary || null,
    sponsored: !!r.sponsored, verified: r.verified, confidence: r.confidence, sources: r.sources || [], w: Math.round(r.score * 10) / 10,
  });
  const data = {
    name: 'Restaurant Honolulu open data', url: SITE.url + '/restaurants.json', generated: TODAY,
    license: 'Facts may be reused with a link to the restaurant page on restauranthonolulu.com. Check the listed sources and the verified date before relying on any detail.',
    notes: ['Only open restaurants are included.', 'Hours are null when we could not confirm them.', 'Tags are null when unknown; null never means "no".', 'Coordinates are approximate (about 100 m); see geo_source.', 'No ratings or review counts are included.'],
    cuisines: Object.fromEntries(CUISINES.map((c) => [c.slug, c.name])),
    cravings: CRAVINGS.filter(([, , cs]) => OPEN.some((r) => r.cuisines.some((c) => cs.includes(c)))).map(([id, name, cuisines]) => ({ id, name, cuisines })),
    areas: AREA_GROUPS.map(([id, name, neighborhoods]) => ({ id, name, neighborhoods })),
    landmarks: Object.entries(ANCHORS).filter(([, a]) => a.lat != null).map(([id, a]) => ({ id, name: a.name, short: a.short || a.name.split(' (')[0], group: a.group || 'Around Oʻahu', lat: a.lat, lng: a.lng, geo_source: a.geo_source })),
    restaurants: OPEN.map(rec),
  };
  out.set('restaurants.json', JSON.stringify(data));
  out.set('ads.txt', `google.com, ${SITE.adsense.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
  return data;
}

const faqBlock = (qa) => `<section class="sec"><h2>Questions</h2><div class="narrow faq">${qa.map(([q, a]) => `<details open><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>`;
const faqLd = (qa) => ({ '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
const toolLd = (name, p, desc) => ({ '@type': 'WebApplication', name, url: SITE.url + p, applicationCategory: 'TravelApplication', operatingSystem: 'Any (web browser)', isAccessibleForFree: true, description: desc, offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url + '/' } });

function mealPlanner(data) {
  const p = '/meal-planner/';
  const chip = (name, v, t, type = 'checkbox') => `<label class="chip"><input type="${type}" name="${name}" value="${v}"><span>${esc(t)}</span></label>`;
  const qa = [
    ['How does the meal planner pick restaurants?', 'It keeps only places that fit your hard choices (craving, budget, area, diet and, if you ask, open now) and then ranks them by how well they fit the occasion, plus awards, track record and how complete our verified details are. Paid listings never change the order.'],
    ['Why does it say “not confirmed” for some details?', 'We only use facts with a source. If we have not confirmed hours, reservations, kid-friendliness or vegan options for a place, the planner treats that detail as unknown rather than guessing yes or no.'],
    ['What does “Make it an evening” do?', 'It takes the top dinner match and looks for a drinks stop and a dessert stop within about 1 km (0.6 mi), using approximate coordinates. If nothing listed is that close, it says so instead of sending you across town.'],
    ['Can I share my results?', 'Yes. Your choices are saved in the page address, so copying the link shares the same search.'],
  ];
  const ideas = [['/best/date-night/', 'Date night'], ['/beach-dining-waikiki/', 'Sunset by the water'], ['/guides/eats-under-15/', 'Cheap eats under $15'], ['/best/plate-lunch/', 'Plate lunch'], ['/best/kid-friendly/', 'Family-friendly'], ['/happy-hour-honolulu/', 'Happy hour'], ['/open-late/', 'Open late'], ['/brunch-honolulu/', 'Brunch']];
  const body = `${head({ kicker: 'Tool', h1: 'Build your perfect meal', intro: 'Tell us what you are craving, what you want to spend and where you are. We will suggest five places that fit, with a reason for each, and can plan drinks and dessert nearby.', photoTopic: 'group-dinner', crumbItems: [['/', 'Home'], [p, 'Meal planner']] })}
<div class="wrap">
<form class="tool-form" data-planner onsubmit="return false">
  <fieldset><legend>Craving <span class="muted small">(pick any)</span></legend><div class="chipset">${data.cravings.map((c) => chip('c', c.id, c.name)).join('')}</div></fieldset>
  <div class="tool-row">
    <label>Budget per person<select name="b"><option value="">Any</option>${[1, 2, 3, 4].map((x) => `<option value="${x}">Up to ${price$(x)} · ${PRICE_LABEL[x]}</option>`).join('')}</select></label>
    <label>Area<select name="a"><option value="">Anywhere on Oʻahu</option>${data.areas.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label>
    <label>When<select name="w"><option value="">Any time</option><option value="now">Open now</option><option value="tonight">Dinner tonight</option><option value="brunch">Weekend breakfast or brunch</option></select></label>
  </div>
  <fieldset><legend>Occasion</legend><div class="chipset">${chip('o', '', 'Any', 'radio').replace('type="radio"', 'type="radio" checked')}${[['date', 'Date night'], ['family', 'With kids'], ['group', 'Group of 6+'], ['quick', 'Quick & cheap'], ['view', 'Ocean view']].map(([v, t]) => chip('o', v, t, 'radio')).join('')}</div></fieldset>
  <div class="tool-row tool-row-checks">
    <label class="tog"><input type="checkbox" name="d" value="vegan"><span>Vegan options needed</span></label>
    <label class="tog"><input type="checkbox" name="e" value="1"><span>Make it an evening (drinks → dinner → dessert)</span></label>
  </div>
  <p class="tool-actions"><button class="btn" type="submit" data-go>Show my matches</button> <button class="linkbtn" type="reset" data-clear>Start over</button></p>
</form>
<div class="tool-out" data-out aria-live="polite"><noscript><p>The planner needs JavaScript. Try one of the lists below instead.</p></noscript></div>
<section class="sec"><h2>Or start from a list</h2>${chips(ideas)}</section>
<section class="sec prose narrow">
<h2>How to use the meal planner</h2>
<p>Pick one or more cravings, or leave them all empty to see the strongest matches across every cuisine. Set a budget if price matters: the $ signs follow the same scale as the rest of the site, from under $15 a person ($) to $60 and up ($$$$). Choose an area if you do not want to drive; Waikīkī, Kapahulu and Diamond Head are grouped together because they are walkable from most hotels.</p>
<p>The occasion changes the order, not the list. <strong>Date night</strong> favors reservable dinner rooms at $30 a person or more. <strong>With kids</strong> favors places we have confirmed as kid-friendly. <strong>Group of 6+</strong> favors places that take reservations and reminds you to book; it never claims a restaurant can seat a large party. <strong>Quick &amp; cheap</strong> favors $ places and walk-in counters. <strong>Ocean view</strong> favors places with a confirmed water view.</p>
<p><strong>Open now</strong> and <strong>dinner tonight</strong> use posted hours in Hawaiʻi time and only apply to places whose hours we have confirmed. Everything else stays in the results with a “hours not confirmed” note, so call ahead. Holiday hours vary.</p>
<h2>What the results show</h2>
<p>Each match lists the neighborhood, cuisine, price band and a short reason built from our records, such as an award, a known dish or a confirmed detail like walk-ins. You also get the date we last verified the listing and a link to the restaurant’s own website where we have one. Tap the name for hours, sources and similar places nearby.</p>
<p>“Make it an evening” builds a three-stop plan around the top dinner match: a drink or happy hour first, dinner, then shave ice, a bakery or dessert, all within about 1 km. Distances are straight-line estimates from approximate coordinates, so treat walking times as a rough guide.</p>
<h2>About the data</h2>
<p>The planner reads the same verified records as the restaurant pages, published as <a href="/restaurants.json">restaurants.json</a>. We do not use star ratings or review counts. If a detail is wrong, <a href="/contact/">tell us</a> and we will check it.</p>
</section>
${faqBlock(qa)}
</div>`;
  page(p, { title: T('Build Your Perfect Meal in Honolulu – Meal Planner'), description: 'Pick a craving, budget, area and occasion and get five Honolulu restaurants that fit, with reasons, verified dates and an optional drinks-dinner-dessert plan.', body, jsonld: [crumbLd([['/', 'Home'], [p, 'Meal planner']]), toolLd('Honolulu meal planner', p, 'Suggests Honolulu restaurants by craving, budget, area, occasion and hours.'), faqLd(qa)], group: 'Tools', sitemapTitle: 'Build your perfect meal', scripts: ['/assets/tools.js'] });
}

function nearHotel(data) {
  const p = '/near-my-hotel/';
  const groups = [...new Set(['Waikīkī', ...data.landmarks.map((l) => l.group)])];
  const waikiki = data.landmarks.filter((l) => l.group === 'Waikīkī');
  const nearest = (l, n) => OPEN.filter((r) => r.lat != null).map((r) => ({ r, d: miles(l, r) })).sort((a, b) => a.d - b.d).slice(0, n);
  const qa = [
    ['How are walking times worked out?', 'We measure the straight-line distance from your starting point to each restaurant and assume about 80 metres (260 feet) a minute. Real routes are longer, so treat the minutes as a minimum.'],
    ['My hotel is not on the list. What should I do?', 'Pick the closest landmark, or press “Use my location” on your phone. Hilton Hawaiian Village and the Hawaiʻi Convention Center are not listed yet because we have not verified their coordinates.'],
    ['Does the finder store my location?', 'No. If you allow location access, the distance calculation happens in your browser and nothing is sent to us.'],
    ['Why are some restaurants missing?', 'Only places with coordinates can be measured. A few listings do not have coordinates yet; you can still find them in the <a href="/restaurants/">directory</a>.'],
  ];
  const body = `${head({ kicker: 'Tool', h1: 'Restaurants near my hotel', intro: 'Choose your Waikīkī hotel or a landmark, or use your location, and see what is within walking distance, nearest first.', photoTopic: 'sunset', crumbItems: [['/', 'Home'], [p, 'Near my hotel']] })}
<div class="wrap">
<form class="tool-form" data-near onsubmit="return false">
  <div class="tool-row">
    <label>Starting point<select name="l">${groups.map((g) => `<optgroup label="${esc(g)}">${data.landmarks.filter((l) => l.group === g).map((l) => `<option value="${l.id}"${l.id === 'rhc' ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
    <label>Distance<select name="r"><option value="0.25">Within ¼ mile (about 5 min walk)</option><option value="0.5" selected>Within ½ mile (about 10 min)</option><option value="1">Within 1 mile (about 20 min)</option><option value="3">Within 3 miles (short ride)</option></select></label>
    <label>Cuisine<select name="c"><option value="">Any</option>${data.cravings.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
  </div>
  <p class="tool-actions"><button class="btn btn-o" type="button" data-geo>Use my location</button> <span class="small muted" data-geo-msg></span></p>
</form>
<div class="tool-out" data-out aria-live="polite"></div>
<section class="sec"><h2>Nearest places to each Waikīkī landmark</h2>
<p class="muted small">The five closest listed restaurants to each starting point, straight-line. The finder above lets you filter and widen the radius.</p>
<div class="two-col">${waikiki.map((l) => `<div class="box"><h3>${esc(l.name)}</h3><ol class="near-list">${nearest(l, 5).map(({ r, d }) => `<li><a href="${r.url}">${esc(r.name)}</a> <span class="muted small">${d.toFixed(2)} mi · about ${walkMin(d)} min walk · ${esc(cuisineNames(r))}</span></li>`).join('')}</ol></div>`).join('')}</div>
</section>
<section class="sec prose narrow">
<h2>How the finder works</h2>
<p>Waikīkī is compact: the beachfront from the Halekulani to the Kapahulu end is under two miles, and most hotels sit within a few blocks of Kalākaua or Kūhiō Avenue. That makes “what can I walk to?” the most useful question after a long flight or a beach day. Pick the landmark nearest your room, set how far you are willing to walk, and the list re-sorts instantly, nearest first, with an approximate walking time.</p>
<p>Waikīkī starting points use the location of a listed restaurant inside that hotel or shopping center, for example the Halekulani point is where House Without a Key sits. That keeps every point tied to a record on this site. Ala Moana Center, the airport, the cruise pier and Pearl Harbor are included for arrival days and excursions.</p>
<p>For a sit-down dinner, filter by cuisine and then open the restaurant page to check hours and whether it takes reservations. For a quick bite, try a radius of ¼ mile and look for $ places. Walk-in breakfast and ramen counters cluster along Kalākaua and Kūhiō avenues.</p>
<h2>Guides by landmark</h2>
<p>Prefer a list you can bookmark? See restaurants near <a href="/guides/near-royal-hawaiian-center/">Royal Hawaiian Center</a>, near <a href="/guides/near-halekulani-beach-walk/">the Halekulani and Waikīkī Beach Walk</a>, near <a href="/guides/near-kapiolani-park/">Kapiʻolani Park and the zoo</a>, around <a href="/guides/ala-moana-center/">Ala Moana Center</a>, and near <a href="/guides/near-honolulu-airport/">the airport</a>, <a href="/guides/near-cruise-pier/">the cruise pier</a> and <a href="/guides/near-pearl-harbor/">Pearl Harbor</a>.</p>
</section>
${faqBlock(qa)}
</div>`;
  page(p, { title: T('Restaurants Near My Hotel in Waikīkī – Walk Finder'), description: 'Pick your Waikīkī hotel or landmark, or use your location, to see Honolulu restaurants within walking distance, nearest first, with estimated walking times.', body, jsonld: [crumbLd([['/', 'Home'], [p, 'Near my hotel']]), toolLd('Waikīkī near-my-hotel restaurant finder', p, 'Lists Honolulu restaurants by straight-line distance from Waikīkī hotels, landmarks or your location.'), faqLd(qa)], group: 'Tools', sitemapTitle: 'Restaurants near my hotel', scripts: ['/assets/tools.js'] });
}

function mapPage(data) {
  const p = '/map/';
  const mapped = OPEN.filter((r) => r.lat != null);
  const unmapped = OPEN.filter((r) => r.lat == null);
  const qa = [
    ['Why does the map only load when I press the button?', 'The map tiles come from OpenStreetMap’s volunteer-run servers. Loading them only when you ask keeps this page fast and respects their usage policy.'],
    ['How accurate are the pins?', 'Pins are approximate, to roughly 100 metres, and their original source was not recorded. Use the Directions link on each restaurant page for exact navigation.'],
    ['Why are some restaurants not on the map?', 'We only pin places with coordinates. The ones without are listed below the map as “location not mapped”.'],
  ];
  const body = `${head({ kicker: 'Tool', h1: 'Honolulu restaurant map', intro: 'Every listed restaurant with known coordinates. Filter by cuisine or area; the list and the map stay in sync.', photoTopic: 'harbor', crumbItems: [['/', 'Home'], [p, 'Map']] })}
<div class="wrap">
<form class="tool-form" data-map-filters onsubmit="return false">
  <div class="tool-row">
    <label>Cuisine<select name="c"><option value="">Any</option>${data.cravings.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
    <label>Area<select name="a"><option value="">All of Oʻahu</option>${data.areas.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label>
  </div>
  <p class="tool-actions"><button class="btn" type="button" data-show-map>Show map</button> <button class="btn btn-o" type="button" data-geo>Sort by distance from me</button> <span class="small muted" data-geo-msg></span></p>
</form>
<div class="map-box" data-map hidden><div id="map" class="map" role="region" aria-label="Map of listed restaurants"></div></div>
<p class="small muted">Map data © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap contributors</a>. Pins are approximate.</p>
<ol class="map-list" data-map-list>${mapped.map((r) => `<li data-slug="${r.slug}" data-c="${r.cuisines.join(' ')}" data-a="${(AREA_GROUPS.find(([, , hs]) => hs.includes(r.neighborhood)) || [])[0] || ''}"><a href="${r.url}">${esc(r.name)}</a> <span class="muted small">${esc(HOODS[r.neighborhood].name)} · ${esc(cuisineNames(r))} · ${price$(r.price)}</span><span class="dist small"></span></li>`).join('')}</ol>
<p class="empty" data-map-empty hidden>Nothing matches those filters.</p>
${unmapped.length ? `<section class="sec"><h2>Location not mapped</h2><p class="small muted">Listed restaurants without coordinates yet.</p><ul class="cols">${unmapped.map((r) => `<li><a href="${r.url}">${esc(r.name)}</a> <span class="muted small">· ${esc(HOODS[r.neighborhood].name)}</span></li>`).join('')}</ul></section>` : ''}
<section class="sec prose narrow">
<h2>Using the map</h2>
<p>The list comes first so you can scan names quickly on a phone. Press <strong>Show map</strong> to load the interactive map; each pin opens a short card with a link to the restaurant page. The cuisine and area filters apply to both the pins and the list. <strong>Sort by distance from me</strong> asks your phone for its location, then orders the list nearest first. Your location never leaves your device.</p>
<p>Most pins cluster in Waikīkī, Kakaʻako, Chinatown and Kaimukī, the areas with the densest dining. North Shore, Kailua and west-side pins are useful for planning a day trip around a meal. Looking for something specific? The <a href="/meal-planner/">meal planner</a> suggests five places from your craving and budget, and the <a href="/near-my-hotel/">near-my-hotel finder</a> lists what is walkable from your Waikīkī hotel.</p>
</section>
${faqBlock(qa)}
</div>`;
  page(p, { title: T('Honolulu Restaurant Map – Waikīkī to the North Shore'), description: 'Interactive map of Honolulu and Oʻahu restaurants with cuisine and area filters, a nearest-first list, and links to hours, prices and sources for each place.', body, jsonld: [crumbLd([['/', 'Home'], [p, 'Map']]), itemListLd(mapped, 'Mapped Honolulu restaurants'), faqLd(qa)], group: 'Tools', sitemapTitle: 'Restaurant map', scripts: ['/assets/tools.js'] });
}

// ---------- hand-written pages from content.mjs ----------
function contentPages() {
  for (const pg of PAGES) {
    const ctx = { OPEN, CLOSED, BY_SLUG, grid, card, ranked, rich, photo, tips, chips, sponsorSlot, HOODS, CUIS, hoodUrl, cuisineUrl, bestUrl, BEST, GUIDES, NEIGHBORHOODS, CUISINES, PLANS, SEO_ADDON, PROMO, SITE, TODAY, esc, fmtDate, price$, head, crumbs, form, HALE_MATCH };
    const r = pg.render(ctx);
    page(pg.path, { title: pg.title, description: pg.description, body: r.body || r, jsonld: [...(r.jsonld || []), ...(pg.crumb ? [crumbLd([['/', 'Home'], [pg.path, pg.crumb]])] : [])], noindex: pg.noindex, group: pg.group, sitemapTitle: pg.sitemapTitle, ogImage: pg.ogImage });
  }
}

// Inquiry forms: FormSubmit AJAX (see assets/app.js). The address is assembled at
// runtime from data-a/data-b, so no email address appears in the HTML.
function form({ subject, fields, button, extraHidden = '' }) {
  const kind = subject.replace(/\s*—\s*RestaurantHonolulu\.com$/i, '');
  const subj = `New lead — restauranthonolulu.com${kind && kind !== subject ? ` · ${kind}` : ''}`;
  return `<form class="form fs-lead" data-a="${SITE.formA}" data-b="${SITE.formB}" method="POST">
<input type="hidden" name="_subject" value="${esc(subj)}">
<input type="hidden" name="_captcha" value="false">
<input type="hidden" name="_template" value="table">
${extraHidden}
<input type="text" name="_honey" class="honey" tabindex="-1" autocomplete="off" aria-hidden="true">
${fields}
<button class="btn" type="submit">${esc(button)}</button>
<p class="fs-status small" role="status" aria-live="polite"></p>
</form>`;
}

// ---------- search index ----------
function searchIndex() {
  const idx = [];
  for (const r of OPEN) idx.push({ t: 'r', n: r.name, u: r.url, s: `${cuisineNames(r)} · ${HOODS[r.neighborhood].name} · ${price$(r.price)}`, k: fold([HOODS[r.neighborhood].name, r.cuisines.map((c) => CUIS[c].name + ' ' + (ALIASES[c] || []).join(' ')).join(' '), r.dishes.join(' ')].join(' ')), w: r.score, ...(r.sponsored ? { sp: 1 } : {}) });
  for (const r of CLOSED) idx.push({ t: 'x', n: r.name, u: r.url, s: `Closed${r.closed_date ? ' ' + fmtDate(r.closed_date) : ''} · ${HOODS[r.neighborhood].name}`, k: '', w: -5 });
  for (const n of NEIGHBORHOODS) if (!n.parent && OPEN.some((r) => inHood(r, n))) idx.push({ t: 'n', n: n.name, u: hoodUrl(n.slug), s: 'Neighborhood', k: fold(n.slug), w: 3 });
  for (const c of CUISINES) if (OPEN.some((r) => r.cuisines.includes(c.slug))) idx.push({ t: 'c', n: c.name, u: cuisineUrl(c.slug), s: 'Cuisine', k: fold((ALIASES[c.slug] || []).join(' ')), w: 3 });
  for (const b of BEST) if (OPEN.some(b.match)) idx.push({ t: 'b', n: b.h1, u: bestUrl(b), s: 'Best of', k: fold(b.title), w: 2 });
  for (const g of GUIDES) idx.push({ t: 'g', n: g.h1, u: g.path, s: 'Guide', k: fold(g.title), w: 2 });
  for (const [n, u, k] of [['Happy hour', '/happy-hour-honolulu/', 'hh drinks deals pupus'], ['Open late', '/open-late/', 'late night midnight 24 hour'], ['New openings', '/new-openings/', 'new restaurants 2026'], ['Closed restaurants', '/closed/', 'closures closing'], ['Hale ʻAina Awards', '/hale-aina-awards/', 'awards winners honolulu magazine'], ['Build your perfect meal', '/meal-planner/', 'meal planner date night dinner ideas what to eat'], ['Restaurants near my hotel', '/near-my-hotel/', 'near me walking distance hotel waikiki'], ['Restaurant map', '/map/', 'map near me pins']]) idx.push({ t: 'p', n, u, s: 'Page', k, w: 2 });
  const dishes = new Map();
  for (const r of OPEN) for (const d of r.dishes) { const k = fold(d); if (!dishes.has(k)) dishes.set(k, d); }
  for (const [k, d] of dishes) idx.push({ t: 'd', n: d, u: `/restaurants/?q=${encodeURIComponent(d)}`, s: 'Dish', k, w: 0 });
  // Sponsored dropdown slots: paid listings with their target keywords (Pop-up Domination / Featured).
  const sponsors = OPEN.filter((r) => r.sponsored).map((r) => ({ n: r.name, u: r.url, s: `${cuisineNames(r)} · ${HOODS[r.neighborhood].name}`, k: fold([...(r.sponsor_keywords || []), ...r.cuisines.map((c) => CUIS[c].name), HOODS[r.neighborhood].name, ...r.dishes].join(' ')) }));
  out.set('search-index.json', JSON.stringify({ v: ASSETS_V, items: idx, sponsors }));
}

// ---------- sitemap, llms, assets ----------
function sitemaps() {
  const urls = [...new Set(sitemap.map((s) => s.p))].sort();
  out.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  const groups = {};
  for (const s of sitemap) (groups[s.group] ||= []).push(s);
  const body = `${head({ h1: 'Sitemap', crumbItems: [['/', 'Home'], ['/sitemap/', 'Sitemap']] })}<div class="wrap sitemap">${Object.entries(groups).map(([g, l]) => `<section class="sec"><h2>${esc(g)}</h2><ul class="cols">${l.sort((a, b) => a.title.localeCompare(b.title)).map((s) => `<li><a href="${s.p}">${esc(s.title)}</a></li>`).join('')}</ul></section>`).join('')}</div>`;
  const html = layout({ path: '/sitemap/', assetsV: ASSETS_V, title: T('Sitemap'), description: 'Every page on Restaurant Honolulu.', body });
  out.set('sitemap/index.html', html);
  out.set('sitemap.html', layout({ path: '/sitemap/', canonical: '/sitemap/', assetsV: ASSETS_V, title: T('Sitemap'), description: 'Every page on Restaurant Honolulu.', body }));
  out.set('llms.txt', `# Restaurant Honolulu
> Visitor-first guide to restaurants in Honolulu, Waikīkī and Oʻahu: a filterable directory with hours, prices, happy hours, awards and closures, generated from verified data.

- Directory: ${SITE.url}/restaurants/
- Search index (JSON): ${SITE.url}/search-index.json
- Recently closed (confirmed permanent closures, with sources; these have no restaurant pages): ${SITE.url}/closed/
- New openings: ${SITE.url}/new-openings/
- Hale ʻAina Awards: ${SITE.url}/hale-aina-awards/
- Publisher: Eye To Ad Media (https://www.eyetoad.com)
- Open data (JSON, open restaurants with sources and verification dates): ${SITE.url}/restaurants.json
- Tools: meal planner ${SITE.url}/meal-planner/ · near-my-hotel finder ${SITE.url}/near-my-hotel/ · map ${SITE.url}/map/
- Restaurant owners: ${SITE.url}/claim/ (free corrections) · ${SITE.url}/advertise/

## Data notes
- Every restaurant page shows a "Last verified" date and its sources. Hours are shown only when confirmed; otherwise the page says so.
- Coordinates are approximate (about 100 m); their original source is not recorded. Places without coordinates are not mapped.
- No ratings or review counts are published. Sponsored listings are labeled.

## Key pages
${sitemap.filter((s) => s.group !== 'Restaurants').map((s) => `- [${s.title}](${SITE.url}${s.p})`).join('\n')}
`);
}

// ---------- run ----------
for (const r of ALL) detail(r);
directory();
neighborhoods();
cuisines();
bestPages();
happyHour();
openLate();
newOpenings();
closedPage();
haleAina();
guides();
{ const data = publicData(); mealPlanner(data); nearHotel(data); mapPage(data); }
contentPages();
searchIndex();
sitemaps();
out.set('assets/site.css', fs.readFileSync(path.join(ROOT, 'src/assets/site.css'), 'utf8'));
out.set('assets/app.js', fs.readFileSync(path.join(ROOT, 'src/assets/app.js'), 'utf8'));
out.set('assets/tools.js', fs.readFileSync(path.join(ROOT, 'src/assets/tools.js'), 'utf8'));

// Guardrails: never show how many restaurants are listed; no unlabeled sponsors.
const COUNT_RE = /(?<![$\d.,])\b(?!(?:19|20)\d\d\b)\d[\d,]*\+?\s+(restaurants|places|spots|eateries|listings|picks|businesses)\b/i;
for (const [f, html] of out) {
  if (!f.endsWith('.html')) continue;
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  const m = text.match(COUNT_RE);
  if (m) errors.push(`${f}: looks like a restaurant count: "${m[0]}"`);
  if (/\{r:/.test(html)) errors.push(`${f}: unreplaced token`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// Write (or check) output; remove files from the previous build that are no longer generated.
const MANIFEST = path.join(ROOT, 'data/.generated.json');
const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : [];
const files = [...out.keys()].sort();
let diff = [];
for (const f of files) {
  const fp = path.join(ROOT, f);
  const cur = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : null;
  if (cur !== out.get(f)) { diff.push(f); if (!CHECK) { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, out.get(f)); } }
}
for (const f of prev) if (!out.has(f) && fs.existsSync(path.join(ROOT, f))) { diff.push(`- ${f}`); if (!CHECK) fs.rmSync(path.join(ROOT, f)); }
if (CHECK) {
  if (diff.length) { console.error(`Generated files are out of date (run npm run build):\n${diff.slice(0, 20).join('\n')}`); process.exit(1); }
  console.log('Build output is up to date.');
} else {
  fs.writeFileSync(MANIFEST, JSON.stringify(files, null, 0).replace(/","/g, '",\n"') + '\n');
  console.log(`Wrote ${diff.length} changed files (${OPEN.length} open, ${CLOSED.length} closed).`);
}
