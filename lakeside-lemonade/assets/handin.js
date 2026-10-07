/* ---------------------------------------------------------------------------
 * handin.js — the Module 10 hand-in. Assembles the full report, saves it to
 * the founder store (and any configured endpoint), opens the printable PDF,
 * and offers the report as a downloadable file the participant can send the
 * founder in self-contained mode.
 * Binds to a #handin box containing #hiName, #hiEmail, #hiSave, #hiStatus,
 * and optional #hiDownload / #hiView buttons.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function setStatus(status, kind, msg) {
    status.className = 'cp-status' + (kind ? ' ' + kind : '');
    status.textContent = msg || '';
    status.hidden = !msg;
  }

  function download(report) {
    try {
      var safe = ((report.learner && report.learner.name) || 'lakeside-lemonade')
        .replace(/[^\w.-]+/g, '_');
      var blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = safe + '.lemonade.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    } catch (e) {}
  }

  ready(function () {
    var box = el('handin'); if (!box) return;
    var name = el('hiName'), email = el('hiEmail'), btn = el('hiSave'), status = el('hiStatus');
    var dl = el('hiDownload'), vw = el('hiView');

    var L = window.LemonadeSync && window.LemonadeSync.getLearner && window.LemonadeSync.getLearner();
    if (L) { if (name) name.value = L.name || ''; if (email) email.value = L.email || ''; }

    function enterSubmits(input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (!btn.disabled) btn.click(); }
      });
    }
    if (name) enterSubmits(name);
    if (email) enterSubmits(email);

    btn.addEventListener('click', function () {
      var n = (name.value || '').trim(), e = (email.value || '').trim();
      if (!n || !e || (email.checkValidity && !email.checkValidity())) {
        setStatus(status, 'error', 'Add your name and a valid email to finish.');
        return;
      }
      if (!window.LemonadeSync) {
        setStatus(status, 'error', "Couldn't assemble the report. Reload the page and try again.");
        return;
      }
      // Open the PDF window inside the click so pop-up blockers allow it.
      var win = window.LemonadePDF ? window.LemonadePDF.openWindow() : null;
      btn.disabled = true; btn.textContent = 'Putting it together…';
      setStatus(status, '', '');

      window.LemonadeSync.flushAll(n, e)
        .then(function (r) {
          setStatus(status, 'ok',
            'Report assembled and saved for the founder. Your PDF is opening — use “Download report file” below to send it along if asked.');
          if (win && window.LemonadePDF) window.LemonadePDF.render(win, r.report);
          if (dl) { dl.hidden = false; dl.onclick = function () { download(r.report); }; }
          if (vw) { vw.hidden = false; vw.onclick = function () {
            window.LemonadePDF.render(window.LemonadePDF.openWindow(), r.report); }; }
        })
        .catch(function () {
          setStatus(status, 'error', 'Something went wrong assembling the report. Your answers are still saved — try again.');
        })
        .then(function () { btn.disabled = false; btn.textContent = 'Put together my report'; });
    });
  });
})();
