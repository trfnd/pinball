/* ---------------------------------------------------------------------------
 * chrome.js — builds the shared header rail + footer nav from the registry,
 * so every page's module nav, active state, prev/next and progress line stay
 * in sync automatically. Each page sets <body data-slug="…" data-module="N">
 * and drops <div id="siteHeader"></div> / <div id="siteFooter"></div>.
 * course.js then binds the modnav toggle + reflection guard as usual.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var LEMON_SVG =
    '<svg class="brand-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="10" fill="#f5d563" stroke="#161616" stroke-width="1.5"/>'
    + '<line x1="12" y1="2.5" x2="12" y2="21.5" stroke="#a87800" stroke-width="0.8"/>'
    + '<line x1="2.5" y1="12" x2="21.5" y2="12" stroke="#a87800" stroke-width="0.8"/>'
    + '<line x1="5" y1="5" x2="19" y2="19" stroke="#a87800" stroke-width="0.6"/>'
    + '<line x1="5" y1="19" x2="19" y2="5" stroke="#a87800" stroke-width="0.6"/></svg>';

  function nav() { return window.LEMONADE_NAV || []; }

  function hasAnswers(mod) {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        if ((localStorage.key(i) || '').indexOf('lemonade.reflect.m' + mod + '.q') === 0) return true;
      }
    } catch (e) {}
    return false;
  }
  function modNumFor(slug) {
    var m = (window.LEMONADE_MODULES || []).find(function (x) { return x.slug === slug; });
    return m ? m.n : null;
  }

  function mountHeader() {
    var host = document.getElementById('siteHeader');
    if (!host) return;
    var slug = document.body.dataset.slug || '';
    var items = nav();
    var curIdx = items.findIndex(function (x) { return x.slug === slug; });

    var links = '';
    items.forEach(function (it, i) {
      if (i === 0) links += '<span class="part-divider">Part 1</span>';
      if (it.slug === '06-books') links += '<span class="part-divider">Part 2</span>';
      var cls = 'modlink';
      if (it.slug === slug) cls += ' active';
      else if (curIdx > -1 && i < curIdx && hasAnswers(modNumFor(it.slug))) cls += ' done';
      if (it.checkpoint) cls += ' checkpoint-link';
      if (it.optional) cls += ' optional';
      var mark = it.optional ? '<span class="opt-mark">opt</span>' : '';
      links += '<a class="' + cls + '" href="' + it.slug + '.html">'
        + '<span class="num">' + it.num + mark + '</span>'
        + '<span class="lbl">' + it.lbl + '</span></a>';
    });

    host.outerHTML =
      '<header class="strip">'
      + '<a class="brand" href="index.html">' + LEMON_SVG
      + '<span>Lakeside Lemonade</span><span class="sub">· GenAI Strategy &amp; Execution</span></a>'
      + '<div class="modnav-wrap">'
      + '<button class="modnav-toggle" aria-expanded="false" aria-controls="modnav" hidden>'
      + '<span class="mt-here">Modules</span>'
      + '<svg class="mt-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
      + '</button>'
      + '<nav class="modnav" id="modnav">' + links + '</nav>'
      + '</div></header>';
  }

  function mountFooter() {
    var host = document.getElementById('siteFooter');
    if (!host) return;
    var slug = document.body.dataset.slug || '';
    var items = nav();
    var idx = items.findIndex(function (x) { return x.slug === slug; });
    var prev = idx > 0 ? items[idx - 1] : null;
    var next = idx > -1 && idx < items.length - 1 ? items[idx + 1] : null;

    // progress label
    var cur = items[idx] || {};
    var numbered = items.filter(function (x) { return !x.checkpoint && !x.optional; });
    var progress;
    if (cur.checkpoint) progress = 'Part 1 · Checkpoint';
    else if (cur.optional) progress = 'Bonus';
    else {
      var pos = numbered.findIndex(function (x) { return x.slug === slug; });
      progress = 'Module ' + (pos + 1) + ' of ' + numbered.length;
    }

    var navCls = '';
    if (prev && !next) navCls = 'prev-only';
    else if (!prev && next) navCls = 'next-only';
    var inner = '';
    if (prev) inner += '<a class="prev" href="' + prev.slug + '.html">← ' + prev.lbl + '</a>';
    if (next) inner += '<a class="next" href="' + next.slug + '.html">' + next.lbl + ' →</a>';

    host.outerHTML =
      '<footer class="rail">'
      + '<div class="progress">' + progress + '</div>'
      + '<nav' + (navCls ? ' class="' + navCls + '"' : '') + '>' + inner + '</nav>'
      + '</footer>';
  }

  function go() { mountHeader(); mountFooter(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go, { once: true });
  } else { go(); }

  window.LemonadeChrome = { mountHeader: mountHeader, mountFooter: mountFooter };
})();
