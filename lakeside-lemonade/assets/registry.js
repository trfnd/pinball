/* ---------------------------------------------------------------------------
 * registry.js — the single source of truth for modules + reflection questions.
 *
 * course.js stores each reflection at  lemonade.reflect.m{module}.q{index}
 * where {module} is the number in <body data-module="N"> and {index} is the
 * order of the .reflect-q block on the page. This registry lists the same
 * modules and questions so the finale report and the founder dashboard can
 * render answers under the right headings, in the right order, without
 * scraping any page.
 *
 * Keep the `q` array here in the SAME ORDER as the .reflect-q blocks on each
 * module page. The checkpoint uses module number 51, the bonus 12, so their
 * storage keys never collide with the numbered modules.
 * ------------------------------------------------------------------------- */
window.LEMONADE_MODULES = [
  { n: 1,  slug: '01-customer',  part: 1, eyebrow: 'Module 01 · Customer',
    q: [
      'What did your first attempt produce?',
      'What did you change in your second prompt?',
      "Looking at your final three personas — what's useful? What still feels generic?",
    ] },
  { n: 2,  slug: '02-location',  part: 1, eyebrow: 'Module 02 · Location',
    q: [
      "Which corner did you choose — and did it match Claude's pick?",
      'What did you know about these corners that never made it into the chat?',
      'In the era of AI, do people still need to build their own expertise — and how?',
    ] },
  { n: 3,  slug: '03-price',     part: 1, eyebrow: 'Module 03 · Price',
    q: [
      'What clarifying questions did Claude ask you before it started?',
      'Were those good questions to ask? How would the output have been worse if Claude had just skipped them and guessed?',
      'Anything in the cost sheet that surprised you, or looked worth a closer look?',
    ] },
  { n: 4,  slug: '04-brand',     part: 1, eyebrow: 'Module 04 · Brand',
    q: [
      "What's one question the Skill asked that you wouldn't have thought to ask yourself?",
      'Looking at your brand book — does it feel like you, or like a generic kit?',
      "What's one recurring task at your work — something you do over and over — that you could imagine packaging into a Skill?",
    ] },
  { n: 5,  slug: '05-launch',    part: 1, eyebrow: 'Module 05 · Launch',
    q: [
      "What did you ask Claude to change between the first pass and the version you'd actually share?",
      'Looking at the final website — which of your earlier outputs ended up showing up most? Which barely showed up?',
      "What's a project of your own where this five-module pattern would apply?",
    ] },
  { n: 51, slug: 'checkpoint',   part: 1, eyebrow: 'Checkpoint · Building something for your own life',
    q: [
      "What I'm going to build, and what I'll give Claude to start",
      'A link to what you built (optional)',
      'What did you set out to build, and what did you end up with?',
      'Where did the difference come from?',
      'Was your idea too big, about right, or too small? What would you do differently next time?',
      'What did you know that you had to tell Claude, or wish you had told it sooner?',
    ] },
  { n: 6,  slug: '06-books',     part: 2, eyebrow: 'Module 06 · Books',
    q: [
      'It was the same Claude on all three rungs. In your own words — what did you have to give it to turn it from something that answers into something that acts?',
      'Did you catch Claude making a decision for you — a judgment call you never spelled out? If you’re not sure, ask it directly: "what calls did you have to make to close these books?" Then look at its answer — would you have made them the same way?',
      "Think of a task that repeats in your real work. What access and what permission would you have to hand an agent for it to actually do that task — and what's the one decision you'd want it to check with you first?",
    ] },
  { n: 7,  slug: '07-expand',    part: 2, eyebrow: 'Module 07 · Expand',
    q: [
      'It was the same LLM in both runs. In your own words, what actually changed when you asked for parallel workstreams — and why would that give a better-grounded answer?',
      'Think back to a recent project at work and the people it took to finish — the one who dug up information, the one who ran the numbers, the one who pulled it all together. Picture that as an agentic system: which roles would run in parallel, and who synthesizes at the end? Is it fan-out-and-synthesize, like you just built — or a different shape?',
      'When would you not split into a team — when is keeping everything in one window actually the better call?',
    ] },
  { n: 8,  slug: '08-skill',     part: 2, eyebrow: 'Module 08 · Skill',
    q: [
      'Claude did almost all the work here — yet the skill was only as good as the expertise you put in. In the era of AI, is your own hard-won expertise worth more, less, or just something different?',
      "Name one thing you know how to do that would package well into a skill — and one that wouldn't, no matter how you tried. What's the difference between them?",
      'Whose expertise on your team — yours, or someone else’s — is locked in one head and should travel? Name it.',
    ] },
  { n: 9,  slug: '09-trust',     part: 2, eyebrow: 'Module 09 · Trust',
    q: [
      'You produced the recap two ways. Which version would you trust enough to hand to someone else to run without you watching — and why?',
      "In your organization, who would answer for it if an AI tool quietly got something wrong and no one caught it — and does that person know it's them?",
      "Pick one real task you'd hand to an AI agent. What's the one check you'd build in so a mistake gets caught before it reaches anyone who matters?",
    ] },
  { n: 10, slug: '10-finale',    part: 2, eyebrow: 'Module 10 · Finale — Your deployment brief',
    // Finale answers render under their own sub-headings.
    subheads: [
      'In your world — the problem',
      'In your world — the data',
      'In your world — the human checkpoint',
      'In your world — the owner',
      'In your world — who loses',
    ],
    q: [
      'In your world — the problem',
      'In your world — the data',
      'In your world — the human checkpoint',
      'In your world — the owner',
      'In your world — who loses',
    ] },
  { n: 12, slug: 'bonus',        part: 2, eyebrow: 'Bonus · Bring agents into your world',
    q: [
      'Did you try it before class, for the first time, or skip it? What surprised you?',
      'Before an agent touches real data, what will you let it read, what will you let it do, and how will you check what it did?',
    ] },
];

/* Ordered nav used by the module rail + prev/next. */
window.LEMONADE_NAV = [
  { slug: '01-customer', num: '01', lbl: 'Customer' },
  { slug: '02-location', num: '02', lbl: 'Location' },
  { slug: '03-price',    num: '03', lbl: 'Price' },
  { slug: '04-brand',    num: '04', lbl: 'Brand' },
  { slug: '05-launch',   num: '05', lbl: 'Launch' },
  { slug: 'checkpoint',  num: '✱',  lbl: 'Checkpoint', checkpoint: true },
  { slug: '06-books',    num: '06', lbl: 'Books' },
  { slug: '07-expand',   num: '07', lbl: 'Expand' },
  { slug: '08-skill',    num: '08', lbl: 'Skill' },
  { slug: '09-trust',    num: '09', lbl: 'Trust' },
  { slug: '10-finale',   num: '10', lbl: 'Finale' },
  { slug: 'bonus',       num: '✱',  lbl: 'Bonus', optional: true },
];
