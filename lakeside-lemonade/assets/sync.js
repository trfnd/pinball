/* ---------------------------------------------------------------------------
 * sync.js — self-contained home for reflections + the founder submission store.
 *
 * Same shape as the original course's Supabase sync (getLearner/setLearner/
 * save/flushAll/findLearner/restore) so the learner pages don't care how it's
 * wired — but the default adapter is fully local:
 *
 *   • localStorage is the source of truth while a learner works (course.js
 *     writes each answer to  lemonade.reflect.m{N}.q{i}).
 *   • At hand-in, flushAll(name,email) assembles the whole report, saves it to
 *     a local "submissions" store (what founder.html reads), and ALSO posts it
 *     to an endpoint / Supabase if config.js provides one.
 *
 * Nothing external is required to see the whole flow work end to end.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var LEARNER_KEY = 'lemonade.learner';
  var SUBMISSIONS_KEY = 'lemonade.submissions';

  function cfg() { return (window.LEMONADE_CONFIG && window.LEMONADE_CONFIG.delivery) || {}; }
  function modules() { return window.LEMONADE_MODULES || []; }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ── Learner identity ──────────────────────────────────────────────────────
  function getLearner() {
    try { var r = lsGet(LEARNER_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function setLearner(name, email) {
    var l = { name: (name || '').trim(), email: (email || '').trim().toLowerCase() };
    lsSet(LEARNER_KEY, JSON.stringify(l));
    return l;
  }

  // ── Question lookup (fills in question text if the stored payload lacks it) ─
  function questionFor(moduleNum, qIndex) {
    var m = modules().find(function (x) { return x.n === moduleNum; });
    if (m && m.q && m.q[qIndex] != null) return m.q[qIndex];
    return '';
  }
  function moduleMeta(moduleNum) {
    return modules().find(function (x) { return x.n === moduleNum; }) || null;
  }

  // ── Collect every cached reflection into an ordered array ──────────────────
  function collectAnswers() {
    var map = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var m = k && k.match(/^lemonade\.reflect\.m(\d+)\.q(\d+)$/);
        if (!m) continue;
        var mod = parseInt(m[1], 10), q = parseInt(m[2], 10);
        var v;
        try { v = JSON.parse(localStorage.getItem(k)); } catch (e) { v = { a: localStorage.getItem(k) }; }
        if (!v) continue;
        var ans = typeof v === 'string' ? v : (v.a || '');
        (map[mod] = map[mod] || {})[q] = {
          question: (v && v.q) || questionFor(mod, q),
          hint: (v && v.hint) || '',
          answer: ans,
        };
      }
    } catch (e) {}
    // Emit in registry order, questions in index order.
    var out = [];
    modules().forEach(function (mod) {
      var qs = map[mod.n]; if (!qs) return;
      Object.keys(qs).map(Number).sort(function (a, b) { return a - b; }).forEach(function (qi) {
        var rec = qs[qi];
        out.push({ module: mod.n, slug: mod.slug, eyebrow: mod.eyebrow, q: qi,
          question: rec.question, hint: rec.hint, answer: rec.answer });
      });
    });
    return out;
  }

  // ── Build the full report object (also what gets posted / downloaded) ──────
  function buildReport(name, email) {
    var learner = { name: (name || '').trim(), email: (email || '').trim().toLowerCase() };
    return {
      course: (window.LEMONADE_CONFIG && window.LEMONADE_CONFIG.course && window.LEMONADE_CONFIG.course.name) || 'Lakeside Lemonade',
      track: (window.LEMONADE_CONFIG && window.LEMONADE_CONFIG.course && window.LEMONADE_CONFIG.course.track) || '',
      learner: learner,
      submittedAt: new Date().toISOString(),
      answers: collectAnswers(),
    };
  }

  // ── Local submissions store (founder dashboard reads this) ─────────────────
  function listSubmissions() {
    try { return JSON.parse(lsGet(SUBMISSIONS_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveSubmission(report) {
    var all = listSubmissions();
    var i = all.findIndex(function (r) { return (r.learner && r.learner.email) === (report.learner && report.learner.email); });
    if (i >= 0) all[i] = report; else all.push(report);
    lsSet(SUBMISSIONS_KEY, JSON.stringify(all));
    return all.length;
  }
  function removeSubmission(email) {
    var all = listSubmissions().filter(function (r) { return (r.learner && r.learner.email) !== String(email).toLowerCase(); });
    lsSet(SUBMISSIONS_KEY, JSON.stringify(all));
  }
  function clearSubmissions() { lsSet(SUBMISSIONS_KEY, '[]'); }
  function importReport(obj) {
    if (!obj || !obj.learner || !obj.learner.email) throw new Error('not a report');
    return saveSubmission(obj);
  }

  // ── Optional remote delivery ───────────────────────────────────────────────
  function postEndpoint(report) {
    var c = cfg();
    if (!c.endpoint) return Promise.resolve(true);
    return fetch(c.endpoint, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, c.endpointHeaders || {}),
      body: JSON.stringify({ report: report }),
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }
  function postSupabase(report) {
    var c = cfg(); var sb = c.supabase;
    if (!sb || !sb.url || !sb.anonKey) return Promise.resolve(true);
    function rpc(fn, body) {
      return fetch(sb.url + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: { apikey: sb.anonKey, Authorization: 'Bearer ' + sb.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    return rpc('upsert_learner', { p_email: report.learner.email, p_name: report.learner.name })
      .then(function () {
        return Promise.all(report.answers.map(function (a) {
          return rpc('save_reflection', {
            p_email: report.learner.email, p_module: String(a.module), p_q_index: a.q,
            p_question: a.question, p_hint: a.hint, p_answer: a.answer,
          }).then(function (r) { return r.ok; }).catch(function () { return false; });
        }));
      })
      .then(function (res) { return res.every(Boolean); })
      .catch(function () { return false; });
  }

  // ── Hand-in: assemble, store locally, deliver if configured ────────────────
  function flushAll(name, email) {
    setLearner(name, email);
    var report = buildReport(name, email);
    saveSubmission(report);                 // local founder store — always
    return Promise.all([postEndpoint(report), postSupabase(report)])
      .then(function (res) {
        return { learnerOk: true, saved: report.answers.length, total: report.answers.length,
          delivered: { endpoint: res[0], supabase: res[1] }, report: report };
      });
  }

  // ── Continue on another browser (local-only unless a backend is wired) ─────
  function findLearner(email, name) {
    var all = listSubmissions();
    var e = (email || '').trim().toLowerCase(), n = (name || '').trim().toLowerCase();
    var hit = all.find(function (r) { return r.learner && r.learner.email === e && e; });
    if (!hit && n) {
      var byName = all.filter(function (r) { return r.learner && (r.learner.name || '').toLowerCase() === n; });
      if (byName.length === 1) hit = byName[0];
    }
    return Promise.resolve(hit ? { email: hit.learner.email, name: hit.learner.name } : null);
  }
  function restore(email) {
    var all = listSubmissions();
    var hit = all.find(function (r) { return r.learner && r.learner.email === String(email).toLowerCase(); });
    var n = 0;
    if (hit) hit.answers.forEach(function (a) {
      var key = 'lemonade.reflect.m' + a.module + '.q' + a.q;
      try {
        var cur = JSON.parse(localStorage.getItem(key) || 'null');
        if (cur && typeof cur.a === 'string' && cur.a.trim()) return;
      } catch (e) {}
      lsSet(key, JSON.stringify({ q: a.question, hint: a.hint, a: a.answer, ts: Date.now() }));
      n++;
    });
    return Promise.resolve(n);
  }

  window.LemonadeSync = {
    getLearner: getLearner, setLearner: setLearner,
    save: function () {},                   // localStorage already holds it; no-op in local mode
    collectAnswers: collectAnswers, buildReport: buildReport,
    flushAll: flushAll, findLearner: findLearner, restore: restore,
    // founder-side
    listSubmissions: listSubmissions, importReport: importReport,
    removeSubmission: removeSubmission, clearSubmissions: clearSubmissions,
    moduleMeta: moduleMeta,
  };
})();
