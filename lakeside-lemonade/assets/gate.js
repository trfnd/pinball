/* ---------------------------------------------------------------------------
 * gate.js — the convenience password lock.
 *
 * A training handout, not a vault: the module text is in the page source, so
 * this keeps casual visitors out, nothing more. Two independent locks:
 *   participant  — the course pages (index gate grants it)
 *   founder      — the private dashboard (founder.html)
 *
 * A tiny synchronous guard in each page's <head> (see partials) reads the raw
 * token key and redirects before paint, so protected content never flashes.
 * This file powers the gate FORMS (verify + grant) on index.html and
 * founder.html.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var KEY = {
    participant: 'lemonade.gate.participant',
    founder: 'lemonade.gate.founder',
  };

  function cfg() { return (window.LEMONADE_CONFIG && window.LEMONADE_CONFIG.gate) || {}; }

  function expectedHash(kind) {
    var g = cfg();
    return kind === 'founder' ? g.founderHash : g.participantHash;
  }

  async function sha256(str) {
    var buf = new TextEncoder().encode(str);
    var hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  function hasAccess(kind) {
    if (cfg().enabled === false) return true;
    try {
      var k = KEY[kind] || KEY.participant;
      var v = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (!v) return false;
      if (v === 'session') return true;
      var t = parseInt(v, 10);
      return isFinite(t) && t > Date.now();
    } catch (e) { return true; }
  }

  function grant(kind, remember) {
    var k = KEY[kind] || KEY.participant;
    try {
      sessionStorage.setItem(k, 'session');
      if (remember) {
        var days = cfg().rememberDays || 30;
        localStorage.setItem(k, String(Date.now() + days * 864e5));
      }
    } catch (e) {}
  }

  function clear(kind) {
    var k = KEY[kind] || KEY.participant;
    try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch (e) {}
  }

  async function verify(kind, password, remember) {
    var want = expectedHash(kind);
    if (!want) return false;
    var got = await sha256(String(password || ''));
    if (got !== want) return false;
    grant(kind, remember);
    return true;
  }

  // Bind a standard gate form: an input (#gatePassword), a submit button inside
  // a <form id="…">, an error <p id="gateError">, optional #gateRemember checkbox.
  // On success, redirect to `onSuccess` (string) or reveal the page.
  function bindForm(opts) {
    var form = document.getElementById(opts.formId);
    if (!form) return;
    var input = form.querySelector('input[type="password"]');
    var err = document.getElementById(opts.errorId || 'gateError');
    var remember = document.getElementById(opts.rememberId || 'gateRemember');
    var kind = opts.kind || 'participant';

    // Already in? Skip straight through.
    if (hasAccess(kind) && opts.onSuccess) { location.replace(opts.onSuccess); return; }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (err) err.textContent = '';
      var ok = false;
      try { ok = await verify(kind, input.value, remember ? remember.checked : true); }
      catch (e2) { ok = false; }
      if (ok) {
        if (typeof opts.onSuccess === 'function') opts.onSuccess();
        else if (opts.onSuccess) location.assign(opts.onSuccess);
      } else {
        if (err) err.textContent = opts.errorText || 'That password didn’t work. Try again.';
        input.select();
      }
    });
    input.focus();
  }

  window.LemonadeGate = {
    sha256: sha256,
    hasAccess: hasAccess,
    grant: grant,
    clear: clear,
    verify: verify,
    bindForm: bindForm,
    KEY: KEY,
  };
})();
