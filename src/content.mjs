// Hand-written pages. Restaurant mentions use {r:slug} tokens, which the build turns into links
// and refuses to build if the restaurant is missing or closed.

const T = (t) => `${t} | Restaurant Honolulu`;

const field = (label, name, { type = 'text', required = false, attrs = '' } = {}) =>
  `<label>${label}${required ? '' : ' <span class="muted small">(optional)</span>'}<input name="${name}" type="${type}"${required ? ' required' : ''} ${attrs}></label>`;
const area = (label, name, { required = false, rows = 4 } = {}) =>
  `<label>${label}${required ? '' : ' <span class="muted small">(optional)</span>'}<textarea name="${name}" rows="${rows}"${required ? ' required' : ''}></textarea></label>`;
const ownerFields = (extra = '') => `${field('Restaurant', 'restaurant', { required: true, attrs: 'data-prefill-name' })}
${field('Your name', 'name', { required: true })}
${field('Role', 'role', { attrs: 'placeholder="Owner, manager, marketing…"' })}
${field('Email', 'email', { type: 'email', required: true })}
${field('Phone', 'phone', { type: 'tel' })}
${extra}`;

const money = (n) => `$${n.toLocaleString('en-US')}`;

function promoBlock(c, { big = false } = {}) {
  const { PROMO } = c;
  const live = c.TODAY <= PROMO.ends;
  return `<div class="promo${big ? ' promo-big' : ''}" data-promo-ends="${PROMO.ends}">
<p class="kick">Pop-up Domination</p>
<p class="promo-price">${live ? `<s aria-label="Regular price ${money(PROMO.regular)}">${money(PROMO.regular)}</s> <strong>${money(PROMO.intro)}</strong>` : `<strong>${money(PROMO.regular)}</strong>`} <span class="muted">per category</span></p>
${live ? `<p class="promo-note" data-promo-live>Intro price for orders placed by ${PROMO.endsLabel}. Regular price ${money(PROMO.regular)} after that.</p>` : ''}
<p class="promo-note" data-promo-over hidden>Regular price ${money(PROMO.regular)} per category.</p>
</div>`;
}

export const PAGES = [
  // ------------------------------------------------------------------ home
  {
    path: '/', title: 'Best Restaurants in Honolulu & Waikīkī (2026) – Search, Hours & Happy Hours',
    description: 'Find a restaurant in Honolulu fast: search by dish, neighborhood or cuisine; filter by open now, happy hour, parking, kid-friendly, vegan and ocean view.',
    group: 'Pages', sitemapTitle: 'Home',
    render(c) {
      const { OPEN, CLOSED, ranked, grid, BEST, GUIDES, NEIGHBORHOODS, HOODS, hoodUrl, bestUrl, photo, esc, fmtDate, SITE } = c;
      const top = ranked(OPEN.filter((r) => r.awards.length && !r.sponsored)).slice(0, 6);
      const newest = OPEN.filter((r) => /^20(25|26)/.test(String(r.opened || '')) && r.confidence !== 'low').sort((a, b) => String(b.opened).localeCompare(String(a.opened))).slice(0, 4);
      const closed = CLOSED.filter((r) => String(r.closed_date || '').startsWith('2026')).sort((a, b) => String(b.closed_date).localeCompare(String(a.closed_date))).slice(0, 6);
      const bestTiles = ['plate-lunch', 'breakfast-waikiki', 'beach-dining', 'fine-dining', 'local-favorites', 'shave-ice', 'ramen', 'malasadas-bakeries'].map((s) => BEST.find((b) => b.slug === s)).filter((b) => OPEN.some(b.match));
      const hoodTiles = ['waikiki', 'kakaako', 'chinatown', 'kaimuki', 'kapahulu', 'ala-moana', 'kailua', 'north-shore'].map((s) => HOODS[s]).filter((n) => OPEN.some((r) => r.neighborhood === n.slug));
      const sponsored = OPEN.filter((r) => r.sponsored);
      return {
        body: `<section class="hero">
${photo('skyline', { cls: 'hero-img', eager: true })}
<div class="hero-in wrap">
  <h1>Where to eat in Honolulu</h1>
  <p class="lead">Search a dish, a neighborhood or a name. Real restaurants, current hours, no filler.</p>
  <form class="search search-hero" role="search" action="/restaurants/" method="get" data-search>
    <label class="sr" for="q-hero">Search restaurants</label>
    <input id="q-hero" name="q" type="search" placeholder="Try “poke”, “loco moco”, “Kaimukī”, “happy hour”" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="sugg-hero" aria-expanded="false">
    <button class="btn" type="submit">Search</button>
    <ul class="sugg" id="sugg-hero" role="listbox" hidden></ul>
  </form>
  <nav class="chips chips-hero" aria-label="Quick filters">
    <a href="/restaurants/?f=now">Open now</a><a href="/happy-hour-honolulu/">Happy hour</a><a href="/open-late/">Open late</a><a href="/poke-honolulu/">Poke</a><a href="/best/plate-lunch/">Plate lunch</a><a href="/breakfast-waikiki/">Breakfast in Waikīkī</a><a href="/guides/eats-under-15/">Under $15</a><a href="/restaurants/?f=ocean">Ocean view</a>
  </nav>
</div>
</section>
<div class="wrap">
<section class="sec">
  <div class="sec-h"><h2>Best of Honolulu</h2><a href="/best/">All lists →</a></div>
  <div class="ptiles">${bestTiles.map((b) => `<a class="ptile" href="${bestUrl(b)}">${photo(b.photo)}<span>${esc(b.h1)}</span></a>`).join('')}</div>
</section>
<section class="sec">
  <div class="sec-h"><h2>Neighborhoods</h2><a href="/neighborhoods/">All neighborhoods →</a></div>
  <div class="tiles">${hoodTiles.map((n) => `<a class="tile" href="${hoodUrl(n.slug)}"><strong>${esc(n.name)}</strong><span>${esc(n.blurb)}</span></a>`).join('')}</div>
</section>
${sponsored.length ? `<section class="sec"><div class="sec-h"><h2>Sponsored</h2><a href="/advertise/">Advertise →</a></div>${grid(sponsored)}</section>` : ''}
<section class="sec">
  <div class="sec-h"><h2>Award winners</h2><a href="/hale-aina-awards/">Hale ʻAina results →</a></div>
  ${grid(top)}
</section>
<section class="sec">
  <div class="sec-h"><h2>Visitor guides</h2><a href="/guides/">All guides →</a></div>
  <div class="tiles">${GUIDES.map((g) => `<a class="tile" href="${g.path}"><strong>${esc(g.h1)}</strong><span>${esc(g.intro.match(/^.*?[.!?](\s|$)/)[0].trim())}</span></a>`).join('')}</div>
</section>
<section class="sec two">
  <div><div class="sec-h"><h2>New openings</h2><a href="/new-openings/">More →</a></div>
  <ul class="mini">${newest.map((r) => `<li><a href="${r.url}">${esc(r.name)}</a><span>${esc(HOODS[r.neighborhood].name)} · opened ${fmtDate(r.opened)}</span></li>`).join('')}</ul></div>
  <div><div class="sec-h"><h2>Closed in 2026</h2><a href="/closed/">Tracker →</a></div>
  <ul class="mini">${closed.map((r) => `<li><a href="${r.url}">${esc(r.name)}</a><span>${esc(HOODS[r.neighborhood].name)} · ${fmtDate(r.closed_date)}</span></li>`).join('')}</ul></div>
</section>
</div>
<section class="band">
  <div class="wrap band-in">
    <div><p class="kick">Restaurant owners</p><h2>Claim your listing free. Then get found first.</h2>
    <p>Fix your hours and details at no cost. Upgrade to Verified, Featured or Premium, or take the top spot in every matching search with Pop-up Domination.</p>
    <p><a class="btn" href="/claim/">Claim your listing</a> <a class="btn btn-o-light" href="/advertise/">See plans</a></p></div>
    ${promoBlock(c)}
  </div>
</section>
<div class="wrap">
<section class="sec faq">
  <h2>Quick answers</h2>
  <details><summary>Where should a first-time visitor eat Hawaiian food?</summary><p>${c.rich('{r:helenas-hawaiian-food} in Kalihi (James Beard America’s Classic) or {r:highway-inn-kakaako}. Order kalua pig, laulau, lomi salmon and poi.')}</p></details>
  <details><summary>Where is the best poke near Waikīkī?</summary><p>${c.rich('{r:ono-seafood} on Kapahulu Ave is a short ride from Waikīkī. In Chinatown, {r:maguro-brothers-chinatown}. See <a href="/poke-honolulu/">all poke</a>.')}</p></details>
  <details><summary>Do I need reservations?</summary><p>${c.rich('For {r:la-mer-halekulani}, {r:orchids-halekulani}, {r:senia} and sunset tables, yes — often a week or more ahead. Plate lunch, poke and shave ice are walk-in. See the <a href="/guides/reservations/">reservations guide</a>.')}</p></details>
  <details><summary>What’s open late?</summary><p>See <a href="/open-late/">open late</a> for kitchens open after 10 pm, or use <a href="/restaurants/?f=now">open now</a>.</p></details>
</section>
</div>`,
        jsonld: [
          { '@type': 'WebSite', name: SITE.name, url: SITE.url + '/', potentialAction: { '@type': 'SearchAction', target: `${SITE.url}/restaurants/?q={search_term_string}`, 'query-input': 'required name=search_term_string' }, publisher: { '@type': 'Organization', name: 'Eye To Ad Media', url: 'https://www.eyetoad.com' } },
          { '@type': 'Organization', name: SITE.name, url: SITE.url + '/', logo: `${SITE.url}/images/restaurant-honolulu-logo.png`, telephone: '+18004818638' },
        ],
      };
    },
  },

  // ------------------------------------------------------------------ legacy overview pages
  {
    path: '/places-to-eat-honolulu/', title: T('Places to Eat in Honolulu – Quick Picks by Situation'), crumb: 'Places to eat',
    description: 'Where to eat in Honolulu for every situation: Hawaiian food, poke, plate lunch, dim sum, sunset dinner, shave ice, late night and cheap eats.',
    sitemapTitle: 'Places to eat in Honolulu',
    render(c) {
      const rows = [
        ['Hawaiian food', '{r:helenas-hawaiian-food}', '{r:highway-inn-kakaako}', '/hawaiian-food-honolulu/'],
        ['Poke', '{r:ono-seafood}', '{r:maguro-brothers-chinatown}', '/poke-honolulu/'],
        ['Plate lunch', '{r:rainbow-drive-in-kapahulu}', '{r:yamas-fish-market}', '/best/plate-lunch/'],
        ['Malasadas', '{r:leonards-bakery}', '{r:kamehameha-bakery}', '/best/malasadas-bakeries/'],
        ['Shave ice', '{r:waiola-shave-ice-kapahulu}', '{r:matsumoto-shave-ice}', '/best/shave-ice/'],
        ['Breakfast', '{r:koko-head-cafe}', '{r:cafe-kaila}', '/brunch-honolulu/'],
        ['Dim sum', '{r:legend-seafood-restaurant}', '{r:tim-ho-wan-waikiki}', '/best/dim-sum/'],
        ['Sunset drinks', '{r:house-without-a-key}', '{r:dukes-waikiki}', '/beach-dining-waikiki/'],
        ['Special occasion', '{r:la-mer-halekulani}', '{r:michels-at-the-colony-surf}', '/five-star-dining/'],
        ['Chef’s counter', '{r:senia}', '{r:mud-hen-water}', '/best/date-night/'],
        ['Cocktails', '{r:bar-leather-apron}', '{r:livestock-tavern}', '/cuisine/cocktail-bar/'],
        ['Cheap eats', '{r:musubi-cafe-iyasume-waikiki}', '{r:marugame-udon-waikiki}', '/guides/eats-under-15/'],
      ];
      return `${c.head({ h1: 'Places to eat in Honolulu', intro: 'Two picks for each craving, then the full list.', crumbItems: [['/', 'Home'], ['/places-to-eat-honolulu/', 'Places to eat']] })}
<div class="wrap"><div class="tbl-wrap"><table class="tbl picks"><thead><tr><th>Craving</th><th>Go to</th><th>Or</th><th></th></tr></thead><tbody>
${rows.map(([k, a, b, u]) => `<tr><th>${k}</th><td>${c.rich(a)}</td><td>${c.rich(b)}</td><td><a href="${u}">More →</a></td></tr>`).join('')}
</tbody></table></div>
${c.chips([['/restaurants/', 'Full directory'], ['/neighborhoods/', 'By neighborhood'], ['/cuisine/', 'By cuisine'], ['/best/', 'Best of']])}
</div>`;
    },
  },
  {
    path: '/oahu-restaurants/', title: T('Oʻahu Restaurants Outside Honolulu – North Shore, Kailua, Ko Olina'), crumb: 'Oʻahu restaurants',
    description: 'Where to eat around Oʻahu: North Shore shrimp trucks and shave ice, Kailua breakfast, Hawaiʻi Kai, Ko Olina and Pearl Harbor-area local food.',
    sitemapTitle: 'Oʻahu restaurants (island-wide)',
    render(c) {
      const { NEIGHBORHOODS, OPEN, ranked, grid, esc, hoodUrl } = c;
      const areas = [['north', 'North Shore', 'Haleʻiwa, Kahuku and Pūpūkea — about an hour from Waikīkī.'], ['windward', 'Windward side', 'Kailua, Kāneʻohe and Waimānalo — 25–40 minutes over the Pali or Likelike.'], ['east', 'East Honolulu', 'Hawaiʻi Kai, on the way to Hanauma Bay.'], ['central', 'Central Oʻahu & Pearl Harbor', 'ʻAiea, Pearl City, Wahiawā and Mililani.'], ['west', 'West Oʻahu', 'Waipahu, Kapolei and Ko Olina.']];
      return `${c.head({ h1: 'Eating around Oʻahu', intro: 'Outside town, by region. For Honolulu itself start with the <a href="/restaurants/">directory</a>.', photoTopic: 'beach', crumbItems: [['/', 'Home'], ['/oahu-restaurants/', 'Oʻahu restaurants']] })}
<div class="wrap">${areas.map(([a, t, d]) => {
        const hs = NEIGHBORHOODS.filter((n) => n.area === a).map((n) => n.slug);
        const l = ranked(OPEN.filter((r) => hs.includes(r.neighborhood)));
        return l.length ? `<section class="sec"><div class="sec-h"><h2>${t}</h2></div><p class="muted">${d}</p>${grid(l.slice(0, 9))}</section>` : '';
      }).join('')}</div>`;
    },
  },

  // ------------------------------------------------------------------ guides
  {
    path: '/guides/', title: T('Honolulu Dining Guides for Visitors'), crumb: 'Guides',
    description: 'Practical Honolulu dining guides: near the airport, cruise pier and Pearl Harbor, Ala Moana Center, eats under $15, plate lunch, reservations and a three-day eating plan.',
    sitemapTitle: 'Guides',
    render(c) {
      const { GUIDES, esc } = c;
      const more = [['/guides/how-to-eat-honolulu/', 'Three days of eating in Honolulu', 'A day-by-day plan with specific restaurants.'], ['/guides/plate-lunch/', 'What is a plate lunch?', 'What you get and where to order one.'], ['/guides/reservations/', 'Do you need reservations?', 'Which places book out and which are walk-in.'], ['/guides/menu-glossary/', 'Menu glossary', 'Poke, saimin, laulau, ahi, ono and other menu words explained.'], ['/hale-aina-awards/', 'Hale ʻAina Awards', 'This year’s winners, linked.'], ['/new-openings/', 'New openings', 'Opened in 2025–2026.'], ['/closed/', 'Closures tracker', 'What closed in 2026.']];
      return `${c.head({ h1: 'Guides', intro: 'Short, practical and specific.', crumbItems: [['/', 'Home'], ['/guides/', 'Guides']] })}
<div class="wrap"><div class="tiles">${GUIDES.map((g) => `<a class="tile" href="${g.path}"><strong>${esc(g.h1)}</strong><span>${esc(g.intro)}</span></a>`).join('')}${more.map(([u, t, d]) => `<a class="tile" href="${u}"><strong>${t}</strong><span>${d}</span></a>`).join('')}</div></div>`;
    },
  },
  {
    path: '/guides/how-to-eat-honolulu/', title: T('Three Days of Eating in Honolulu – A Day-by-Day Plan'), group: 'Guides',
    description: 'A three-day Honolulu eating plan with specific restaurants: Waikīkī and Kapahulu, Chinatown and Kalihi, Kaimukī, plus a North Shore day trip.',
    sitemapTitle: 'Three days of eating in Honolulu',
    render(c) {
      const day = (t, items) => `<section class="box day"><h2>${t}</h2><dl class="itin">${items.map(([k, v]) => `<dt>${k}</dt><dd>${c.rich(v)}</dd>`).join('')}</dl></section>`;
      return `${c.head({ kicker: 'Guide', h1: 'Three days of eating in Honolulu', intro: 'Each day stays in one part of town, so you’re not driving all day. Check hours on each page — several places close one or two days a week.', photoTopic: 'plate-lunch', crumbItems: [['/', 'Home'], ['/guides/', 'Guides'], ['/guides/how-to-eat-honolulu/', 'Three days']] })}
<div class="wrap narrow">
${day('Day 1 · Waikīkī & Kapahulu', [['Breakfast', '{r:liliha-bakery-waikiki-beach-walk} (coco puffs, griddle breakfasts) or musubi to go from {r:musubi-cafe-iyasume-waikiki}.'], ['Lunch', 'Poke from {r:ono-seafood}, then malasadas at {r:leonards-bakery} two blocks away.'], ['Afternoon', 'Shave ice at {r:waiola-shave-ice-kapahulu}.'], ['Sunset', 'A drink at {r:house-without-a-key} (book ahead) or {r:dukes-waikiki}.'], ['Dinner', '{r:hys-steak-house-waikiki} for a classic steak room, or udon at {r:marugame-udon-waikiki} if you want cheap and fast.']])}
${day('Day 2 · Chinatown, Downtown & Kalihi', [['Breakfast', 'Dim sum at {r:legend-seafood-restaurant} — go before 10 am on weekends.'], ['Lunch', 'Hawaiian food at {r:helenas-hawaiian-food} (closed weekends and Mondays — check hours), or plate lunch at {r:alicias-market}.'], ['Snack', 'Manjū and mochi at {r:nisshodo-candy-store}.'], ['Dinner', '{r:fete} or the tasting menu at {r:senia} (reserve).'], ['Late', 'Cocktails at {r:bar-leather-apron}.']])}
${day('Day 3 · Kaimukī & Kāhala', [['Brunch', '{r:koko-head-cafe} or {r:cafe-kaila} — expect a wait after 9 am.'], ['Lunch', 'Tonkatsu at {r:tonkatsu-tamafuji}.'], ['Dinner', '{r:mud-hen-water}, {r:the-pig-and-the-lady}, or {r:alan-wongs-kahala} for a big night.']])}
${day('Day trip · North Shore', [['On the way', 'Breakfast at {r:konos-haleiwa} in Haleʻiwa.'], ['Lunch', 'Garlic shrimp at {r:giovannis-shrimp-truck} in Kahuku.'], ['Afternoon', '{r:matsumoto-shave-ice}, then the farm café at {r:kahuku-farms-cafe}.']])}
</div>`;
    },
  },
  {
    path: '/guides/plate-lunch/', title: T('What Is a Plate Lunch? Where to Get One in Honolulu'), group: 'Guides',
    description: 'A Hawaiʻi plate lunch is two scoops rice, macaroni salad and a main. What to order and where to get one in Honolulu.',
    sitemapTitle: 'What is a plate lunch?',
    render(c) {
      const list = c.ranked(c.OPEN.filter((r) => r.cuisines.includes('local-plate-lunch')));
      return `${c.head({ kicker: 'Guide', h1: 'What is a plate lunch?', intro: 'Two scoops of white rice, one scoop of macaroni salad and a main, served in a takeout box. It came out of Hawaiʻi’s plantation-era lunch wagons.', photoTopic: 'plate-lunch', crumbItems: [['/', 'Home'], ['/guides/', 'Guides'], ['/guides/plate-lunch/', 'Plate lunch']] })}
<div class="wrap">
<div class="two-col">
<section class="box"><h2>What to order</h2><ul>
<li><strong>Loco moco</strong> — hamburger patty and fried egg on rice, covered in gravy.</li>
<li><strong>Chicken katsu</strong> — panko-fried chicken with katsu sauce.</li>
<li><strong>Kalua pig</strong> — smoky shredded pork, often with cabbage.</li>
<li><strong>Mixed plate</strong> — two or three mains on one plate.</li>
<li><strong>Mini plate</strong> — smaller portion, usually a few dollars less.</li>
</ul></section>
<section class="box"><h2>Where to start</h2><p>${c.rich('{r:rainbow-drive-in-kapahulu} near Waikīkī, {r:highway-inn-kakaako} for Hawaiian plates, and {r:yamas-fish-market} in Mōʻiliʻili.')}</p><p class="small muted">Most plate-lunch counters are walk-in, takeout-first and under $20.</p></section>
</div>
<h2>Plate lunch spots</h2>
${c.grid(list)}
</div>`;
    },
  },
  {
    path: '/guides/reservations/', title: T('Do You Need Reservations at Honolulu Restaurants?'), group: 'Guides',
    description: 'Which Honolulu restaurants need reservations, which take walk-ins, and how far ahead to book sunset and tasting-menu tables.',
    sitemapTitle: 'Do you need reservations?',
    render(c) {
      const need = c.ranked(c.OPEN.filter((r) => r.tags.reservations && r.price >= 3));
      const walk = c.ranked(c.OPEN.filter((r) => r.tags.walk_in && !r.tags.reservations));
      return `${c.head({ kicker: 'Guide', h1: 'Do you need reservations?', intro: 'Book ahead for tasting menus, hotel fine dining and sunset seatings. Plate lunch, poke, bakeries and shave ice are walk-in.', crumbItems: [['/', 'Home'], ['/guides/', 'Guides'], ['/guides/reservations/', 'Reservations']] })}
<div class="wrap">
${c.tips(['Sunset seatings at oceanfront rooms: book 1–2 weeks ahead, longer around holidays.', 'Most reservable restaurants use OpenTable, Resy or Tock; links are on each restaurant’s website.', 'Walk-in places get busiest noon–1 pm and 6–7:30 pm.'])}
<section class="sec"><h2>Book ahead</h2>${c.grid(need)}</section>
<section class="sec"><h2>Walk in</h2>${c.grid(walk)}</section>
</div>`;
    },
  },

  {
    path: '/guides/menu-glossary/', title: T('Honolulu Menu Glossary – Local Food Words Explained'), group: 'Guides',
    description: 'What poke, saimin, loco moco, manapua, laulau, haupia, li hing mui and Hawaiʻi fish names like ahi, ono and ʻōpakapaka mean on Honolulu menus.',
    sitemapTitle: 'Menu glossary',
    render(c) {
      const sec = (h, rows) => `<section class="box"><h2>${h}</h2><ul>${rows.map(([t, d]) => `<li><strong>${t}</strong> — ${d}</li>`).join('')}</ul></section>`;
      const qa = [
        ['What does “ono” mean on a menu?', 'It can mean two things. As a fish, ono is wahoo, a firm white fish often grilled or served in fish tacos. As a Hawaiian word, ʻono means delicious, so “ono grinds” is simply good food.'],
        ['What is the difference between poke and sashimi?', 'Sashimi is sliced raw fish served plain with soy sauce and wasabi on the side. Poke is raw fish cut into cubes and tossed with seasonings such as shoyu, sesame oil, onions, seaweed (limu) or roasted kukui nut (ʻinamona), and it is often served over rice as a poke bowl.'],
        ['What is a kamaʻāina discount?', 'Kamaʻāina means a long-time resident of Hawaiʻi. Some restaurants and attractions offer a kamaʻāina rate to residents who show a Hawaiʻi ID. Visitors pay the regular price.'],
      ];
      return {
        body: `${c.head({ kicker: 'Guide', h1: 'Honolulu menu glossary', intro: 'Local menus mix Hawaiian, Japanese, Chinese, Korean, Filipino and Portuguese words. Here is what the common ones mean, so you can order with confidence.', photoTopic: 'plate-lunch', crumbItems: [['/', 'Home'], ['/guides/', 'Guides'], ['/guides/menu-glossary/', 'Menu glossary']] })}
<div class="wrap">
<div class="two-col">
${sec('Everyday local food', [
  ['Plate lunch', 'two scoops of rice, a scoop of macaroni salad and a main. See <a href="/guides/plate-lunch/">what is a plate lunch</a>.'],
  ['Mixed plate', 'a plate lunch with two or three mains.'],
  ['Loco moco', 'rice topped with a hamburger patty, a fried egg and brown gravy. It was created on the Big Island and is now an all-day local staple.'],
  ['Spam musubi', 'a slice of grilled Spam on a block of rice, wrapped with nori. Sold everywhere from convenience stores to cafés.'],
  ['Saimin', 'a noodle soup in a light dashi-style broth, topped with green onion, fish cake and often char siu. It grew out of Hawaiʻi’s plantation era, when many cultures shared kitchens.'],
  ['Manapua', 'Hawaiʻi’s name for a large steamed or baked bun filled with char siu pork, similar to Chinese bao.'],
  ['Pūpū', 'appetizers or snacks, especially with drinks. A pūpū platter is a shared plate.'],
])}
${sec('Hawaiian dishes', [
  ['Kālua pig', 'pork traditionally cooked in an underground oven (imu) until smoky and tender, then shredded.'],
  ['Laulau', 'pork or fish wrapped in taro leaves (lūʻau) and ti leaves and steamed until soft.'],
  ['Lomi salmon', 'salted salmon mixed with tomato and onion, served cold as a side.'],
  ['Poi', 'cooked taro root pounded into a smooth paste. Mild and slightly sour; eat it alongside salty dishes.'],
  ['Squid lūʻau', 'taro leaves stewed with coconut milk and squid or octopus.'],
  ['Haupia', 'a firm coconut milk pudding, cut into squares. Also a popular pie and cake flavor.'],
])}
</div>
<div class="two-col">
${sec('Fish names', [
  ['Ahi', 'yellowfin or bigeye tuna. The most common fish for poke and seared dishes.'],
  ['Aku', 'skipjack tuna, stronger in flavor than ahi.'],
  ['Mahimahi', 'dolphinfish (not the mammal). Mild, flaky and often grilled or in sandwiches.'],
  ['Ono', 'wahoo. Firm and white; great grilled.'],
  ['ʻŌpakapaka', 'pink snapper, delicate and often steamed or pan-seared at nicer restaurants.'],
  ['Onaga', 'red snapper, prized for special occasions.'],
])}
${sec('Sweets, snacks and seasonings', [
  ['Shoyu', 'the local word for soy sauce. Shoyu chicken and shoyu poke are classics.'],
  ['Furikake', 'a Japanese seasoning of seaweed and sesame, sprinkled on rice, poke and even popcorn.'],
  ['Li hing mui', 'salty-sweet dried plum. The red powder is dusted on shave ice, candy, fruit and drink rims.'],
  ['Shave ice', 'ice shaved as fine as snow and soaked with syrups, often with ice cream or sweet azuki beans underneath. See <a href="/best/shave-ice/">shave ice</a>.'],
  ['Malasada', 'a Portuguese-style fried doughnut with no hole, rolled in sugar and sometimes filled. See <a href="/best/malasadas-bakeries/">malasadas and bakeries</a>.'],
  ['Poke', 'cubed, seasoned raw fish. See <a href="/poke-honolulu/">poke in Honolulu</a>.'],
])}
</div>
${c.tips(['“Two scoop rice” is the default; ask for brown rice or “mix plate” (half rice, half greens) if you want lighter.', 'Ordering “local style” usually means with rice and macaroni salad.', '“Broke da mouth” is local slang for very delicious.'])}
<section class="sec"><h2>Common questions</h2><div class="narrow faq">${qa.map(([q, a]) => `<details open><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>
<p class="small muted">Want to try the Hawaiian dishes above? Start with our <a href="/hawaiian-food-honolulu/">Hawaiian food</a> list.</p>
</div>`,
        jsonld: [
          { '@type': 'Article', headline: 'Honolulu menu glossary: local food words explained', datePublished: '2026-10-09', dateModified: '2026-10-09', author: { '@type': 'Organization', name: 'Restaurant Honolulu' }, publisher: { '@type': 'Organization', name: 'Eye To Ad Media' } },
          { '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
        ],
      };
    },
  },

  // ------------------------------------------------------------------ info pages
  {
    path: '/faq/', title: T('Honolulu Restaurant FAQ – Reservations, Cost, Tipping, Neighborhoods'), crumb: 'FAQ',
    description: 'Answers to common questions about eating in Honolulu: reservations, costs, tipping, what Hawaiian food to try, where locals eat and what’s open late.',
    sitemapTitle: 'FAQ',
    render(c) {
      const qa = [
        ['How much does a meal cost in Honolulu?', 'A plate lunch or poke bowl runs about $13–20. Casual sit-down is $25–50 a person before drinks; hotel fine dining is $150+ a person. Prices on each listing use $ (under $15) to $$$$ ($60+).'],
        ['How much should I tip?', 'Tipping works like the mainland: 18–22% at sit-down restaurants. Some places add a service charge — check the bill. Counter service tipping is optional.'],
        ['What Hawaiian food should I try?', 'Kalua pig, laulau, lomi salmon, poi, squid lūʻau and haupia. {r:helenas-hawaiian-food}, {r:highway-inn-kakaako} and {r:waiahole-poi-factory} are reliable places to try them.'],
        ['Where do locals eat?', 'Mostly outside Waikīkī: Kaimukī, Kapahulu, Kalihi, Chinatown and Mōʻiliʻili. See <a href="/hidden-gems/">local favorites</a>.'],
        ['Is Waikīkī food worth it?', 'Yes, if you pick well: {r:musubi-cafe-iyasume-waikiki} and {r:marugame-udon-waikiki} for cheap eats, {r:la-mer-halekulani} or {r:hys-steak-house-waikiki} for a big night. See <a href="/waikiki-restaurants/">Waikīkī restaurants</a>.'],
        ['Do I need reservations?', 'For fine dining and sunset tables, yes. See <a href="/guides/reservations/">the reservations guide</a>.'],
        ['What’s open late?', 'See <a href="/open-late/">open late</a>, or filter the <a href="/restaurants/?f=now">directory by open now</a>.'],
        ['How current is this information?', 'Every restaurant page shows a “Last verified” date and the sources we used. We track <a href="/closed/">closures</a> separately. <a href="/contact/">Tell us</a> if something has changed.'],
      ];
      return {
        body: `${c.head({ h1: 'Honolulu restaurant FAQ', crumbItems: [['/', 'Home'], ['/faq/', 'FAQ']] })}
<div class="wrap narrow faq">${qa.map(([q, a]) => `<details open><summary>${q}</summary><p>${c.rich(a)}</p></details>`).join('')}</div>`,
        jsonld: [{ '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: c.rich(a).replace(/<[^>]+>/g, '') } })) }],
      };
    },
  },
  {
    path: '/about/', title: T('About Restaurant Honolulu'), crumb: 'About',
    description: 'How Restaurant Honolulu verifies restaurant information, labels sponsored listings and handles corrections.',
    sitemapTitle: 'About',
    render(c) {
      return `${c.head({ h1: 'About Restaurant Honolulu', crumbItems: [['/', 'Home'], ['/about/', 'About']] })}
<div class="wrap narrow prose">
<p>Restaurant Honolulu is a guide for visitors and locals deciding where to eat on Oʻahu. It is published by <a href="https://www.eyetoad.com" rel="noopener">Eye To Ad Media</a> in Honolulu.</p>
<h2>How we verify</h2>
<ul>
<li>Every listing is checked against recent sources: the restaurant’s own site and social accounts, reservation platforms and local news.</li>
<li>Each restaurant page shows a <strong>Last verified</strong> date and its sources.</li>
<li>We only publish hours we could confirm. If we couldn’t, the page says so instead of guessing.</li>
<li>Closed restaurants move to the <a href="/closed/">closures tracker</a> with the date and a note.</li>
</ul>
<h2>Sponsored listings</h2>
<p>Restaurants can pay for placement. Paid placements are always labeled <span class="spon">Sponsored</span>. They never change the order of “Best of” lists, award listings or the directory itself. See <a href="/advertise/">advertising</a>.</p>
<h2>Corrections</h2>
<p>Spotted something wrong? <a href="/contact/">Send a correction</a>. Owners can <a href="/claim/">claim their page</a> for free.</p>
<h2>Photos</h2>
<p>Photos are free-license images from <a href="https://unsplash.com/?utm_source=restauranthonolulu&utm_medium=referral" rel="noopener">Unsplash</a>, credited on each image. They illustrate a dish or place type and are not photos of the specific restaurant unless the caption says so.</p>
</div>`;
    },
  },
  {
    path: '/contact/', title: T('Contact Restaurant Honolulu'), crumb: 'Contact',
    description: 'Send a correction, report a closure or ask about advertising on Restaurant Honolulu.',
    sitemapTitle: 'Contact',
    render(c) {
      return `${c.head({ h1: 'Contact', intro: `Corrections, closures, new openings or advertising. Advertising by phone: <a href="${c.SITE.phoneHref}">${c.SITE.phone}</a>.`, crumbItems: [['/', 'Home'], ['/contact/', 'Contact']] })}
<div class="wrap narrow">
${c.form({ subject: 'Message — RestaurantHonolulu.com', button: 'Send message', fields: `
<label>About<select name="topic"><option>Correction to a listing</option><option>Restaurant closed</option><option>New restaurant to add</option><option>Advertising</option><option>Something else</option></select></label>
${field('Restaurant (if any)', 'restaurant', { attrs: 'data-prefill-name' })}
${field('Your name', 'name', { required: true })}
${field('Email', 'email', { type: 'email', required: true })}
${area('Message', 'message', { required: true, rows: 5 })}` })}
<p class="small muted">Or <a class="eml" data-a="${c.SITE.formA}" data-b="${c.SITE.formB}" data-s="Message — restauranthonolulu.com" href="tel:+18004818638">email us</a>.</p>
</div>`;
    },
  },

  // ------------------------------------------------------------------ owners
  {
    path: '/advertise/', title: T('Advertise Your Restaurant in Honolulu – Claim, Verified, Featured & Premium'), crumb: 'Advertise',
    description: 'Claim your Honolulu restaurant listing free. Verified listings from $25/month, Featured and Premium placement, SEO add-on and Pop-up Domination top placement.',
    group: 'For owners', sitemapTitle: 'Advertise',
    render(c) {
      const { PLANS, SEO_ADDON, SITE, esc } = c;
      return `${c.head({ kicker: 'For restaurant owners', h1: 'Get your restaurant in front of hungry visitors', intro: `Start with a free claim. Upgrade when you want more. Questions: <a href="${SITE.phoneHref}">${SITE.phone}</a>.`, crumbItems: [['/', 'Home'], ['/advertise/', 'Advertise']] })}
<div class="wrap">
<section class="sec">
<div class="plans">${PLANS.map((p) => `<article class="plan${p.hi ? ' plan-hi' : ''}">${p.hi ? '<p class="kick">Most chosen</p>' : ''}<h2>${p.name}</h2><p class="plan-price">${p.price ? `$${p.price}<span>${p.per}</span>` : 'Free'}</p><ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><a class="btn${p.hi ? '' : ' btn-o'}" href="${p.id === 'claim' ? '/claim/' : `#apply`}" data-plan="${p.name}">${p.id === 'claim' ? 'Claim free' : `Choose ${p.name}`}</a></article>`).join('')}</div>
<p class="small muted">Month-to-month, cancel anytime. Paid placements are labeled Sponsored and never change editorial rankings.</p>
</section>

<section class="sec split-box">
  <div>
    <p class="kick">Top placement</p>
    <h2>Pop-up Domination</h2>
    <p>Be the first restaurant people see for your category — everywhere it shows up.</p>
    <ul class="checks">
      <li>Top spot on every matching cuisine, neighborhood and “Best of” page</li>
      <li>Sponsored slot in the search dropdown for your category’s keywords</li>
      <li>First card in matching directory searches</li>
      <li>One restaurant per category, so you don’t share the spot</li>
    </ul>
    <p><a class="btn" href="/advertise/pop-up-domination/">How it works</a></p>
  </div>
  ${promoBlock(c, { big: true })}
</section>

<section class="sec split-box" id="seo">
  <div>
    <p class="kick">Add-on</p>
    <h2>${SEO_ADDON.name}</h2>
    <p>Get found on Google and Maps as well as here. Add it to any plan.</p>
    <ul class="checks">${SEO_ADDON.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>
  <div class="promo"><p class="promo-price"><strong>$${SEO_ADDON.price}</strong><span class="muted">${SEO_ADDON.per}</span></p><p class="promo-note">Run by our Hawaiʻi SEO team at <a href="https://www.bigislandseo.com" rel="noopener">bigislandseo.com</a>.</p><a class="btn" href="#apply" data-plan="SEO add-on">Add SEO</a></div>
</section>

<section class="sec">
  <h2>Also available</h2>
  <div class="tiles">
    <div class="tile"><strong>Editorial feature · $150/mo</strong><span>A longer write-up with extra photos and its own shareable URL.</span></div>
    <div class="tile"><strong>Dedicated page · quote</strong><span>Your own landing page on this domain with schema, photos and a booking form. More at <a href="https://advertisingforrestaurant.com" rel="noopener">advertisingforrestaurant.com</a>.</span></div>
    <div class="tile"><strong>Not a restaurant?</strong><span>List any local business on <a href="https://usabusinesssearch.com" rel="noopener">usabusinesssearch.com</a>.</span></div>
  </div>
</section>

<section class="sec" id="apply">
  <h2>Get started</h2>
  <div class="two-col">
  ${c.form({ subject: 'Restaurant listing inquiry — RestaurantHonolulu.com', button: 'Send', fields: `${ownerFields()}
<label>Plan<select name="package" data-plan-select>${PLANS.filter((p) => p.price).map((p) => `<option>${p.name} $${p.price}/mo</option>`).join('')}<option>Pop-up Domination</option><option>SEO add-on</option><option>Editorial feature $150/mo</option><option>Dedicated page</option></select></label>
${area('Anything we should know?', 'message')}` })}
  <div class="box"><h3>What happens next</h3><ol><li>We reply within one business day.</li><li>We confirm your details and send an invoice.</li><li>Your listing goes live within two business days of payment.</li></ol><p>Prefer to call? <a href="${SITE.phoneHref}">${SITE.phone}</a></p></div>
  </div>
</section>
</div>`;
    },
  },
  {
    path: '/advertise/pop-up-domination/', title: T('Pop-up Domination – Top Placement for Honolulu Restaurants'), crumb: 'Pop-up Domination',
    description: 'Pop-up Domination puts one restaurant per category at the top of matching search results, cuisine and neighborhood pages, plus a sponsored slot in the search dropdown.',
    group: 'For owners', sitemapTitle: 'Pop-up Domination',
    render(c) {
      return `${c.head({ kicker: 'For restaurant owners', h1: 'Pop-up Domination', intro: 'One restaurant per category gets the top spot wherever that category appears on the site.', crumbItems: [['/', 'Home'], ['/advertise/', 'Advertise'], ['/advertise/pop-up-domination/', 'Pop-up Domination']] })}
<div class="wrap">
<section class="sec split-box">
  <div>
    <h2>What you get</h2>
    <ul class="checks">
      <li><strong>Search dropdown:</strong> a sponsored slot when someone types your category’s keywords (for example “tacos”, “poke”, “ramen”).</li>
      <li><strong>Category pages:</strong> top placement on the matching cuisine and “Best of” pages.</li>
      <li><strong>Neighborhood pages:</strong> top placement on your neighborhood’s page.</li>
      <li><strong>Directory:</strong> first card in matching filtered results.</li>
      <li><strong>Exclusive:</strong> one restaurant per category at a time.</li>
    </ul>
    <p class="small muted">Every placement is labeled Sponsored. No popups or interstitials — the name refers to showing up first in search.</p>
  </div>
  ${promoBlock(c, { big: true })}
</section>
<section class="sec" id="apply">
  <h2>Reserve your category</h2>
  ${c.form({ subject: 'Pop-up Domination — RestaurantHonolulu.com', button: 'Check my category', fields: `${ownerFields(field('Category you want', 'category', { required: true, attrs: 'placeholder="e.g. tacos, poke, sushi, Waikīkī breakfast"' }))}
<input type="hidden" name="package" value="Pop-up Domination">
${area('Anything we should know?', 'message')}` })}
  <p class="small muted">We’ll confirm whether your category is available. Categories are first come, first served.</p>
</section>
</div>`;
    },
  },
  {
    path: '/claim/', title: T('Claim Your Restaurant Listing – Free'), crumb: 'Claim your listing',
    description: 'Restaurant owners: claim your free listing on Restaurant Honolulu to correct hours, phone and details. Upgrades available.',
    group: 'For owners', sitemapTitle: 'Claim your listing',
    render(c) {
      return `${c.head({ kicker: 'For restaurant owners', h1: 'Claim your listing', intro: 'Free. Correct your hours, phone, address and details. We confirm you’re the owner or manager before changes go live.', crumbItems: [['/', 'Home'], ['/claim/', 'Claim your listing']] })}
<div class="wrap two-col">
${c.form({ subject: 'Listing claim — RestaurantHonolulu.com', button: 'Claim my listing', extraHidden: '<input type="hidden" name="listing_url" data-prefill-url>', fields: `${ownerFields()}
${area('What needs to change?', 'changes', { rows: 5 })}
<label class="tog"><input type="checkbox" name="interested_in_upgrade" value="yes"><span>Send me upgrade options (Verified, Featured, Premium)</span></label>` })}
<div>
  <div class="box"><h2>After you claim</h2><ol><li>We verify you by phone or email at the restaurant.</li><li>Your corrections go live, usually within one business day.</li><li>Your page gets an updated “Last verified” date.</li></ol></div>
  <div class="box"><h2>Want more?</h2><p><strong>Verified</strong> $25/mo · <strong>Featured</strong> $75/mo · <strong>Premium</strong> $150/mo with photos, menu and deals.</p><p><a href="/advertise/">Compare plans →</a></p></div>
  <p class="small muted">Not listed yet? Use this form too and we’ll add you. Other kinds of business: <a href="https://usabusinesssearch.com" rel="noopener">usabusinesssearch.com</a>.</p>
</div>
</div>`;
    },
  },
  {
    path: '/advertise/thanks/', title: T('Thank you'), noindex: true,
    description: 'Thanks — we’ll be in touch within one business day.',
    render(c) {
      return `${c.head({ h1: 'Mahalo — we got it', intro: `We’ll reply within one business day. Need us sooner? Call <a href="${c.SITE.phoneHref}">${c.SITE.phone}</a>.` })}
<div class="wrap"><p><a class="btn" href="/">Back to the guide</a></p></div>`;
    },
  },
  {
    path: '/404.html', title: T('Page not found'), noindex: true,
    description: 'Page not found.',
    render(c) {
      return `${c.head({ h1: 'That page isn’t here', intro: 'It may have moved. Search above, or start with the <a href="/restaurants/">directory</a>.' })}
<div class="wrap">${c.chips([['/restaurants/', 'All restaurants'], ['/neighborhoods/', 'Neighborhoods'], ['/best/', 'Best of'], ['/happy-hour-honolulu/', 'Happy hour'], ['/closed/', 'Closed restaurants']])}</div>`;
    },
  },
];
