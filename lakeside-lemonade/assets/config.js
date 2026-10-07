/* ---------------------------------------------------------------------------
 * config.js — single place to configure the self-contained course.
 *
 * Everything here is safe to ship in a static site. The gate is a convenience
 * lock for a training handout, not real security: the module content is in the
 * page source. If you need true gating, put the site behind Vercel password
 * protection or staticrypt and leave GATE.enabled = false here.
 * ------------------------------------------------------------------------- */
window.LEMONADE_CONFIG = {
  course: {
    name: 'Lakeside Lemonade',
    tagline: 'From a lemonade stand to GenAI strategy and execution',
    track: 'GenAI Strategy & Execution',
    // Shown in the report footer and as the canonical URL.
    siteUrl: 'https://lakeside-lemonade.vercel.app',
  },

  // ── Gate ────────────────────────────────────────────────────────────────
  // SHA-256 hashes of the passwords (so the plain text isn't in the source).
  // Defaults:  participant = "lemonade2026"   founder = "founder-ibrahim"
  // To change: run  printf '%s' 'yourpassword' | sha256sum  and paste below.
  gate: {
    enabled: true,
    participantHash: '3710df413d6f40bc8626d68ecad1bc3ea47d19bd30f362470aa4b1c3e5b84842',
    founderHash: '1cc84541ae2df1842a9b3c7dd36d6f7178265ada03222bec01560faf9f418030',
    rememberDays: 30,
  },

  // ── Report delivery (self-contained by default) ──────────────────────────
  // Participants' finished reports are always saved locally and offered as a
  // download. If you later stand up a backend, set `endpoint` to a URL that
  // accepts a POST { report } (Vercel function, Supabase RPC, Formspree, ...).
  // The founder dashboard reads whatever is configured here, plus any reports
  // imported by file.
  delivery: {
    endpoint: null,            // e.g. 'https://your-app.vercel.app/api/submit'
    endpointHeaders: {},       // e.g. { apikey: '...' } for Supabase
    // Supabase (optional) — matches the original course's shape. Leave null to
    // stay self-contained. If set, flushAll() also calls these PostgREST RPCs.
    supabase: null,            // { url: 'https://xxx.supabase.co', anonKey: '...' }
  },
};
