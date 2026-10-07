/* ---------------------------------------------------------------------------
 * pdf.js — "The whole course, in your words" report, print-to-PDF.
 *
 * Renders the finished reflections into a clean document that matches the
 * course's hand-in: a title block, then each module's questions in serif with
 * the learner's answer in a left-border blockquote; the finale's answers sit
 * under their "In your world — …" sub-headings. Print → Save as PDF.
 *
 * LemonadePDF.openWindow()  → opens the print window immediately (inside the
 *   click, so pop-up blockers allow it) and returns it.
 * LemonadePDF.render(win, report) → fills that window and triggers print.
 *   `report` is { learner:{name,email}, submittedAt, answers:[…] } — e.g. the
 *   object returned by LemonadeSync.flushAll().report. If omitted, it is built
 *   from localStorage via LemonadeSync.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function cfg() { return window.LEMONADE_CONFIG || {}; }
  function modules() { return window.LEMONADE_MODULES || []; }

  var DOC_CSS = [
    '@page { margin: 0.9in 0.85in 1in; }',
    ':root{--ink:#161616;--soft:#555;--faint:#9a9892;--rule:#e2ded3;--paper:#fff;',
    '--serif:"Iowan Old Style","Charter","Georgia",serif;',
    '--sans:-apple-system,BlinkMacSystemFont,"Inter","SF Pro Text",system-ui,sans-serif;}',
    '*{box-sizing:border-box;}',
    'html,body{margin:0;padding:0;background:var(--paper);color:var(--ink);font-family:var(--serif);',
    'font-size:12.5pt;line-height:1.55;-webkit-font-smoothing:antialiased;}',
    '.wrap{max-width:7in;margin:0 auto;padding:28px 6px 60px;}',
    '.run{display:flex;justify-content:space-between;font-family:var(--sans);font-size:8.5pt;',
    'color:var(--faint);letter-spacing:.01em;padding-bottom:18px;}',
    '.eyebrow-top{font-family:var(--sans);font-size:9pt;font-weight:600;letter-spacing:.18em;',
    'text-transform:uppercase;color:var(--soft);margin:18px 0 10px;}',
    'h1{font-family:var(--serif);font-weight:500;font-size:30pt;line-height:1.1;letter-spacing:-.01em;',
    'margin:0 0 14px;}',
    '.byline{font-family:var(--sans);font-size:10.5pt;color:var(--soft);margin:0 0 6px;}',
    '.byline span{margin:0 10px;color:var(--faint);}',
    '.mod{margin-top:30px;padding-top:14px;border-top:1px solid var(--rule);break-inside:avoid;}',
    '.mod-eyebrow{font-family:var(--sans);font-size:9.5pt;font-weight:700;letter-spacing:.16em;',
    'text-transform:uppercase;color:var(--soft);margin:0 0 14px;}',
    '.q{font-family:var(--serif);font-size:13pt;line-height:1.35;color:var(--ink);margin:18px 0 8px;}',
    '.q:first-of-type{margin-top:0;}',
    '.subhead{font-family:var(--serif);font-size:13pt;color:var(--ink);margin:20px 0 8px;}',
    '.a{margin:0 0 4px;padding:2px 0 2px 16px;border-left:2px solid var(--rule);color:#2a2a2a;',
    'font-size:12.5pt;line-height:1.55;white-space:pre-wrap;}',
    '.empty{color:var(--faint);font-style:italic;}',
    '.foot{position:fixed;bottom:0.45in;left:0.85in;right:0.85in;display:flex;',
    'justify-content:space-between;font-family:var(--sans);font-size:8.5pt;color:var(--faint);}',
    '@media screen{body{background:#f4f2ec;}.wrap{background:#fff;margin:24px auto;',
    'box-shadow:0 2px 20px rgba(0,0,0,.08);padding:48px 56px 72px;}.foot{position:static;',
    'margin-top:40px;padding-top:12px;border-top:1px solid var(--rule);}}',
  ].join('\n');

  function fmtDate(iso) {
    var d = iso ? new Date(iso) : new Date();
    try {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return d.toDateString(); }
  }

  function buildBody(report) {
    var byMod = {};
    (report.answers || []).forEach(function (a) { (byMod[a.module] = byMod[a.module] || []).push(a); });

    var html = '';
    modules().forEach(function (m) {
      var rows = byMod[m.n];
      if (!rows || !rows.length) return;
      rows.sort(function (a, b) { return a.q - b.q; });
      var any = rows.some(function (r) { return (r.answer || '').trim(); });
      if (!any) return;

      html += '<section class="mod"><p class="mod-eyebrow">' + esc(m.eyebrow) + '</p>';
      if (m.subheads) {
        rows.forEach(function (r) {
          var ans = (r.answer || '').trim();
          if (!ans) return;
          var head = m.subheads[r.q] || r.question;
          html += '<p class="subhead">' + esc(head) + '</p>'
                + '<p class="a">' + esc(ans) + '</p>';
        });
      } else {
        rows.forEach(function (r) {
          var ans = (r.answer || '').trim();
          if (!ans) return;
          html += '<p class="q">' + esc(r.question) + '</p>'
                + '<p class="a">' + esc(ans) + '</p>';
        });
      }
      html += '</section>';
    });
    return html;
  }

  function buildDoc(report) {
    var c = cfg().course || {};
    var url = (c.siteUrl || '') + '/10-finale.html';
    var learner = report.learner || {};
    return '<!doctype html><html><head><meta charset="utf-8">'
      + '<title>' + esc(c.name || 'Lakeside Lemonade') + ' — Reflections</title>'
      + '<style>' + DOC_CSS + '</style></head><body><div class="wrap">'
      + '<div class="run"><span>' + esc(c.name || 'Lakeside Lemonade') + ' — Reflections</span>'
      + '<span>' + esc(fmtDate(report.submittedAt)) + '</span></div>'
      + '<p class="eyebrow-top">' + esc((c.name || 'Lakeside Lemonade').toUpperCase()) + ' · REFLECTIONS</p>'
      + '<h1>The whole course, in your words</h1>'
      + '<p class="byline">' + esc(learner.name || '—')
      + '<span>·</span>' + esc(learner.email || '')
      + '<span>·</span>' + esc(fmtDate(report.submittedAt))
      + '<span>·</span>' + esc(c.track || 'GenAI Strategy & Execution') + '</p>'
      + buildBody(report)
      + '<div class="foot"><span>' + esc(url) + '</span><span>' + esc(c.name || 'Lakeside Lemonade') + '</span></div>'
      + '</div></body></html>';
  }

  function openWindow() {
    var win = window.open('', '_blank');
    if (win) {
      win.document.write('<!doctype html><title>Preparing your report…</title>'
        + '<body style="font-family:-apple-system,system-ui,sans-serif;color:#555;padding:40px">'
        + 'Preparing your report…</body>');
    }
    return win;
  }

  function render(win, report) {
    if (!report) report = (window.LemonadeSync && window.LemonadeSync.buildReport(
      (window.LemonadeSync.getLearner() || {}).name, (window.LemonadeSync.getLearner() || {}).email)) || { answers: [] };
    var html = buildDoc(report);
    var target = win && !win.closed ? win : window.open('', '_blank');
    if (!target) { return false; }
    target.document.open();
    target.document.write(html);
    target.document.close();
    setTimeout(function () { try { target.focus(); target.print(); } catch (e) {} }, 350);
    return true;
  }

  window.LemonadePDF = { openWindow: openWindow, render: render, buildDoc: buildDoc };
})();
