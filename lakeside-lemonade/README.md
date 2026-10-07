# Lakeside Lemonade — GenAI course (self-contained replica)

A hands-on GenAI-adoption course, themed as planning a lemonade stand. Ten short
modules plus a checkpoint and a bonus; each ends with a reflection, and the finale
assembles everything into one report — *"The whole course, in your words"* — that is
saved for the **founder** and offered as a printable PDF.

This is a faithful, self-contained rebuild of the HBS Executive-Education original
(Max Lu & Suraj Srinivasan). It is a static site — no build step, no server required.

## What's here

```
index.html          Password gate + course overview
01-customer.html    01 · Customer   — prompting; personas from real interviews
02-location.html    02 · Location   — local knowledge vs. Claude's pick (map)
03-price.html       03 · Price      — clarifying questions; the cost sheet
04-brand.html       04 · Brand      — running a Skill; the "generic kit" problem
05-launch.html      05 · Launch     — ship the website; the five-module pattern
checkpoint.html      * · Checkpoint — build something for your own life
06-books.html       06 · Books      — agents that act (classify-and-act)
07-expand.html      07 · Expand     — parallel workstreams (fan-out-and-synthesize)
08-skill.html       08 · Skill      — package your expertise into a Skill
09-trust.html       09 · Trust      — verification + the six swarm patterns
10-finale.html      10 · Finale     — your deployment brief + hand-in
bonus.html           * · Bonus      — bring agents into your real tools (access & risk)
founder.html        Private founder dashboard (separate password)
assets/             Shared CSS + JS (see below)
```

The six agent-swarm patterns (Module 09): **classify-and-act, fan-out-and-synthesize,
adversarial verification, generate-and-filter, tournament, loop-until-done** — each with
a one-line "what it's for" and a small diagram.

## Running it

It's plain static files. Any static host works (Vercel, Netlify, GitHub Pages) or
locally:

```bash
cd lakeside-lemonade
python3 -m http.server 8099      # then open http://localhost:8099
```

## Passwords (change these)

Set in `assets/config.js` as SHA-256 hashes (so the plain text isn't in the source).

| Lock        | Default password  | Used for                     |
|-------------|-------------------|------------------------------|
| participant | `lemonade2026`    | the course pages (index gate)|
| founder     | `founder-ibrahim` | `founder.html` dashboard     |

To change one:

```bash
printf '%s' 'your-new-password' | sha256sum
# paste the hash into config.js → gate.participantHash / gate.founderHash
```

The gate is a convenience lock for a handout, not real security (the module text is in
the page source). For true gating, put the site behind your host's password protection
and set `gate.enabled = false`.

## How reports reach the founder (self-contained by default)

As a participant works, every reflection is saved to `localStorage`. At the **Module 10
hand-in** they enter name + email; the course then:

1. **assembles** the whole report (all modules + checkpoint),
2. **saves** it to the founder store in that browser (`founder.html` reads this),
3. **opens** a printable PDF, and
4. offers a **downloadable `<name>.lemonade.json`** file.

The **founder dashboard** (`founder.html`) lists every saved report, and can **import**
those `.json` files (what a participant sends you) and **export all**. So the full loop
works with nothing external: participant downloads their report file → sends it to you →
you import it.

### Wiring a real backend later (optional)

`assets/config.js → delivery` has two hooks, both off by default:

- `endpoint` — any URL that accepts `POST { report }` (a Vercel function, Formspree, …).
  The hand-in posts there automatically, in addition to saving locally.
- `supabase` — `{ url, anonKey }`. Mirrors the original course: the hand-in calls the
  PostgREST RPCs `upsert_learner` and `save_reflection`. (You'd create those tables +
  SECURITY DEFINER functions in your Supabase project; the client code is already here.)

Nothing about the course pages changes — only `config.js`.

## Assets

| File              | Role |
|-------------------|------|
| `course.css`      | Shared chrome + content styles (ported from the original) |
| `extra.css`       | Additions: landing, swarm grid, image lifts, founder dashboard |
| `course.js`       | Checkpoints, reflection persistence + guard, copy buttons, image zoom (ported) |
| `config.js`       | Passwords (hashed), report-delivery config |
| `registry.js`     | Single source of truth: modules + reflection questions + nav order |
| `chrome.js`       | Builds the module rail + prev/next + progress from the registry |
| `sync.js`         | Local reflection store + founder submission store (+ optional endpoint/Supabase) |
| `pdf.js`          | Renders the report ("The whole course, in your words") and prints to PDF |
| `handin.js`       | The Module 10 hand-in flow |
| `gate.js`         | Password gate (participant + founder) |

## Editing content

Module pages are hand-authored HTML following one template (see `01-customer.html`).
To change a reflection question, edit **both** the page's `.reflect-q` block **and** the
matching entry in `registry.js` (same order) so the report and dashboard stay in sync.
Reflection answers are stored at `lemonade.reflect.m{module}.q{index}`.
