/* ---------------------------------------------------------------------------
 * course.js — shared learner-page behavior for the Lemonade course.
 *
 * Auto-binds on DOM ready. Every binding is no-op-safe: if the elements the
 * binding looks for aren't present on the current page, the binding does
 * nothing. That keeps this single file usable on every src/*.html page
 * without per-page configuration beyond `<body data-module="N">` and an
 * optional `data-checkpoint-target="<selector>"`.
 *
 * Bindings:
 *   1. Checkpoint pass/stuck handler   (data-action="pass" | "stuck")
 *   2. Helper sub-option toggle        (data-toggle="<id>")
 *   3. Reflection persistence          (.reflect-q textareas, JSON payload)
 *   4. Reflection guard                (next-link clicks pulse empty fields)
 *   5. Image lift overlays             (map-frame / lift-img-frame patterns)
 *   6. Prompt copy buttons             (.sample-prompt / .code-prompt blocks)
 *   7. Module menu on narrow screens   (.modnav-toggle / .modnav)
 *
 * Module-specific behavior (M3 annotated-prompt hover, M5 hand-in PDF
 * generator, etc.) stays inline on those pages. This file is cross-cutting
 * only.
 * ------------------------------------------------------------------------- */

(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  // ── 1. Checkpoint pass / stuck ───────────────────────────────────────────
  function bindCheckpoint() {
    const body = document.body;
    const helper = document.getElementById('helper');
    // Default scroll target is .check-confirmed (the transition line that
    // sits just above .post-checkpoint). Scrolling there lands users at
    // the start of the newly-revealed section, not buried in the middle.
    // Per-module override: <body data-checkpoint-target="...">.
    const targetSelector =
      body.dataset.checkpointTarget || '.check-confirmed';

    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'pass') {
          body.classList.add('checkpoint-passed');
          requestAnimationFrame(() => {
            const target = document.querySelector(targetSelector);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        } else if (action === 'stuck') {
          if (!helper) return;
          helper.classList.add('open');
          requestAnimationFrame(() => {
            helper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        }
      });
    });
  }

  // ── 2. Helper sub-option toggle ──────────────────────────────────────────
  function bindHelperToggle() {
    document.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.toggle);
        if (!target) return;
        const isOpen = target.classList.toggle('open');
        btn.classList.toggle('expanded', isOpen);
      });
    });
  }

  // ── 3. Reflection persistence ────────────────────────────────────────────
  // Canonical schema: JSON.stringify({ q, hint, a, ts }).
  // Defensive fallback: if a stored value is a raw string (legacy M6/M7
  // schema), treat it as the answer text so old data isn't lost.
  function bindReflectionPersistence() {
    const moduleNum = parseInt(document.body.dataset.module || '', 10);
    if (!Number.isFinite(moduleNum)) return;

    document.querySelectorAll('.reflect-q').forEach((block, i) => {
      const ta = block.querySelector('textarea');
      if (!ta) return;
      const qEl = block.querySelector('.q-text');
      const hintEl = block.querySelector('.q-hint');
      const key = `lemonade.reflect.m${moduleNum}.q${i}`;

      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === 'object' && typeof saved.a === 'string') {
            ta.value = saved.a;
          } else if (typeof saved === 'string') {
            ta.value = saved;
          }
        } catch (e) {
          // Legacy raw-string value (M6/M7 pre-migration). Use as-is.
          ta.value = raw;
        }
      }

      ta.addEventListener('input', () => {
        const payload = {
          q: qEl ? qEl.textContent.trim() : '',
          hint: hintEl ? hintEl.textContent.trim() : '',
          a: ta.value,
          ts: Date.now(),
        };
        try { localStorage.setItem(key, JSON.stringify(payload)); } catch (e) {}
        // Durable sync: push to Supabase if the learner signed in (no-op
        // otherwise). localStorage above is always the source of truth.
        if (window.LemonadeSync) window.LemonadeSync.save(moduleNum, i, payload);
      });
    });
  }

  // ── 4. Reflection guard ──────────────────────────────────────────────────
  // Block clicks on the next link if any .reflect-q textarea is empty.
  // Pulses the empty ones (--accent border for ~1500ms via .pulse class if
  // present in CSS; falls back to inline borderColor) and focuses the first.
  // Also shows a toast if `#reflect-toast` exists; creates one on demand
  // otherwise so M6/M7 (which historically lacked the element) still get it.
  function ensureToast() {
    let toast = document.getElementById('reflect-toast');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.className = 'reflect-toast';
    toast.id = 'reflect-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    return toast;
  }

  function bindReflectionGuard() {
    const fields = document.querySelectorAll('.reflect-q textarea');
    if (fields.length === 0) return;

    const links = document.querySelectorAll('footer.rail nav a.next, .rail nav a.next, .next a');
    if (links.length === 0) return;

    const toast = ensureToast();
    let toastTimer = null;
    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
    }

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        // Hidden fields (e.g. a picker's recorded choice) are filled by the page,
        // not typed, and [data-optional] blocks are the learner's choice, so
        // neither ever blocks Next.
        const empty = Array.from(fields).filter(
          t => !t.value.trim() && !t.closest('[hidden]') && !t.closest('[data-optional]')
        );
        if (empty.length === 0) return;
        e.preventDefault();
        empty.forEach(t => {
          // Prefer the CSS .pulse animation; fall back to inline color.
          t.classList.remove('pulse');
          void t.offsetWidth; // force reflow so animation re-triggers
          t.classList.add('pulse');
          t.style.borderColor = 'var(--accent)';
          setTimeout(() => { t.style.borderColor = ''; }, 1500);
        });
        empty[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        empty[0].focus({ preventScroll: true });
        showToast("Don't forget your reflections — they're your takeaway from this module.");
      });
    });
  }

  // ── 5. Image lift overlays ───────────────────────────────────────────────
  // Two structurally-identical patterns share this binder:
  //   M2 location map  → #mapFrame, #mapBackdrop, #mapLifted, body.map-expanded
  //   M4 skills image  → #skillsImg, #skillsBackdrop, #skillsLifted,
  //                      body.lift-img-expanded
  //   M7 cowork shot    → #coworkShot, #coworkBackdrop, #coworkLifted,
  //                      body.lift-img-expanded
  // Each entry is independent and no-op-safe.
  const LIFT_TARGETS = [
    { frame: 'mapFrame',  backdrop: 'mapBackdrop',     lifted: 'mapLifted',    cls: 'map-expanded' },
    { frame: 'skillsImg', backdrop: 'skillsBackdrop',  lifted: 'skillsLifted', cls: 'lift-img-expanded' },
    { frame: 'coworkShot', backdrop: 'coworkBackdrop', lifted: 'coworkLifted', cls: 'lift-img-expanded' },
  ];

  function bindLift(spec) {
    const frame = document.getElementById(spec.frame);
    const backdrop = document.getElementById(spec.backdrop);
    const lifted = document.getElementById(spec.lifted);
    if (!frame || !backdrop || !lifted) return;

    const body = document.body;
    const close = () => body.classList.remove(spec.cls);
    const toggle = (e) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      body.classList.toggle(spec.cls);
    };

    frame.addEventListener('click', toggle);
    backdrop.addEventListener('click', close);
    lifted.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && body.classList.contains(spec.cls)) close();
    });
  }

  function bindImageLifts() {
    LIFT_TARGETS.forEach(bindLift);
  }

  // ── 6. Copy buttons on prompt blocks ─────────────────────────────────────
  // Every learner-facing prompt (.sample-prompt anywhere, .code-prompt in
  // modules 05–08) gets a small in-flow "Copy" chip in the block. The button
  // copies the block's own text — not the text of any sibling annotations
  // that sit around it. No per-page markup needed.
  //
  // The icon carries a full inline `style` for its box: several modules define
  // their own `svg {}` rules (e.g. M9's `.detail svg { width:100%; margin:16px
  // auto }` and `.step-diagram svg`). Those share specificity with a shared
  // `.copy-btn svg` rule but load later, so they win — leaking not just width
  // but margin and max-width into the injected glyph, inflating the chip. An
  // inline style beats any stylesheet rule, so we pin every geometry property
  // a page `svg {}` rule could touch — fully isolating the icon, present and
  // future. Stroke colour is left to inherit (currentColor → button colour).
  const ICON_STYLE =
    'display:block;width:13px;height:13px;max-width:13px;margin:0;flex-shrink:0';
  const COPY_ICON =
    '<svg viewBox="0 0 24 24" style="' + ICON_STYLE + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" style="' + ICON_STYLE + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for non-secure contexts (e.g. plain http:// preview).
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  function bindCopyButtons() {
    document.querySelectorAll('.sample-prompt, .code-prompt').forEach(block => {
      if (block.querySelector('.copy-btn')) return; // idempotent
      // Capture the prompt text before injecting the button, so the button's
      // own (empty) label is never part of what gets copied.
      const text = block.textContent.trim();
      if (!text) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copy prompt');
      btn.title = 'Copy prompt';
      btn.innerHTML = COPY_ICON + '<span class="copy-label">Copy</span>';

      let resetTimer = null;
      btn.addEventListener('click', () => {
        copyText(text).then(() => {
          btn.classList.add('copied');
          btn.innerHTML = CHECK_ICON + '<span class="copy-label">Copied</span>';
          if (resetTimer) clearTimeout(resetTimer);
          resetTimer = setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = COPY_ICON + '<span class="copy-label">Copy</span>';
          }, 1600);
        }).catch(() => {});
      });

      block.appendChild(btn);
    });
  }

  // ── 7. Module menu on narrow screens ─────────────────────────────────────
  // The rail collapses to a button below 900px (see course.css). The button
  // names the module you're on, and the panel is the same list of links.
  function bindModnavToggle() {
    const toggle = document.querySelector('.modnav-toggle');
    const nav = document.getElementById('modnav');
    if (!toggle || !nav) return;

    const here = toggle.querySelector('.mt-here');
    const active = nav.querySelector('a.active');
    if (here && active) {
      const num = active.querySelector('.num');
      const lbl = active.querySelector('.lbl');
      here.textContent = num && lbl ? num.textContent.trim() + ' · ' + lbl.textContent.trim() : 'Modules';
    }
    toggle.hidden = false;   // only once it has a label worth showing

    function close() {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 900) close(); });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  ready(function () {
    bindCheckpoint();
    bindHelperToggle();
    bindReflectionPersistence();
    bindReflectionGuard();
    bindImageLifts();
    bindCopyButtons();
    bindModnavToggle();
  });
})();
