/* Restaurant Honolulu client script: search, filters, open-now, small UI. No dependencies. */
(function () {
  'use strict';
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var fold = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻ‘’'`]/g, '').toLowerCase(); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---------- time (Hawaiʻi has no DST: UTC-10) ----------
  function hst() { var d = new Date(Date.now() - 10 * 3600 * 1000); return { day: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), date: d.toISOString().slice(0, 10) }; }
  function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function closeMin(r) { var o = toMin(r[0]), c = toMin(r[1]); return c <= o ? c + 1440 : c; }
  function fmt(t) { var p = t.split(':'), h = +p[0], m = +p[1]; if (h === 24 || (h === 0 && m === 0)) return 'midnight'; if (h === 12 && !m) return 'noon'; var ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap : h + ' ' + ap; }
  function status(hours) {
    var n = hst(), today = hours[DAYS[n.day]] || [], yest = hours[DAYS[(n.day + 6) % 7]] || [], i, r;
    for (i = 0; i < yest.length; i++) { r = yest[i]; if (closeMin(r) > 1440 && n.min < closeMin(r) - 1440) return { open: true, until: r[1], left: closeMin(r) - 1440 - n.min }; }
    for (i = 0; i < today.length; i++) { r = today[i]; if (n.min >= toMin(r[0]) && n.min < closeMin(r)) return { open: true, until: r[1], left: closeMin(r) - n.min }; }
    for (i = 0; i < today.length; i++) { r = today[i]; if (toMin(r[0]) > n.min) return { open: false, next: 'Opens ' + fmt(r[0]) }; }
    for (var k = 1; k <= 7; k++) { var d = hours[DAYS[(n.day + k) % 7]] || []; if (d.length) return { open: false, next: k === 1 ? 'Opens tomorrow ' + fmt(d[0][0]) : 'Opens ' + DAYS[(n.day + k) % 7].replace(/^./, function (c) { return c.toUpperCase(); }) }; }
    return { open: false, next: '' };
  }
  function hoursOf(el) { try { return JSON.parse(el.getAttribute('data-hours')); } catch (e) { return null; } }

  function paintOpen() {
    $$('.open').forEach(function (el) {
      var src = el.hasAttribute('data-hours') ? el : el.closest('[data-hours]');
      var h = src && hoursOf(src);
      if (!h) { el.textContent = ''; return; }
      var s = status(h);
      el.className = el.className.replace(/\bis-(open|closed)\b/g, '').trim() + (s.open ? ' is-open' : ' is-closed');
      el.textContent = s.open ? (s.left <= 45 ? 'Closes soon · ' + fmt(s.until) : 'Open now · until ' + fmt(s.until)) : ('Closed' + (s.next ? ' · ' + s.next : ''));
    });
    var tbl = $('table.hours');
    if (tbl) { var tr = $('tr[data-day="' + DAYS[hst().day] + '"]', tbl); if (tr) tr.classList.add('today'); }
  }

  // ---------- menu ----------
  var mb = $('[data-menu]');
  if (mb) mb.addEventListener('click', function () { var nav = $('#nav'); var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o); });

  // ---------- search index ----------
  var IDX = null, loading = null;
  function loadIndex() {
    if (IDX) return Promise.resolve(IDX);
    if (!loading) loading = fetch('/search-index.json').then(function (r) { return r.json(); }).then(function (d) {
      d.items.forEach(function (it) { it._n = fold(it.n); it._all = it._n + ' ' + fold(it.s) + ' ' + (it.k || ''); });
      d.sponsors.forEach(function (s) { s._k = fold(s.n) + ' ' + s.k; });
      IDX = d; return d;
    });
    return loading;
  }
  var TYPE = { r: 'Restaurant', x: 'Closed', n: 'Area', c: 'Cuisine', b: 'Best of', g: 'Guide', p: 'Page', d: 'Dish' };
  function search(q, limit) {
    var toks = fold(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return { items: [], sponsor: null };
    var out = [];
    IDX.items.forEach(function (it) {
      var sc = 0;
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (it._all.indexOf(t) === -1) return;
        if (it._n.indexOf(t) === 0) sc += 10; else if (it._n.indexOf(' ' + t) !== -1) sc += 7; else if (it._n.indexOf(t) !== -1) sc += 4; else sc += 1;
      }
      if (it._n === toks.join(' ')) sc += 20;
      sc += { r: 2, n: 4, c: 4, b: 3, g: 3, p: 3, d: -6, x: -3 }[it.t] + (it.w || 0) * 0.15;
      out.push({ it: it, sc: sc });
    });
    out.sort(function (a, b) { return b.sc - a.sc; });
    // Sponsored slot: first paid listing whose keywords match a whole query word (prefix of 3+ chars).
    var sponsor = null;
    for (var j = 0; j < IDX.sponsors.length && !sponsor; j++) {
      var s = IDX.sponsors[j], words = s._k.split(/\s+/);
      if (toks.some(function (t) { return t.length >= 3 && words.some(function (w) { return w.indexOf(t) === 0; }); })) sponsor = s;
    }
    return { items: out.slice(0, limit).map(function (x) { return x.it; }), sponsor: sponsor };
  }

  $$('form[data-search]').forEach(function (form) {
    var input = $('input[type=search]', form), list = $('.sugg', form), sel = -1, last = '';
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); sel = -1; }
    function render() {
      var q = input.value.trim();
      if (q === last && !list.hidden) return; last = q;
      if (!q) { close(); return; }
      loadIndex().then(function () {
        if (input.value.trim() !== q) return;
        var r = search(q, 8), html = '';
        if (r.sponsor) r.items = r.items.filter(function (i) { return i.u !== r.sponsor.u; });
        if (r.sponsor) html += '<li class="sp" role="option"><a href="' + r.sponsor.u + '">' + esc(r.sponsor.n) + '<span>' + esc(r.sponsor.s) + '</span><em>Sponsored</em></a></li>';
        r.items.forEach(function (it) {
          html += '<li role="option"><a href="' + it.u + '">' + esc(it.n) + '<span>' + esc(it.s) + '</span><em>' + TYPE[it.t] + '</em></a></li>';
        });
        if (!r.items.length) html += '<li class="none">No matches. Try a dish, cuisine or neighborhood.</li>';
        html += '<li class="all" role="option"><a href="/restaurants/?q=' + encodeURIComponent(q) + '">See all results for “' + esc(q) + '”</a></li>';
        list.innerHTML = html; list.hidden = false; input.setAttribute('aria-expanded', 'true'); sel = -1;
      });
    }
    input.addEventListener('focus', loadIndex, { once: true });
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      var opts = $$('li[role=option]', list);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden || !opts.length) return; e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
        opts.forEach(function (o, i) { o.setAttribute('aria-selected', i === sel); });
        opts[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && sel >= 0 && opts[sel]) { e.preventDefault(); location.href = $('a', opts[sel]).href; }
      else if (e.key === 'Escape') close();
    });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) close(); });
  });

  // ---------- directory filters ----------
  var F = $('[data-filters]');
  if (F) {
    var cards = $$('[data-list] .rc'), empty = $('[data-empty]');
    var params = new URLSearchParams(location.search);
    F.q.value = params.get('q') || '';
    ['n', 'c', 'p'].forEach(function (k) { if (params.get(k)) F[k].value = params.get(k); });
    var fs = params.getAll('f').join(',').split(',');
    $$('input[name=f]', F).forEach(function (cb) { cb.checked = fs.indexOf(cb.value) !== -1; });
    var hq = $('.hdr input[type=search]'); if (hq && F.q.value) hq.value = F.q.value;

    var apply = function () {
      var toks = fold(F.q.value).split(/\s+/).filter(Boolean), n = F.n.value, c = F.c.value, p = F.p.value;
      var want = $$('input[name=f]:checked', F).map(function (x) { return x.value; });
      var shown = 0;
      cards.forEach(function (el) {
        var ok = (!n || el.dataset.n === n) && (!c || (' ' + el.dataset.c + ' ').indexOf(' ' + c + ' ') !== -1) && (!p || el.dataset.p === p);
        if (ok && toks.length) ok = toks.every(function (t) { return el.dataset.q.indexOf(t) !== -1; });
        if (ok) ok = want.every(function (f) {
          if (f === 'now') { var h = hoursOf(el); return !!h && status(h).open; }
          return (' ' + el.dataset.f + ' ').indexOf(' ' + f + ' ') !== -1;
        });
        el.hidden = !ok; if (ok) shown++;
      });
      empty.hidden = shown > 0;
      var u = new URLSearchParams();
      if (F.q.value.trim()) u.set('q', F.q.value.trim());
      ['n', 'c', 'p'].forEach(function (k) { if (F[k].value) u.set(k, F[k].value); });
      if (want.length) u.set('f', want.join(','));
      var s = u.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
    };
    F.addEventListener('input', apply); F.addEventListener('change', apply);
    $$('[data-reset]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); F.reset(); apply(); }); });
    apply();
  }

  // ---------- happy hour "now" ----------
  var hht = $('[data-hh-table]');
  if (hht) {
    var paintHH = function () {
      var n = hst(), only = $('[data-hh-now]').checked, any = false;
      $$('tr[data-hh]', hht).forEach(function (tr) {
        var h = JSON.parse(tr.getAttribute('data-hh'));
        var on = h.days.indexOf(DAYS[n.day]) !== -1 && n.min >= toMin(h.start) && n.min < closeMin([h.start, h.end]);
        tr.classList.toggle('hh-on', on); tr.hidden = only && !on; if (on) any = true;
      });
      $('[data-hh-empty]').hidden = !(only && !any);
    };
    $('[data-hh-now]').addEventListener('change', paintHH); paintHH();
  }

  // ---------- promo expiry (also handled at build time) ----------
  $$('[data-promo-ends]').forEach(function (el) {
    if (hst().date > el.getAttribute('data-promo-ends')) {
      var s = $('s', el); if (s) { var strong = $('strong', el); strong.textContent = s.textContent; s.remove(); }
      $$('[data-promo-live]', el).forEach(function (x) { x.hidden = true; });
      $$('[data-promo-over]', el).forEach(function (x) { x.hidden = false; });
    }
  });

  // ---------- forms: plan buttons, ?r= prefill ----------
  $$('[data-plan]').forEach(function (b) { b.addEventListener('click', function () { var s = $('[data-plan-select]'); if (!s) return; for (var i = 0; i < s.options.length; i++) if (s.options[i].text.indexOf(b.dataset.plan) === 0) s.selectedIndex = i; }); });
  var slug = new URLSearchParams(location.search).get('r');
  if (slug && /^[a-z0-9-]+$/.test(slug) && $('[data-prefill-name]')) {
    loadIndex().then(function (d) {
      var url = '/restaurants/' + slug + '/', it = d.items.filter(function (i) { return i.u === url; })[0];
      if (it) { $$('[data-prefill-name]').forEach(function (x) { if (!x.value) x.value = it.n; }); }
      $$('[data-prefill-url]').forEach(function (x) { x.value = 'https://restauranthonolulu.com' + url; });
    });
  }

  paintOpen();
  setInterval(paintOpen, 60000);
})();
