// Page shell: head, header with search, footer.
import { SITE } from './config.mjs';
import { esc } from './lib.mjs';

const NAV = [
  ['/restaurants/', 'Restaurants'],
  ['/neighborhoods/', 'Neighborhoods'],
  ['/best/', 'Best of'],
  ['/happy-hour-honolulu/', 'Happy hour'],
  ['/open-late/', 'Open late'],
  ['/guides/', 'Guides'],
];

export function layout({ path, title, description, body, jsonld = [], ogImage, noindex = false, canonical, assetsV, scripts = [] }) {
  const url = SITE.url + (canonical || path);
  const og = ogImage || `${SITE.url}/images/best-restaurants-honolulu.jpg`;
  const ld = jsonld.length ? `<script type="application/ld+json">${JSON.stringify(jsonld.length === 1 ? { '@context': 'https://schema.org', ...jsonld[0] } : { '@context': 'https://schema.org', '@graph': jsonld.map(({ ['@context']: _, ...x }) => x) }).replace(/</g, '\\u003c')}</script>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta name="google-site-verification" content="${SITE.gsv}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/images/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
<meta name="theme-color" content="#0b4f5c">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/assets/site.css?v=${assetsV}" as="style">
<link rel="stylesheet" href="/assets/site.css?v=${assetsV}">
<script src="/assets/app.js?v=${assetsV}" defer></script>
${scripts.map((s) => `<script src="${/^https:/.test(s) ? s : `${s}?v=${assetsV}`}" defer></script>`).join('\n')}
<meta name="google-adsense-account" content="${SITE.adsense}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsense}" crossorigin="anonymous"></script>
${ld}
${ga4()}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr">
  <div class="hdr-in">
    <a class="logo" href="/" aria-label="Restaurant Honolulu home"><img src="/images/logo.webp" width="132" height="88" alt="Restaurant Honolulu"></a>
    <form class="search" role="search" action="/restaurants/" method="get" data-search>
      <label class="sr" for="q-${esc(path).replace(/\W/g, '')}">Search restaurants, dishes, neighborhoods</label>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/></svg>
      <input id="q-${esc(path).replace(/\W/g, '')}" name="q" type="search" placeholder="Search poke, ramen, Kaimukī, Helena’s…" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="sugg" aria-expanded="false" role="combobox">
      <ul class="sugg" id="sugg" role="listbox" hidden></ul>
    </form>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" data-menu>Menu</button>
  </div>
  <nav class="nav" id="nav" aria-label="Primary">
    ${NAV.map(([h, t]) => `<a href="${h}"${path.startsWith(h) ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
    <a class="nav-own" href="/for-restaurant-owners/">For owners</a>
  </nav>
</header>
<main id="main">
${body}
</main>
${footer()}
</body>
</html>
`;
}

// GA4 + lead / phone / A-B events (same snippet as ga4tag.mjs). Kept in the layout so the
// daily GitHub Action rebuild doesn't strip the tag again.
const GA4_EVENTS = `<script>(function(){function s(n,p){try{gtag('event',n,p)}catch(e){}}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="tel:"]');if(a)s('phone_click',{phone_number:a.getAttribute('href').slice(4),link_text:(a.textContent||'').trim().slice(0,60)})},true);document.addEventListener('submit',function(e){var f=e.target;if(!f||f.getAttribute('role')==='search'||/search/i.test(f.id+' '+f.className+' '+(f.action||'')))return;var id=f.id||f.getAttribute('name')||f.className||'form';if(/estimat|calc/i.test(id+' '+(f.action||'')))s('estimator_use',{form_id:id});s('generate_lead',{form_id:id})},true);window.etAB=function(n,v){var k='etab_'+n,x;try{x=localStorage.getItem(k)}catch(e){}if(!x||v.indexOf(x)<0){x=v[Math.floor(Math.random()*v.length)];try{localStorage.setItem(k,x)}catch(e){}}s('ab_view',{experiment:n,variant:x});try{gtag('set','user_properties',{['ab_'+n]:x})}catch(e){}document.documentElement.setAttribute('data-ab-'+n,x);return x}})();</script>`;
function ga4() {
  if (!SITE.ga4) return '';
  return `<!-- GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.ga4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${SITE.ga4}');</script>
${GA4_EVENTS}`;
}

function footer() {
  return `<footer class="ftr">
  <div class="ftr-in">
    <div class="ftr-brand">
      <a href="/"><img src="/images/restaurant-honolulu-logo-reversed.webp" width="600" height="400" alt="Restaurant Honolulu" loading="lazy"></a>
      <p>Independent dining guide for Honolulu, Waikīkī and Oʻahu.</p>
      <p><a href="/about/">About</a> · <a href="/contact/">Contact</a> · <a href="/privacy/">Privacy</a></p>
    </div>
    <div>
      <h2>Explore</h2>
      <ul>
        <li><a href="/restaurants/">All restaurants</a></li>
        <li><a href="/meal-planner/">Build your perfect meal</a></li>
        <li><a href="/near-my-hotel/">Near my hotel</a></li>
        <li><a href="/map/">Restaurant map</a></li>
        <li><a href="/waikiki-restaurants/">Waikīkī restaurants</a></li>
        <li><a href="/hidden-gems/">Local favorites</a></li>
        <li><a href="/five-star-dining/">Fine dining</a></li>
        <li><a href="/hawaiian-food-honolulu/">Hawaiian food</a></li>
        <li><a href="/poke-honolulu/">Poke</a></li>
        <li><a href="/hale-aina-awards/">Hale ʻAina Awards</a></li>
        <li><a href="/new-openings/">New openings</a></li>
        <li><a href="/closed/">Recently closed</a></li>
      </ul>
    </div>
    <div>
      <h2>For restaurants</h2>
      <ul>
        <li><a href="/claim/">Claim your listing (free)</a></li>
        <li><a href="https://linkrestaurants.com/claim/" rel="nofollow">Claim &amp; Optimize (from $9.99/mo)</a></li>
        <li><a href="/for-restaurant-owners/">Get featured (from $29/mo)</a></li>
        <li><a href="/advertise/">Advertise on this site</a></li>
        <li><a href="https://advertisingforrestaurant.com" rel="nofollow noopener">Advertising For Restaurant (sister site)</a></li>
        <li><a href="https://www.bigislandseo.com" rel="nofollow noopener">Big Island SEO (sister site)</a></li>
        <li><a href="https://usabusinesssearch.com" rel="nofollow noopener">USA Business Search (our directory)</a></li>
        <li><a href="/sitemap/">HTML sitemap</a></li>
      </ul>
    </div>
    <div>
      <h2>Our Hawaii sister sites</h2>
      <ul>
        <li><a href="https://surflessonhonolulu.com" rel="nofollow noopener">Surf Lesson Honolulu</a></li>
        <li><a href="https://bestdivinghawaii.com" rel="nofollow noopener">Best Diving Hawaii</a></li>
        <li><a href="https://massageshonolulu.com" rel="nofollow noopener">Massages Honolulu</a></li>
        <li><a href="https://attractionsoahu.com" rel="nofollow noopener">Attractions Oahu</a></li>
      </ul>
      <p class="xpromo">Looking for any other local business? Try <a href="https://usabusinesssearch.com" rel="nofollow noopener">usabusinesssearch.com</a>.</p>
    </div>
  </div>
  <div class="legal">
    <span>© 2026 Restaurant Honolulu · Powered by <a href="https://www.eyetoad.com" rel="nofollow noopener">Eye To Ad Media</a></span>
    <span><a href="/privacy/">Privacy &amp; cookies</a> · <a href="/about/">How we verify</a></span>
  </div>
</footer>`;
}
