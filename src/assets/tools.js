/* Restaurant Honolulu tools: meal planner, near-my-hotel finder, map. Reads /restaurants.json. No dependencies;
   the map loads the self-hosted Leaflet 1.9.4 and OpenStreetMap tiles only after the visitor presses "Show map". */
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var planner = $('[data-planner]'), near = $('[data-near]'), mapF = $('[data-map-filters]');
  if (!planner && !near && !mapF) return;

  var DATA = null, loading = null;
  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (!loading) loading = fetch('/restaurants.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) { DATA = d; return d; });
    return loading;
  }
  function fail(out) { out.innerHTML = '<p class="empty">Sorry, the restaurant data did not load. Please refresh, or browse the <a href="/restaurants/">directory</a>.</p>'; }

  // ---------- time (Hawaiʻi is UTC-10 all year) ----------
  function hst() { var d = new Date(Date.now() - 10 * 3600 * 1000); return { day: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
  function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function closeMin(r) { var o = toMin(r[0]), c = toMin(r[1]); return c <= o ? c + 1440 : c; }
  function openNow(h) {
    if (!h) return null;
    var n = hst(), today = h[DAYS[n.day]] || [], yest = h[DAYS[(n.day + 6) % 7]] || [], i;
    for (i = 0; i < yest.length; i++) if (closeMin(yest[i]) > 1440 && n.min < closeMin(yest[i]) - 1440) return true;
    for (i = 0; i < today.length; i++) if (n.min >= toMin(today[i][0]) && n.min < closeMin(today[i])) return true;
    return false;
  }
  function dinnerToday(h) { if (!h) return null; var t = h[DAYS[hst().day]] || []; return t.some(function (r) { return closeMin(r) >= 20 * 60; }); }
  function weekendMorning(h) { if (!h) return null; return ['sat', 'sun'].some(function (d) { return (h[d] || []).some(function (r) { return toMin(r[0]) <= 10 * 60; }); }); }
  function fmtDate(s) { var p = String(s || '').split('-'); if (!p[1]) return p[0] || ''; return MONTHS[+p[1] - 1] + (p[2] ? ' ' + +p[2] + ',' : '') + ' ' + p[0]; }

  // ---------- geo ----------
  function miles(a, b) {
    if (a.lat == null || b.lat == null) return Infinity;
    var R = 3958.8, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.pow(Math.sin(dLng / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function walk(mi) { return Math.max(1, Math.round(mi * 1609.34 / 80)); }
  function geolocate(msg, cb) {
    if (!navigator.geolocation) { msg.textContent = 'Your browser does not share location.'; return; }
    msg.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(function (p) { msg.textContent = 'Using your location (not stored).'; cb({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      function () { msg.textContent = 'Location not available. Pick a starting point instead.'; }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  // ---------- shared helpers ----------
  function cravingOf(id) { return (DATA.cravings.filter(function (c) { return c.id === id; })[0] || { cuisines: [] }).cuisines; }
  function matchesCraving(r, ids) { if (!ids.length) return true; return ids.some(function (id) { return r.cuisines.some(function (c) { return cravingOf(id).indexOf(c) !== -1; }); }); }
  function inArea(r, id) { if (!id) return true; return r.area === id; }
  function price(p) { return p ? new Array(p + 1).join('$') : '—'; }
  function setParams(form, names) {
    var u = new URLSearchParams();
    names.forEach(function (n) {
      var els = $$('[name="' + n + '"]', form), vals = [];
      els.forEach(function (el) { if ((el.type === 'checkbox' || el.type === 'radio') ? el.checked : true) { if (el.value) vals.push(el.value); } });
      if (vals.length) u.set(n, vals.join(','));
    });
    var s = u.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }
  function readParams(form, names) {
    var q = new URLSearchParams(location.search), any = false;
    names.forEach(function (n) {
      if (!q.has(n)) return; any = true;
      var vals = q.get(n).split(',');
      $$('[name="' + n + '"]', form).forEach(function (el) {
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = vals.indexOf(el.value) !== -1;
        else el.value = vals[0];
      });
    });
    return any;
  }
  function resultCard(r, why, extra) {
    var site = r.website ? ' · <a href="' + esc(r.website) + '" rel="noopener nofollow">Official site</a>' : '';
    return '<article class="tool-card"><h3><a href="' + esc(r.path) + '">' + esc(r.name) + '</a>' + (r.sponsored ? ' <span class="spon">Sponsored</span>' : '') + '</h3>' +
      '<p class="small muted">' + esc(r.neighborhood_name) + ' · ' + esc(r.cuisine_names.join(' · ')) + ' · ' + price(r.price) + (extra ? ' · ' + extra : '') + '</p>' +
      (why ? '<p class="why">' + why + '</p>' : '') +
      '<p class="small muted">Last verified ' + esc(fmtDate(r.verified)) + site + '</p></article>';
  }

  // ---------- meal planner ----------
  if (planner) {
    var out = $('[data-out]');
    var NAMES = ['c', 'b', 'a', 'w', 'o', 'd', 'e'];
    var vals = function (n) { return $$('[name="' + n + '"]', planner).filter(function (el) { return el.checked; }).map(function (el) { return el.value; }); };
    var run = function () {
      load().then(function () {
        var crav = vals('c'), budget = +planner.b.value || 0, area = planner.a.value, when = planner.w.value, occ = (vals('o')[0] || ''), vegan = vals('d').length > 0, evening = vals('e').length > 0;
        setParams(planner, NAMES);
        var list = [];
        DATA.restaurants.forEach(function (r) {
          if (!matchesCraving(r, crav) || !inArea(r, area)) return;
          if (budget && r.price && r.price > budget) return;
          if (vegan && !(r.tags.vegan_options === true || r.cuisines.indexOf('vegan-vegetarian') !== -1)) return;
          var why = [], note = [], s = r.w || 0;
          if (when === 'now') { var o = openNow(r.hours); if (o !== true) return; why.push('open now'); }
          if (when === 'tonight') { var t = dinnerToday(r.hours); if (t === false) return; if (t === null) { s -= 2; note.push('hours not confirmed'); } else why.push('serving dinner tonight'); }
          if (when === 'brunch') { var b = r.cuisines.indexOf('breakfast-brunch') !== -1 || weekendMorning(r.hours); if (!b) { if (r.hours) return; s -= 3; note.push('hours not confirmed'); } else why.push('weekend mornings'); }
          if (occ === 'date') { if (r.price >= 3 && r.tags.reservations === true) { s += 4; why.push('takes reservations'); } else if (r.price >= 3) s += 1.5; else s -= 2; }
          if (occ === 'family') { if (r.tags.kid_friendly === true) { s += 4; why.push('kid-friendly (confirmed)'); } else note.push('kid-friendliness not confirmed'); }
          if (occ === 'group') { if (r.tags.reservations === true) { s += 3; why.push('takes reservations: book ahead for 6+'); } else note.push('call ahead about large groups'); }
          if (occ === 'quick') { if (r.price === 1) { s += 3; why.push('under $15'); } else if (r.price === 2) s += 1; else s -= 3; if (r.tags.walk_in === true) { s += 1.5; why.push('walk-ins'); } }
          if (occ === 'view') { if (r.tags.ocean_view === true) { s += 5; why.push('ocean view'); } else s -= 3; }
          if (vegan) why.push('vegan options');
          if (r.awards.length) why.unshift(r.awards[0]);
          if (r.dishes.length) why.push('known for ' + r.dishes.slice(0, 2).join(', '));
          if (r.confidence === 'low') s -= 2;
          list.push({ r: r, s: s, why: why, note: note });
        });
        list.sort(function (a, b) { return b.s - a.s || a.r.name.localeCompare(b.r.name); });
        // Labeled sponsored listings may sit on top but never push editorial picks out of the five.
        var top = list.slice(0, 5);
        if (!top.length) { out.innerHTML = '<p class="empty">Nothing fits all of those choices. Try removing the budget or area, or pick “Any time”.</p>'; return; }
        var html = '<h2 class="tool-h">Your matches</h2>' + top.map(function (x, i) {
          return resultCard(x.r, esc(x.why.slice(0, 4).join(' · ')) + (x.note.length ? ' <span class="muted">(' + esc(x.note.join('; ')) + ')</span>' : ''), i === 0 ? '<strong>Top match</strong>' : '');
        }).join('');
        if (list.length > 5) html += '<p class="small muted">More places fit; narrow your choices or browse the <a href="/restaurants/">directory</a>.</p>';
        if (evening) html += eveningPlan(top);
        out.innerHTML = html;
      }).catch(function () { fail(out); });
    };
    var eveningPlan = function (top) {
      var dinner = top.filter(function (x) { return x.r.lat != null; })[0];
      if (!dinner) return '<section class="evening"><h2 class="tool-h">Make it an evening</h2><p>We do not have a location for these matches yet, so we cannot plan nearby stops.</p></section>';
      var d = dinner.r, KM = 0.62;
      var pick = function (test) {
        return DATA.restaurants.filter(function (r) { return r.slug !== d.slug && r.lat != null && test(r) && miles(d, r) <= KM; })
          .sort(function (a, b) { return miles(d, a) - miles(d, b) || (b.w || 0) - (a.w || 0); })[0];
      };
      var drink = pick(function (r) { return !!r.happy_hour || r.cuisines.some(function (c) { return ['bar-pub', 'cocktail-bar', 'brewery'].indexOf(c) !== -1; }); });
      var sweet = pick(function (r) { return r.cuisines.some(function (c) { return ['shave-ice-dessert', 'bakery'].indexOf(c) !== -1; }); });
      var stop = function (label, r, why) {
        if (!r) return '<li><strong>' + label + ':</strong> <span class="muted">nothing listed within about 1 km of ' + esc(d.name) + '.</span></li>';
        var m = miles(d, r);
        return '<li><strong>' + label + ':</strong> <a href="' + esc(r.path) + '">' + esc(r.name) + '</a> <span class="small muted">' + (r === d ? '' : m.toFixed(2) + ' mi from dinner, about ' + walk(m) + ' min walk · ') + esc(why) + '</span></li>';
      };
      var hh = drink && drink.happy_hour ? 'happy hour listed (check days and times)' : 'bar with food';
      return '<section class="evening"><h2 class="tool-h">Make it an evening</h2><ol class="plan">' + stop('Drinks', drink, hh) + stop('Dinner', d, d.cuisine_names.join(' · ')) + stop('Dessert', sweet, sweet ? sweet.cuisine_names.join(' · ') : '') + '</ol><p class="small muted">Straight-line distances from approximate coordinates. Check each place’s hours before you go.</p></section>';
    };
    readParams(planner, NAMES);
    planner.addEventListener('submit', run);
    $('[data-go]', planner).addEventListener('click', run);
    $('[data-clear]', planner).addEventListener('click', function () { setTimeout(function () { history.replaceState(null, '', location.pathname); out.innerHTML = ''; }, 0); });
    if (location.search) run();
  }

  // ---------- near my hotel ----------
  if (near) {
    var nout = $('[data-out]'), here = null, gmsg = $('[data-geo-msg]', near);
    var nrun = function () {
      load().then(function () {
        var start = here || DATA.landmarks.filter(function (l) { return l.id === near.l.value; })[0];
        if (!start) return;
        var r = +near.r.value || 0.5, c = near.c.value;
        if (!here) setParams(near, ['l', 'r', 'c']);
        var list = DATA.restaurants.filter(function (x) { return x.lat != null && matchesCraving(x, c ? [c] : []); })
          .map(function (x) { return { x: x, d: miles(start, x) }; }).filter(function (o) { return o.d <= r; }).sort(function (a, b) { return a.d - b.d; });
        var label = here ? 'your location' : start.name;
        if (!list.length) { nout.innerHTML = '<p class="empty">Nothing listed within that distance of ' + esc(label) + '. Try a wider radius or another cuisine.</p>'; return; }
        nout.innerHTML = '<h2 class="tool-h">Nearest to ' + esc(label) + '</h2>' + list.slice(0, 20).map(function (o) {
          return resultCard(o.x, o.x.summary ? esc(o.x.summary) : '', '<strong>' + o.d.toFixed(2) + ' mi</strong> · about ' + walk(o.d) + ' min walk');
        }).join('') + (list.length > 20 ? '<p class="small muted">Showing the nearest 20. Narrow by cuisine to see others.</p>' : '') +
          '<p class="small muted">Straight-line distance; walking routes are longer. ' + (here ? '' : 'Starting point: ' + esc(start.geo_source) + '.') + '</p>';
      }).catch(function () { fail(nout); });
    };
    readParams(near, ['l', 'r', 'c']);
    near.addEventListener('change', function (e) { if (e.target.name === 'l') { here = null; gmsg.textContent = ''; } nrun(); });
    $('[data-geo]', near).addEventListener('click', function () { geolocate(gmsg, function (p) { here = p; nrun(); }); });
    nrun();
  }

  // ---------- map ----------
  if (mapF) {
    var items = $$('[data-map-list] li'), empty = $('[data-map-empty]'), gm = $('[data-geo-msg]', mapF), map = null, markers = {}, L = null;
    var visible = function (li) {
      var c = mapF.c.value, a = mapF.a.value;
      var okC = !c || li.getAttribute('data-c').split(' ').some(function (x) { return (DATA ? cravingOf(c) : []).indexOf(x) !== -1; });
      return okC && (!a || li.getAttribute('data-a') === a);
    };
    var apply = function () {
      load().then(function () {
        var shown = 0;
        items.forEach(function (li) { var ok = visible(li); li.hidden = !ok; if (ok) shown++; var m = markers[li.getAttribute('data-slug')]; if (m && map) { if (ok) m.addTo(map); else m.remove(); } });
        empty.hidden = shown > 0;
        setParams(mapF, ['c', 'a']);
      });
    };
    var loadLeaflet = function () {
      if (window.L) return Promise.resolve(window.L);
      return new Promise(function (res, rej) {
        var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/assets/vendor/leaflet-1.9.4/leaflet.css'; document.head.appendChild(css);
        var s = document.createElement('script'); s.src = '/assets/vendor/leaflet-1.9.4/leaflet.js'; s.onload = function () { res(window.L); }; s.onerror = rej; document.head.appendChild(s);
      });
    };
    var showMap = function () {
      var btn = $('[data-show-map]', mapF); btn.disabled = true; btn.textContent = 'Loading map…';
      Promise.all([load(), loadLeaflet()]).then(function (v) {
        L = v[1]; var box = $('[data-map]'); box.hidden = false;
        map = L.map('map', { scrollWheelZoom: false }).setView([21.33, -157.93], 10);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
        var pts = [];
        DATA.restaurants.forEach(function (r) {
          if (r.lat == null) return;
          var m = L.circleMarker([r.lat, r.lng], { radius: 7, color: '#0b4f5c', weight: 2, fillColor: r.sponsored ? '#e2603f' : '#13808a', fillOpacity: 0.85, keyboard: true, title: r.name });
          m.bindPopup('<strong><a href="' + esc(r.path) + '">' + esc(r.name) + '</a></strong><br>' + esc(r.neighborhood_name) + ' · ' + esc(r.cuisine_names.join(' · ')) + ' · ' + price(r.price) + '<br><span style="color:#667a7d">Approximate location</span>');
          markers[r.slug] = m; pts.push([r.lat, r.lng]);
        });
        if (pts.length) map.fitBounds(pts, { padding: [20, 20], maxZoom: 13 });
        btn.textContent = 'Map loaded'; window.__mapReady = true;
        apply();
      }).catch(function () { btn.disabled = false; btn.textContent = 'Show map'; $('[data-map]').hidden = true; gm.textContent = 'The map could not load. The list below still works.'; });
    };
    readParams(mapF, ['c', 'a']);
    mapF.addEventListener('change', apply);
    $('[data-show-map]', mapF).addEventListener('click', showMap);
    $('[data-geo]', mapF).addEventListener('click', function () {
      geolocate(gm, function (p) {
        load().then(function () {
          var by = {}; DATA.restaurants.forEach(function (r) { by[r.slug] = r; });
          var list = $('[data-map-list]');
          items.sort(function (a, b) { return miles(p, by[a.getAttribute('data-slug')]) - miles(p, by[b.getAttribute('data-slug')]); });
          items.forEach(function (li) { var d = miles(p, by[li.getAttribute('data-slug')]); $('.dist', li).textContent = ' · ' + d.toFixed(1) + ' mi'; list.appendChild(li); });
          if (map) { L.circleMarker([p.lat, p.lng], { radius: 8, color: '#e2603f', weight: 3, fillOpacity: 0.3 }).addTo(map).bindPopup('You are here'); map.setView([p.lat, p.lng], 14); }
        });
      });
    });
    if (location.search) apply();
  }
})();
