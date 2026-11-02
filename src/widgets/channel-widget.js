// UI for the channel resolver on channel-attribution.astro. Concatenated after channel-logic.js
// into the page's single inline script. All DOM lookups are null-guarded.
(function () {
  var root = document.getElementById('ch-widget');
  var out = document.getElementById('ch-out');
  if (!root || !out || typeof classifyChannel !== 'function') return;

  var UTM = 'utm_source=newsletter&utm_medium=email&utm_campaign=launch&gclid=abc123';
  var PRESETS = {
    alice: { label: 'alice — API test persona (google.com + UTM + gclid)', verified: 'tests/api/revenue.spec.ts asserts alice → paidAds on Postgres and ClickHouse (revenue report)',
      row: { referrer_domain: 'google.com', url_query: UTM, utm_source: 'newsletter', utm_medium: 'email', hostname: 'example.test' } },
    bob: { label: 'bob — API test persona (t.co)', verified: 'tests/api/revenue.spec.ts asserts bob → organicSocial on both backends (revenue report)',
      row: { referrer_domain: 't.co', url_query: '', utm_source: null, utm_medium: null, hostname: 'example.test' } },
    carol: { label: 'carol — API test persona (no referrer, no query)', verified: 'tests/api/revenue.spec.ts asserts carol → direct on both backends (revenue report)',
      row: { referrer_domain: null, url_query: '', utm_source: null, utm_medium: null, hostname: 'example.test' } },
    seedCpc: { label: 'seed: google / cpc / brand_search (scripts/seed)', verified: null,
      row: { referrer_domain: 'google.com', url_query: null, utm_source: 'google', utm_medium: 'cpc', hostname: 'blog.example.com' } },
    seedEmail: { label: 'seed: newsletter / email, no referrer (scripts/seed)', verified: null,
      row: { referrer_domain: null, url_query: null, utm_source: 'newsletter', utm_medium: 'email', hostname: 'blog.example.com' } },
    seedPh: { label: 'seed: referral from producthunt.com (scripts/seed)', verified: null,
      row: { referrer_domain: 'producthunt.com', url_query: null, utm_source: null, utm_medium: null, hostname: 'blog.example.com' } },
    refQuery: { label: 'tracked: landing on /?ref=launch with no referrer', verified: null,
      row: { referrer_domain: null, url_query: 'ref=launch', utm_source: null, utm_medium: null, hostname: 'example.test' } },
    partner: { label: 'tracked: google.com with utm_medium=partner', verified: null,
      row: { referrer_domain: 'google.com', url_query: 'utm_source=acme&utm_medium=partner', utm_source: 'acme', utm_medium: 'partner', hostname: 'example.test' } }
  };
  var FIELDS = ['referrer_domain', 'url_query', 'utm_source', 'utm_medium', 'hostname'];
  var VARIANTS = [
    ['chanPg', 'Channels report · Postgres', 'getChannelMetrics / getChannelExpandedMetrics'],
    ['chanCh', 'Channels report · ClickHouse', 'same files, clickhouseQuery'],
    ['revPg', 'Revenue report · Postgres', 'revenue/getRevenueMetrics.ts'],
    ['revCh', 'Revenue report · ClickHouse', 'revenue/getRevenueMetrics.ts']
  ];

  // Exact values live in state; inputs are read only when the user edits them.
  var state = { preset: 'alice', edited: false, row: Object.assign({}, PRESETS.alice.row) };

  function syncControls() {
    FIELDS.forEach(function (f) {
      var t = document.getElementById('ch-' + f);
      var n = document.getElementById('ch-' + f + '-null');
      var v = state.row[f];
      if (t) { t.value = v == null ? '' : v; t.disabled = v == null; }
      if (n) n.checked = v == null;
    });
    var sel = document.getElementById('ch-preset');
    if (sel) sel.value = state.preset;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    var results = VARIANTS.map(function (v) { return [v, classifyChannel(state.row, v[0])]; });
    out.textContent = '';
    var grid = el('div', 'chgrid');
    results.forEach(function (pair) {
      var v = pair[0], r = pair[1];
      var card = el('div', 'chcard');
      card.setAttribute('data-variant', v[0]);
      card.setAttribute('data-channel', r.channel);
      card.appendChild(el('div', 'chname', v[1]));
      card.appendChild(el('div', 'chfile', v[2]));
      card.appendChild(el('div', 'chval', r.channel));
      card.appendChild(el('div', 'chwhy', (r.branch ? 'WHEN #' + r.branch + ': ' : '') + r.why));
      card.appendChild(el('div', 'chpre', 'prefix = ' + r.prefix));
      var trace = el('div', 'chtrace');
      r.evals.forEach(function (e, i) {
        if (r.branch && i + 1 > r.branch) {
          // CASE stops at the first true WHEN; later branches are never evaluated.
          var skip = el('span', 'tb tb-x', (i + 1) + '–');
          skip.title = 'not reached';
          trace.appendChild(skip);
          return;
        }
        var s = el('span', 'tb ' + (e === true ? 'tb-t' : e === null ? 'tb-n' : 'tb-f'), (i + 1) + (e === true ? '✓' : e === null ? '?' : '✗'));
        s.title = e === true ? 'true' : e === null ? 'NULL (unknown) — branch skipped' : 'false';
        trace.appendChild(s);
      });
      card.appendChild(trace);
      grid.appendChild(card);
    });
    out.appendChild(grid);

    var names = results.map(function (p) { return p[1].channel; });
    var allSame = names.every(function (n) { return n === names[0]; });
    var verdict = el('div', 'verdict ' + (allSame ? 'ok' : 'stop'));
    verdict.id = 'ch-verdict';
    if (allSame) {
      verdict.textContent = 'All four copies agree: ' + names[0] + '.';
    } else {
      var parts = results.map(function (p) { return p[0][1] + ' → ' + p[1].channel; });
      verdict.textContent = 'The copies disagree. ' + parts.join(' · ') + '.';
    }
    out.appendChild(verdict);

    var p = PRESETS[state.preset];
    var note = el('div', 'chnote');
    if (p && p.verified && !state.edited) note.textContent = '✔ Verified value: ' + p.verified + '.';
    else if (state.edited) note.textContent = 'Edited row — outputs come from the ported CASE logic, not from a test assertion.';
    else note.textContent = 'Not asserted by a test: outputs come from the ported CASE logic.';
    out.appendChild(note);

    root.setAttribute('data-result', names.join('|'));
  }

  var sel = document.getElementById('ch-preset');
  if (sel) {
    sel.textContent = '';
    Object.keys(PRESETS).forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = PRESETS[k].label; sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      if (!PRESETS[sel.value]) return;
      state.preset = sel.value;
      state.edited = false;
      state.row = Object.assign({}, PRESETS[sel.value].row);
      syncControls();
      render();
    });
  }
  FIELDS.forEach(function (f) {
    var t = document.getElementById('ch-' + f);
    var n = document.getElementById('ch-' + f + '-null');
    if (t) t.addEventListener('input', function () { state.row[f] = t.value; state.edited = true; render(); });
    if (n) n.addEventListener('change', function () {
      state.row[f] = n.checked ? null : (t ? t.value : '');
      if (t) t.disabled = n.checked;
      state.edited = true;
      render();
    });
  });
  syncControls();
  render();
})();
