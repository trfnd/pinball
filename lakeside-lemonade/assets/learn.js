/* ---------------------------------------------------------------------------
 * learn.js — click-and-learn behaviors. Every binder is no-op-safe: it does
 * nothing on pages that lack its markup. See LEARN-COMPONENTS.md.
 *
 *   1. Annotated prompt   .annotated  (.ap-seg[data-ap] + .ap-notes li[data-ap])
 *   2. Tabs               .tabs       (.tab[data-tab] + .tab-panel[data-panel])
 *   3. Quiz               .quiz       (.quiz-opt[data-correct] + template.fb)
 *   4. Reveal             .reveal     (.reveal-btn + .reveal-body[hidden])
 *   5. Hotspot map        .hotspot-map(.hotspot[data-spot,data-x,data-y] + .hm-data)
 *   6. Finder             .finder     ([data-hit] / [data-miss] messages)
 *   7. Sorter             .sorter[data-choices="a:Label|b:Label"] (.sort-item[data-answer])
 *   8. Price calculator   #priceCalc  (Module 03 — numbers from the cost workbook)
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function keyActivate(el, fn) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
    });
  }

  // ── 1. Annotated prompt ──────────────────────────────────────────────────
  function bindAnnotated() {
    all('.annotated').forEach(function (box) {
      var callout = box.querySelector('.ap-callout');
      if (!callout) { callout = document.createElement('div'); callout.className = 'ap-callout'; box.appendChild(callout); }
      var notes = {};
      all('.ap-notes [data-ap]', box).forEach(function (li) { notes[li.dataset.ap] = li.innerHTML; });
      var segs = all('.ap-seg', box);
      function show(seg) {
        segs.forEach(function (s) { s.classList.toggle('active', s === seg); });
        callout.innerHTML = notes[seg.dataset.ap] || '';
      }
      segs.forEach(function (seg) {
        seg.setAttribute('tabindex', '0');
        seg.setAttribute('role', 'button');
        seg.addEventListener('click', function (e) { e.preventDefault(); show(seg); });
        keyActivate(seg, function () { show(seg); });
      });
    });
  }

  // ── 2. Tabs ──────────────────────────────────────────────────────────────
  function bindTabs() {
    all('.tabs').forEach(function (t) {
      var bar = t.querySelector('.tab-bar');
      if (!bar) return;
      var tabs = all('.tab', bar);
      var panels = Array.prototype.filter.call(t.children, function (c) { return c.classList.contains('tab-panel'); });
      function act(key) {
        tabs.forEach(function (b) {
          var on = b.dataset.tab === key;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(function (p) { p.classList.toggle('active', p.dataset.panel === key); });
      }
      tabs.forEach(function (b) {
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.addEventListener('click', function () { act(b.dataset.tab); });
      });
      var first = tabs.filter(function (b) { return b.classList.contains('active'); })[0] || tabs[0];
      if (first) act(first.dataset.tab);
    });
  }

  // ── 3. Quiz ──────────────────────────────────────────────────────────────
  function bindQuiz() {
    all('.quiz').forEach(function (q) {
      var fb = q.querySelector('.quiz-fb');
      if (!fb) { fb = document.createElement('div'); fb.className = 'quiz-fb'; q.appendChild(fb); }
      fb.setAttribute('role', 'status');
      fb.setAttribute('aria-live', 'polite');
      all('.quiz-opt', q).forEach(function (o) {
        o.type = 'button';
        o.addEventListener('click', function () {
          var right = o.dataset.correct === 'true';
          var tpl = o.querySelector('template.fb');
          var html = tpl ? tpl.innerHTML : (o.dataset.fb || '');
          o.classList.remove('right', 'wrong');
          void o.offsetWidth;
          o.classList.add(right ? 'right' : 'wrong');
          fb.className = 'quiz-fb ' + (right ? 'ok' : 'no');
          fb.innerHTML = (right ? '<b>Yes.</b> ' : '<b>Not quite.</b> ') + html;
          if (right) q.classList.add('solved');
        });
      });
    });
  }

  // ── 4. Reveal ────────────────────────────────────────────────────────────
  function bindReveal() {
    all('.reveal').forEach(function (r) {
      var btn = r.querySelector('.reveal-btn');
      var body = r.querySelector('.reveal-body');
      if (!btn || !body) return;
      btn.type = 'button';
      var label = btn.textContent;
      btn.addEventListener('click', function () {
        if (body.hasAttribute('hidden')) { body.removeAttribute('hidden'); btn.textContent = 'Hide'; }
        else { body.setAttribute('hidden', ''); btn.textContent = label; }
      });
    });
  }

  // ── 5. Hotspot map ───────────────────────────────────────────────────────
  function bindHotspots() {
    all('.hotspot-map').forEach(function (m) {
      var panel = m.querySelector('.hm-panel');
      var count = m.querySelector('.hm-count');
      var data = {};
      all('.hm-data [data-spot]', m).forEach(function (d) { data[d.dataset.spot] = d.innerHTML; });
      var spots = all('.hotspot', m);
      var seen = {};
      function upd() {
        if (count) count.textContent = 'Explored ' + Object.keys(seen).length + ' of ' + spots.length + ' corners';
      }
      function show(h) {
        spots.forEach(function (s) { s.classList.toggle('active', s === h); });
        h.classList.add('visited');
        seen[h.dataset.spot] = 1;
        if (panel) panel.innerHTML = data[h.dataset.spot] || '';
        upd();
      }
      spots.forEach(function (h) {
        h.type = 'button';
        if (h.dataset.x) h.style.left = h.dataset.x + '%';
        if (h.dataset.y) h.style.top = h.dataset.y + '%';
        if (!h.getAttribute('aria-label')) h.setAttribute('aria-label', 'Corner ' + h.dataset.spot);
        h.addEventListener('click', function () { show(h); });
      });
      upd();
    });
  }

  // ── 6. Finder (hunt for planted problems) ────────────────────────────────
  function bindFinder() {
    all('.finder').forEach(function (f) {
      var hits = all('[data-hit]', f), misses = all('[data-miss]', f);
      var total = hits.length, found = 0;
      var bar = f.querySelector('.finder-bar');
      if (!bar) { bar = document.createElement('div'); bar.className = 'finder-bar'; f.appendChild(bar); }
      var status = f.querySelector('.finder-status');
      if (!status) { status = document.createElement('span'); status.className = 'finder-status'; bar.insertBefore(status, bar.firstChild); }
      var msg = f.querySelector('.finder-msg');
      if (!msg) { msg = document.createElement('div'); msg.className = 'finder-msg'; f.appendChild(msg); }
      msg.setAttribute('role', 'status');
      var done = f.querySelector('.finder-done');
      var showBtn = f.querySelector('.finder-show');
      function upd() { status.textContent = (f.dataset.label || 'Found') + ' ' + found + ' of ' + total; }
      function finish() { if (found === total && done) done.hidden = false; }
      function markHit(el, say) {
        if (!el.classList.contains('found')) { el.classList.add('found'); found++; upd(); }
        if (say) { msg.className = 'finder-msg hit'; msg.innerHTML = el.dataset.hit; }
        finish();
      }
      hits.forEach(function (el) {
        el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
        el.addEventListener('click', function () { markHit(el, true); });
        keyActivate(el, function () { markHit(el, true); });
      });
      misses.forEach(function (el) {
        el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
        function go() { el.classList.add('checked'); msg.className = 'finder-msg ok'; msg.innerHTML = el.dataset.miss; }
        el.addEventListener('click', go);
        keyActivate(el, go);
      });
      if (showBtn) {
        showBtn.type = 'button';
        showBtn.addEventListener('click', function () {
          hits.forEach(function (el) { markHit(el, false); });
          msg.className = 'finder-msg hit';
          msg.innerHTML = 'All the planted problems are now highlighted — click any of them to read why.';
        });
      }
      upd();
    });
  }

  // ── 7. Sorter ────────────────────────────────────────────────────────────
  function bindSorter() {
    all('.sorter').forEach(function (s) {
      var choices = (s.dataset.choices || '').split('|').map(function (p) {
        var i = p.indexOf(':');
        return { k: p.slice(0, i).trim(), l: p.slice(i + 1).trim() };
      }).filter(function (c) { return c.k; });
      var items = all('.sort-item', s);
      var status = s.querySelector('.sorter-status');
      if (!status) { status = document.createElement('p'); status.className = 'sorter-status'; s.appendChild(status); }
      var done = 0, agree = 0;
      function upd() {
        status.textContent = 'Sorted ' + done + ' of ' + items.length + (done ? ' · you matched our call on ' + agree : '');
      }
      function labelOf(k) { var c = choices.filter(function (x) { return x.k === k; })[0]; return c ? c.l : k; }
      items.forEach(function (it) {
        var box = it.querySelector('.sort-choices');
        if (!box) { box = document.createElement('div'); box.className = 'sort-choices'; it.appendChild(box); }
        var fb = it.querySelector('.sort-fb');
        if (!fb) { fb = document.createElement('p'); fb.className = 'sort-fb'; it.appendChild(fb); }
        var tpl = it.querySelector('template.fb');
        var why = tpl ? tpl.innerHTML : '';
        var answered = false;
        choices.forEach(function (c) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'sort-btn'; b.textContent = c.l; b.dataset.choice = c.k;
          b.addEventListener('click', function () {
            var right = c.k === it.dataset.answer;
            all('.sort-btn', box).forEach(function (x) {
              x.classList.remove('picked', 'right', 'wrong', 'answer');
              if (!right && x.dataset.choice === it.dataset.answer) x.classList.add('answer');
            });
            b.classList.add('picked', right ? 'right' : 'wrong');
            fb.innerHTML = (right ? '<b>Our call too.</b> ' : '<b>We’d say “' + labelOf(it.dataset.answer) + '”.</b> ') + why;
            if (!answered) { answered = true; done++; if (right) agree++; upd(); }
          });
          box.appendChild(b);
        });
      });
      upd();
    });
  }

  // ── 8. Price calculator (Module 03) ──────────────────────────────────────
  // Every number below comes from ingredient_and_supply_costs.xlsx and
  // competitor_beverage_pricing.xlsx (collected week of June 14, 2026).
  var D = {
    lemons: [
      { k: 'gl1', l: 'GreenLeaf — single ($0.79 each)', p: 0.79 },
      { k: 'gl8', l: 'GreenLeaf — bag of 8 ($5.49 → $0.69 each)', p: 0.68625 },
      { k: 'fm', l: 'Farmers Market — crate of 50 ($22 → $0.44) · Sat/Sun only', p: 0.44, weekend: true },
      { k: 'co', l: 'Costco — bag of ~24 ($9.99 → $0.42) · needs membership', p: 0.41625, costco: true, base: 0.68625 },
      { k: 'rs', l: 'Restaurant supply — case of 95 ($38 → $0.40)', p: 0.40 },
    ],
    per8: [
      { k: '0.5', l: '½ lemon per 8 oz (juicy lemons)' },
      { k: '0.625', l: '⅝ lemon per 8 oz (middle)' },
      { k: '0.75', l: '¾ lemon per 8 oz (what the yield notes say to plan for)' },
    ],
    sugar: [
      { k: 'gl4', l: 'GreenLeaf — 4 lb bag ($1.12/lb)', p: 1.1225 },
      { k: 'co', l: 'Costco — 25 lb bag ($0.68/lb) · needs membership', p: 0.6796, costco: true, base: 1.1225 },
      { k: 'rs', l: 'Restaurant supply — 50 lb bag ($0.59/lb)', p: 0.59 },
      { k: 'org', l: 'Organic cane sugar — GreenLeaf ($3.25/lb)', p: 3.245 },
    ],
    sweet: [
      { k: '1', l: 'Standard (1 cup sugar ≈ 16 cups)' },
      { k: '0.7', l: 'Less sweet (−30%) — half the interviews complained about sugar' },
    ],
    water: [
      { k: 'tap', l: 'Tap water — free (Lakeside municipal is potable)', p: 0 },
      { k: 'gl', l: 'Filtered spring — GreenLeaf ($1.69/gal)', p: 1.69 },
      { k: 'co', l: 'Filtered spring — Costco 3-pack ($1.43/gal) · membership', p: 1.43, costco: true, base: 1.69 },
    ],
    ice: [
      { k: 'gl10', l: 'GreenLeaf 10 lb bag ($3.49 → $0.35/lb)', p: 0.349 },
      { k: 'gl20', l: 'GreenLeaf 20 lb bag ($5.99 → $0.30/lb)', p: 0.2995 },
      { k: 'co20', l: 'Costco 20 lb bag ($4.49 → $0.22/lb) · membership', p: 0.2245, costco: true, base: 0.349 },
      { k: 'diy', l: 'DIY freezer trays — "free" (~3 lb/day per batch)', p: 0, diy: true },
    ],
    cups: {
      '8': [
        { k: 'c8', l: '8 oz clear plastic — Costco ($0.079)', p: 0.079125, costco: true, base: 0.1298 },
        { k: 'c9', l: '9 oz paper — GreenLeaf party aisle ($0.130)', p: 0.1298 },
      ],
      '12': [
        { k: 'c12p', l: '12 oz clear plastic — Amazon ($0.080)', p: 0.07998 },
        { k: 'c12k', l: '12 oz paper cold cup — restaurant supply ($0.072)', p: 0.072 },
        { k: 'c12c', l: '12 oz compostable PLA — Amazon ($0.145)', p: 0.145 },
      ],
      '16': [
        { k: 'c16', l: '16 oz plastic + flat lid — Amazon ($0.250)', p: 0.2499 },
      ],
    },
    straws: [
      { k: 'none', l: 'No straws (sit-and-sip)', p: 0 },
      { k: 'pl', l: 'Plastic, wrapped — Costco ($0.020)', p: 0.01998, costco: true, base: 0.02998 },
      { k: 'pa', l: 'Paper — Amazon ($0.030)', p: 0.02998 },
    ],
    napkins: [
      { k: 'co', l: 'White cocktail napkins — Costco ($0.015)', p: 0.01498, costco: true, base: 0.03298 },
      { k: 'kr', l: 'Kraft eco napkins — Amazon ($0.033)', p: 0.03298 },
      { k: 'none', l: 'No napkins', p: 0 },
    ],
    corners: [
      { k: '5', l: '5 · Waterfront path', permit: true, ins: 'yes' },
      { k: '2', l: '2 · Soccer field edge', permit: true, ins: 'yes' },
      { k: '3', l: '3 · City Park', permit: true, ins: 'yes', trap: true },
      { k: '1', l: '1 · Community Center', permit: true, ins: 'yes' },
      { k: '4', l: '4 · Commercial strip sidewalk', permit: true, ins: 'maybe' },
      { k: '6', l: '6 · Grocery parking lot', permit: true, ins: 'maybe' },
      { k: '7', l: '7 or 8 · Residential street', permit: false, ins: 'no' },
    ],
    signs: [
      { k: 'card', l: 'Handmade cardboard + markers ($5)', p: 5 },
      { k: 'chalk', l: 'Chalkboard A-frame ($39.99)', p: 39.99 },
      { k: 'banner', l: 'Custom vinyl banner 3×6 ft ($59.99)', p: 59.99 },
    ],
    readers: [
      { k: 'mag', l: 'Square mag-stripe reader (free)', p: 0 },
      { k: 'tap', l: 'Square tap + chip reader ($49)', p: 49 },
    ],
  };
  var SUGAR_LB_PER8 = 0.44 / 16;   // 1 cup sugar (0.44 lb) ≈ 16 eight-ounce cups
  var WATER_GAL_PER8 = 6 / 128;    // ~6 oz of water in an 8 oz cup
  var ICE_LB_PER8 = 10 / 30;       // budget one 10 lb bag per 30 cups (includes melt)

  // How the people we interviewed react to a price (from customer_interviews.docx)
  var PEOPLE = [
    { n: 'Megan · soccer mom', r: function (P) { return P <= 3 ? 'buys three — one per twin and one for her' : P <= 5 ? 'buys — but makes the twins share' : 'thinks twice'; }, y: function (P) { return P <= 5; } },
    { n: 'Marcus · playground dad', r: function (P) { return P < 5 ? 'buys without thinking — the kids decide' : P < 6 ? 'starts to feel "had"' : 'says no and looks like the bad guy'; }, y: function (P) { return P < 6; } },
    { n: 'Janelle · school pickup, 3 kids', r: function (P) { return P <= 2 ? 'every day — it’s part of the routine' : P <= 3 ? 'Fridays only' : P <= 4 ? 'once a week, as a treat' : 'rarely'; }, y: function (P) { return P <= 4; } },
    { n: 'Tyler + friends · teens', r: function (P) { return P <= 3 ? 'buys — and splits one' : P < 5 ? 'maybe, split four ways' : 'laughs and walks on'; }, y: function (P) { return P < 5; } },
    { n: 'Jamie & Alex · brunch couple', r: function (P) { return P <= 5 ? 'yes — if it tastes actually fresh' : P < 6 ? 'borderline' : 'too much off the market'; }, y: function (P) { return P <= 5; } },
    { n: 'Brian · weekday commuter', r: function (P) { return P <= 4 ? 'weekends only, on impulse' : 'probably not'; }, y: function (P) { return P <= 4; } },
    { n: 'Hal & Doris · retirees', r: function (P) { return P <= 1.5 ? 'both buy' : P <= 2.5 ? 'Hal buys; Doris makes her own' : P <= 3 ? 'Hal buys once, "to be supportive"' : 'neither'; }, y: function (P) { return P <= 3; } },
    { n: 'Priya · farmers-market regular', r: function (P) { return P <= 2 ? 'buys "to be nice"' : 'saves her $6 for Hansen’s'; }, y: function (P) { return P <= 2; } },
    { n: 'Sam · cyclist', r: function (P) { return P <= 2 ? 'grabs one — only if it’s on his route' : 'won’t stop'; }, y: function (P) { return P <= 2; } },
    { n: 'Rebecca · party planner (40 cups)', r: function (P) { return P <= 1.5 ? 'pre-orders for parties' : P <= 2 ? 'considers it' : 'goes back to $0.20 powder'; }, y: function (P) { return P <= 2; } },
    { n: 'Derek · jogger', r: function () { return 'not a buyer of regular lemonade at any price (wants low/no sugar)'; }, y: function () { return false; } },
  ];

  function money(x) { return (x < 0 ? '−$' : '$') + Math.abs(x).toFixed(2); }
  function opt(list, k) { return list.filter(function (o) { return o.k === k; })[0] || list[0]; }
  function options(list, sel) {
    return list.map(function (o) {
      return '<option value="' + o.k + '"' + (o.k === sel ? ' selected' : '') + '>' + o.l + '</option>';
    }).join('');
  }
  function field(id, label, q, inner) {
    return '<div class="cfield"><label for="' + id + '">' + label + '</label>' +
      (q ? '<span class="cq">' + q + '</span>' : '') + inner + '</div>';
  }

  function bindPriceCalc() {
    var root = document.getElementById('priceCalc');
    if (!root) return;
    root.classList.add('calc');
    root.innerHTML =
      '<div class="calc-head"><div class="ch-t">What does one cup really cost you?</div>' +
      '<div class="ch-s">Play with it — nothing breaks. Every number comes from the cost workbook, and every setting is a question Claude should ask you before it suggests a price.</div></div>' +
      '<div class="calc-body"><div class="calc-in">' +
      field('cSize', 'Cup size', 'Q: "Are we pricing an 8, 12 or 16 oz cup?"',
        '<select id="cSize"><option value="8">8 oz</option><option value="12" selected>12 oz</option><option value="16">16 oz</option></select>') +
      field('cCorner', 'Corner', 'Q: "Where are you selling? It changes the permit and insurance."',
        '<select id="cCorner">' + options(D.corners, '5') + '</select>') +
      field('cLemon', 'Lemons from', 'Q: "Where will you buy lemons — and on which days?"',
        '<select id="cLemon">' + options(D.lemons, 'gl8') + '</select>') +
      field('cPer8', 'Lemon per cup', 'Q: "How lemony — and how juicy are the lemons?"',
        '<select id="cPer8">' + options(D.per8, '0.75') + '</select>') +
      field('cSugar', 'Sugar from', 'Q: "Which sugar, and from where?"',
        '<select id="cSugar">' + options(D.sugar, 'gl4') + '</select>') +
      field('cSweet', 'Sweetness', 'Q: "Standard, or less sweet?"',
        '<select id="cSweet">' + options(D.sweet, '1') + '</select>') +
      field('cWater', 'Water', 'Q: "Tap or filtered?" — the one Claude usually just assumes.',
        '<select id="cWater">' + options(D.water, 'tap') + '</select>') +
      field('cIce', 'Ice', 'Q: "Buying ice, or making it?"',
        '<select id="cIce">' + options(D.ice, 'gl10') + '</select>') +
      field('cCup', 'Cup', 'Q: "Plastic, paper or compostable?"', '<select id="cCup"></select>') +
      field('cStraw', 'Straws', '', '<select id="cStraw">' + options(D.straws, 'none') + '</select>') +
      field('cNapkin', 'Napkins', '', '<select id="cNapkin">' + options(D.napkins, 'co') + '</select>') +
      field('cSign', 'Sign', 'Q: "Kid’s stand, or a brand?"', '<select id="cSign">' + options(D.signs, 'chalk') + '</select>') +
      field('cReader', 'Card reader', '', '<select id="cReader">' + options(D.readers, 'mag') + '</select>') +
      '<div class="cfield"><label class="chk"><input type="checkbox" id="cTable" /> I already own a folding table</label>' +
      '<label class="chk"><input type="checkbox" id="cInsMaybe" checked /> Include insurance where it "may" be required</label></div>' +
      field('cCard', 'Paid by card <span class="cval" id="cCardV"></span>', 'Q: "Cash or card?" — Square takes 2.6% + $0.10 a swipe.',
        '<input type="range" id="cCard" min="0" max="100" step="5" value="60" />') +
      field('cCups', 'Cups this season <span class="cval" id="cCupsV"></span>', 'Q: "How many cups do you expect to sell?" — spreads the one-time costs.',
        '<input type="range" id="cCups" min="300" max="3000" step="100" value="1500" />') +
      field('cPrice', 'Your price per cup <span class="cval" id="cPriceV"></span>', 'Q: "What price are you testing?"',
        '<input type="range" id="cPrice" min="1" max="7" step="0.25" value="4" />') +
      '</div><div class="calc-out" id="cOut" aria-live="polite"></div></div>';

    var $ = function (id) { return document.getElementById(id); };
    function fillCups() {
      var size = $('cSize').value, cur = $('cCup').value;
      var list = D.cups[size];
      var keep = list.some(function (o) { return o.k === cur; }) ? cur : list[0].k;
      $('cCup').innerHTML = options(list, keep);
    }
    fillCups();

    function calc() {
      var size = $('cSize').value, f = parseInt(size, 10) / 8;
      var corner = opt(D.corners, $('cCorner').value);
      var lem = opt(D.lemons, $('cLemon').value), per8 = parseFloat($('cPer8').value);
      var sug = opt(D.sugar, $('cSugar').value), sweet = parseFloat($('cSweet').value);
      var wat = opt(D.water, $('cWater').value), ice = opt(D.ice, $('cIce').value);
      var cup = opt(D.cups[size], $('cCup').value), straw = opt(D.straws, $('cStraw').value);
      var nap = opt(D.napkins, $('cNapkin').value), sign = opt(D.signs, $('cSign').value);
      var reader = opt(D.readers, $('cReader').value);
      var ownTable = $('cTable').checked, insMaybe = $('cInsMaybe').checked;
      var c = parseInt($('cCard').value, 10) / 100;
      var N = parseInt($('cCups').value, 10);
      var P = parseFloat($('cPrice').value);
      $('cCardV').textContent = Math.round(c * 100) + '%';
      $('cCupsV').textContent = N.toLocaleString() + ' cups';
      $('cPriceV').textContent = money(P);

      var lemonsPerCup = per8 * f, sugarLb = SUGAR_LB_PER8 * sweet * f;
      var waterGal = WATER_GAL_PER8 * f, iceLb = ICE_LB_PER8 * f;
      var vLem = lemonsPerCup * lem.p, vSug = sugarLb * sug.p, vWat = waterGal * wat.p, vIce = iceLb * ice.p;
      var vCup = cup.p, vStraw = straw.p, vNap = nap.p;
      var ingredients = vLem + vSug + vWat + vIce, packaging = vCup + vStraw + vNap;
      var V = ingredients + packaging;

      var permit = corner.permit ? 30 : 0;
      var ins = corner.ins === 'yes' || (corner.ins === 'maybe' && insMaybe) ? 75 : 0;
      var picks = [lem, sug, wat, ice, cup, straw, nap];
      var usesCostco = picks.some(function (o) { return o.costco; });
      var equip = 39.99 + 12.99 + 2 * 14.99 + 18.99 + (ownTable ? 0 : 44.99) + sign.p + reader.p;
      var Fx = equip + permit + ins + (usesCostco ? 65 : 0);
      var F = Fx / N;
      var fee = c * (0.026 * P + 0.10);
      var cost = V + F + fee;
      var floor = (V + F + 0.10 * c) / (1 - 0.026 * c);
      var profit = P - cost, margin = profit / P;

      // notes
      var notes = [];
      var waterSwing = WATER_GAL_PER8 * f * 1.69;
      notes.push('<div class="cnote"><b>The quiet one:</b> tap vs. GreenLeaf filtered water moves your cost by <b>' + money(waterSwing) +
        '</b> a cup — <b>' + money(waterSwing * N) + '</b> over ' + N.toLocaleString() + ' cups. Claude will usually assume tap without asking.</div>');
      if (corner.trap) notes.push('<div class="cnote warn"><b>Read the permit note twice.</b> It names Locations 1, 2, 4, 5 and 6 — and says <em>only 7 and 8</em> are exempt. Location 3 is never named, so it still needs the $30 permit.</div>');
      if (corner.ins === 'maybe') notes.push('<div class="cnote">Insurance at ' + corner.l.split(' · ')[1] + ' "may" be required, depending on the property owner. Confirm with the site contact.</div>');
      if (corner.k === '7') notes.push('<div class="cnote">No permit and no insurance on a residential street — and almost no passers-by. Cheap is not the same as good.</div>');
      if (lem.weekend) notes.push('<div class="cnote warn">The Farmers Market is open <b>Sat–Sun, 8am–1pm only</b>. A stand that runs Tue–Fri needs a second lemon source.</div>');
      if (ice.diy) notes.push('<div class="cnote warn">DIY ice makes ~3 lb a day per tray batch. At this cup size you need about <b>' + (iceLb * 50).toFixed(0) + ' lb</b> for a 50-cup day. Free on paper — a logistics problem in practice.</div>');
      if (usesCostco) {
        var save = picks.reduce(function (s, o) {
          if (!o.costco || o.base == null) return s;
          var qty = o === lem ? lemonsPerCup : o === sug ? sugarLb : o === wat ? waterGal : o === ice ? iceLb : 1;
          return s + (o.base - o.p) * qty * N;
        }, 0);
        notes.push('<div class="cnote' + (save < 65 ? ' warn' : '') + '">Costco needs a <b>$65</b> membership (now in your fixed costs). Your Costco picks save about <b>' +
          money(save) + '</b> this season — ' + (save >= 65 ? 'worth it.' : 'not enough to cover the membership.') + '</div>');
      }
      notes.push('<div class="cnote">Lemons climb 10–20% by mid-August, and real batches run 10–20% off book yield. Make a test batch before you trust any floor.</div>');

      var yes = PEOPLE.filter(function (p) { return p.y(P); }).length;
      var people = PEOPLE.map(function (p) {
        return '<div class="cline sub"><span>' + p.n + '</span><span style="text-align:right">' + p.r(P) + '</span></div>';
      }).join('');

      $('cOut').innerHTML =
        '<div class="cline"><span>Lemons (' + lemonsPerCup.toFixed(2) + ' per cup)</span><b>' + money(vLem) + '</b></div>' +
        '<div class="cline"><span>Sugar</span><b>' + money(vSug) + '</b></div>' +
        '<div class="cline"><span>Water</span><b>' + money(vWat) + '</b></div>' +
        '<div class="cline"><span>Ice (with melt)</span><b>' + money(vIce) + '</b></div>' +
        '<div class="cline"><span>Cup, straw, napkin</span><b>' + money(packaging) + '</b></div>' +
        '<div class="cline"><span>One-time costs ÷ ' + N.toLocaleString() + ' cups (' + money(Fx) + ')</span><b>' + money(F) + '</b></div>' +
        '<div class="cline sub"><span>equipment ' + money(equip) + (permit ? ' · permit $30' : '') + (ins ? ' · insurance $75' : '') + (usesCostco ? ' · Costco $65' : '') + '</span><span></span></div>' +
        '<div class="cline"><span>Card fees at ' + money(P) + '</span><b>' + money(fee) + '</b></div>' +
        '<div class="cline total"><span>Cost per cup</span><b>' + money(cost) + '</b></div>' +
        '<div class="cbig"><div><div class="n">' + money(floor) + '</div><div class="l">price floor — below this you lose money on every cup</div></div>' +
        '<div class="' + (profit < 0 ? 'neg' : '') + '"><div class="n">' + money(profit) + '</div><div class="l">profit per cup at ' + money(P) + ' (' + Math.round(margin * 100) + '% margin)</div></div>' +
        '<div class="' + (profit < 0 ? 'neg' : '') + '"><div class="n">' + money(profit * N) + '</div><div class="l">season profit at ' + N.toLocaleString() + ' cups (before your time)</div></div>' +
        '<div><div class="n">' + money(ingredients + packaging) + '</div><div class="l">your cost of goods — Hansen says his is ~$1.40</div></div></div>' +
        notes.join('') +
        '<div class="canchors"><b>Around town:</b> gas-station soda $1.49 (20 oz) · bottled Simply $2.99 (11.5 oz) · bakery lemonade $3.50 (12 oz) · truck lemon slushie $4.50 (12 oz) · Joe’s strawberry lemonade $4.75 (16 oz) · Hansen’s $6.00 (12 oz) · <span class="you">you: ' + money(P) + ' (' + size + ' oz)</span></div>' +
        '<div style="margin-top:14px"><div class="cline" style="border-bottom:1px solid var(--rule)"><span><b style="font-family:var(--sans)">At ' + money(P) + ', ' + yes + ' of ' + PEOPLE.length + ' interviewees say yes</b> — on their own terms</span><span></span></div>' + people + '</div>';
    }

    $('cSize').addEventListener('change', function () { fillCups(); calc(); });
    all('select, input', root).forEach(function (el) {
      if (el.id === 'cSize') return;
      el.addEventListener('input', calc);
      el.addEventListener('change', calc);
    });
    calc();
  }

  ready(function () {
    bindAnnotated();
    bindTabs();
    bindQuiz();
    bindReveal();
    bindHotspots();
    bindFinder();
    bindSorter();
    bindPriceCalc();
  });
})();
